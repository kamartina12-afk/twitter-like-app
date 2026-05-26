import { API_URL } from '@/constants/api';

export type NotificationKind = 'like' | 'comment' | 'follow' | 'mention' | 'system';

export interface ApiNotification {
  id: string;
  type: NotificationKind | string;
  message: string;
  createdAt: string;
  readAt: string | null;
  /** Present for post / comment engagement notifications. */
  postId?: string | null;
  commentId?: string | null;
  /** Present for follow + some system notifications. */
  actorId?: string | null;
}

export function isChatNotification(n: ApiNotification): boolean {
  // Backend uses `type: 'message'` for chat message notifications.
  return n.type === 'message';
}

export function filterOutChatNotifications(list: ApiNotification[]): ApiNotification[] {
  return list.filter((n) => !isChatNotification(n));
}

export const fetchNotifications = async (
  token: string,
): Promise<ApiNotification[]> => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load notifications');
  }

  return response.json();
};

export const fetchUnreadCountExcludingChat = async (token: string): Promise<number> => {
  const list = await fetchNotifications(token);
  return filterOutChatNotifications(list).filter((n) => !n.readAt).length;
};

export const fetchUnreadCount = async (token: string): Promise<number> => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/notifications/unread-count`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load notification unread count');
  }

  const data = await response.json();
  return typeof data.count === 'number' ? data.count : 0;
};

export const markOneAsRead = async (
  token: string,
  id: string,
): Promise<void> => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
};

export const markAllAsRead = async (token: string): Promise<void> => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/notifications/mark-read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
};

