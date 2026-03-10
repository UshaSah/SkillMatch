import axios from 'axios';
import { AuthResponse, User, Listing, Profile, Thread, Message } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log network errors for debugging
    if (!error.response) {
      console.error('Network Error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
    }
    
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Handle token refresh or redirect to login
      localStorage.removeItem('accessToken');
      // Don't redirect if we're already on login/register page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { email, password });
    // Backend returns { success: true, data: { user, profile, tokens: { accessToken, refreshToken } } }
    if (response.data.success && response.data.data) {
      return {
        accessToken: response.data.data.tokens.accessToken,
        refreshToken: response.data.data.tokens.refreshToken,
        user: response.data.data.user
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
        user: response.data.data.user
      };
    }
    return response.data;
  },
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};

// User API
export const userApi = {
  getProfile: async (): Promise<Profile> => {
    const response = await api.get('/users/me');
    return response.data;
  },
  updateProfile: async (data: Partial<Profile>): Promise<Profile> => {
    const response = await api.put('/users/me', data);
    return response.data;
  },
};

// Listings API
export const listingsApi = {
  search: async (params?: {
    type?: 'offer' | 'request';
    skills?: string[];
    status?: string;
    page?: number;
    limit?: number;
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
    return response.data;
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

// Messages API
export const messagesApi = {
  getThreads: async (): Promise<Thread[]> => {
    const response = await api.get('/messages/threads');
    return response.data;
  },
  getThread: async (threadId: string): Promise<Thread> => {
    const response = await api.get(`/messages/threads/${threadId}`);
    return response.data;
  },
  getMessages: async (threadId: string): Promise<Message[]> => {
    const response = await api.get(`/messages/threads/${threadId}/messages`);
    return response.data;
  },
  createThread: async (data: {
    recipientUserId: string;
    listingId?: string;
    initialMessage: string;
  }): Promise<Thread> => {
    const response = await api.post('/messages/threads', data);
    return response.data;
  },
  sendMessage: async (threadId: string, content: string): Promise<Message> => {
    const response = await api.post(`/messages/threads/${threadId}/messages`, {
      content,
    });
    return response.data;
  },
  markAsRead: async (threadId: string): Promise<void> => {
    await api.put(`/messages/threads/${threadId}/read`);
  },
};

export default api;
