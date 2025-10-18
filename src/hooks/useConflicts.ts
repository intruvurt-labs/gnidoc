import { useState, useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { ConflictDAO, QueueDAO } from '../db/dao';
import { Conflict } from '../db/schema';
import { generateIdempotencyKey } from '../utils/idempotency';

export function useConflicts() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SQLite.openDatabaseAsync('gnidoc.db').then(setDb);
  }, []);

  const load = useCallback(async () => {
    if (!db) return;
    const dao = new ConflictDAO(db);
    const all = await dao.getAll();
    setConflicts(all);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = useCallback(async (conflictId: string, resolution: 'local' | 'remote' | any) => {
    if (!db) return;
    
    const conflictDao = new ConflictDAO(db);
    const queueDao = new QueueDAO(db);
    
    const conflict = await conflictDao.getById(conflictId);
    if (!conflict) return;

    let finalPayload: any;
    if (resolution === 'local') {
      finalPayload = JSON.parse(conflict.local_json);
    } else if (resolution === 'remote') {
      finalPayload = JSON.parse(conflict.remote_json);
    } else {
      finalPayload = resolution;
    }

    const idempotencyKey = generateIdempotencyKey(
      'update',
      'node',
      conflict.node_id,
      0,
      finalPayload
    );

    await queueDao.enqueue({
      id: idempotencyKey,
      op: 'update',
      target_type: 'node',
      target_id: conflict.node_id,
      payload_json: JSON.stringify(finalPayload),
      base_version: 0,
      next_attempt_at: Date.now(),
      status: 'pending',
    });

    await conflictDao.delete(conflictId);
    await load();
  }, [db, load]);

  const defer = useCallback(async (conflictId: string) => {
    if (!db) return;
    const dao = new ConflictDAO(db);
    await dao.delete(conflictId);
    await load();
  }, [db, load]);

  return {
    conflicts,
    loading,
    refresh: load,
    resolve,
    defer,
  };
}
