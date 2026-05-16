/**
 * AuthAdapter — pluggable interface for authentication backends.
 *
 * The app uses `LocalAuthAdapter` today (SQLite + AsyncStorage). When we move
 * to Supabase, only `src/auth/index.ts` changes — every screen and hook keeps
 * importing from `src/auth` and calling the same interface methods.
 */

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthAdapter {
  hasAccount(): Promise<boolean>;
  emailExists(email: string): Promise<boolean>;
  signUp(email: string, password: string): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  /**
   * Resets the password for an existing account. Local implementation accepts
   * the new password directly (the only "auth" being device access). A future
   * Supabase implementation will route this through email reset.
   */
  resetPassword(email: string, newPassword: string): Promise<void>;
}
