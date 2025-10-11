import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

const connectionSchema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean(),
});

export const testConnectionProcedure = protectedProcedure
  .input(connectionSchema)
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.token;

    console.log(`[Database] User ${userId} testing connection to ${input.host}:${input.port}`);

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

      await pool.query('SELECT 1');
      await pool.end();

      console.log(`[Database] Connection test successful`);

      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error) {
      console.error('[Database] Connection test failed:', error);
      
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }
      
      return {
        success: false,
        message: 'Connection failed',
      };
    }
  });
