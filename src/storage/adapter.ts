import { MetricEntry, MetricType, DateRange } from '../types';

export interface StorageAdapter {
  setUser(userId: string | null): void;
  getEntries(filter?: { metric_type?: MetricType; dateRange?: DateRange }): Promise<MetricEntry[]>;
  addEntry(entry: Omit<MetricEntry, 'id'>): Promise<MetricEntry>;
  bulkAdd(entries: Omit<MetricEntry, 'id'>[]): Promise<number>;
  deleteEntry(id: string): Promise<void>;
  deleteAll(): Promise<number>;
  getLatestEntry(metric_type: MetricType): Promise<MetricEntry | null>;
  entryExists(metric_type: MetricType, timestamp: string): Promise<boolean>;
}
