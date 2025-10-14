import { requestCache } from './dedup-cache';

type BatchedRequest<T> = {
  key: string;
  fetcher: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

class RequestBatcher {
  private queue: BatchedRequest<any>[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly delayMs: number;
  private readonly maxBatchSize: number;

  constructor(delayMs: number = 10, maxBatchSize: number = 50) {
    this.delayMs = delayMs;
    this.maxBatchSize = maxBatchSize;
  }

  async request<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    return requestCache.get(key, () => {
      return new Promise<T>((resolve, reject) => {
        this.queue.push({ key, fetcher, resolve, reject });

        if (this.queue.length >= this.maxBatchSize) {
          this.flush();
        } else if (!this.timer) {
          this.timer = setTimeout(() => this.flush(), this.delayMs);
        }
      });
    });
  }

  private flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch = this.queue.splice(0, this.maxBatchSize);
    if (batch.length === 0) return;

    console.log(`[RequestBatcher] Flushing ${batch.length} requests`);

    batch.forEach(async (req) => {
      try {
        const result = await req.fetcher();
        req.resolve(result);
      } catch (error) {
        req.reject(error instanceof Error ? error : new Error('Request failed'));
      }
    });
  }

  clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }
}

export const requestBatcher = new RequestBatcher(10, 50);

class StorageBatcher {
  private readQueue = new Map<string, {
    resolve: (value: string | null) => void;
    reject: (error: Error) => void;
  }[]>();
  private writeQueue = new Map<string, string>();
  private readTimer: ReturnType<typeof setTimeout> | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly delayMs: number;

  constructor(delayMs: number = 50) {
    this.delayMs = delayMs;
  }

  async get(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.readQueue.has(key)) {
        this.readQueue.set(key, []);
      }
      this.readQueue.get(key)!.push({ resolve, reject });

      if (!this.readTimer) {
        this.readTimer = setTimeout(() => this.flushReads(), this.delayMs);
      }
    });
  }

  async set(key: string, value: string): Promise<void> {
    this.writeQueue.set(key, value);

    if (!this.writeTimer) {
      this.writeTimer = setTimeout(() => this.flushWrites(), this.delayMs);
    }
  }

  private async flushReads() {
    if (this.readTimer) {
      clearTimeout(this.readTimer);
      this.readTimer = null;
    }

    const keys = Array.from(this.readQueue.keys());
    if (keys.length === 0) return;

    console.log(`[StorageBatcher] Reading ${keys.length} keys`);

    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const results = new Map(pairs);

      for (const [key, callbacks] of this.readQueue.entries()) {
        const value = results.get(key) ?? null;
        callbacks.forEach(cb => cb.resolve(value));
      }
    } catch (error) {
      for (const callbacks of this.readQueue.values()) {
        callbacks.forEach(cb => cb.reject(error instanceof Error ? error : new Error('Storage read failed')));
      }
    }

    this.readQueue.clear();
  }

  private async flushWrites() {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }

    const entries = Array.from(this.writeQueue.entries());
    if (entries.length === 0) return;

    console.log(`[StorageBatcher] Writing ${entries.length} keys`);

    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

    try {
      await AsyncStorage.multiSet(entries);
    } catch (error) {
      console.error('[StorageBatcher] Write failed:', error);
    }

    this.writeQueue.clear();
  }

  clear() {
    if (this.readTimer) {
      clearTimeout(this.readTimer);
      this.readTimer = null;
    }
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    this.readQueue.clear();
    this.writeQueue.clear();
  }
}

export const storageBatcher = new StorageBatcher(50);
