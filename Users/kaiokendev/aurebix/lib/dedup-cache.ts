export class DeduplicatedRequestCache<T> {
  private entries = new Map<string, {
    promise?: Promise<T>;
    value?: T;
    expiry: number;
    timer?: ReturnType<typeof setTimeout>;
  }>();

  constructor(private ttlMs: number = 5000) {}

  async get(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (entry && entry.value !== undefined && entry.expiry > now) {
      return entry.value;
    }

    if (entry?.promise) {
      return entry.promise;
    }

    const promise = fetcher();
    const expiry = now + this.ttlMs;

    this.setEntry(key, { promise, expiry });

    try {
      const result = await promise;
      this.setEntry(key, { value: result, expiry });
      return result;
    } catch (err) {
      this.delete(key);
      throw err instanceof Error ? err : new Error('Fetch failed');
    }
  }

  clear(): void {
    for (const [, e] of this.entries) {
      if (e.timer) clearTimeout(e.timer);
    }
    this.entries.clear();
  }

  has(key: string): boolean {
    const e = this.entries.get(key);
    return !!e && (e.promise !== undefined || (e.value !== undefined && e.expiry > Date.now()));
  }

  private setEntry(key: string, data: Partial<{ promise: Promise<T>; value: T; expiry: number }>) {
    const prev = this.entries.get(key);
    const next = {
      promise: data.promise ?? prev?.promise,
      value: data.value ?? prev?.value,
      expiry: data.expiry ?? prev?.expiry ?? (Date.now() + this.ttlMs),
      timer: prev?.timer
    };

    if (next.timer) clearTimeout(next.timer);
    const ttlLeft = Math.max(0, next.expiry - Date.now());
    next.timer = setTimeout(() => this.delete(key), ttlLeft);

    this.entries.set(key, next);
  }

  private delete(key: string) {
    const e = this.entries.get(key);
    if (e?.timer) clearTimeout(e.timer);
    this.entries.delete(key);
  }
}

export const requestCache = new DeduplicatedRequestCache<any>(10_000);
