import { createHash } from 'crypto';

export function generateIdempotencyKey(
  op: string,
  targetType: string,
  targetId: string,
  baseVersion: number,
  payload: any
): string {
  const data = JSON.stringify({ op, targetType, targetId, baseVersion, payload });
  return createHash('sha256').update(data).digest('hex');
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
