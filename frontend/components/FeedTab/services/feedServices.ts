const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

export const feedServices = {
  async fetchFeed(
    token: string,
    page: number = 1,
    limit: number = 10,
    type: 'for_you' | 'following' = 'for_you',
  ) {
    const response = await fetch(`${apiUrl}/posts/feed?page=${page}&limit=${limit}&type=${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to load feed');
    return response.json();
  },

  async createPost(
    token: string,
    content: string,
    imageUrl?: string,
    gifUrl?: string,
    videoUrl?: string,
    poll?: {
      question?: string;
      options: string[];
      expiresAt: string;
    },
  ) {
    const response = await fetch(`${apiUrl}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content, imageUrl, gifUrl, videoUrl, poll }),
    });
    if (!response.ok) throw new Error('Failed to create post');
    return response.json();
  },

  async likePost(token: string, postId: string) {
    const response = await fetch(`${apiUrl}/likes/${postId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to like post');
    return response.json();
  },

  async unlikePost(token: string, postId: string) {
    const response = await fetch(`${apiUrl}/likes/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to unlike post');
    return response.json();
  },

  async fetchComments(token: string, postId: string) {
    const response = await fetch(`${apiUrl}/comments/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return response.json();
  },

  async createComment(token: string, postId: string, content: string) {
    const response = await fetch(`${apiUrl}/comments/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Failed to create comment');
    return response.json();
  },

  async fetchMentionSuggestions(token: string, query: string) {
    const params = new URLSearchParams();
    if (query) {
      params.set('q', query);
    }
    const response = await fetch(`${apiUrl}/users/mentions?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to load mention suggestions');
    }
    return response.json();
  },

  async repostPost(token: string, postId: string, content?: string) {
    const response = await fetch(`${apiUrl}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ originalPostId: postId, content }),
    });
    if (!response.ok) throw new Error('Failed to repost');
    return response.json();
  },

  async unrepostPost(token: string, originalPostId: string) {
    const response = await fetch(`${apiUrl}/posts/unrepost/${originalPostId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to unrepost');
  },

  async deletePost(token: string, postId: string) {
    const response = await fetch(`${apiUrl}/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to delete post');
    return response.json();
  },

  async toggleSavedPost(token: string, postId: string, collectionName?: string) {
    const response = await fetch(`${apiUrl}/saved-posts/${postId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(collectionName ? { 'Content-Type': 'application/json' } : {}),
      },
      body: collectionName ? JSON.stringify({ collectionName }) : undefined,
    });
    if (!response.ok) {
      throw new Error('Failed to toggle saved post');
    }
    return response.json() as Promise<{ saved: boolean }>;
  },

  async fetchSavedPosts(token: string) {
    const response = await fetch(`${apiUrl}/saved-posts/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to load saved posts');
    }
    return response.json();
  },

  async fetchSavedCollections(token: string) {
    const response = await fetch(`${apiUrl}/saved-posts/collections`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to load saved collections');
    }
    return response.json();
  },

  async renameSavedCollection(token: string, id: string, name: string) {
    const response = await fetch(`${apiUrl}/saved-posts/collections/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error('Failed to rename collection');
    }
    return response.json() as Promise<{ id: string; name: string }>;
  },

  async deleteSavedCollection(token: string, id: string) {
    const response = await fetch(`${apiUrl}/saved-posts/collections/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete collection');
    }
    return response.json() as Promise<{ success: boolean }>;
  },

  async voteOnPoll(token: string, postId: string, optionId: string) {
    const response = await fetch(`${apiUrl}/posts/${postId}/poll/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ optionId }),
    });
    if (!response.ok) {
      throw new Error('Failed to vote on poll');
    }
    return response.json();
  },
};
