import { getDatabase } from '../db/client';
import {
  queryEntries,
  insertEntry,
  deleteEntryById,
  deleteAllForUser,
  queryLatestEntry,
  entryExists,
} from '../db/queries';
import { StorageAdapter } from './adapter';
import { MetricEntry, MetricType, DateRange } from '../types';

function generateId(): string {
  // Simple UUID-like ID without external dependency
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SQLiteStorageAdapter implements StorageAdapter {
  private userId: string | null = null;

  setUser(userId: string | null): void {
    this.userId = userId;
  }

  private requireUser(): string {
    if (!this.userId) {
      throw new Error('No authenticated user — storage adapter requires setUser() first.');
    }
    return this.userId;
  }

  async getEntries(filter?: {
    metric_type?: MetricType;
    dateRange?: DateRange;
  }): Promise<MetricEntry[]> {
    const userId = this.requireUser();
    const db = await getDatabase();
    return queryEntries(db, userId, filter);
  }

  async addEntry(entry: Omit<MetricEntry, 'id'>): Promise<MetricEntry> {
    const userId = this.requireUser();
    const db = await getDatabase();
    const newEntry: MetricEntry = {
      ...entry,
      id: generateId(),
    };
    await insertEntry(db, userId, newEntry);
    return newEntry;
  }

  async bulkAdd(entries: Omit<MetricEntry, 'id'>[]): Promise<number> {
    const userId = this.requireUser();
    const db = await getDatabase();
    let inserted = 0;
    const CHUNK = 200;
    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      await db.withTransactionAsync(async () => {
        for (const e of chunk) {
          const newEntry: MetricEntry = { ...e, id: generateId() };
          await insertEntry(db, userId, newEntry);
          inserted++;
        }
      });
    }
    return inserted;
  }

  async deleteEntry(id: string): Promise<void> {
    const userId = this.requireUser();
    const db = await getDatabase();
    await deleteEntryById(db, userId, id);
  }

  async deleteAll(): Promise<number> {
    const userId = this.requireUser();
    const db = await getDatabase();
    return deleteAllForUser(db, userId);
  }

  async getLatestEntry(metric_type: MetricType): Promise<MetricEntry | null> {
    const userId = this.requireUser();
    const db = await getDatabase();
    return queryLatestEntry(db, userId, metric_type);
  }

  async entryExists(metric_type: MetricType, timestamp: string): Promise<boolean> {
    const userId = this.requireUser();
    const db = await getDatabase();
    return entryExists(db, userId, metric_type, timestamp);
  }
}

export const sqliteAdapter = new SQLiteStorageAdapter();
