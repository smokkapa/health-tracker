import { getDatabase } from './client';
import { HealthProfile } from '../types';

interface HealthProfileRow {
  user_id: string;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  conditions: string | null;
  medications: string | null;
  family_history: string | null;
  allergies: string | null;
  genetics: string | null;
  notes: string | null;
  updated_at: string | null;
}

function rowToProfile(row: HealthProfileRow): HealthProfile {
  const profile: HealthProfile = { userId: row.user_id };
  if (row.date_of_birth != null) profile.dateOfBirth = row.date_of_birth;
  if (row.sex != null) profile.sex = row.sex as HealthProfile['sex'];
  if (row.height_cm != null) profile.heightCm = row.height_cm;
  if (row.conditions != null) profile.conditions = row.conditions;
  if (row.medications != null) profile.medications = row.medications;
  if (row.family_history != null) profile.familyHistory = row.family_history;
  if (row.allergies != null) profile.allergies = row.allergies;
  if (row.genetics != null) profile.genetics = row.genetics;
  if (row.notes != null) profile.notes = row.notes;
  if (row.updated_at != null) profile.updatedAt = row.updated_at;
  return profile;
}

export async function getProfile(userId: string): Promise<HealthProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<HealthProfileRow>(
    'SELECT * FROM health_profile WHERE user_id = ?',
    [userId],
  );
  return row ? rowToProfile(row) : null;
}

export async function upsertProfile(
  userId: string,
  profile: Omit<HealthProfile, 'userId' | 'updatedAt'>,
): Promise<HealthProfile> {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO health_profile (
      user_id, date_of_birth, sex, height_cm, conditions, medications,
      family_history, allergies, genetics, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      date_of_birth = excluded.date_of_birth,
      sex = excluded.sex,
      height_cm = excluded.height_cm,
      conditions = excluded.conditions,
      medications = excluded.medications,
      family_history = excluded.family_history,
      allergies = excluded.allergies,
      genetics = excluded.genetics,
      notes = excluded.notes,
      updated_at = excluded.updated_at
    `,
    [
      userId,
      profile.dateOfBirth ?? null,
      profile.sex ?? null,
      profile.heightCm ?? null,
      profile.conditions ?? null,
      profile.medications ?? null,
      profile.familyHistory ?? null,
      profile.allergies ?? null,
      profile.genetics ?? null,
      profile.notes ?? null,
      updatedAt,
    ],
  );
  return { ...profile, userId, updatedAt };
}

export async function deleteProfile(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM health_profile WHERE user_id = ?', [userId]);
}
