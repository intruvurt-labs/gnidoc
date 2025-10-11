import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';

export interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
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

const STORAGE_KEY_CONNECTIONS = '@db_connections';
const STORAGE_KEY_HISTORY = '@query_history';
const STORAGE_KEY_SAVED = '@saved_queries';

export const [DatabaseProvider, useDatabase] = createContextHook(() => {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPersistedData();
  }, []);

  const loadPersistedData = async () => {
    try {
      const [connectionsData, historyData, savedData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_CONNECTIONS),
        AsyncStorage.getItem(STORAGE_KEY_HISTORY),
        AsyncStorage.getItem(STORAGE_KEY_SAVED),
      ]);

      if (connectionsData) {
        const parsed = JSON.parse(connectionsData);
        setConnections(parsed);
        const active = parsed.find((c: DatabaseConnection) => c.isActive);
        if (active) setActiveConnection(active);
      } else {
        console.log('[DatabaseContext] No saved connections found');
        setConnections([]);
        setActiveConnection(null);
      }

      if (historyData) {
        setQueryHistory(JSON.parse(historyData));
      }

      if (savedData) {
        setSavedQueries(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConnections = useCallback(async (conns: DatabaseConnection[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(conns));
      setConnections(conns);
    } catch (error) {
      console.error('Failed to save connections:', error);
    }
  }, []);

  const addConnection = useCallback(async (connection: Omit<DatabaseConnection, 'id' | 'isActive'>) => {
    const newConnection: DatabaseConnection = {
      ...connection,
      id: Date.now().toString(),
      isActive: connections.length === 0,
    };

    const updated = [...connections, newConnection];
    await saveConnections(updated);

    if (newConnection.isActive) {
      setActiveConnection(newConnection);
    }

    return newConnection;
  }, [connections, saveConnections]);

  const updateConnection = useCallback(async (id: string, updates: Partial<DatabaseConnection>) => {
    const updated = connections.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    await saveConnections(updated);

    if (activeConnection?.id === id) {
      setActiveConnection({ ...activeConnection, ...updates });
    }
  }, [connections, activeConnection, saveConnections]);

  const deleteConnection = useCallback(async (id: string) => {
    const updated = connections.filter(c => c.id !== id);
    await saveConnections(updated);

    if (activeConnection?.id === id) {
      setActiveConnection(updated.find(c => c.isActive) || null);
    }
  }, [connections, activeConnection, saveConnections]);

  const setActiveConnectionById = useCallback(async (id: string) => {
    const updated = connections.map(c => ({
      ...c,
      isActive: c.id === id,
    }));
    await saveConnections(updated);

    const active = updated.find(c => c.id === id);
    setActiveConnection(active || null);
  }, [connections, saveConnections]);

  const addToHistory = useCallback(async (item: Omit<QueryHistoryItem, 'id' | 'timestamp'>) => {
    const historyItem: QueryHistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    const updated = [historyItem, ...queryHistory].slice(0, 100);
    setQueryHistory(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save query history:', error);
    }
  }, [queryHistory]);

  const executeQuery = useCallback(async (query: string): Promise<QueryResult> => {
    if (!activeConnection) {
      throw new Error('No active database connection');
    }

    const startTime = Date.now();
    
    try {
      console.log('[DatabaseContext] Executing query via tRPC:', query.substring(0, 100));
      
      const result = await trpcClient.database.execute.mutate({
        connection: activeConnection,
        query,
      });

      const duration = Date.now() - startTime;

      await addToHistory({
        query,
        duration,
        success: true,
        rowCount: result.rowCount,
      });

      console.log('[DatabaseContext] Query executed successfully:', result.rowCount, 'rows');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[DatabaseContext] Query execution failed:', error);
      
      await addToHistory({
        query,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, [activeConnection, addToHistory]);

  const clearHistory = useCallback(async () => {
    setQueryHistory([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, []);

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

    try {
      await AsyncStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save query:', error);
    }

    return savedQuery;
  }, [savedQueries]);

  const deleteSavedQuery = useCallback(async (id: string) => {
    const updated = savedQueries.filter(q => q.id !== id);
    setSavedQueries(updated);

    try {
      await AsyncStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete saved query:', error);
    }
  }, [savedQueries]);

  return useMemo(() => ({
    connections,
    activeConnection,
    queryHistory,
    savedQueries,
    isLoading,
    addConnection,
    updateConnection,
    deleteConnection,
    setActiveConnectionById,
    executeQuery,
    clearHistory,
    saveQuery,
    deleteSavedQuery,
  }), [connections, activeConnection, queryHistory, savedQueries, isLoading, addConnection, updateConnection, deleteConnection, setActiveConnectionById, executeQuery, clearHistory, saveQuery, deleteSavedQuery]);
});
