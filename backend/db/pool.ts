import { Pool, PoolClient, QueryResultRow } from 'pg';
import { ENV } from '../lib/env';

const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: ENV.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error:', err);
});

pool.on('connect', () => {
  console.log('[DB Pool] New client connected');
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount };
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query<{ ok: number }>('SELECT 1 as ok');
    return result.rows[0]?.ok === 1;
  } catch (error) {
    console.error('[DB Pool] Health check failed:', error);
    return false;
  }
}

export { pool };
