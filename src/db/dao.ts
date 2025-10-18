import * as SQLite from 'expo-sqlite';
import {
  QueueItem,
  Conflict,
  Revision,
  Cursor,
  KV,
  Log,
  Orchestration,
} from './schema';

export class QueueDAO {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async enqueue(item: Omit<QueueItem, 'created_at' | 'retries'>): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO queue 
       (id, op, target_type, target_id, payload_json, base_version, next_attempt_at, status, retries, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        item.id,
        item.op,
        item.target_type,
        item.target_id,
        item.payload_json,
        item.base_version,
        item.next_attempt_at,
        item.status,
        Date.now(),
      ]
    );
  }

  async getPending(limit: number = 10): Promise<QueueItem[]> {
    const now = Date.now();
    const result = await this.db.getAllAsync<QueueItem>(
      `SELECT * FROM queue 
       WHERE status IN ('pending', 'retrying') 
       AND next_attempt_at <= ? 
       ORDER BY next_attempt_at ASC 
       LIMIT ?`,
      [now, limit]
    );
    return result;
  }

  async updateStatus(
    id: string,
    status: QueueItem['status'],
    nextAttempt?: number
  ): Promise<void> {
    if (nextAttempt !== undefined) {
      await this.db.runAsync(
        'UPDATE queue SET status = ?, next_attempt_at = ?, retries = retries + 1 WHERE id = ?',
        [status, nextAttempt, id]
      );
    } else {
      await this.db.runAsync('UPDATE queue SET status = ? WHERE id = ?', [status, id]);
    }
  }

  async getAll(): Promise<QueueItem[]> {
    return this.db.getAllAsync<QueueItem>('SELECT * FROM queue ORDER BY created_at DESC');
  }

  async getById(id: string): Promise<QueueItem | null> {
    const result = await this.db.getFirstAsync<QueueItem>('SELECT * FROM queue WHERE id = ?', [id]);
    return result || null;
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM queue WHERE id = ?', [id]);
  }

  async clearDone(): Promise<void> {
    await this.db.runAsync('DELETE FROM queue WHERE status = ?', ['done']);
  }
}

export class ConflictDAO {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async create(conflict: Omit<Conflict, 'created_at'>): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO conflicts 
       (id, project_id, node_id, base_json, remote_json, local_json, policy, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conflict.id,
        conflict.project_id,
        conflict.node_id,
        conflict.base_json,
        conflict.remote_json,
        conflict.local_json,
        conflict.policy,
        Date.now(),
      ]
    );
  }

  async getAll(): Promise<Conflict[]> {
    return this.db.getAllAsync<Conflict>('SELECT * FROM conflicts ORDER BY created_at DESC');
  }

  async getByProject(projectId: string): Promise<Conflict[]> {
    return this.db.getAllAsync<Conflict>(
      'SELECT * FROM conflicts WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
  }

  async getById(id: string): Promise<Conflict | null> {
    const result = await this.db.getFirstAsync<Conflict>(
      'SELECT * FROM conflicts WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM conflicts WHERE id = ?', [id]);
  }
}

export class RevisionDAO {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async create(revision: Omit<Revision, 'created_at'>): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO revisions 
       (entity_type, entity_id, version, patch_json, actor, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        revision.entity_type,
        revision.entity_id,
        revision.version,
        revision.patch_json,
        revision.actor,
        Date.now(),
      ]
    );
  }

  async getHistory(entityType: string, entityId: string): Promise<Revision[]> {
    return this.db.getAllAsync<Revision>(
      'SELECT * FROM revisions WHERE entity_type = ? AND entity_id = ? ORDER BY version DESC',
      [entityType, entityId]
    );
  }

  async getLatestVersion(entityType: string, entityId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) as version FROM revisions WHERE entity_type = ? AND entity_id = ?',
      [entityType, entityId]
    );
    return result?.version ?? 0;
  }
}

export class CursorDAO {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async set(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO cursors (key, value, updated_at) VALUES (?, ?, ?)',
      [key, value, Date.now()]
    );
  }

  async get(key: string): Promise<string | null> {
    const result = await this.db.getFirstAsync<Cursor>('SELECT * FROM cursors WHERE key = ?', [
      key,
    ]);
    return result?.value ?? null;
  }

  async delete(key: string): Promise<void> {
    await this.db.runAsync('DELETE FROM cursors WHERE key = ?', [key]);
  }
}

export class KVDAO {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async set(key: string, value: string): Promise<void> {
    await this.db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value]);
  }

  async get(key: string): Promise<string | null> {
    const result = await this.db.getFirstAsync<KV>('SELECT * FROM kv WHERE key = ?', [key]);
    return result?.value ?? null;
  }

  async delete(key: string): Promise<void> {
    await this.db.runAsync('DELETE FROM kv WHERE key = ?', [key]);
  }
}

export class LogDAO {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async add(log: Omit<Log, 'id' | 'ts'>): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await this.db.runAsync(
      'INSERT INTO logs (id, level, message, meta_json, ts) VALUES (?, ?, ?, ?, ?)',
      [id, log.level, log.message, log.meta_json, Date.now()]
    );
  }

  async getRecent(limit: number = 1000): Promise<Log[]> {
    return this.db.getAllAsync<Log>('SELECT * FROM logs ORDER BY ts DESC LIMIT ?', [limit]);
  }

  async clear(): Promise<void> {
    await this.db.runAsync('DELETE FROM logs');
  }
}

export class OrchestrationDAO {
  constructor(private db: SQLite.SQLiteDatabase) {}

  async create(orch: Omit<Orchestration, 'started_at' | 'finished_at'>): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO orchestrations 
       (run_id, project_id, blueprint_id, consensus, votes_json, critiques_json, status, started_at, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        orch.run_id,
        orch.project_id,
        orch.blueprint_id,
        orch.consensus,
        orch.votes_json,
        orch.critiques_json,
        orch.status,
        Date.now(),
      ]
    );
  }

  async update(runId: string, updates: Partial<Orchestration>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.consensus !== undefined) {
      fields.push('consensus = ?');
      values.push(updates.consensus);
    }
    if (updates.votes_json !== undefined) {
      fields.push('votes_json = ?');
      values.push(updates.votes_json);
    }
    if (updates.critiques_json !== undefined) {
      fields.push('critiques_json = ?');
      values.push(updates.critiques_json);
    }
    if (updates.finished_at !== undefined) {
      fields.push('finished_at = ?');
      values.push(updates.finished_at);
    }

    if (fields.length > 0) {
      values.push(runId);
      await this.db.runAsync(`UPDATE orchestrations SET ${fields.join(', ')} WHERE run_id = ?`, values);
    }
  }

  async getByProject(projectId: string): Promise<Orchestration[]> {
    return this.db.getAllAsync<Orchestration>(
      'SELECT * FROM orchestrations WHERE project_id = ? ORDER BY started_at DESC',
      [projectId]
    );
  }

  async getById(runId: string): Promise<Orchestration | null> {
    const result = await this.db.getFirstAsync<Orchestration>(
      'SELECT * FROM orchestrations WHERE run_id = ?',
      [runId]
    );
    return result || null;
  }

  async getAll(limit: number = 50): Promise<Orchestration[]> {
    return this.db.getAllAsync<Orchestration>(
      'SELECT * FROM orchestrations ORDER BY started_at DESC LIMIT ?',
      [limit]
    );
  }
}
