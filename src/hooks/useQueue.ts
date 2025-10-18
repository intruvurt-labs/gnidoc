import { useState, useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { QueueDAO } from '../db/dao';
import { QueueItem } from '../db/schema';
import { SyncWorker } from '../sync/worker';

export function useQueue() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SQLite.openDatabaseAsync('gnidoc.db').then(setDb);
  }, []);

  const load = useCallback(async () => {
    if (!db) return;
    const dao = new QueueDAO(db);
    const all = await dao.getAll();
    setItems(all);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = useCallback(async (id: string) => {
    if (!db) return;
    const dao = new QueueDAO(db);
    await dao.updateStatus(id, 'pending', Date.now());
    
    const worker = new SyncWorker(db);
    await worker.drainQueue();
    await load();
  }, [db, load]);

  const quarantine = useCallback(async (id: string) => {
    if (!db) return;
    const dao = new QueueDAO(db);
    await dao.updateStatus(id, 'poison');
    await load();
  }, [db, load]);

  const deleteDone = useCallback(async () => {
    if (!db) return;
    const dao = new QueueDAO(db);
    await dao.clearDone();
    await load();
  }, [db, load]);

  const deleteItem = useCallback(async (id: string) => {
    if (!db) return;
    const dao = new QueueDAO(db);
    await dao.delete(id);
    await load();
  }, [db, load]);

  return {
    items,
    loading,
    refresh: load,
    retry,
    quarantine,
    deleteDone,
    deleteItem,
  };
}
