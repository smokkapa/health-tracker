import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authAdapter, SESSION_TIMEOUT_MS, User } from './index';
import {
  clearSession,
  getSession,
  isExpired,
  touchSession,
} from './session';
import { useMetricsStore } from '../stores/metrics';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  touch: () => void;
  clearSessionExpired: () => void;
  hasAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACTIVITY_CHECK_MS = 30 * 1000;
// Throttle touch writes — every interaction calling AsyncStorage.setItem is
// wasteful. One write per 5s is plenty when the timeout is 15 minutes.
const TOUCH_THROTTLE_MS = 5 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const lastTouchRef = useRef(0);

  // Keep the metrics store's userId in sync with auth state. This also clears
  // the in-memory entries array on logout so previous user's data doesn't leak.
  useEffect(() => {
    useMetricsStore.getState().setUserId(user?.id ?? null);
  }, [user]);

  // Hydrate on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getSession();
        if (session && isExpired(session)) {
          await clearSession();
          if (!cancelled) {
            setUser(null);
            setSessionExpired(true);
          }
        } else {
          const current = await authAdapter.getCurrentUser();
          if (!cancelled) setUser(current);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Periodic expiry check.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(async () => {
      const session = await getSession();
      if (!session || isExpired(session)) {
        await clearSession();
        setUser(null);
        setSessionExpired(true);
      }
    }, ACTIVITY_CHECK_MS);
    return () => clearInterval(id);
  }, [user]);

  const touch = useCallback(() => {
    const now = Date.now();
    if (now - lastTouchRef.current < TOUCH_THROTTLE_MS) return;
    lastTouchRef.current = now;
    // Fire-and-forget — failure to bump activity is non-fatal.
    void touchSession();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await authAdapter.signIn(email, password);
    setUser(u);
    setSessionExpired(false);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const u = await authAdapter.signUp(email, password);
    setUser(u);
    setSessionExpired(false);
  }, []);

  const signOut = useCallback(async () => {
    await authAdapter.signOut();
    setUser(null);
    setSessionExpired(false);
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string) => {
    await authAdapter.resetPassword(email, newPassword);
    // Reset clears the session — make sure local state reflects that.
    setUser(null);
    setSessionExpired(false);
  }, []);

  const hasAccount = useCallback(() => authAdapter.hasAccount(), []);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      sessionExpired,
      signIn,
      signUp,
      signOut,
      resetPassword,
      touch,
      clearSessionExpired,
      hasAccount,
    }),
    [user, isLoading, sessionExpired, signIn, signUp, signOut, resetPassword, touch, clearSessionExpired, hasAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}

export { SESSION_TIMEOUT_MS };
