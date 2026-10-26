import axios, { InternalAxiosRequestConfig } from 'axios';

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}
import {
  AuthResponse,
  AuthSession,
  User,
  Listing,
  Profile,
  ProfileUpdateInput,
  PublicProfile,
  ProfileSkill,
} from '@/types';

function normalizeUser(raw: Record<string, unknown>): User {
  const id = raw._id ?? raw.id;
  return {
    _id: String(id ?? ''),
    email: String(raw.email ?? ''),
    emailVerified: Boolean(raw.emailVerified),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

function normalizeProfile(raw: Record<string, unknown> | null): Profile | null {
  if (!raw) return null;
  const id = raw._id ?? raw.id;
  const userId = raw.userId;
  const location = (raw.location as Profile['location']) ?? {
    coordinates: [0, 0] as [number, number],
  };
  const skills = Array.isArray(raw.skills) ? raw.skills : [];

  return {
    _id: String(id ?? ''),
    userId: String(userId ?? ''),
    displayName: String(raw.displayName ?? ''),
    bio: raw.bio != null ? String(raw.bio) : undefined,
    skills: skills.map((s) => {
      if (typeof s === 'string') {
        return { name: s, category: 'General', level: 'intermediate' as const };
      }
      const skill = s as Record<string, unknown>;
      return {
        name: String(skill.name ?? ''),
        level: skill.level as Profile['skills'][0]['level'],
        category: String(skill.category ?? 'General'),
      };
    }),
    location: {
      type: location.type,
      coordinates: (location.coordinates?.length === 2
        ? location.coordinates
        : [0, 0]) as [number, number],
      address: location.address,
    },
    radius: raw.radius != null ? Number(raw.radius) : undefined,
    avatarUrl: raw.avatarUrl != null ? String(raw.avatarUrl) : null,
    reputation: raw.reputation != null ? Number(raw.reputation) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';

/** AuthProvider listens and clears React state + client navigates to login. */
export const AUTH_SESSION_EXPIRED_EVENT = 'skillmatch:session-expired';

let sessionExpiredNotified = false;

export function setAuthTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  sessionExpiredNotified = false;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Axios HTTP status, or null when there was no response (network, CORS, timeout). */
export function getHttpStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (typeof status === 'number') return status;
  }
  return null;
}

/** Only wipe stored tokens when the server rejected auth (after refresh retry in interceptor). */
export function shouldClearSessionOnError(error: unknown): boolean {
  return getHttpStatus(error) === 401;
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Avoid interceptor loop; refresh uses this client directly. */
const refreshClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

function authRequestSkipsRefresh(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  );
}

/**
 * Invalid refresh / retry still 401: clear storage once and notify UI (no hard reload).
 * Safe to call multiple times; parallel 401s only dispatch one event.
 */
export function notifySessionExpired(): void {
  if (typeof window === 'undefined') return;
  clearAuthTokens();
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken =
    typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await refreshClient.post('/auth/refresh', { refreshToken });
  if (response.data?.success && response.data.data?.tokens) {
    const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
    setAuthTokens(accessToken, newRefreshToken);
    return accessToken;
  }
  throw new Error('Token refresh failed');
}

function refreshAccessTokenDeduped(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401: refresh access token once and retry; otherwise clear session
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      console.error('Network Error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      return Promise.reject(error);
    }

    const status = error.response.status;
    const originalRequest = error.config as RetryAxiosRequestConfig | undefined;

    if (status !== 401 || typeof window === 'undefined' || !originalRequest) {
      return Promise.reject(error);
    }

    if (authRequestSkipsRefresh(originalRequest.url) || originalRequest._retry) {
      if (!authRequestSkipsRefresh(originalRequest.url)) {
        notifySessionExpired();
      }
      return Promise.reject(error);
    }

    if (!localStorage.getItem(REFRESH_TOKEN_KEY)) {
      notifySessionExpired();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessTokenDeduped();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  }
);

// Auth API
export const authApi = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const localPart = email.split('@')[0]?.trim() || 'User';
    const displayName = localPart.length >= 2 ? localPart : 'User';
    const response = await api.post('/auth/register', {
      email,
      password,
      displayName,
    });
    // Backend returns { success: true, data: { user, profile, tokens: { accessToken, refreshToken } } }
    if (response.data.success && response.data.data) {
      return {
        accessToken: response.data.data.tokens.accessToken,
        refreshToken: response.data.data.tokens.refreshToken,
        user: normalizeUser(response.data.data.user),
      };
    }
    return response.data;
  },
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    // Backend returns { success: true, data: { user, tokens: { accessToken, refreshToken } } }
    if (response.data.success && response.data.data) {
      return {
        accessToken: response.data.data.tokens.accessToken,
        refreshToken: response.data.data.tokens.refreshToken,
        user: normalizeUser(response.data.data.user),
      };
    }
    return response.data;
  },
  getMe: async (): Promise<AuthSession> => {
    const response = await api.get('/auth/me');
    if (response.data.success && response.data.data?.user) {
      return {
        user: normalizeUser(response.data.data.user),
        profile: normalizeProfile(response.data.data.profile ?? null),
      };
    }
    const rawUser = response.data.user ?? response.data;
    return {
      user: normalizeUser(rawUser),
      profile: normalizeProfile(response.data.profile ?? response.data.data?.profile ?? null),
    };
  },
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};

// User API
export const userApi = {
  getProfile: async (): Promise<Profile | null> => {
    const response = await api.get('/users/me');
    if (response.data.success && response.data.data) {
      return normalizeProfile(response.data.data.profile);
    }
    return normalizeProfile(response.data.profile ?? response.data);
  },
  updateProfile: async (data: ProfileUpdateInput): Promise<Profile> => {
    const response = await api.put('/users/me', data);
    if (response.data.success && response.data.data?.profile) {
      const profile = normalizeProfile(response.data.data.profile);
      if (!profile) {
        throw new Error('Profile update returned empty profile');
      }
      return profile;
    }
    const profile = normalizeProfile(response.data.profile ?? response.data);
    if (!profile) {
      throw new Error('Profile update failed');
    }
    return profile;
  },
  getPublicProfile: async (userId: string): Promise<PublicProfile> => {
    const response = await api.get(`/users/${userId}/profile`);
    const raw = response.data.data?.profile ?? response.data.profile;
    if (!response.data.success || !raw) {
      throw new Error('Profile not found');
    }
    const profile = raw as Record<string, unknown>;
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    return {
      userId: String(profile.userId ?? userId),
      displayName: String(profile.displayName ?? 'Member'),
      bio: profile.bio != null ? String(profile.bio) : undefined,
      skills: skills.map((s) => {
        const skill = s as Record<string, unknown>;
        return {
          name: String(skill.name ?? ''),
          level: skill.level as ProfileSkill['level'],
          category: String(skill.category ?? 'General'),
        };
      }),
      avatarUrl: profile.avatarUrl != null ? String(profile.avatarUrl) : null,
      reputation: profile.reputation != null ? Number(profile.reputation) : undefined,
      rating: profile.rating as PublicProfile['rating'],
      location: profile.location as PublicProfile['location'],
      memberSince: profile.memberSince ? String(profile.memberSince) : undefined,
    };
  },
};

// Listings API
export const listingsApi = {
  search: async (params?: {
    q?: string;
    type?: 'offer' | 'request';
    skills?: string | string[];
    category?: string;
    isRemote?: boolean;
    timeCommitment?: string;
    status?: string;
    ownerId?: string;
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'oldest' | 'distance' | 'popularity';
  }): Promise<{ listings: Listing[]; total: number }> => {
    try {
      console.log('API: Calling /listings with params:', params);
      const response = await api.get('/listings', { params });
      console.log('API: Raw response:', response);
      console.log('API: Response data:', response.data);
      
      // Backend returns { success: true, data: { listings: [], pagination: { total } } }
      if (response.data.success && response.data.data) {
        const result = {
          listings: response.data.data.listings || [],
          total: response.data.data.pagination?.total || 0
        };
        console.log('API: Parsed result:', result);
        return result;
      }
      console.warn('API: Unexpected response structure:', response.data);
      return { listings: [], total: 0 };
    } catch (error: any) {
      console.error('API: Error in search:', error);
      throw error;
    }
  },
  getById: async (id: string): Promise<Listing> => {
    const response = await api.get(`/listings/${id}`);
    if (response.data.success && response.data.data?.listing) {
      return response.data.data.listing as Listing;
    }
    return response.data.listing ?? response.data;
  },
  create: async (data: {
    type: 'offer' | 'request';
    title: string;
    description: string;
    skills: Array<{
      name: string;
      level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      category?: string;
    }>;
    location: {
      type: 'Point';
      coordinates: [number, number];
      address?: {
        city?: string;
        state?: string;
        country?: string;
      };
    };
    timeCommitment?: 'one-time' | 'short-term' | 'long-term' | 'ongoing';
    isRemote?: boolean;
    estimatedHours?: {
      min?: number;
      max?: number;
    };
  }): Promise<Listing> => {
    const response = await api.post('/listings', data);
    // Backend returns { success: true, data: { listing: ... } }
    if (response.data.success && response.data.data?.listing) {
      return response.data.data.listing;
    }
    return response.data;
  },
  update: async (id: string, data: Partial<Listing>): Promise<Listing> => {
    const response = await api.put(`/listings/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/listings/${id}`);
  },
  getMyListings: async (): Promise<Listing[]> => {
    const response = await api.get('/listings/me');
    return response.data;
  },
};

export { messagesApi } from './messages';

export default api;
