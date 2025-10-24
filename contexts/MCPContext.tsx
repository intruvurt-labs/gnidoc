import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MCPClient, MCPMessage, MCPServerInfo, defaultMockServers } from '@/lib/mcp/client';

export interface MCPState {
  servers: MCPServerInfo[];
  connecting: Record<string, boolean>;
  events: Array<{ serverId: string; msg: MCPMessage; at: number }>;
  addServers: (servers: MCPServerInfo[]) => void;
  removeServer: (id: string) => void;
  discoverFrom: (urls: string[]) => Promise<void>;
  connect: (id: string) => void;
  disconnect: (id: string) => void;
  isConnected: (id: string) => boolean;
  send: (id: string, message: MCPMessage) => Promise<MCPMessage>;
  clearEvents: (id?: string) => void;
}

const STORAGE_KEY = 'mcp-servers';

export const [MCPProvider, useMCP] = createContextHook<MCPState>(() => {
  const [servers, setServers] = useState<MCPServerInfo[]>([]);
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [events, setEvents] = useState<Array<{ serverId: string; msg: MCPMessage; at: number }>>([]);
  const clientRef = useRef<MCPClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new MCPClient({
      onServersChanged(next) {
        setServers(next);
      },
      onEvent(serverId, msg) {
        setEvents((prev) => {
          const updated = [...prev, { serverId, msg, at: Date.now() }];
          return updated.slice(-500);
        });
      },
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as MCPServerInfo[];
          saved.forEach((s) => clientRef.current!.registerServer(s));
        } else {
          defaultMockServers().forEach((s) => clientRef.current!.registerServer(s));
        }
      } catch {
        defaultMockServers().forEach((s) => clientRef.current!.registerServer(s));
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(servers)).catch(() => {});
  }, [servers]);

  const addServers = useCallback((items: MCPServerInfo[]) => {
    items.forEach((s) => clientRef.current!.registerServer(s));
  }, []);

  const discoverFrom = useCallback(async (urls: string[]) => {
    try {
      await clientRef.current!.discoverFrom(urls);
    } catch {}
  }, []);

  const removeServer = useCallback((id: string) => {
    clientRef.current!.unregisterServer(id);
  }, []);

  const connect = useCallback((id: string) => {
    const s = servers.find((x) => x.id === id);
    if (!s) return;
    setConnecting((prev) => ({ ...prev, [id]: true }));
    clientRef.current!.connect(s);
    setTimeout(() => setConnecting((prev) => ({ ...prev, [id]: false })), 800);
  }, [servers]);

  const disconnect = useCallback((id: string) => {
    clientRef.current!.disconnect(id);
  }, []);

  const send = useCallback(async (id: string, message: MCPMessage) => {
    const res = await clientRef.current!.send(id, message);
    return res as MCPMessage;
  }, []);

  const isConnected = useCallback((id: string) => clientRef.current!.isConnected(id), []);

  const clearEvents = useCallback((id?: string) => {
    if (!id) return setEvents([]);
    setEvents((prev) => prev.filter((e) => e.serverId !== id));
  }, []);

  return useMemo(() => ({
    servers,
    connecting,
    events,
    addServers,
    removeServer,
    discoverFrom,
    connect,
    disconnect,
    isConnected,
    send,
    clearEvents,
  }), [servers, connecting, events, addServers, removeServer, discoverFrom, connect, disconnect, isConnected, send, clearEvents]);
});
