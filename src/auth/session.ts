import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Session storage.
 *
 * The active session lives in AsyncStorage so it survives reloads. On web,
 * AsyncStorage is backed by localStorage; on native it uses the platform
 * keyed-store. Single active session per device for v1.
 */

const SESSION_KEY = 'health_tracker.session.v1';

export const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export interface Session {
  userId: string;
  signedInAt: string; // ISO
  lastActivityAt: string; // ISO
}

export async function getSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.userId || !parsed.signedInAt || !parsed.lastActivityAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/**
 * Bump `lastActivityAt` to now. Cheap-ish (one AsyncStorage write) — callers
 * may throttle if needed, but in practice user interactions are infrequent
 * enough that we don't bother.
 */
export async function touchSession(): Promise<void> {
  const s = await getSession();
  if (!s) return;
  s.lastActivityAt = new Date().toISOString();
  await setSession(s);
}

export function isExpired(session: Session, timeoutMs: number = SESSION_TIMEOUT_MS): boolean {
  const last = new Date(session.lastActivityAt).getTime();
  if (Number.isNaN(last)) return true;
  return Date.now() - last > timeoutMs;
}
