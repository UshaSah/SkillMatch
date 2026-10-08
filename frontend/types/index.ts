export interface User {
  _id: string;
  email: string;
  emailVerified: boolean;
  createdAt?: string;
}

export interface ProfileSkill {
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
}

export interface Profile {
  _id: string;
  userId: string;
  displayName: string;
  bio?: string;
  skills: ProfileSkill[];
  location: {
    type?: 'Point';
    coordinates: [number, number];
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  radius?: number;
  avatarUrl?: string | null;
  reputation?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ProfileUpdateInput = {
  displayName?: string;
  bio?: string;
  skills?: ProfileSkill[];
  radius?: number;
  location?: {
    coordinates: [number, number];
    address?: Profile['location']['address'];
  };
};

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
  isRemote?: boolean;
  /** Present on GET /listings/:id when backend attaches owner profile */
  owner?: {
    email?: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string | null;
      reputation?: number;
    };
  };
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

/** Current user + profile from GET /auth/me (no tokens). */
export interface AuthSession {
  user: User;
  profile: Profile | null;
}
