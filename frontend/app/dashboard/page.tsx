'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { AppNav } from '@/components/AppNav';

function DashboardContent() {
  const { user, profile, loading } = useAuth();

  const greetingName =
    profile?.displayName?.trim() ||
    user?.email.split('@')[0] ||
    'there';
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileSaved = searchParams.get('profileSaved') === '1';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const dismissProfileSavedBanner = () => {
    router.replace('/dashboard');
  };

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

      {profileSaved && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div
            className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between gap-4"
            role="status"
          >
            <span>Profile saved successfully.</span>
            <button
              type="button"
              onClick={dismissProfileSavedBanner}
              className="text-green-900 hover:text-green-950 text-sm font-medium shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
