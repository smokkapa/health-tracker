import { getDatabase } from '../db/client';
import { claimOrphanedEntriesForOwner } from '../db/queries';
import { AuthAdapter, User } from './adapter';
import { LEGACY_OWNER_EMAIL } from './constants';
import { generateId, generateSalt, hashPassword, verifyPassword } from './crypto';
import { clearSession, getSession, setSession } from './session';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  created_at: string;
}

function rowToUser(row: UserRow): User {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class LocalAuthAdapter implements AuthAdapter {
  async hasAccount(): Promise<boolean> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM users',
    );
    return (row?.count ?? 0) > 0;
  }

  async emailExists(email: string): Promise<boolean> {
    const normalised = normaliseEmail(email);
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalised],
    );
    return !!row;
  }

  async signUp(email: string, password: string): Promise<User> {
    const normalised = normaliseEmail(email);
    const db = await getDatabase();

    const existing = await db.getFirstAsync<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [normalised],
    );
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const salt = await generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const id = generateId();
    const createdAt = new Date().toISOString();

    await db.runAsync(
      'INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, normalised, passwordHash, salt, createdAt],
    );

    const user: User = { id, email: normalised, createdAt };
    await setSession({
      userId: id,
      signedInAt: createdAt,
      lastActivityAt: createdAt,
    });
    if (normalised === LEGACY_OWNER_EMAIL) {
      try {
        await claimOrphanedEntriesForOwner(db, id, normalised);
      } catch {
        // Non-fatal; sign-up succeeds regardless.
      }
    }
    return user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const normalised = normaliseEmail(email);
    const db = await getDatabase();
    const row = await db.getFirstAsync<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [normalised],
    );
    if (!row) {
      throw new Error('No account found with that email.');
    }
    const ok = await verifyPassword(password, row.salt, row.password_hash);
    if (!ok) {
      throw new Error('Incorrect password.');
    }

    const now = new Date().toISOString();
    await setSession({
      userId: row.id,
      signedInAt: now,
      lastActivityAt: now,
    });
    if (row.email === LEGACY_OWNER_EMAIL) {
      try {
        await claimOrphanedEntriesForOwner(db, row.id, row.email);
      } catch {
        // Non-fatal; sign-in succeeds regardless.
      }
    }
    return rowToUser(row);
  }

  async signOut(): Promise<void> {
    await clearSession();
  }

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const normalised = normaliseEmail(email);
    const db = await getDatabase();
    const row = await db.getFirstAsync<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [normalised],
    );
    if (!row) {
      throw new Error('No account found with that email.');
    }
    const salt = await generateSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    await db.runAsync(
      'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
      [passwordHash, salt, row.id],
    );
    // Reset invalidates any existing session.
    await clearSession();
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await getSession();
    if (!session) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [session.userId],
    );
    if (!row) return null;
    return rowToUser(row);
  }
}
