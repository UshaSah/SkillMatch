import type { AxiosResponse } from 'axios';
import api from './api';

export interface MessagingPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type PopulatedUserRef = { _id: string; email: string };

export interface ThreadParticipant {
  userId: PopulatedUserRef | string;
  joinedAt?: string;
  lastReadAt?: string;
  isActive?: boolean;
}

export interface ThreadListingRef {
  _id: string;
  title?: string;
  type?: 'offer' | 'request';
}

export interface ThreadLastMessage {
  content?: string;
  senderId?: PopulatedUserRef | string;
  sentAt?: string;
}

export interface MessageThread {
  _id: string;
  participants: ThreadParticipant[];
  listingId?: ThreadListingRef | string | null;
  subject?: string;
  lastMessage?: ThreadLastMessage;
  messageCount?: number;
  unreadCount?: number;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageAttachment {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

export interface ChatMessage {
  _id: string;
  threadId: string;
  senderId: PopulatedUserRef | string;
  recipientId: PopulatedUserRef | string;
  content: string;
  type?: string;
  attachments?: MessageAttachment[];
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateThreadInput {
  recipientId: string;
  content: string;
  listingId?: string;
  subject?: string;
}

export interface SendMessageInput {
  content: string;
  type?: 'text' | 'image' | 'file' | 'system';
  attachments?: MessageAttachment[];
  replyTo?: string;
}

export interface ListThreadsParams {
  page?: number;
  limit?: number;
}

export interface ListMessagesParams {
  page?: number;
  limit?: number;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  requestId?: string;
  timestamp?: string;
};

function unwrapData<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  const body = response.data;
  if (body?.success && body.data !== undefined) {
    return body.data;
  }
  throw new Error('Unexpected messaging API response shape');
}

export function participantUserId(
  participant: ThreadParticipant
): string | null {
  const ref = participant.userId;
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref._id ?? null;
}

export function refEmail(ref: PopulatedUserRef | string | undefined): string {
  if (!ref) return '';
  if (typeof ref === 'string') return '';
  return ref.email ?? '';
}

export function threadListingTitle(thread: MessageThread): string | null {
  const listing = thread.listingId;
  if (!listing || typeof listing === 'string') return null;
  return listing.title ?? null;
}

export const messagesApi = {
  getThreads: async (
    params?: ListThreadsParams
  ): Promise<{ threads: MessageThread[]; pagination: MessagingPagination }> => {
    const response = await api.get<
      ApiEnvelope<{ threads: MessageThread[]; pagination: MessagingPagination }>
    >('/messages/threads', { params });
    return unwrapData(response);
  },

  getThread: async (threadId: string): Promise<MessageThread> => {
    const response = await api.get<ApiEnvelope<{ thread: MessageThread }>>(
      `/messages/threads/${threadId}`
    );
    const data = unwrapData(response);
    return data.thread;
  },

  getMessages: async (
    threadId: string,
    params?: ListMessagesParams
  ): Promise<{ messages: ChatMessage[]; pagination: MessagingPagination }> => {
    const response = await api.get<
      ApiEnvelope<{ messages: ChatMessage[]; pagination: MessagingPagination }>
    >(`/messages/threads/${threadId}/messages`, { params });
    return unwrapData(response);
  },

  createThread: async (
    input: CreateThreadInput
  ): Promise<{ thread: MessageThread; message: ChatMessage | null }> => {
    const response = await api.post<
      ApiEnvelope<{ thread: MessageThread; message: ChatMessage | null }>
    >('/messages/threads', input);
    return unwrapData(response);
  },

  sendMessage: async (
    threadId: string,
    input: SendMessageInput | string
  ): Promise<ChatMessage> => {
    const body = typeof input === 'string' ? { content: input } : input;
    const response = await api.post<ApiEnvelope<{ message: ChatMessage }>>(
      `/messages/threads/${threadId}/messages`,
      body
    );
    const data = unwrapData(response);
    return data.message;
  },

  markAsRead: async (
    threadId: string
  ): Promise<{ threadId: string; unreadCount: number }> => {
    const response = await api.post<
      ApiEnvelope<{ threadId: string; unreadCount: number }>
    >(`/messages/threads/${threadId}/read`);
    return unwrapData(response);
  },
};
