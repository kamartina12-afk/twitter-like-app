import { API_URL } from '@/constants/api';
import { auth } from '@/lib/firebase';

export interface ConversationListItem {
  id: string;
  type: string;
  updatedAt: string;
  participants: {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  hasUnread?: boolean;
  isBlocked?: boolean;
  blockedByMe?: boolean;
  blockedByOther?: boolean;
  hasBlockedParticipants?: boolean;
}

export interface Conversation {
  id: string;
  type: string;
  updatedAt: string;
  participants: {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }[];
  isBlocked?: boolean;
  blockedByMe?: boolean;
  blockedByOther?: boolean;
  hasBlockedParticipants?: boolean;
}

export interface GroupInvitePayload {
  ok: boolean;
  status?: 'accepted' | 'declined';
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: string;
  createdAt: string;
  sender: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
}

async function getAuthToken() {
  if (!API_URL) {
    throw new Error('API_URL is not configured');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  return user.getIdToken();
}

export const chatService = {
  async listConversations(): Promise<ConversationListItem[]> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/conversations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load conversations');
    }

    return response.json();
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load conversation');
    }

    return response.json();
  },

  async getMessages(
    conversationId: string,
    before?: string,
    limit = 50,
  ): Promise<ApiMessage[]> {
    const token = await getAuthToken();
    const params = new URLSearchParams();
    if (before) params.set('before', before);
    params.set('limit', String(limit));

    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/messages?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to load messages');
    }

    return response.json();
  },

  async markConversationRead(conversationId: string): Promise<void> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark conversation as read');
    }
  },

  async leaveGroup(conversationId: string): Promise<void> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/conversations/${conversationId}/leave`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to leave group conversation');
    }
  },

  async getOrCreateDirect(otherUserId: string): Promise<Conversation> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/conversations/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ otherUserId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }

    return response.json();
  },

  async createGroup(memberUserIds: string[], name?: string): Promise<Conversation> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/conversations/group`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ memberUserIds, name }),
    });

    if (!response.ok) {
      throw new Error('Failed to create group conversation');
    }

    return response.json();
  },
};

