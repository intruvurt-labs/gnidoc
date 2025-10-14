import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageOperation {
  key: string;
  value: string;
  type: 'set' | 'remove';
}

class StorageManager {
  private queue: StorageOperation[] = [];
  private isProcessing: boolean = false;
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY = 100;

  async setItem(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, value, type: 'set' });
      this.scheduleBatch();
      resolve();
    });
  }

  async removeItem(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, value: '', type: 'remove' });
      this.scheduleBatch();
      resolve();
    });
  }

  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async multiGet(keys: string[]): Promise<readonly [string, string | null][]> {
    return AsyncStorage.multiGet(keys);
  }

  private scheduleBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const operations = [...this.queue];
    this.queue = [];

    try {
      const setOperations: [string, string][] = [];
      const removeKeys: string[] = [];

      operations.forEach(op => {
        if (op.type === 'set') {
          setOperations.push([op.key, op.value]);
        } else {
          removeKeys.push(op.key);
        }
      });

      const promises: Promise<void>[] = [];

      if (setOperations.length > 0) {
        promises.push(AsyncStorage.multiSet(setOperations));
      }

      if (removeKeys.length > 0) {
        promises.push(AsyncStorage.multiRemove(removeKeys));
      }

      await Promise.all(promises);
      console.log(`[StorageManager] Batch processed: ${setOperations.length} sets, ${removeKeys.length} removes`);
    } catch (error) {
      console.error('[StorageManager] Batch processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.processBatch();
  }
}

export const storage = new StorageManager();

export async function batchSetItems(items: Record<string, any>): Promise<void> {
  const entries: [string, string][] = Object.entries(items).map(([key, value]) => [
    key,
    typeof value === 'string' ? value : JSON.stringify(value),
  ]);
  
  await AsyncStorage.multiSet(entries);
  console.log(`[Storage] Batch set ${entries.length} items`);
}

export async function batchGetItems(keys: string[]): Promise<Record<string, any> | null> {
  try {
    const results = await AsyncStorage.multiGet(keys);
    const parsed: Record<string, any> = {};
    let hasData = false;
    
    results.forEach(([key, value]) => {
      if (value) {
        hasData = true;
        try {
          parsed[key] = JSON.parse(value);
        } catch {
          parsed[key] = value;
        }
      }
    });
    
    return hasData ? parsed : null;
  } catch (error) {
    console.error('[Storage] batchGetItems failed:', error);
    return null;
  }
}
