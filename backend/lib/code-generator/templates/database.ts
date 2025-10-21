export interface DatabaseSchema {
  tables: DatabaseTable[];
  relations: DatabaseRelation[];
  indexes: DatabaseIndex[];
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable?: boolean;
  unique?: boolean;
  default?: string;
  primary?: boolean;
}

export interface DatabaseRelation {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  foreignKey: string;
}

export interface DatabaseIndex {
  table: string;
  columns: string[];
  unique?: boolean;
}

export function generatePrismaSchema(schema: DatabaseSchema): string {
  let output = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

  for (const table of schema.tables) {
    output += `model ${table.name} {\n`;
    
    for (const col of table.columns) {
      output += `  ${col.name} ${col.type}`;
      if (col.primary) output += ' @id @default(auto()) @db.Integer';
      if (col.unique) output += ' @unique';
      if (col.default) output += ` @default(${col.default})`;
      if (!col.nullable) output += '';
      else output += '?';
      output += '\n';
    }
    
    output += '}\n\n';
  }

  return output;
}

export function generateMigrationSQL(schema: DatabaseSchema): string {
  let sql = `-- Migration: Initial Schema
-- Generated: ${new Date().toISOString()}

`;

  for (const table of schema.tables) {
    sql += `CREATE TABLE IF NOT EXISTS "${table.name}" (\n`;
    const colDefs = table.columns.map(col => {
      let def = `  "${col.name}" ${col.type.toUpperCase()}`;
      if (col.primary) def += ' PRIMARY KEY';
      if (col.unique && !col.primary) def += ' UNIQUE';
      if (!col.nullable) def += ' NOT NULL';
      if (col.default) def += ` DEFAULT ${col.default}`;
      return def;
    });
    sql += colDefs.join(',\n');
    sql += '\n);\n\n';
  }

  for (const idx of schema.indexes) {
    const uniqueStr = idx.unique ? 'UNIQUE ' : '';
    const idxName = `idx_${idx.table}_${idx.columns.join('_')}`;
    sql += `CREATE ${uniqueStr}INDEX IF NOT EXISTS "${idxName}" ON "${idx.table}" (${idx.columns.map(c => `"${c}"`).join(', ')});\n`;
  }

  return sql;
}

export const commonSchemas = {
  auth: {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'Int', primary: true },
          { name: 'email', type: 'String', unique: true },
          { name: 'password_hash', type: 'String' },
          { name: 'name', type: 'String', nullable: true },
          { name: 'email_verified', type: 'Boolean', default: 'false' },
          { name: 'created_at', type: 'DateTime', default: 'now()' },
          { name: 'updated_at', type: 'DateTime', default: 'now()' },
        ],
      },
      {
        name: 'sessions',
        columns: [
          { name: 'id', type: 'String', primary: true },
          { name: 'user_id', type: 'Int' },
          { name: 'expires_at', type: 'DateTime' },
          { name: 'created_at', type: 'DateTime', default: 'now()' },
        ],
      },
    ],
    relations: [
      { from: 'sessions', to: 'users', type: 'many-to-one' as const, foreignKey: 'user_id' },
    ],
    indexes: [
      { table: 'users', columns: ['email'] },
      { table: 'sessions', columns: ['user_id'] },
    ],
  },

  payments: {
    tables: [
      {
        name: 'subscriptions',
        columns: [
          { name: 'id', type: 'Int', primary: true },
          { name: 'user_id', type: 'Int' },
          { name: 'stripe_subscription_id', type: 'String', unique: true },
          { name: 'status', type: 'String' },
          { name: 'plan', type: 'String' },
          { name: 'current_period_end', type: 'DateTime' },
          { name: 'created_at', type: 'DateTime', default: 'now()' },
        ],
      },
      {
        name: 'payments',
        columns: [
          { name: 'id', type: 'Int', primary: true },
          { name: 'user_id', type: 'Int' },
          { name: 'stripe_payment_id', type: 'String', unique: true },
          { name: 'amount', type: 'Int' },
          { name: 'currency', type: 'String' },
          { name: 'status', type: 'String' },
          { name: 'created_at', type: 'DateTime', default: 'now()' },
        ],
      },
    ],
    relations: [
      { from: 'subscriptions', to: 'users', type: 'many-to-one' as const, foreignKey: 'user_id' },
      { from: 'payments', to: 'users', type: 'many-to-one' as const, foreignKey: 'user_id' },
    ],
    indexes: [
      { table: 'subscriptions', columns: ['user_id'] },
      { table: 'subscriptions', columns: ['stripe_subscription_id'], unique: true },
      { table: 'payments', columns: ['user_id'] },
      { table: 'payments', columns: ['stripe_payment_id'], unique: true },
    ],
  },
};
