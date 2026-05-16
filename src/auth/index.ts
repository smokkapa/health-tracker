import { AuthAdapter } from './adapter';
import { LocalAuthAdapter } from './local';

/**
 * Active auth adapter. To migrate to Supabase, swap this one export for a
 * `SupabaseAuthAdapter` implementing the same `AuthAdapter` interface — no
 * other file needs to change.
 */
export const authAdapter: AuthAdapter = new LocalAuthAdapter();

export type { AuthAdapter, User } from './adapter';
export { SESSION_TIMEOUT_MS } from './session';
