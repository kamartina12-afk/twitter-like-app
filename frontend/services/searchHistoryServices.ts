import { apiUrl } from './notificationServices';
import type { SearchResult } from '@/components/SearchBar/types';
import type { ExploreHistoryItem } from '@/components/ExploreTab/types';

export type SearchHistoryItem = ExploreHistoryItem;

export const searchHistoryServices = {
  async fetchHistory(token: string): Promise<SearchHistoryItem[]> {
    const res = await fetch(`${apiUrl}/search-history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to load search history');
    }

    const data = await res.json();
    return Array.isArray(data) ? (data as SearchHistoryItem[]) : [];
  },

  async addUserSearch(token: string, user: SearchResult): Promise<void> {
    await fetch(`${apiUrl}/search-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: user.username,
        targetId: user.id,
        type: 'user',
      }),
    });
  },

  async deleteEntry(token: string, historyId: string): Promise<void> {
    await fetch(`${apiUrl}/search-history/${historyId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async clearAll(token: string): Promise<void> {
    await fetch(`${apiUrl}/search-history`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
