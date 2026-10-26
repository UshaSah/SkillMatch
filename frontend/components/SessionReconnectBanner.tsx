'use client';

import { useAuth } from '@/hooks/useAuth';

export function SessionReconnectBanner() {
  const { user, loading, sessionError, sessionRetrying, retryRestoreSession } = useAuth();

  if (loading || user || !sessionError) {
    return null;
  }

  const message =
    sessionError === 'server'
      ? 'SkillMatch couldn’t reach the server. Your login is still saved.'
      : 'You’re offline or the API isn’t reachable. Your login is still saved.';

  return (
    <div
      className="bg-amber-50 border-b border-amber-200 px-4 py-3"
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-amber-900">{message}</p>
        <button
          type="button"
          onClick={() => void retryRestoreSession()}
          disabled={sessionRetrying}
          className="text-sm font-medium bg-amber-800 text-white px-4 py-2 rounded-md hover:bg-amber-900 disabled:opacity-50"
        >
          {sessionRetrying ? 'Reconnecting…' : 'Retry'}
        </button>
      </div>
    </div>
  );
}
