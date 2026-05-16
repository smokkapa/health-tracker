import { SQLiteDatabase } from 'expo-sqlite';
import { MetricEntry, MetricType, DateRange } from '../types';
import { LEGACY_OWNER_EMAIL } from '../auth/constants';

// DB row shape: fasting stored as 0/1 integer.
interface MetricEntryRow {
  id: string;
  metric_type: MetricType;
  timestamp: string;
  source: MetricEntry['source'];
  systolic: number | null;
  diastolic: number | null;
  value: number | null;
  pulse: number | null;
  body_fat: number | null;
  fasting: number | null;
  unit: string | null;
  notes: string | null;
}

function rowToEntry(row: MetricEntryRow): MetricEntry {
  const entry: MetricEntry = {
    id: row.id,
    metric_type: row.metric_type,
    timestamp: row.timestamp,
    source: row.source,
  };
  if (row.systolic != null) entry.systolic = row.systolic;
  if (row.diastolic != null) entry.diastolic = row.diastolic;
  if (row.value != null) entry.value = row.value;
  if (row.pulse != null) entry.pulse = row.pulse;
  if (row.body_fat != null) entry.body_fat = row.body_fat;
  if (row.fasting != null) entry.fasting = row.fasting === 1;
  if (row.unit != null) entry.unit = row.unit;
  if (row.notes != null) entry.notes = row.notes;
  return entry;
}

export async function queryEntries(
  db: SQLiteDatabase,
  userId: string,
  filter?: { metric_type?: MetricType; dateRange?: DateRange }
): Promise<MetricEntry[]> {
  let sql = 'SELECT * FROM metric_entries';
  const params: (string | number)[] = [];
  const conditions: string[] = ['user_id = ?'];
  params.push(userId);

  if (filter?.metric_type) {
    conditions.push('metric_type = ?');
    params.push(filter.metric_type);
  }

  if (filter?.dateRange) {
    conditions.push('timestamp >= ? AND timestamp <= ?');
    params.push(filter.dateRange.start.toISOString());
    params.push(filter.dateRange.end.toISOString());
  }

  sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY timestamp DESC';

  const rows = await db.getAllAsync<MetricEntryRow>(sql, params);
  return rows.map(rowToEntry);
}

export async function insertEntry(
  db: SQLiteDatabase,
  userId: string,
  entry: MetricEntry
): Promise<void> {
  await db.runAsync(
    `INSERT INTO metric_entries (id, metric_type, timestamp, source, systolic, diastolic, value, pulse, body_fat, fasting, unit, notes, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.metric_type,
      entry.timestamp,
      entry.source,
      entry.systolic ?? null,
      entry.diastolic ?? null,
      entry.value ?? null,
      entry.pulse ?? null,
      entry.body_fat ?? null,
      entry.fasting == null ? null : entry.fasting ? 1 : 0,
      entry.unit ?? null,
      entry.notes ?? null,
      userId,
    ]
  );
}

export async function deleteEntryById(
  db: SQLiteDatabase,
  userId: string,
  id: string
): Promise<void> {
  await db.runAsync(
    'DELETE FROM metric_entries WHERE id = ? AND user_id = ?',
    [id, userId]
  );
}

export async function deleteAllForUser(
  db: SQLiteDatabase,
  userId: string
): Promise<number> {
  const result = await db.runAsync(
    'DELETE FROM metric_entries WHERE user_id = ?',
    [userId]
  );
  return result.changes ?? 0;
}

export async function queryLatestEntry(
  db: SQLiteDatabase,
  userId: string,
  metric_type: MetricType
): Promise<MetricEntry | null> {
  const row = await db.getFirstAsync<MetricEntryRow>(
    'SELECT * FROM metric_entries WHERE metric_type = ? AND user_id = ? ORDER BY timestamp DESC LIMIT 1',
    [metric_type, userId]
  );
  return row ? rowToEntry(row) : null;
}

export async function entryExists(
  db: SQLiteDatabase,
  userId: string,
  metric_type: MetricType,
  timestamp: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM metric_entries WHERE metric_type = ? AND timestamp = ? AND user_id = ? LIMIT 1',
    [metric_type, timestamp, userId]
  );
  return !!row;
}

/**
 * One-time data fix: assigns every metric_entries row with NULL user_id to the
 * provided userId, but ONLY if the caller's email matches LEGACY_OWNER_EMAIL.
 * Returns the number of rows reassigned (0 if email doesn't match or no orphans).
 */
export async function claimOrphanedEntriesForOwner(
  db: SQLiteDatabase,
  userId: string,
  email: string
): Promise<number> {
  if (email.trim().toLowerCase() !== LEGACY_OWNER_EMAIL) return 0;
  const result = await db.runAsync(
    'UPDATE metric_entries SET user_id = ? WHERE user_id IS NULL',
    [userId]
  );
  return result.changes ?? 0;
}
