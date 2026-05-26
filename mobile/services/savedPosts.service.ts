import { API_URL } from '@/constants/api';

export type SavedCollectionSummary = { id: string; name: string };

export const savedPostsService = {
  async fetchCollections(token: string): Promise<SavedCollectionSummary[]> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const response = await fetch(`${API_URL}/saved-posts/collections`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to load collections');
    }

    return response.json();
  },

  /**
   * Matches web `feedServices.toggleSavedPost`:
   * - omit `collectionName` for global toggle (save unsorted / remove all memberships).
   * - pass `__NO_COLLECTION__` to toggle only the unsorted entry.
   * - pass a name to toggle membership in that collection (creates collection if needed).
   */
  async toggleSavedPost(
    token: string,
    postId: string,
    collectionName?: string,
  ): Promise<{ saved: boolean }> {
    if (!API_URL) {
      throw new Error('API_URL is not configured');
    }

    const response = await fetch(
      `${API_URL}/saved-posts/${encodeURIComponent(postId)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(collectionName !== undefined
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        body:
          collectionName !== undefined
            ? JSON.stringify({ collectionName })
            : undefined,
      },
    );

    if (!response.ok) {
      throw new Error('Failed to toggle saved post');
    }

    return response.json() as Promise<{ saved: boolean }>;
  },
};
