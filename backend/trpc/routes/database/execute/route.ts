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

const executeQuerySchema = z.object({
  connection: connectionSchema,
  query: z.string(),
});

export const executeQueryProcedure = protectedProcedure
  .input(executeQuerySchema)
  .mutation(async ({ input, ctx }) => {
    const { connection, query } = input;
    const userId = ctx.token;

    console.log(`[Database] User ${userId} executing query on ${connection.name}`);

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

      const sanitizedQuery = query.trim();
      
      const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE'];
      const upperQuery = sanitizedQuery.toUpperCase();
      const isDangerous = dangerousKeywords.some(keyword => upperQuery.includes(keyword));

      if (isDangerous) {
        console.warn(`[Database] Dangerous query blocked for user ${userId}`);
        throw new Error('Dangerous queries (DROP, DELETE, etc.) are not allowed. Use SELECT queries only.');
      }

      const startTime = Date.now();
      const result = await pool.query(sanitizedQuery);
      const duration = Date.now() - startTime;

      await pool.end();

      console.log(`[Database] Query executed successfully in ${duration}ms, ${result.rowCount} rows`);

      return {
        rows: result.rows,
        fields: result.fields.map((f: any) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
        })),
        rowCount: result.rowCount || 0,
        command: result.command,
        duration,
      };
    } catch (error) {
      console.error('[Database] Query execution failed:', error);
      
      if (error instanceof Error) {
        throw new Error(`Query failed: ${error.message}`);
      }
      throw new Error('Query execution failed');
    }
  });
