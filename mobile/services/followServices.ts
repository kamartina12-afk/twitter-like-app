import { API_URL } from '@/constants/api';
import type { FollowListUser } from '@/types/follow.types';

export type FollowUser = FollowListUser;

export const followServices = {
  async fetchFollowers(token: string): Promise<FollowListUser[]> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const res = await fetch(`${API_URL}/users/me/followers`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to load followers');
    }

    return res.json();
  },

  async fetchFollowing(token: string): Promise<FollowListUser[]> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const res = await fetch(`${API_URL}/users/me/following`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to load following');
    }

    return res.json();
  },

  async toggleFollow(token: string, userId: string, isFollowing: boolean): Promise<void> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const endpoint = isFollowing ? 'unfollow' : 'follow';

    const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to toggle follow status');
    }
  },
};

