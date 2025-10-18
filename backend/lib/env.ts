import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().pipe(z.coerce.number()).default('8787'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SECRETS_ENC_KEY: z.string(),
  EXPO_PUBLIC_API_URL: z.string().url().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
  GOOGLE_WEB_CLIENT_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', JSON.stringify(error.format(), null, 2));
      throw new Error('Environment validation failed. Check your .env file.');
    }
    throw error;
  }
}

export const ENV = getEnv();
