import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './pool';

interface Migration {
  id: number;
  name: string;
  applied_at: Date;
}

async function createMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
  const result = await query<Migration>('SELECT name FROM schema_migrations ORDER BY id');
  return result.rows.map(row => row.name);
}

async function applyMigration(name: string, sql: string) {
  console.log(`[Migration] Applying ${name}...`);
  
  try {
    await query('BEGIN');
    await query(sql);
    await query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
    await query('COMMIT');
    
    console.log(`[Migration] ✓ ${name} applied successfully`);
  } catch (error) {
    await query('ROLLBACK');
    console.error(`[Migration] ✗ ${name} failed:`, error);
    throw error;
  }
}

export async function runMigrations() {
  console.log('[Migration] Starting database migrations...');
  
  try {
    await createMigrationsTable();
    
    const appliedMigrations = await getAppliedMigrations();
    console.log(`[Migration] ${appliedMigrations.length} migrations already applied`);
    
    const migrationsDir = join(__dirname, 'migrations');
    const migrations = [
      '001_initial_schema.sql',
    ];
    
    let newMigrationsCount = 0;
    
    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration)) {
        const sql = readFileSync(join(migrationsDir, migration), 'utf-8');
        await applyMigration(migration, sql);
        newMigrationsCount++;
      }
    }
    
    if (newMigrationsCount === 0) {
      console.log('[Migration] Database is up to date');
    } else {
      console.log(`[Migration] ✓ ${newMigrationsCount} new migrations applied`);
    }
    
    return { success: true, newMigrations: newMigrationsCount };
  } catch (error) {
    console.error('[Migration] Failed:', error);
    throw error;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Fatal error:', error);
      process.exit(1);
    });
}
