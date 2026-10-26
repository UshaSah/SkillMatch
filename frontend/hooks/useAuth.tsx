'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  authApi,
  setAuthTokens,
  clearAuthTokens,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  AUTH_SESSION_EXPIRED_EVENT,
  getHttpStatus,
  shouldClearSessionOnError,
} from '@/lib/api';
import { SessionReconnectBanner } from '@/components/SessionReconnectBanner';
import { User, Profile } from '@/types';

export type SessionError = 'offline' | 'server';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Set when restore failed but tokens were kept (network / 5xx). */
  sessionError: SessionError | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  /** Retry bootstrap after offline / 5xx (tokens kept). */
  retryRestoreSession: () => Promise<void>;
  sessionRetrying: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<SessionError | null>(null);
  const [sessionRetrying, setSessionRetrying] = useState(false);

  const applySession = useCallback((session: { user: User; profile: Profile | null }) => {
    setUser(session.user);
    setProfile(session.profile);
  }, []);

  const handleSessionRestoreFailure = useCallback((error: unknown) => {
    if (shouldClearSessionOnError(error)) {
      // Idempotent: interceptor may have already cleared via notifySessionExpired().
      clearAuthTokens();
      setSessionError(null);
    } else {
      const status = getHttpStatus(error);
      setSessionError(status != null && status >= 500 ? 'server' : 'offline');
    }
    setUser(null);
    setProfile(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await authApi.getMe();
    applySession(session);
    setSessionError(null);
  }, [applySession]);

  useEffect(() => {
    const hasAccess = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
    const hasRefresh = Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
    const shouldRestoreSession = hasAccess || hasRefresh;

    if (!shouldRestoreSession) {
      setLoading(false);
      return;
    }

    refreshSession()
      .catch(handleSessionRestoreFailure)
      .finally(() => setLoading(false));
  }, [refreshSession, handleSessionRestoreFailure]);

  const retryRestoreSession = useCallback(async () => {
    const hasAccess = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
    const hasRefresh = Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
    if (!hasAccess && !hasRefresh) {
      setSessionError(null);
      return;
    }

    setSessionRetrying(true);
    try {
      await refreshSession();
    } catch (error) {
      handleSessionRestoreFailure(error);
    } finally {
      setSessionRetrying(false);
    }
  }, [refreshSession, handleSessionRestoreFailure]);

  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      setProfile(null);
      setSessionError(null);
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/register')) {
        router.replace('/login');
      }
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [router]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setAuthTokens(response.accessToken, response.refreshToken);
    await refreshSession();
  };

  const register = async (email: string, password: string) => {
    const response = await authApi.register(email, password);
    setAuthTokens(response.accessToken, response.refreshToken);
    await refreshSession();
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Still clear local session if token expired or network fails
    }
    clearAuthTokens();
    setUser(null);
    setProfile(null);
    setSessionError(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        sessionError,
        login,
        register,
        logout,
        refreshSession,
        retryRestoreSession,
        sessionRetrying,
      }}
    >
      <SessionReconnectBanner />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
