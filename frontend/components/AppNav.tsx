'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export function AppNav() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              SkillMatch
            </Link>
            <Link
              href="/listings"
              className="text-gray-700 hover:text-blue-600 text-sm font-medium"
            >
              Browse Listings
            </Link>
            <Link
              href="/profile"
              className="text-gray-700 hover:text-blue-600 text-sm font-medium"
            >
              My Profile
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 text-sm hidden sm:inline">{user.email}</span>
            <Link
              href="/listings/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Create Listing
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
