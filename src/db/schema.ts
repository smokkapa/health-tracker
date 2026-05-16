export const SCHEMA_VERSION = 6;

export const CREATE_SCHEMA_VERSION_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL,
    applied_at TEXT NOT NULL
  );
`;

export const CREATE_METRIC_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS metric_entries (
    id TEXT PRIMARY KEY NOT NULL,
    metric_type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    systolic REAL,
    diastolic REAL,
    value REAL,
    pulse INTEGER,
    body_fat REAL,
    fasting INTEGER,
    unit TEXT,
    notes TEXT,
    user_id TEXT
  );
`;

export const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

export const CREATE_HEALTH_PROFILE_TABLE = `
  CREATE TABLE IF NOT EXISTS health_profile (
    user_id TEXT PRIMARY KEY,
    date_of_birth TEXT,
    sex TEXT,
    height_cm REAL,
    conditions TEXT,
    medications TEXT,
    family_history TEXT,
    allergies TEXT,
    genetics TEXT,
    notes TEXT,
    updated_at TEXT
  );
`;

export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_metric_entries_timestamp ON metric_entries(timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_metric_entries_metric_type ON metric_entries(metric_type);`,
  `CREATE INDEX IF NOT EXISTS idx_metric_entries_user ON metric_entries(user_id, timestamp DESC);`,
];

// Columns expected on metric_entries; used by migration check to ALTER TABLE
// for older local DBs created before these columns existed.
export const METRIC_ENTRIES_ADDED_COLUMNS: { name: string; ddl: string }[] = [
  { name: 'pulse', ddl: 'ALTER TABLE metric_entries ADD COLUMN pulse INTEGER' },
  { name: 'fasting', ddl: 'ALTER TABLE metric_entries ADD COLUMN fasting INTEGER' },
  { name: 'body_fat', ddl: 'ALTER TABLE metric_entries ADD COLUMN body_fat REAL' },
  { name: 'user_id', ddl: 'ALTER TABLE metric_entries ADD COLUMN user_id TEXT' },
];
