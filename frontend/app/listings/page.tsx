'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listingsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppNav } from '@/components/AppNav';
import { Listing } from '@/types';
import Link from 'next/link';

export default function ListingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<{
    q?: string;
    type?: 'offer' | 'request';
    isRemote?: boolean;
  }>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await listingsApi.search({
        ...filters,
        limit: 50,
      });
      setListings(response.listings || []);
    } catch (err: any) {
      console.error('Error fetching listings:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code,
        config: err.config?.url
      });
      
      // Better error messages
      let errorMessage = 'Failed to load listings';
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        errorMessage = 'Cannot connect to backend. Make sure the backend server is running on port 3001.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access forbidden. Please check your permissions.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    void fetchListings();
  }, [user, authLoading, fetchListings]);

  const applySearch = () => {
    const trimmed = searchInput.trim();
    setFilters((prev) => {
      const next = { ...prev };
      if (trimmed) {
        next.q = trimmed;
      } else {
        delete next.q;
      }
      return next;
    });
  };

  const setTypeFilter = (type?: 'offer' | 'request') => {
    setFilters((prev) => {
      const next = { ...prev };
      if (type) {
        next.type = type;
      } else {
        delete next.type;
      }
      return next;
    });
  };

  const toggleRemote = () => {
    setFilters((prev) => {
      const next = { ...prev };
      if (next.isRemote) {
        delete next.isRemote;
      } else {
        next.isRemote = true;
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({});
  };

  const hasActiveFilters =
    Boolean(filters.q) || Boolean(filters.type) || Boolean(filters.isRemote);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-900">Checking session…</div>
          <p className="text-sm text-gray-500 mt-1">Verifying your login</p>
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
          <div className="text-center">
            <div className="text-lg text-gray-900">Loading listings…</div>
            <p className="text-sm text-gray-500 mt-1">Fetching skill exchanges</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isConnectionError = error.includes('Cannot connect') || error.includes('Network Error');
    
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl">
            <h2 className="text-red-800 font-bold mb-2 text-xl">Error Loading Listings</h2>
            <p className="text-red-600 mb-4">{error}</p>
            
            {isConnectionError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <p className="text-yellow-800 text-sm font-semibold mb-2">Troubleshooting Steps:</p>
                <ol className="text-yellow-700 text-sm list-decimal list-inside space-y-1">
                  <li>Make sure the backend server is running: <code className="bg-yellow-100 px-1 rounded">cd backend && npm run dev</code></li>
                  <li>Check if backend is accessible: <code className="bg-yellow-100 px-1 rounded">curl http://localhost:3001/api/health</code></li>
                  <li>Verify API URL in browser console (check the logged API URL)</li>
                  <li>Check browser console (F12) for detailed error messages</li>
                </ol>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={fetchListings}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Browse Listings</h1>

        <section className="bg-white rounded-lg shadow-md p-4 mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applySearch();
                }
              }}
              placeholder="Search title or description…"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
              aria-label="Search listings by title or description"
            />
            <button
              type="button"
              onClick={applySearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 mr-1">Type:</span>
            <button
              type="button"
              onClick={() => setTypeFilter(undefined)}
              className={`px-3 py-1 rounded-full text-sm ${
                !filters.type ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('offer')}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.type === 'offer'
                  ? 'bg-green-700 text-white'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              Offers
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('request')}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.type === 'request'
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              }`}
            >
              Requests
            </button>
            <button
              type="button"
              onClick={toggleRemote}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.isRemote
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
              }`}
            >
              Remote only
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-1 rounded-full text-sm text-gray-600 underline hover:text-gray-900"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              {hasActiveFilters
                ? 'No listings match your filters.'
                : 'No listings found. Be the first to create one!'}
            </div>
          ) : (
            listings.map((listing) => (
              <Link
                key={listing._id}
                href={`/listings/${listing._id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-sm font-semibold ${
                    listing.type === 'offer' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {listing.type === 'offer' ? 'Offering' : 'Requesting'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    listing.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {listing.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {listing.title ||
                    (listing.skills && listing.skills.length > 0
                      ? listing.skills.map((s) => (typeof s === 'string' ? s : s.name)).join(', ')
                      : 'Untitled listing')}
                </h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                  {listing.description}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(listing.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}