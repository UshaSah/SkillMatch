'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { authApi, setAuthTokens, clearAuthTokens, ACCESS_TOKEN_KEY } from '@/lib/api';
import { User, Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: { user: User; profile: Profile | null }) => {
    setUser(session.user);
    setProfile(session.profile);
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await authApi.getMe();
    applySession(session);
  }, [applySession]);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      refreshSession()
        .catch(() => {
          clearAuthTokens();
          setUser(null);
          setProfile(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshSession]);

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
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, login, register, logout, refreshSession }}
    >
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
