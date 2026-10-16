'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppNav } from '@/components/AppNav';
import { useAuth } from '@/hooks/useAuth';
import {
  messagesApi,
  ChatMessage,
  MessageThread,
  participantUserId,
  refEmail,
  threadListingTitle,
} from '@/lib/messages';

function senderIdString(
  senderId: ChatMessage['senderId']
): string {
  if (typeof senderId === 'string') return senderId;
  return senderId._id ?? '';
}

export default function MessageThreadPage() {
  const params = useParams();
  const threadId =
    typeof params.threadId === 'string'
      ? params.threadId
      : params.threadId?.[0];
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadThread = useCallback(async () => {
    if (!threadId) {
      setError('Invalid conversation link');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const [threadData, messagesData] = await Promise.all([
        messagesApi.getThread(threadId),
        messagesApi.getMessages(threadId),
      ]);
      setThread(threadData);
      setMessages(messagesData.messages);
      await messagesApi.markAsRead(threadId);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) {
        setError('This conversation was not found.');
      } else if (status === 403) {
        setError('You do not have access to this conversation.');
      } else {
        setError('Failed to load conversation.');
      }
      setThread(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (authLoading || !user || !threadId) return;
    void loadThread();
  }, [user, authLoading, threadId, loadThread]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !threadId || sending) return;
    try {
      setSending(true);
      const message = await messagesApi.sendMessage(threadId, text);
      setMessages((prev) => [...prev, message]);
      setDraft('');
    } catch {
      setError('Failed to send message. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900">Checking session…</div>
      </div>
    );
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-gray-700">Loading conversation…</p>
        </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-red-600 mb-4">{error || 'Conversation not found.'}</p>
          <Link href="/messages" className="text-blue-600 hover:underline">
            ← Back to messages
          </Link>
        </main>
      </div>
    );
  }

  const otherParticipant = thread.participants.find(
    (p) => participantUserId(p) !== user._id
  );
  const headerName =
    refEmail(
      typeof otherParticipant?.userId === 'object'
        ? otherParticipant.userId
        : undefined
    ) || thread.subject || 'Conversation';
  const listingTitle = threadListingTitle(thread);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col flex-1 w-full">
        <Link href="/messages" className="text-blue-600 hover:underline text-sm mb-3">
          ← All messages
        </Link>

        <header className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h1 className="text-xl font-bold text-gray-900">{headerName}</h1>
          {listingTitle && (
            <p className="text-sm text-gray-600 mt-1">About: {listingTitle}</p>
          )}
        </header>

        <div className="flex-1 bg-white rounded-lg shadow-md p-4 mb-4 overflow-y-auto space-y-3 min-h-[280px]">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm">No messages yet.</p>
          ) : (
            messages.map((msg) => {
              const mine = senderIdString(msg.senderId) === user._id;
              return (
                <div
                  key={msg._id}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      mine
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        mine ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Write a message…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 resize-none"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 self-end"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
}
