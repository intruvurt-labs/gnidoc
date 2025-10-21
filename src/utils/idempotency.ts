import { sha256 } from 'js-sha256';

export function generateIdempotencyKey(
  op: string,
  targetType: string,
  targetId: string,
  baseVersion: number,
  payload: any
): string {
  const data = JSON.stringify({ op, targetType, targetId, baseVersion, payload });
  return sha256(data);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
