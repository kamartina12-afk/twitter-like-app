import { API_URL } from '@/constants/api';

export type UpdateProfilePayload = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  birthDate?: string | null;
};

export const profileProfileServices = {
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

