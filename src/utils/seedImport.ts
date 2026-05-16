import { sqliteAdapter } from '../storage/sqlite';
import { MetricEntry, DataSource, MetricType } from '../types';

interface SeedEntry {
  metric_type: MetricType;
  timestamp: string;
  source: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  value?: number;
  unit?: string;
  fasting?: boolean;
  notes?: string;
}

function toIso(ts: string): string {
  // Seed timestamps are like "2023-09-07T05:52:00" (no timezone).
  // Treat them as local time and normalize to ISO so dedupe checks line up
  // with how the rest of the app stores timestamps.
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toISOString();
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

export async function importSeedData(): Promise<ImportResult> {
  // Metro bundles JSON at build time via require.
  const seed: SeedEntry[] = require('../../assets/seed-sridhar.json');

  const toInsert: Omit<MetricEntry, 'id'>[] = [];
  let skipped = 0;

  for (const raw of seed) {
    const timestamp = toIso(raw.timestamp);
    const exists = await sqliteAdapter.entryExists(raw.metric_type, timestamp);
    if (exists) {
      skipped++;
      continue;
    }
    const entry: Omit<MetricEntry, 'id'> = {
      metric_type: raw.metric_type,
      timestamp,
      source: (raw.source as DataSource) ?? 'manual',
    };
    if (raw.systolic != null) entry.systolic = raw.systolic;
    if (raw.diastolic != null) entry.diastolic = raw.diastolic;
    if (raw.pulse != null) entry.pulse = raw.pulse;
    if (raw.value != null) entry.value = raw.value;
    if (raw.unit != null) entry.unit = raw.unit;
    if (raw.fasting != null) entry.fasting = raw.fasting;
    if (raw.notes != null) entry.notes = raw.notes;
    toInsert.push(entry);
  }

  const imported = await sqliteAdapter.bulkAdd(toInsert);
  return { imported, skipped };
}
