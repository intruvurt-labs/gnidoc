import { TRPCError } from '@trpc/server';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60000, max: 60 }
): Promise<{ success: boolean; remaining: number }> {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { success: true, remaining: config.max - 1 };
  }

  if (record.count >= config.max) {
    return { success: false, remaining: 0 };
  }

  record.count += 1;
  return { success: true, remaining: config.max - record.count };
}

export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupRateLimitStore, 60000);
