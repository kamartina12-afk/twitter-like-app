import { API_URL } from '@/constants/api';
import type { FeedPost } from '@/components/post/feed/types/types';

export type UpdateProfilePayload = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  birthDate?: string | null;
};

export const profileServices = {
  async fetchUserPosts(token: string, username: string): Promise<FeedPost[]> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const response = await fetch(`${API_URL}/posts/user/${encodeURIComponent(username)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load profile posts');
    }

    return response.json();
  },

  async fetchMentionedPosts(token: string, username: string): Promise<FeedPost[]> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const response = await fetch(
      `${API_URL}/posts/mentions/${encodeURIComponent(username)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to load mentioned posts');
    }

    return response.json();
  },

  async fetchSavedPosts(token: string): Promise<FeedPost[]> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const response = await fetch(`${API_URL}/saved-posts/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load saved posts');
    }

    return response.json();
  },

  async updateProfile(token: string, data: UpdateProfilePayload) {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return response.json();
  },
};

