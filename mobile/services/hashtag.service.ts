import { API_URL } from '@/constants/api';
import { auth } from '@/lib/firebase';

export type HashtagRecord = {
  id: string;
  name: string;
};

export const searchHashtags = async (prefix: string): Promise<HashtagRecord[]> => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const trimmed = prefix.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();
  const q = encodeURIComponent(trimmed);

  const response = await fetch(`${API_URL}/hashtags/search?q=${q}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to search hashtags');
  }

  return response.json();
};
