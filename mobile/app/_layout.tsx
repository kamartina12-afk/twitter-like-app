import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ChatSocketProvider, useChatSocket } from '@/contexts/ChatSocketContext';
import { queryClient } from '@/lib/queryClient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRegisterPushNotifications } from '@/hooks/useRegisterPushNotifications';
import { useNotificationResponseRouting } from '@/hooks/useNotificationResponseRouting';
import { QUERY_KEYS } from '@/constants/queryKeys';
import type { ApiNotification } from '@/services/notification.service';
import type { ApiMessage, ConversationListItem } from '@/services/chat.service';

export const unstable_settings = {
  anchor: '(tabs)',
};

function PushNotificationsRegistrar() {
  useRegisterPushNotifications();
  useNotificationResponseRouting();
  return null;
}

function NotificationsRealtimeBridge() {
  const queryClient = useQueryClient();
  const { onNotificationNew } = useChatSocket();

  React.useEffect(() => {
    const unsubscribe = onNotificationNew((notification: ApiNotification) => {
      // Chat messages are represented as notifications in the backend (`type: 'message'`).
      // We route those to the Chat tab badge instead of the bell.
      if (notification.type === 'message') {
        if (!notification.readAt) {
          queryClient.setQueryData<number | undefined>(
            [...QUERY_KEYS.CHAT_UNREAD, 'count'],
            (prev) => (prev ?? 0) + 1,
          );
        }
        return;
      }

      queryClient.setQueryData<ApiNotification[] | undefined>(
        QUERY_KEYS.NOTIFICATIONS,
        (prev) => {
          const current = prev ?? [];
          if (current.some((n) => n.id === notification.id)) {
            return current;
          }
          return [notification, ...current];
        },
      );

      queryClient.setQueryData<number | undefined>(
        [...QUERY_KEYS.NOTIFICATIONS, 'unread-count'],
        (prevCount) =>
          (prevCount ?? 0) + (notification.readAt ? 0 : 1),
      );
    });

    return unsubscribe;
  }, [onNotificationNew, queryClient]);

  return null;
}

function ChatUnreadRealtimeBridge() {
  const queryClient = useQueryClient();
  const { onMessageNew } = useChatSocket();
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) return;

    const unsubscribe = onMessageNew((message: ApiMessage) => {
      // Only count messages coming from other users.
      if (message.senderId === user.uid) return;

      queryClient.setQueryData<number | undefined>(
        [...QUERY_KEYS.CHAT_UNREAD, 'count'],
        (prev) => (prev ?? 0) + 1,
      );

      // Best-effort: mark the conversation as unread in the cached list if present.
      queryClient.setQueryData<ConversationListItem[] | undefined>(
        ['conversations'],
        (prev) => {
          if (!prev) return prev;
          const idx = prev.findIndex((c) => c.id === message.conversationId);
          if (idx === -1) return prev;

          const existing = prev[idx];
          const updated: ConversationListItem = {
            ...existing,
            updatedAt: message.createdAt,
            hasUnread: true,
            lastMessage: {
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
          };

          // Move updated conversation to the top for immediate UI feedback.
          const next = prev.slice();
          next.splice(idx, 1);
          return [updated, ...next];
        },
      );
    });

    return unsubscribe;
  }, [onMessageNew, queryClient, user]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ChatSocketProvider>
              <PushNotificationsRegistrar />
              <NotificationsRealtimeBridge />
              <ChatUnreadRealtimeBridge />
              <Stack
                screenOptions={{
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}
              >
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="register" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="camera"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_left',
                    gestureDirection: 'horizontal',
                  }}
                />
                <Stack.Screen
                  name="chat-photo-send"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureDirection: 'horizontal',
                  }}
                />
                <Stack.Screen
                  name="notifications"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="explore-media-feed"
                  options={{
                    headerShown: false,
                    animation: 'fade',
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="post/[id]"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="profile/[id]"
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen name="followers" options={{ headerShown: false }} />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: 'modal', title: 'Modal' }}
                />
              </Stack>
              <StatusBar style="light" />
            </ChatSocketProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
