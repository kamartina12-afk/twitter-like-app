import { API_URL } from '@/constants/api';
import type { FeedPageResponse, FeedType } from '@/types/feed.types';

const apiUrl = API_URL;

export type { FeedType } from '@/types/feed.types';

export const feedServices = {
  async fetchFeed(
    token: string,
    type: FeedType,
    page: number = 1,
    limit: number = 10,
  ): Promise<FeedPageResponse> {
    if (!apiUrl) {
      throw new Error('API_URL is not configured');
    }

    const response = await fetch(
      `${apiUrl}/posts/feed?page=${page}&limit=${limit}&type=${type}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to load feed');
    }

    return response.json();
  },
};

