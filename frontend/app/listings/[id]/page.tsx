'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { listingsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppNav } from '@/components/AppNav';
import { Listing } from '@/types';

export default function ListingDetailPage() {
  const params = useParams();
  const listingId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchListing = useCallback(async () => {
    if (!listingId) {
      setError('Invalid listing link');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await listingsApi.getById(listingId);
      setListing(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 404) {
        setError('This listing was not found or is no longer available.');
      } else {
        setError('Failed to load listing. Please try again.');
      }
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (authLoading || !user || !listingId) {
      return;
    }
    void fetchListing();
  }, [user, authLoading, listingId, fetchListing]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-900">Checking session…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-lg text-gray-900">Loading listing…</div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-red-600 mb-4">{error || 'Listing not found.'}</p>
          <Link href="/listings" className="text-blue-600 hover:underline">
            ← Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const populatedOwner =
    listing.ownerId && typeof listing.ownerId === 'object' ? listing.ownerId : null;

  const ownerName =
    listing.owner?.profile?.displayName?.trim() ||
    listing.owner?.email?.trim() ||
    populatedOwner?.email?.trim() ||
    'Community member';

  const locationLine = [
    listing.location?.address?.city,
    listing.location?.address?.state,
    listing.location?.address?.country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/listings" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Back to listings
        </Link>

        <article className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-sm font-semibold ${
                listing.type === 'offer'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {listing.type === 'offer' ? 'Offering' : 'Requesting'}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
              {listing.status}
            </span>
            {listing.isRemote && (
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                Remote OK
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            {listing.title || listing.skills.map((s) => s.name).join(', ')}
          </h1>

          <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Skills</h2>
            <ul className="flex flex-wrap gap-2">
              {listing.skills.map((skill, index) => (
                <li
                  key={`${skill.name}-${index}`}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {skill.name}
                  {skill.level ? ` (${skill.level})` : ''}
                  {skill.category ? ` · ${skill.category}` : ''}
                </li>
              ))}
            </ul>
          </section>

          {(locationLine || listing.timeCommitment) && (
            <section className="text-sm text-gray-600 space-y-1">
              {locationLine && <p>Location: {locationLine}</p>}
              {listing.timeCommitment && (
                <p>Time: {listing.timeCommitment.replace('-', ' ')}</p>
              )}
            </section>
          )}

          <section className="border-t pt-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Posted by</h2>
            <p className="text-gray-800">{ownerName}</p>
            <p className="text-xs text-gray-500 mt-2">
              Listed {new Date(listing.createdAt).toLocaleDateString()}
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
