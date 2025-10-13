// DatabaseContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';

export interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string; // stored securely via SecureStore; mirrored in-memory only
  ssl: boolean;
  isActive: boolean;
}

export interface QueryResult {
  rows: any[];
  fields: { name: string; dataTypeID: number }[];
  rowCount: number;
  command: string;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
  rowCount?: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  description?: string;
  createdAt: number;
}

type ExecuteOptions = {
  signal?: AbortSignal;
};

const STORAGE_KEY_CONNECTIONS = '@db_connections';
const STORAGE_KEY_HISTORY = '@query_history';
const STORAGE_KEY_SAVED = '@saved_queries';
const STORAGE_KEY_ACTIVE_ID = '@db_active_id';
const HISTORY_LIMIT = 200;

// ----- Logger (silent in prod except errors) -----
const logger = {
  info: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.log(...a); },
  warn: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.warn(...a); },
  error: (...a: any[]) => console.error(...a),
};

// ----- Secure storage helpers (graceful fallback) -----
let SecureStore: typeof import('expo-secure-store') | null = null;
(async () => {
  try { SecureStore = await import('expo-secure-store'); } catch { SecureStore = null; }
})();

const secretKey = (id: string) => `@db_secret_${id}`;

async function setSecret(id: string, password: string) {
  try {
    if (SecureStore?.setItemAsync) {
      await SecureStore.setItemAsync(secretKey(id), password, { keychainService: secretKey(id) });
    } else {
      await AsyncStorage.setItem(secretKey(id), password); // fallback
    }
  } catch (e) { logger.error('[DatabaseContext] setSecret failed:', e); }
}

async function getSecret(id: string) {
  try {
    if (SecureStore?.getItemAsync) {
      return await SecureStore.getItemAsync(secretKey(id));
    }
    return await AsyncStorage.getItem(secretKey(id)); // fallback
  } catch (e) { logger.error('[DatabaseContext] getSecret failed:', e); return null; }
}

async function deleteSecret(id: string) {
  try {
    if (SecureStore?.deleteItemAsync) {
      await SecureStore.deleteItemAsync(secretKey(id), { keychainService: secretKey(id) });
    } else {
      await AsyncStorage.removeItem(secretKey(id));
    }
  } catch (e) { logger.error('[DatabaseContext] deleteSecret failed:', e); }
}

// ----- Debounce persist -----
function debounce<T extends (...args: any[]) => void>(fn: T, delay = 200) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ----- Safe JSON helpers -----
function safeParse<T>(raw: string | null, fallback: T): T {
  try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

// ----- Redact connection for logging -----
function redact(conn: Partial<DatabaseConnection>) {
  const { password, ...rest } = conn;
  return { ...rest, password: password ? '******' : '' };
}

// ----- Context -----
export const [DatabaseProvider, useDatabase] = createContextHook(() => {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);

  // Track inflight abort controller
  const abortRef = useRef<AbortController | null>(null);

  // Persist helpers (debounced)
  const persistConnections = useCallback(
    debounce(async (conns: DatabaseConnection[]) => {
      try {
        // Store without passwords; passwords live in SecureStore
        const stripped = conns.map(({ password: _pw, ...rest }) => rest);
        await AsyncStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(stripped));
        // Update per-connection password in secrets
        for (const c of conns) {
          if (c.password) await setSecret(c.id, c.password);
        }
      } catch (e) {
        logger.error('Failed to save connections:', e);
      }
    }, 150),
    []
  );

  const persistActiveId = useCallback(async (id: string | null) => {
    try {
      if (id) await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
      else await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    } catch (e) { logger.error('Failed to persist active id:', e); }
  }, []);

  const persistHistory = useCallback(
    debounce(async (items: QueryHistoryItem[]) => {
      try { await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(items)); }
      catch (e) { logger.error('Failed to save query history:', e); }
    }, 150),
    []
  );

  const persistSaved = useCallback(
    debounce(async (items: SavedQuery[]) => {
      try { await AsyncStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(items)); }
      catch (e) { logger.error('Failed to save queries:', e); }
    }, 150),
    []
  );

  // ----- Load persisted on mount -----
  useEffect(() => {
    (async () => {
      try {
        const [connectionsData, historyData, savedData, activeId] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_CONNECTIONS),
          AsyncStorage.getItem(STORAGE_KEY_HISTORY),
          AsyncStorage.getItem(STORAGE_KEY_SAVED),
          AsyncStorage.getItem(STORAGE_KEY_ACTIVE_ID),
        ]);

        const parsedConnsNoPw = safeParse<Omit<DatabaseConnection, 'password'>[]>(connectionsData, []);
        // Rehydrate passwords from SecureStore
        const rehydrated: DatabaseConnection[] = [];
        for (const c of parsedConnsNoPw) {
          const pw = (await getSecret(c.id)) || '';
          rehydrated.push({ ...c, password: pw });
        }
        setConnections(rehydrated);

        // Active connection: from stored id or first active flag
        let active: DatabaseConnection | null =
          rehydrated.find(c => c.id === activeId) || rehydrated.find(c => c.isActive) || null;

        if (active && !active.password) {
          active = { ...active, password: (await getSecret(active.id)) || '' };
        }
        setActiveConnection(active || null);

        setQueryHistory(safeParse<QueryHistoryItem[]>(historyData, []));
        setSavedQueries(safeParse<SavedQuery[]>(savedData, []));
        logger.info('[DatabaseContext] Loaded', rehydrated.length, 'connections');
      } catch (error) {
        logger.error('Failed to load persisted data:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ----- Save connections state change (without passwords) -----
  useEffect(() => {
    if (isLoading) return;
    persistConnections(connections);
  }, [connections, isLoading, persistConnections]);

  // ----- Core CRUD for connections -----
  const saveConnections = useCallback(async (conns: DatabaseConnection[]) => {
    setConnections(conns);
    // passwords persisted via persistConnections effect
    // ensure exactly one active
    const all = conns.map(c => ({ ...c, isActive: c.isActive && c.id === (conns.find(x => x.isActive)?.id || c.id) }));
    const active = all.find(c => c.isActive) || null;
    setActiveConnection(active);
    await persistActiveId(active?.id || null);
  }, [persistActiveId]);

  const addConnection = useCallback(async (connection: Omit<DatabaseConnection, 'id' | 'isActive'>) => {
    const newConnection: DatabaseConnection = {
      ...connection,
      id: Date.now().toString(),
      isActive: connections.length === 0,
    };
    await setSecret(newConnection.id, newConnection.password || '');
    const updated = [...connections, newConnection];
    await saveConnections(updated);
    if (newConnection.isActive) setActiveConnection(newConnection);
    logger.info('[DatabaseContext] Added connection:', redact(newConnection));
    return newConnection;
  }, [connections, saveConnections]);

  const updateConnection = useCallback(async (id: string, updates: Partial<DatabaseConnection>) => {
    const updated = connections.map(c => c.id === id ? { ...c, ...updates } : c);
    // If password updated, store in SecureStore
    const updatedConn = updated.find(c => c.id === id);
    if (updatedConn && typeof updates.password === 'string') {
      await setSecret(id, updates.password);
    }
    await saveConnections(updated);

    if (activeConnection?.id === id) {
      setActiveConnection({ ...activeConnection, ...updates });
    }
    logger.info('[DatabaseContext] Updated connection:', redact({ id, ...updates }));
  }, [connections, activeConnection, saveConnections]);

  const deleteConnection = useCallback(async (id: string) => {
    const updated = connections.filter(c => c.id !== id);
    await saveConnections(updated);
    await deleteSecret(id);

    if (activeConnection?.id === id) {
      const next = updated.find(c => c.isActive) || updated[0] || null;
      setActiveConnection(next);
      await persistActiveId(next?.id || null);
    }
    logger.info('[DatabaseContext] Deleted connection:', id);
  }, [connections, activeConnection, saveConnections, persistActiveId]);

  const setActiveConnectionById = useCallback(async (id: string) => {
    const updated = connections.map(c => ({ ...c, isActive: c.id === id }));
    await saveConnections(updated);
    const active = updated.find(c => c.id === id) || null;
    if (active && !active.password) {
      active.password = (await getSecret(active.id)) || '';
    }
    setActiveConnection(active);
    await persistActiveId(active?.id || null);
    logger.info('[DatabaseContext] Active connection set:', redact(active || {}));
  }, [connections, saveConnections, persistActiveId]);

  // ----- History -----
  const addToHistory = useCallback(async (item: Omit<QueryHistoryItem, 'id' | 'timestamp'>) => {
    const historyItem: QueryHistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    const updated = [historyItem, ...queryHistory].slice(0, HISTORY_LIMIT);
    setQueryHistory(updated);
    persistHistory(updated);
  }, [queryHistory, persistHistory]);

  const clearHistory = useCallback(async () => {
    setQueryHistory([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (error) {
      logger.error('Failed to clear history:', error);
    }
  }, []);

  // ----- Saved Queries -----
  const saveQuery = useCallback(async (name: string, query: string, description?: string) => {
    const savedQuery: SavedQuery = {
      id: Date.now().toString(),
      name,
      query,
      description,
      createdAt: Date.now(),
    };
    const updated = [...savedQueries, savedQuery];
    setSavedQueries(updated);
    persistSaved(updated);
    return savedQuery;
  }, [savedQueries, persistSaved]);

  const deleteSavedQuery = useCallback(async (id: string) => {
    const updated = savedQueries.filter(q => q.id !== id);
    setSavedQueries(updated);
    persistSaved(updated);
  }, [savedQueries, persistSaved]);

  const runSavedQuery = useCallback(async (id: string, options?: ExecuteOptions) => {
    const sq = savedQueries.find(s => s.id === id);
    if (!sq) throw new Error('Saved query not found');
    return await executeQuery(sq.query, options);
  }, [savedQueries]); // executeQuery is hoisted below via function reference

  // ----- Connection Test / Ping -----
  const testConnection = useCallback(async (id?: string) => {
    const conn = id ? connections.find(c => c.id === id) : activeConnection;
    if (!conn) throw new Error('No connection to test');
    const connection: DatabaseConnection = {
      ...conn,
      password: conn.password || (await getSecret(conn.id)) || '',
    };
    logger.info('[DatabaseContext] Testing connection:', redact(connection));
    try {
      const start = Date.now();
      const res = await trpcClient.database.ping.mutate({ connection });
      const ms = Date.now() - start;
      logger.info('[DatabaseContext] Connection OK in', ms, 'ms:', res);
      return { ok: true, latency: ms, details: res };
    } catch (e) {
      logger.error('[DatabaseContext] Connection test failed:', e);
      return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }, [connections, activeConnection]);

  // ----- Execute Query (with optional cancellation) -----
  const executeQuery = useCallback(async (query: string, options?: ExecuteOptions): Promise<QueryResult> => {
    if (!activeConnection) throw new Error('No active database connection');

    // Abort prior run if any (single-flight UX)
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = options?.signal || controller.signal;

    const startTime = Date.now();
    setIsExecuting(true);

    try {
      logger.info('[DatabaseContext] Executing query via tRPC:', query.slice(0, 120).replace(/\s+/g, ' '), '…');

      // Ensure password present from secure storage
      const conn: DatabaseConnection = {
        ...activeConnection,
        password: activeConnection.password || (await getSecret(activeConnection.id)) || '',
      };

      // If your tRPC link supports fetch/AbortSignal, pass it through; else ignore.
      const result: QueryResult = await trpcClient.database.execute.mutate(
        { connection: conn, query },
        // @ts-ignore optional context passthrough (depends on your client impl)
        { signal }
      );

      const duration = Date.now() - startTime;
      await addToHistory({ query, duration, success: true, rowCount: result.rowCount });

      logger.info('[DatabaseContext] Query OK in', duration, 'ms → rows:', result.rowCount);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const aborted = error?.name === 'AbortError';
      logger.error('[DatabaseContext] Query failed:', aborted ? '(aborted)' : error);

      await addToHistory({
        query,
        duration,
        success: false,
        error: aborted ? 'Query aborted' : (error instanceof Error ? error.message : 'Unknown error'),
      });
      throw error;
    } finally {
      setIsExecuting(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [activeConnection, addToHistory]);

  const cancelQuery = useCallback(() => {
    try { abortRef.current?.abort(); } catch {}
  }, []);

  // ----- Import / Export connections (without passwords) -----
  const exportConnections = useCallback(() => {
    const data = connections.map(({ password: _pw, ...rest }) => rest);
    return JSON.stringify({ version: 1, connections: data }, null, 2);
  }, [connections]);

  const importConnections = useCallback(async (json: string) => {
    try {
      const parsed = safeParse<any>(json, null);
      if (!parsed || !Array.isArray(parsed.connections)) throw new Error('Invalid import format');
      // Merge by id/name
      const incoming: Omit<DatabaseConnection, 'password'>[] = parsed.connections;
      const merged: DatabaseConnection[] = [...connections];

      for (const inc of incoming) {
        const matchIdx = merged.findIndex(m => m.id === inc.id || (m.name === inc.name && m.host === inc.host && m.database === inc.database));
        const pw = await getSecret(inc.id);
        if (matchIdx >= 0) {
          merged[matchIdx] = { ...merged[matchIdx], ...inc, password: pw || merged[matchIdx].password || '' };
        } else {
          merged.push({ ...inc, password: pw || '', isActive: false });
        }
      }
      await saveConnections(merged);
      logger.info('[DatabaseContext] Imported', incoming.length, 'connections');
      return { success: true, count: incoming.length };
    } catch (e) {
      logger.error('[DatabaseContext] Import failed:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }, [connections, saveConnections]);

  return useMemo(() => ({
    connections,
    activeConnection,
    queryHistory,
    savedQueries,
    isLoading,
    isExecuting,
    // CRUD
    addConnection,
    updateConnection,
    deleteConnection,
    setActiveConnectionById,
    // Query
    executeQuery,
    cancelQuery,
    // History
    clearHistory,
    // Saved
    saveQuery,
    deleteSavedQuery,
    runSavedQuery,
    // Tools
    testConnection,
    exportConnections,
    importConnections,
  }), [
    connections,
    activeConnection,
    queryHistory,
    savedQueries,
    isLoading,
    isExecuting,
    addConnection,
    updateConnection,
    deleteConnection,
    setActiveConnectionById,
    executeQuery,
    cancelQuery,
    clearHistory,
    saveQuery,
    deleteSavedQuery,
    runSavedQuery,
    testConnection,
    exportConnections,
    importConnections,
  ]);
});
