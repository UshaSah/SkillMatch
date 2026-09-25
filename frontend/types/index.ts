export interface User {
  _id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface Profile {
  _id: string;
  userId: string;
  displayName: string;
  bio?: string;
  skills: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  avatarUrl?: string;
  reputation: number;
}

export interface Listing {
  _id: string;
  ownerId: string | { _id: string; email: string };
  type: 'offer' | 'request';
  skills: Array<{
    name: string;
    level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category: string;
  }>;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
  title?: string;
  compensation?: {
    type: 'free' | 'paid' | 'trade' | 'negotiable';
    amount?: number;
    currency?: string;
    description?: string;
  };
  timeCommitment?: 'one-time' | 'short-term' | 'long-term' | 'ongoing';
}

export interface Message {
  _id: string;
  threadId: string;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  attachments?: string[];
  createdAt: string;
  readAt?: string;
}

export interface Thread {
  _id: string;
  participantUserIds: string[];
  lastMessageAt: string;
  listingId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}
