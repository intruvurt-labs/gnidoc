import * as SQLite from 'expo-sqlite';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { QueueDAO, ConflictDAO, CursorDAO, LogDAO } from '../db/dao';
import { restClient } from '../api/client';
import { generateId } from '../utils/idempotency';

const SYNC_TASK_NAME = 'gnidoc-sync';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

export class SyncWorker {
  private queueDao: QueueDAO;
  private conflictDao: ConflictDAO;
  private cursorDao: CursorDAO;
  private logDao: LogDAO;

  constructor(private db: SQLite.SQLiteDatabase) {
    this.queueDao = new QueueDAO(db);
    this.conflictDao = new ConflictDAO(db);
    this.cursorDao = new CursorDAO(db);
    this.logDao = new LogDAO(db);
  }

  async drainQueue(): Promise<void> {
    const pending = await this.queueDao.getPending(10);
    
    await this.logDao.add({
      level: 'info',
      message: `[SyncWorker] Draining queue: ${pending.length} items`,
      meta_json: JSON.stringify({ count: pending.length }),
    });

    for (const item of pending) {
      try {
        const payload = JSON.parse(item.payload_json);
        
        const response = await restClient.syncMutate({
          op: item.op,
          targetType: item.target_type,
          targetId: item.target_id,
          payload,
          baseVersion: item.base_version,
          idempotencyKey: item.id,
        });

        if (response.success) {
          await this.queueDao.updateStatus(item.id, 'done');
          await this.logDao.add({
            level: 'info',
            message: `[SyncWorker] Success: ${item.id}`,
            meta_json: JSON.stringify({ id: item.id }),
          });
        } else if (response.conflict) {
          await this.conflictDao.create({
            id: generateId(),
            project_id: item.target_id,
            node_id: item.target_id,
            base_json: JSON.stringify(response.conflict.base),
            remote_json: JSON.stringify(response.conflict.remote),
            local_json: item.payload_json,
            policy: response.conflict.policy,
          });
          await this.queueDao.updateStatus(item.id, 'poison');
          await this.logDao.add({
            level: 'warn',
            message: `[SyncWorker] Conflict: ${item.id}`,
            meta_json: JSON.stringify({ id: item.id }),
          });
        } else {
          throw new Error(response.error || 'Unknown error');
        }
      } catch (error) {
        const retries = item.retries + 1;
        if (retries >= MAX_RETRIES) {
          await this.queueDao.updateStatus(item.id, 'poison');
          await this.logDao.add({
            level: 'error',
            message: `[SyncWorker] Max retries: ${item.id}`,
            meta_json: JSON.stringify({ id: item.id, error: String(error) }),
          });
        } else {
          const nextAttempt = Date.now() + BASE_DELAY_MS * Math.pow(2, retries);
          await this.queueDao.updateStatus(item.id, 'retrying', nextAttempt);
          await this.logDao.add({
            level: 'warn',
            message: `[SyncWorker] Retry ${retries}: ${item.id}`,
            meta_json: JSON.stringify({ id: item.id, retries, nextAttempt }),
          });
        }
      }
    }
  }

  async pullChanges(projectId?: string): Promise<void> {
    const cursorKey = projectId ? `delta:project:${projectId}` : 'delta:global';
    const cursor = (await this.cursorDao.get(cursorKey)) || '0';

    try {
      const response = await restClient.syncChanges({ since: cursor, projectId });
      
      await this.logDao.add({
        level: 'info',
        message: `[SyncWorker] Pulled changes: ${response.changes.length}`,
        meta_json: JSON.stringify({ count: response.changes.length, cursor: response.cursor }),
      });

      await this.cursorDao.set(cursorKey, response.cursor);
    } catch (error) {
      await this.logDao.add({
        level: 'error',
        message: `[SyncWorker] Pull failed`,
        meta_json: JSON.stringify({ error: String(error) }),
      });
    }
  }

  async runSync(projectId?: string): Promise<void> {
    await this.drainQueue();
    await this.pullChanges(projectId);
  }
}

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const db = await SQLite.openDatabaseAsync('gnidoc.db');
    const worker = new SyncWorker(db);
    await worker.runSync();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background Sync] Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('[Background Sync] Registered');
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME);
  console.log('[Background Sync] Unregistered');
}
