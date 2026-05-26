import { API_URL } from '@/constants/api';

export type BlockedUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  blockedAt: string;
};

export const blockServices = {
  async blockUser(token: string, userId: string): Promise<void> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const res = await fetch(`${API_URL}/blocks/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to block user');
    }
  },

  async fetchBlockedUsers(token: string): Promise<BlockedUser[]> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const res = await fetch(`${API_URL}/blocks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to load blocked users');
    }

    return res.json();
  },

  async unblockUser(token: string, userId: string): Promise<void> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const res = await fetch(`${API_URL}/blocks/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to unblock user');
    }
  },
};

