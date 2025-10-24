import { Platform, AppState } from 'react-native';

// Minimal interface to represent an MCP server instance
export interface MCPServer {
  dispose?: () => Promise<void> | void;
}

// Known server types mapped to lazy import resolvers
const serverLoaders: Record<string, () => Promise<MCPServer>> = {
  'expo-file-system': async () => {
    const mod = await import('../../servers/expo-file-system-mcp');
    // Support both default and named exports
    const AnyServer: any = (mod as any).default ?? (mod as any).ExpoFileSystemMCPServer;
    return new AnyServer();
  },
  'expo-device': async () => {
    const mod = await import('../../servers/expo-device-mcp');
    const AnyServer: any = (mod as any).default ?? (mod as any).ExpoDeviceMCPServer;
    return new AnyServer();
  },
};

export class MCPSessionManager {
  private static instances: Map<string, MCPServer> = new Map();
  private static initializing: Map<string, Promise<MCPServer>> = new Map();
  private static wiredMemoryListener = false;

  // Ensure we subscribe to memory pressure signals once (iOS only)
  private static ensureMemoryListener() {
    if (this.wiredMemoryListener) return;
    this.wiredMemoryListener = true;

    if (Platform.OS === 'ios') {
      try {
        // AppState emits 'memoryWarning' on iOS
        AppState.addEventListener('memoryWarning', () => {
          console.log('[MCPSessionManager] iOS memoryWarning received – clearing all MCP servers');
          this.cleanupUnusedServers(true);
        });
      } catch (e) {
        console.log('[MCPSessionManager] Failed to bind memoryWarning listener', e);
      }
    }
  }

  static async getMCPServer(serverType: string): Promise<MCPServer> {
    this.ensureMemoryListener();

    const existing = this.instances.get(serverType);
    if (existing) return existing;

    const inFlight = this.initializing.get(serverType);
    if (inFlight) return inFlight;

    const loader = serverLoaders[serverType];
    if (!loader) {
      throw new Error(`Unknown MCP server type: ${serverType}`);
    }

    const promise = loader()
      .then((server) => {
        this.instances.set(serverType, server);
        this.initializing.delete(serverType);
        console.log(`[MCPSessionManager] Loaded MCP server: ${serverType}`);
        return server;
      })
      .catch((err) => {
        this.initializing.delete(serverType);
        console.error(`[MCPSessionManager] Failed to load server ${serverType}:`, err);
        throw err;
      });

    this.initializing.set(serverType, promise);
    return promise;
  }

  static async release(serverType: string) {
    const server = this.instances.get(serverType);
    if (!server) return;
    try {
      await server.dispose?.();
    } catch (e) {
      console.log(`[MCPSessionManager] Error disposing server ${serverType}`, e);
    } finally {
      this.instances.delete(serverType);
      console.log(`[MCPSessionManager] Released MCP server: ${serverType}`);
    }
  }

  static async cleanupUnusedServers(forceAll: boolean = false) {
    if (Platform.OS === 'ios' || forceAll) {
      const types: string[] = Array.from(this.instances.keys());
      await Promise.all(types.map((t) => this.release(t)));
      return;
    }

    // For non-iOS, provide a conservative cleanup hook if ever needed
    console.log('[MCPSessionManager] No-op cleanup on this platform');
  }
}
