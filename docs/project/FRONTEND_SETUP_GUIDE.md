# SkillMatch Frontend Setup: Next.js + TypeScript

## 🚀 Quick Start

### Step 1: Create Next.js App

```bash
# Navigate to your project root
cd /Users/mac/Desktop/Coding_projects/SkillMatch/SkillMatch

# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir

# When prompted:
# - TypeScript? Yes
# - ESLint? Yes
# - Tailwind CSS? Yes
# - App Router? Yes (default)
# - Import alias? @/* (default)
```

### Step 2: Install Additional Dependencies

```bash
cd frontend

# API client
npm install axios

# Form handling
npm install react-hook-form zod @hookform/resolvers

# State management (optional, Context API might be enough)
npm install zustand

# Date handling
npm install date-fns

# Icons (optional)
npm install lucide-react
```

### Step 3: Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── listings/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── messages/
│   │       ├── page.tsx
│   │       └── [threadId]/
│   │           └── page.tsx
│   └── profile/
│       └── page.tsx
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── listings/
│   │   ├── ListingCard.tsx
│   │   ├── ListingForm.tsx
│   │   └── ListingList.tsx
│   ├── messages/
│   │   ├── MessageThread.tsx
│   │   └── MessageInput.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── lib/
│   ├── api.ts              # API client
│   ├── auth.ts             # Auth utilities
│   └── types.ts            # TypeScript types
├── hooks/
│   ├── useAuth.ts
│   └── useListings.ts
└── types/
    └── index.ts             # Shared types
```

---

## 📝 Step-by-Step Implementation

### 1. Set Up API Client

**`lib/api.ts`**:
```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2. Create Types

**`types/index.ts`**:
```typescript
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
  ownerUserId: string;
  type: 'offer' | 'request';
  skills: string[];
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: string;
  updatedAt: string;
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
```

### 3. Set Up Auth Context

**`hooks/useAuth.ts`**:
```typescript
import { useState, useEffect, createContext, useContext } from 'react';
import api from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', response.data.accessToken);
    await fetchUser();
  };

  const register = async (email: string, password: string) => {
    await api.post('/auth/register', { email, password });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
```

### 4. Create Login Page

**`app/(auth)/login/page.tsx`**:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      setError('');
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-center">Login</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              {...register('email')}
              type="email"
              className="mt-1 block w-full rounded-md border p-2"
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              {...register('password')}
              type="password"
              className="mt-1 block w-full rounded-md border p-2"
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-center text-sm">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
```

### 5. Update Root Layout

**`app/layout.tsx`**:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SkillMatch - Local Skill Exchange',
  description: 'Connect with people in your community to exchange skills',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### 6. Create Environment Variables

**`.env.local`**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
# Or your deployed backend URL:
# NEXT_PUBLIC_API_URL=https://your-alb-url.us-east-1.elb.amazonaws.com
```

---

## 🎯 Implementation Order

### Week 1: Core Setup
1. **Day 1**: Set up Next.js, API client, types, auth context
2. **Day 2**: Build login/register pages
3. **Day 3**: Build dashboard page
4. **Day 4**: Build listings pages (browse, create, view)
5. **Day 5**: Build messaging interface

### Week 2: Polish
1. **Day 1**: Profile management
2. **Day 2**: Error handling & loading states
3. **Day 3**: Responsive design
4. **Day 4**: Testing & bug fixes
5. **Day 5**: Deploy to Vercel

---

## 🚀 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Follow prompts:
# - Link to existing project? No (first time)
# - Project name? skillmatch-frontend
# - Directory? ./
# - Override settings? No
```

Or use GitHub integration:
1. Push code to GitHub
2. Go to vercel.com
3. Import your repo
4. Deploy automatically

---

## 📚 Resources

- **Next.js Docs**: https://nextjs.org/docs
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/

---

## ✅ Checklist

- [ ] Next.js app created
- [ ] Dependencies installed
- [ ] API client set up
- [ ] Types defined
- [ ] Auth context created
- [ ] Login/Register pages built
- [ ] Dashboard page built
- [ ] Listings pages built
- [ ] Messaging interface built
- [ ] Environment variables configured
- [ ] Deployed to Vercel

---

**Start with Step 1 today, and you'll have a working frontend by next week!** 🚀
