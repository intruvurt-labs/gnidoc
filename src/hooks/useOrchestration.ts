import { useState, useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { OrchestrationDAO } from '../db/dao';
import { Orchestration } from '../db/schema';
import { restClient } from '../api/client';

export function useOrchestration() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [orchestrations, setOrchestrations] = useState<Orchestration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SQLite.openDatabaseAsync('gnidoc.db').then(setDb);
  }, []);

  const load = useCallback(async () => {
    if (!db) return;
    const dao = new OrchestrationDAO(db);
    const all = await dao.getAll(50);
    setOrchestrations(all);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const rerun = useCallback(async (runId: string, shard?: string) => {
    try {
      await restClient.rerunOrchestration(runId, shard);
      await load();
    } catch (error) {
      console.error('[useOrchestration] Rerun error:', error);
    }
  }, [load]);

  return {
    orchestrations,
    loading,
    refresh: load,
    rerun,
  };
}
