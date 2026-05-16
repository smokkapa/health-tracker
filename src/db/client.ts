import * as SQLite from 'expo-sqlite';
import {
  CREATE_METRIC_ENTRIES_TABLE,
  CREATE_SCHEMA_VERSION_TABLE,
  CREATE_USERS_TABLE,
  CREATE_HEALTH_PROFILE_TABLE,
  CREATE_INDEXES,
  SCHEMA_VERSION,
  METRIC_ENTRIES_ADDED_COLUMNS,
} from './schema';
import { claimOrphanedEntriesForOwner } from './queries';
import { LEGACY_OWNER_EMAIL } from '../auth/constants';

let db: SQLite.SQLiteDatabase | null = null;

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

async function migrateMetricEntries(database: SQLite.SQLiteDatabase) {
  const cols = await database.getAllAsync<ColumnInfo>(
    'PRAGMA table_info(metric_entries)'
  );
  const existing = new Set(cols.map((c) => c.name));
  for (const { name, ddl } of METRIC_ENTRIES_ADDED_COLUMNS) {
    if (!existing.has(name)) {
      try {
        await database.execAsync(ddl);
      } catch (e) {
        // Idempotent safety net: ignore if already added by a parallel init.
        if (!String(e).includes('duplicate column')) throw e;
      }
    }
  }
}

/**
 * Best-effort claim of orphan metric_entries on app startup. If the legacy
 * owner already exists as a user, attach all NULL-user_id rows to them.
 * If they don't exist yet, this is a no-op — the sign-up/sign-in path will
 * trigger the claim later when they first authenticate.
 */
async function runStartupClaim(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const row = await database.getFirstAsync<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE email = ?',
      [LEGACY_OWNER_EMAIL]
    );
    if (row) {
      await claimOrphanedEntriesForOwner(database, row.id, row.email);
    }
  } catch {
    // Non-fatal — claim will retry on next sign-in.
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('health_tracker.db');

  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(CREATE_SCHEMA_VERSION_TABLE);
  await db.execAsync(CREATE_METRIC_ENTRIES_TABLE);
  await db.execAsync(CREATE_USERS_TABLE);
  await db.execAsync(CREATE_HEALTH_PROFILE_TABLE);

  // Run additive column migrations BEFORE creating indexes — some indexes
  // reference columns added by the migrations (e.g. user_id), and would fail
  // with "no such column" on existing DBs created at an earlier schema version.
  await migrateMetricEntries(db);

  for (const idx of CREATE_INDEXES) {
    await db.execAsync(idx);
  }

  // Best-effort claim of orphan rows for the legacy owner (if registered).
  await runStartupClaim(db);

  // Record schema version (insert latest if not already at HEAD).
  const existing = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );
  if (!existing) {
    await db.runAsync(
      'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
      [SCHEMA_VERSION, new Date().toISOString()]
    );
  } else if (existing.version < SCHEMA_VERSION) {
    await db.runAsync(
      'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
      [SCHEMA_VERSION, new Date().toISOString()]
    );
  }

  return db;
}
