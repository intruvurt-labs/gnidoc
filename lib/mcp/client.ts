import { Platform } from 'react-native';

export type MCPCapability =
  | 'file_operations'
  | 'code_generation'
  | 'refactoring'
  | 'model_routing'
  | 'prompt_optimization'
  | 'cost_tracking'
  | 'scraping'
  | 'automation'
  | 'screenshot'
  | 'ui_generation'
  | 'style_validation'
  | 'asset_optimization';

export type MCPHealth = 'healthy' | 'degraded' | 'down';

export interface MCPServerInfo {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  capabilities: MCPCapability[];
  transport: 'websocket' | 'http' | 'inprocess';
  endpoint?: string;
  health: MCPHealth;
  latencyMs?: number;
}

export interface MCPMessage<T = any> {
  id: string;
  type: 'request' | 'response' | 'event';
  method?: string;
  params?: Record<string, unknown> | undefined;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export interface MCPClientEvents {
  onServersChanged?: (servers: MCPServerInfo[]) => void;
  onEvent?: (serverId: string, msg: MCPMessage) => void;
}

export class MCPClient {
  private servers: MCPServerInfo[] = [];
  private sockets: Map<string, WebSocket> = new Map();
  private listeners: MCPClientEvents;

  constructor(listeners: MCPClientEvents = {}) {
    this.listeners = listeners;
  }

  listServers() {
    return this.servers.slice();
  }

  registerServer(server: MCPServerInfo) {
    const exists = this.servers.find((s) => s.id === server.id);
    if (exists) {
      this.servers = this.servers.map((s) => (s.id === server.id ? server : s));
    } else {
      this.servers = [...this.servers, server];
    }
    this.listeners.onServersChanged?.(this.listServers());
  }

  unregisterServer(id: string) {
    this.servers = this.servers.filter((s) => s.id !== id);
    const sock = this.sockets.get(id);
    if (sock) try { sock.close(); } catch {}
    this.sockets.delete(id);
    this.listeners.onServersChanged?.(this.listServers());
  }

  async discoverFrom(urls: string[]) {
    await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, { method: 'GET' });
          if (!res.ok) throw new Error('discovery failed');
          const items: MCPServerInfo[] = await res.json();
          items.forEach((it) => this.registerServer(it));
        } catch (e) {
          console.log('[MCP] discovery error', url, e);
        }
      })
    );
  }

  connect(server: MCPServerInfo) {
    if (server.transport !== 'websocket' || !server.endpoint) return;
    if (Platform.OS === 'web') {
      try {
        const ws = new WebSocket(server.endpoint);
        ws.onopen = () => console.log('[MCP] ws open', server.name);
        ws.onclose = () => console.log('[MCP] ws close', server.name);
        ws.onerror = (e) => console.log('[MCP] ws error', server.name, e);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data as string) as MCPMessage;
            this.listeners.onEvent?.(server.id, msg);
          } catch {}
        };
        this.sockets.set(server.id, ws);
      } catch (e) {
        console.log('[MCP] ws connect failed', e);
      }
    } else {
      console.log('[MCP] WebSocket connections are supported on native via Expo networking; using same API');
      try {
        const ws = new WebSocket(server.endpoint);
        ws.onopen = () => console.log('[MCP] ws open', server.name);
        ws.onclose = () => console.log('[MCP] ws close', server.name);
        ws.onerror = (e) => console.log('[MCP] ws error', server.name, e);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(String(e.data)) as MCPMessage;
            this.listeners.onEvent?.(server.id, msg);
          } catch {}
        };
        this.sockets.set(server.id, ws);
      } catch (e) {
        console.log('[MCP] ws connect failed', e);
      }
    }
  }

  send<T = any>(serverId: string, message: MCPMessage): Promise<MCPMessage<T>> {
    return new Promise((resolve, reject) => {
      const ws = this.sockets.get(serverId);
      if (!ws || ws.readyState !== ws.OPEN) return reject(new Error('socket not open'));
      const id = message.id || `${Date.now()}-${Math.random()}`;
      const payload = { ...message, id };

      const onMessage = (e: MessageEvent) => {
        try {
          const msg = JSON.parse(e.data as string) as MCPMessage<T>;
          if (msg.id === id && (msg.type === 'response' || msg.error)) {
            ws.removeEventListener('message', onMessage as any);
            resolve(msg);
          }
        } catch {}
      };
      ws.addEventListener('message', onMessage as any);
      ws.send(JSON.stringify(payload));
    });
  }
}

export function defaultMockServers(): MCPServerInfo[] {
  return [
    {
      id: 'code-mcp',
      name: 'Code MCP',
      description: 'Filesystem + code ops',
      icon: '🧩',
      capabilities: ['file_operations', 'code_generation', 'refactoring'],
      transport: 'inprocess',
      health: 'healthy',
      latencyMs: 12,
    },
    {
      id: 'ai-mcp',
      name: 'Multi-AI MCP',
      description: 'Model routing + cost',
      icon: '🧠',
      capabilities: ['model_routing', 'prompt_optimization', 'cost_tracking'],
      transport: 'http',
      endpoint: '/api/mcp/ai',
      health: 'healthy',
      latencyMs: 34,
    },
    {
      id: 'browser-mcp',
      name: 'Browser MCP',
      description: 'Scraping + automation',
      icon: '🌐',
      capabilities: ['scraping', 'automation', 'screenshot'],
      transport: 'websocket',
      endpoint: 'wss://example.com/mcp/browser',
      health: 'degraded',
      latencyMs: 120,
    },
  ];
}
