import * as SQLite from 'expo-sqlite';

export interface QueueItem {
  id: string;
  op: string;
  target_type: string;
  target_id: string;
  payload_json: string;
  base_version: number;
  retries: number;
  next_attempt_at: number;
  status: 'pending' | 'retrying' | 'poison' | 'done';
  created_at: number;
}

export interface Conflict {
  id: string;
  project_id: string;
  node_id: string;
  base_json: string;
  remote_json: string;
  local_json: string;
  policy: string;
  created_at: number;
}

export interface Revision {
  entity_type: string;
  entity_id: string;
  version: number;
  patch_json: string;
  actor: string;
  created_at: number;
}

export interface Cursor {
  key: string;
  value: string;
  updated_at: number;
}

export interface KV {
  key: string;
  value: string;
}

export interface Log {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta_json: string;
  ts: number;
}

export interface Orchestration {
  run_id: string;
  project_id: string;
  blueprint_id: string;
  consensus: number;
  votes_json: string;
  critiques_json: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: number;
  finished_at: number | null;
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS queue (
    id TEXT PRIMARY KEY,
    op TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    base_version INTEGER NOT NULL,
    retries INTEGER DEFAULT 0,
    next_attempt_at INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );`,
  
  `CREATE INDEX IF NOT EXISTS idx_queue_status_attempt 
   ON queue(status, next_attempt_at);`,

  `CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    base_json TEXT NOT NULL,
    remote_json TEXT NOT NULL,
    local_json TEXT NOT NULL,
    policy TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`,
  
  `CREATE INDEX IF NOT EXISTS idx_conflicts_project 
   ON conflicts(project_id);`,

  `CREATE TABLE IF NOT EXISTS revisions (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    patch_json TEXT NOT NULL,
    actor TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(entity_type, entity_id, version)
  );`,
  
  `CREATE INDEX IF NOT EXISTS idx_revisions_entity 
   ON revisions(entity_type, entity_id);`,

  `CREATE TABLE IF NOT EXISTS cursors (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    meta_json TEXT NOT NULL,
    ts INTEGER NOT NULL
  );`,
  
  `CREATE INDEX IF NOT EXISTS idx_logs_ts ON logs(ts DESC);`,

  `CREATE TABLE IF NOT EXISTS orchestrations (
    run_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    blueprint_id TEXT NOT NULL,
    consensus REAL NOT NULL,
    votes_json TEXT NOT NULL,
    critiques_json TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at INTEGER NOT NULL,
    finished_at INTEGER
  );`,
  
  `CREATE INDEX IF NOT EXISTS idx_orchestrations_project 
   ON orchestrations(project_id, started_at DESC);`,
];

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('gnidoc.db');
  
  console.log('[DB] Running migrations...');
  for (const migration of MIGRATIONS) {
    await db.execAsync(migration);
  }
  console.log('[DB] Migrations complete');
  
  return db;
}

export async function clearOldLogs(db: SQLite.SQLiteDatabase, keepDays: number = 7): Promise<void> {
  const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
  await db.runAsync('DELETE FROM logs WHERE ts < ?', [cutoff]);
}
