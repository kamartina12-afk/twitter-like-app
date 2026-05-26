import { API_URL } from '@/constants/api';
import { auth } from '@/lib/firebase';
import type { FeedPageResponse } from '@/types/feed.types';

type CreatePostPayload = {
  content: string;
  imageUrl?: string | string[] | null;
  gifUrl?: string | null;
  videoUrl?: string | null;
  mediaAspectRatio?: number | null;
  poll?: {
    question?: string;
    options: string[];
    expiresAt: string;
  };
};

export const createPost = async (payload: CreatePostPayload) => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: payload.content,
      imageUrl: payload.imageUrl ?? undefined,
      gifUrl: payload.gifUrl ?? undefined,
      videoUrl: payload.videoUrl ?? undefined,
      mediaAspectRatio: payload.mediaAspectRatio ?? undefined,
      poll: payload.poll,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create post');
  }

  return response.json();
};

export const deletePost = async (postId: string) => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete post');
  }

  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

export const getPosts = async () => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const response = await fetch(`${API_URL}/posts`);

  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }

  return response.json();
};

export const getPost = async (id: string) => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();
  const response = await fetch(
    `${API_URL}/posts/${encodeURIComponent(id)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch post');
  }

  return response.json();
};

export const toggleLike = async (postId: string) => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}/likes/${postId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to like post');
  }
};

export const toggleRepost = async (postId: string) => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ originalPostId: postId }),
  });

  if (!response.ok) {
    throw new Error('Failed to repost');
  }
};

export type ExplorePostsResponse = FeedPageResponse;

export const getExplorePosts = async (params?: {
  page?: number;
  limit?: number;
}): Promise<ExplorePostsResponse> => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  const response = await fetch(
    `${API_URL}/posts/explore?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch explore posts');
  }

  return response.json();
};

export const getPostsByHashtag = async (
  hashtagName: string,
  params?: { page?: number; limit?: number },
): Promise<ExplorePostsResponse> => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const name = encodeURIComponent(hashtagName.replace(/^#/, '').toLowerCase());

  const response = await fetch(
    `${API_URL}/posts/by-hashtag/${name}?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch posts for hashtag');
  }

  return response.json();
};

export const recordPostView = async (postId: string): Promise<boolean> => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/view`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to record post view');
  }

  try {
    const body = (await response.json()) as { recorded?: boolean };
    return body.recorded === true;
  } catch {
    return false;
  }
};

export const voteOnPoll = async (postId: string, optionId: string) => {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();
  const response = await fetch(
    `${API_URL}/posts/${encodeURIComponent(postId)}/poll/vote`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ optionId }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to vote on poll');
  }
};
