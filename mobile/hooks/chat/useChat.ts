import { useCallback, useEffect, useRef, useState } from 'react';

import { useChatSocket } from '@/contexts/ChatSocketContext';
import type { ApiMessage } from '@/services/chat.service';
import { chatService } from '@/services/chat.service';
import { auth } from '@/lib/firebase';
import type { ChatAttachment } from '@/services/storage.service';
import { saveVoiceMessagesToFirestore } from '@/services/voiceMessages.service';

export type Message = {
  id: string;
  text: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  attachments?: ChatAttachment[];
};

type MessageContentPayload = {
  text?: string;
  attachments?: ChatAttachment[];
};

function parseMessageContent(content: string): {
  text: string;
  attachments?: ChatAttachment[];
} {
  try {
    const parsed = JSON.parse(content) as MessageContentPayload;
    if (parsed && typeof parsed === 'object') {
      const text = typeof parsed.text === 'string' ? parsed.text : '';
      const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : undefined;
      if (text || attachments?.length) {
        return { text, attachments };
      }
    }
  } catch {
    // ignore and fall back to raw content
  }
  return { text: content };
}

function apiMessageToMessage(m: ApiMessage): Message {
  const { text, attachments } = parseMessageContent(m.content);
  return {
    id: m.id,
    text,
    senderId: m.senderId,
    conversationId: m.conversationId,
    createdAt: m.createdAt,
    status: m.status as Message['status'],
    attachments,
  };
}

export function useChat(conversationId: string | null) {
  const {
    joinConversation,
    leaveConversation,
    sendMessage: socketSend,
    onMessageNew,
    onTyping,
  } = useChatSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const currentUserId = auth.currentUser?.uid ?? undefined;
  const hasMoreRef = useRef(true);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      hasMoreRef.current = true;
      return;
    }

    let cancelled = false;
    setLoading(true);
    hasMoreRef.current = true;

    chatService
      .getMessages(conversationId)
      .then((list) => {
        if (!cancelled) {
          setMessages(list.map(apiMessageToMessage));
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    joinConversation(conversationId);
    return () => leaveConversation(conversationId);
  }, [conversationId, joinConversation, leaveConversation]);

  useEffect(() => {
    const unsub = onMessageNew((apiMsg) => {
      if (apiMsg.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === apiMsg.id)) return prev;
        return [...prev, apiMessageToMessage(apiMsg)];
      });
    });
    return unsub;
  }, [conversationId, onMessageNew]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const unsub = onTyping((data) => {
      if (data.conversationId !== conversationId) return;
      if (data.userId === currentUserId) return;
      setIsOtherTyping(!!data.isTyping);
    });

    return () => {
      unsub();
      setIsOtherTyping(false);
    };
  }, [conversationId, currentUserId, onTyping]);

  const markMessagesReadOptimistic = useCallback(() => {
    if (!conversationId || !currentUserId) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.conversationId === conversationId && m.senderId !== currentUserId && m.status !== 'read'
          ? { ...m, status: 'read' as const }
          : m,
      ),
    );
  }, [conversationId, currentUserId]);

  const sendMessage = useCallback(
    async (text: string, attachments?: ChatAttachment[]) => {
      const trimmed = text.trim();
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
      if (!trimmed && !hasAttachments) return;
      if (!currentUserId || !conversationId) return;

      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        text: trimmed,
        senderId: currentUserId,
        conversationId,
        createdAt: new Date().toISOString(),
        status: 'sending',
        attachments,
      };
      setMessages((prev) => [...prev, optimistic]);

      const payload: MessageContentPayload = {
        text: trimmed || undefined,
        attachments: hasAttachments ? attachments : undefined,
      };
      const serializedContent = JSON.stringify(payload);

      try {
        const result = await socketSend(conversationId, serializedContent);

        if (result.error) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          return;
        }

        if (result.message) {
          const finalMessage = apiMessageToMessage(result.message);
          setMessages((prev) => {
            // Remove the optimistic temp message and any duplicate with the same final id
            const withoutTemp = prev.filter((m) => m.id !== tempId);
            const withoutDup = withoutTemp.filter((m) => m.id !== finalMessage.id);
            return [...withoutDup, finalMessage];
          });
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' as const } : m)),
          );
        }

        // Persist voice message metadata to Firestore when sending audio attachments
        if (hasAttachments && attachments?.some((a) => a.type.startsWith('audio/'))) {
          saveVoiceMessagesToFirestore({
            conversationId,
            senderId: currentUserId,
            attachments,
          }).catch(() => {
            // Ignore Firestore errors so chat sending is not blocked
          });
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [currentUserId, conversationId, socketSend],
  );

  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMoreRef.current || loadingMore) return;
    const firstId = messages[0]?.id;
    if (!firstId) return;

    setLoadingMore(true);
    try {
      const older = await chatService.getMessages(conversationId, firstId);
      if (older.length === 0) hasMoreRef.current = false;
      setMessages((prev) => [...older.map(apiMessageToMessage), ...prev]);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, messages, loadingMore]);

  return {
    messages,
    sendMessage,
    loadMore,
    currentUserId,
    loading,
    loadingMore,
    isOtherTyping,
    markMessagesReadOptimistic,
  };
}

