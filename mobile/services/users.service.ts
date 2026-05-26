import axios from 'axios';

import { API_URL } from '@/constants/api';

const API = process.env.EXPO_PUBLIC_API_URL;

export const searchUsers = async (token: string, query: string) => {
  const { data } = await axios.get(`${API}/users/search`, {
    params: { q: query },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data;
};

export type PublicUserProfile = {
  id: string;
  username: string;
  displayName?: string | null;
  email?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  createdAt?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
};

/** Loads a user by Firebase uid or username (`GET /users/:identifier`). */
export const fetchUserProfile = async (
  token: string,
  identifier: string,
): Promise<PublicUserProfile | null> => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const res = await fetch(`${API_URL}/users/${encodeURIComponent(identifier)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error('Failed to load user profile');
  }

  const data = (await res.json()) as PublicUserProfile | null;
  return data;
};