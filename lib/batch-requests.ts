// batcher.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

type BatchRequest<T> = {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  key: string;
};

export abstract class KeyedRequestBatcher<T> {
  private queue: Map<string, BatchRequest<T>[]> = new Map();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly batchDelay: number = 50,
    private readonly maxBatchSize: number = 10
  ) {}

  /** Public API */
  get(key: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const list = this.queue.get(key);
      const entry = { resolve, reject, key };
      if (list) {
        list.push(entry);
      } else {
        this.queue.set(key, [entry]);
      }

      if (this.queue.size >= this.maxBatchSize) {
        this.flush(); // flush immediately when too many unique keys queued
      } else {
        this.scheduleFlush();
      }
    });
  }

  /** Subclasses implement a true batched call */
  protected abstract executeBatch(keys: string[]): Promise<Map<string, T>>;

  private scheduleFlush(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.flush(), this.batchDelay);
  }

  private async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.queue.size === 0) return;

    // Drain up to maxBatchSize unique keys for this flush
    const keys: string[] = [];
    const batchRequests = new Map<string, BatchRequest<T>[]>();
    for (const [key, requests] of this.queue) {
      keys.push(key);
      batchRequests.set(key, requests);
      this.queue.delete(key);
      if (keys.length >= this.maxBatchSize) break;
    }

    try {
      const results = await this.executeBatch(keys); // Map<key, value>
      for (const key of keys) {
        const value = results.get(key);
        const reqs = batchRequests.get(key) || [];
        if (value !== undefined) {
          reqs.forEach(r => r.resolve(value));
        } else {
          const err = new Error(`Missing value for key "${key}" in batched result`);
          reqs.forEach(r => r.reject(err));
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Batch request failed');
      for (const key of keys) {
        (batchRequests.get(key) || []).forEach(r => r.reject(err));
      }
    }

    // If there are still items left (more than maxBatchSize were queued), schedule another flush tick quickly
    if (this.queue.size > 0) {
      this.scheduleFlush();
    }
  }
}

class StorageBatcher extends KeyedRequestBatcher<string | null> {
  protected async executeBatch(keys: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [key, value] of pairs) {
        results.set(key, value);
      }
    } catch (error) {
      console.error('[StorageBatcher] multiGet failed:', error);
      throw error;
    }
    
    return results;
  }
}

export const storageBatcher = new StorageBatcher(50, 10);
