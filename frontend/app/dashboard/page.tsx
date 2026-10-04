'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { AppNav } from '@/components/AppNav';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();

  const greetingName =
    profile?.displayName?.trim() ||
    user?.email.split('@')[0] ||
    'there';
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to SkillMatch, {greetingName}!
            </h1>
            <p className="text-gray-600 mb-6">
              Get started by browsing available skill exchanges or create your own listing.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/profile"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </Link>
              <Link
                href="/listings"
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
              >
                Browse Listings
              </Link>
              <Link
                href="/listings/new"
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
              >
                Create Listing
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
