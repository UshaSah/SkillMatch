'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppNav } from '@/components/AppNav';
import { useAuth } from '@/hooks/useAuth';
import {
  messagesApi,
  MessageThread,
  participantUserId,
  refEmail,
  threadListingTitle,
} from '@/lib/messages';

function threadLabel(thread: MessageThread, currentUserId: string): string {
  const other = thread.participants.find(
    (p) => participantUserId(p) !== currentUserId
  );
  const email = refEmail(
    typeof other?.userId === 'object' ? other.userId : undefined
  );
  return email || thread.subject || 'Conversation';
}

function threadPreview(thread: MessageThread): string {
  return thread.lastMessage?.content?.trim() || thread.subject || 'No messages yet';
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadThreads = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { threads: list } = await messagesApi.getThreads({ limit: 50 });
      setThreads(list);
    } catch {
      setError('Failed to load conversations.');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadThreads();
  }, [user, authLoading, loadThreads]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900">Checking session…</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Messages</h1>

        {loading && (
          <p className="text-gray-600">Loading conversations…</p>
        )}

        {error && (
          <div className="mb-4 text-red-600">
            {error}
            <button
              type="button"
              onClick={() => void loadThreads()}
              className="ml-3 underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && threads.length === 0 && (
          <p className="text-gray-600">
            No conversations yet. Open a listing and use{' '}
            <strong>Message about this listing</strong> to start one.
          </p>
        )}

        <ul className="space-y-3">
          {threads.map((thread) => {
            const listingTitle = threadListingTitle(thread);
            const sentAt = thread.lastMessage?.sentAt || thread.updatedAt;
            return (
              <li key={thread._id}>
                <Link
                  href={`/messages/${thread._id}`}
                  className="block bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between gap-2 items-start">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {threadLabel(thread, user._id)}
                      </p>
                      {listingTitle && (
                        <p className="text-xs text-blue-700 truncate">
                          Re: {listingTitle}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {threadPreview(thread)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {sentAt && (
                        <span className="text-xs text-gray-400">
                          {new Date(sentAt).toLocaleDateString()}
                        </span>
                      )}
                      {(thread.unreadCount ?? 0) > 0 && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
