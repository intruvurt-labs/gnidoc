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

export const listTablesProcedure = protectedProcedure
  .input(connectionSchema)
  .query(async ({ input, ctx }) => {
    const userId = ctx.token;

    console.log(`[Database] User ${userId} listing tables for ${input.name}`);

    try {
      const { Pool } = await import('pg');
      
      const pool = new Pool({
        host: input.host,
        port: input.port,
        database: input.database,
        user: input.username,
        password: input.password,
        ssl: input.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
        max: 1,
      });

      const query = `
        SELECT 
          table_schema,
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name;
      `;

      const result = await pool.query(query);
      await pool.end();

      console.log(`[Database] Found ${result.rowCount} tables`);

      return {
        tables: result.rows.map((row: any) => ({
          schema: row.table_schema,
          name: row.table_name,
          type: row.table_type,
        })),
      };
    } catch (error) {
      console.error('[Database] Failed to list tables:', error);
      throw new Error('Failed to list tables');
    }
  });
