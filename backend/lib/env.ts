// backend/lib/env.ts
import { z } from 'zod';

// Helper: optional-but-required-in-prod pattern
const requireInProd = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) => (process.env.NODE_ENV === 'production' ? val : val ?? undefined),
    schema
  );

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // ✅ numbers: coerce + numeric default (NUMBER, not string)
  PORT: z.coerce.number().int().positive().default(3000),

  // Example timeouts & limits
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  MAX_CONCURRENCY: z.coerce.number().int().positive().default(8),

  // ✅ booleans: coerce + boolean default
  DEBUG: z.coerce.boolean().default(false),
  ENABLE_BACKGROUND_JOBS: z.coerce.boolean().default(true),

  // ✅ strings/URLs
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // Provider keys – required in prod, optional in dev
  OPENAI_API_KEY: requireInProd(z.string().min(1)).optional(),
  ANTHROPIC_API_KEY: requireInProd(z.string().min(1)).optional(),
  GOOGLE_API_KEY: requireInProd(z.string().min(1)).optional(),

  // Database/Redis
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').optional(),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required').optional(),
});

export type Env = z.infer<typeof EnvSchema>;

// Feed raw process.env; coerce handles string → number/boolean where needed
export const env: Env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  API_TIMEOUT_MS: process.env.API_TIMEOUT_MS,
  MAX_CONCURRENCY: process.env.MAX_CONCURRENCY,
  DEBUG: process.env.DEBUG,
  ENABLE_BACKGROUND_JOBS: process.env.ENABLE_BACKGROUND_JOBS,
  APP_URL: process.env.APP_URL,
  API_URL: process.env.API_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
});
