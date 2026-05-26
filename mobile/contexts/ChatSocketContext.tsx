import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_URL } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiMessage } from '@/services/chat.service';
import type { ApiNotification } from '@/services/notification.service';

type ChatSocketContextType = {
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (
    conversationId: string,
    content: string,
  ) => Promise<{ ok?: boolean; error?: string; message?: ApiMessage }>;
  onMessageNew: (cb: (message: ApiMessage) => void) => () => void;
  onNotificationNew: (cb: (notification: ApiNotification) => void) => () => void;
  emitTyping: (conversationId: string, isTyping: boolean) => void;
  onTyping: (
    cb: (data: { conversationId: string; userId: string; isTyping: boolean }) => void,
  ) => () => void;
};

const ChatSocketContext = createContext<ChatSocketContextType | null>(null);

const socketUrl =
  typeof window !== 'undefined'
    ? process.env.EXPO_PUBLIC_WS_URL || API_URL || 'http://localhost:3001'
    : '';

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Set<(message: ApiMessage) => void>>(new Set());
  const notificationListenersRef = useRef<
    Set<(notification: ApiNotification) => void>
  >(new Set());
  const typingListenersRef = useRef<
    Set<(data: { conversationId: string; userId: string; isTyping: boolean }) => void>
  >(new Set());

  useEffect(() => {
    if (!isAuthenticated || !user || !socketUrl) return;

    let isUnmounted = false;

    const connect = async () => {
      const token = await user.getIdToken();
      const socket = io(socketUrl, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        if (isUnmounted) return;
        setIsConnected(true);
      });
      socket.on('disconnect', () => {
        if (isUnmounted) return;
        setIsConnected(false);
      });
      socket.on('message:new', (message: ApiMessage) => {
        listenersRef.current.forEach((cb) => cb(message));
      });
      socket.on('notification:new', (notification: ApiNotification) => {
        notificationListenersRef.current.forEach((cb) => cb(notification));
      });
      socket.on('typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
        typingListenersRef.current.forEach((cb) => cb(data));
      });

      socketRef.current = socket;
    };

    connect();

    return () => {
      isUnmounted = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, user, user?.uid]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation:join', { conversationId });
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation:leave', { conversationId });
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    return new Promise<{ ok?: boolean; error?: string; message?: ApiMessage }>((resolve) => {
      if (!socketRef.current) {
        resolve({ error: 'Not connected' });
        return;
      }

      socketRef.current.emit(
        'message:send',
        { conversationId, content },
        (res: { ok?: boolean; error?: string; message?: ApiMessage }) => {
          resolve(res ?? {});
        },
      );
    });
  }, []);

  const onMessageNew = useCallback((cb: (message: ApiMessage) => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const onNotificationNew = useCallback(
    (cb: (notification: ApiNotification) => void) => {
      notificationListenersRef.current.add(cb);
      return () => {
        notificationListenersRef.current.delete(cb);
      };
    },
    [],
  );

  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { conversationId, isTyping });
  }, []);

  const onTyping = useCallback(
    (cb: (data: { conversationId: string; userId: string; isTyping: boolean }) => void) => {
      typingListenersRef.current.add(cb);
      return () => {
        typingListenersRef.current.delete(cb);
      };
    },
    [],
  );

  const value: ChatSocketContextType = {
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    onMessageNew,
    onNotificationNew,
    emitTyping,
    onTyping,
  };

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error('useChatSocket must be used within ChatSocketProvider');
  }
  return ctx;
}

