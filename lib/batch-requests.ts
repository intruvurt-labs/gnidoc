type BatchRequest<T> = {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  key: string;
};

class RequestBatcher<T> {
  private queue: Map<string, BatchRequest<T>[]> = new Map();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly batchDelay: number;
  private readonly maxBatchSize: number;

  constructor(batchDelay: number = 50, maxBatchSize: number = 10) {
    this.batchDelay = batchDelay;
    this.maxBatchSize = maxBatchSize;
  }

  add(key: string, executor: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const existing = this.queue.get(key);
      
      if (existing) {
        existing.push({ resolve, reject, key });
        return;
      }

      this.queue.set(key, [{ resolve, reject, key }]);

      if (this.queue.size >= this.maxBatchSize) {
        this.flush();
      } else {
        this.scheduleFlush();
      }
    });
  }

  private scheduleFlush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  private async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const currentQueue = new Map(this.queue);
    this.queue.clear();

    for (const [key, requests] of currentQueue) {
      console.log(`[RequestBatcher] Processing batch for key: ${key}, size: ${requests.length}`);
      
      try {
        const result = await this.executeBatch(key);
        requests.forEach(req => req.resolve(result));
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Batch request failed');
        requests.forEach(req => req.reject(err));
      }
    }
  }

  protected async executeBatch(key: string): Promise<T> {
    throw new Error('executeBatch must be implemented by subclass');
  }
}

export class AsyncStorageBatcher extends RequestBatcher<string | null> {
  protected async executeBatch(key: string): Promise<string | null> {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
    return AsyncStorage.getItem(key);
  }
}

export class DeduplicatedRequestCache<T> {
  private cache: Map<string, Promise<T>> = new Map();
  private ttl: number;

  constructor(ttl: number = 5000) {
    this.ttl = ttl;
  }

  async get(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached) {
      console.log(`[DeduplicatedCache] Cache hit for key: ${key}`);
      return cached;
    }

    console.log(`[DeduplicatedCache] Cache miss for key: ${key}, fetching...`);
    const promise = fetcher();
    this.cache.set(key, promise);

    setTimeout(() => {
      this.cache.delete(key);
      console.log(`[DeduplicatedCache] Expired cache for key: ${key}`);
    }, this.ttl);

    try {
      const result = await promise;
      return result;
    } catch (error) {
      this.cache.delete(key);
      throw error;
    }
  }

  clear(): void {
    this.cache.clear();
    console.log('[DeduplicatedCache] Cache cleared');
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

export const storageBatcher = new AsyncStorageBatcher(100, 20);
export const requestCache = new DeduplicatedRequestCache(10000);
