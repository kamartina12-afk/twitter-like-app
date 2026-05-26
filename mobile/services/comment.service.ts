import { API_URL } from '@/constants/api';
import { auth } from '@/lib/firebase';

export type ApiCommentThread = {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  user: {
    id: string;
    username: string;
    displayName: string | null;
  };
  likesCount: number;
  isLikedByMe: boolean;
  replies: ApiCommentThread[];
};

export async function fetchCommentsForPost(
  postId: string,
): Promise<ApiCommentThread[]> {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  const token = await user.getIdToken();
  const response = await fetch(
    `${API_URL}/comments/${encodeURIComponent(postId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) {
    throw new Error('Failed to load comments');
  }
  return response.json() as Promise<ApiCommentThread[]>;
}

export async function postComment(params: {
  postId: string;
  content: string;
  parentId?: string | null;
}): Promise<ApiCommentThread> {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  const token = await user.getIdToken();
  const response = await fetch(
    `${API_URL}/comments/${encodeURIComponent(params.postId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: params.content,
        parentId: params.parentId ?? undefined,
      }),
    },
  );
  if (!response.ok) {
    throw new Error('Failed to post comment');
  }
  return response.json() as Promise<ApiCommentThread>;
}

export async function toggleCommentLike(
  commentId: string,
): Promise<{ liked: boolean }> {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  const token = await user.getIdToken();
  const response = await fetch(
    `${API_URL}/comment-likes/${encodeURIComponent(commentId)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) {
    throw new Error('Failed to toggle comment like');
  }
  return response.json() as Promise<{ liked: boolean }>;
}
