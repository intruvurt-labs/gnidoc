import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

const connectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean(),
});

const tableSchemaInput = z.object({
  connection: connectionSchema,
  schema: z.string(),
  table: z.string(),
});

export const getTableSchemaProcedure = protectedProcedure
  .input(tableSchemaInput)
  .query(async ({ input, ctx }) => {
    const { connection, schema, table } = input;
    const userId = ctx.token;

    console.log(`[Database] User ${userId} fetching schema for ${schema}.${table}`);

    try {
      const { Pool } = await import('pg');
      
      const pool = new Pool({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        user: connection.username,
        password: connection.password,
        ssl: connection.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
        max: 1,
      });

      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;

      const result = await pool.query(query, [schema, table]);
      await pool.end();

      console.log(`[Database] Found ${result.rowCount} columns`);

      return {
        columns: result.rows.map((row: any) => ({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
          maxLength: row.character_maximum_length,
        })),
      };
    } catch (error) {
      console.error('[Database] Failed to fetch table schema:', error);
      throw new Error('Failed to fetch table schema');
    }
  });
