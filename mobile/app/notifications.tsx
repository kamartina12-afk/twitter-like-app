import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '@/contexts/AuthContext';
import { QUERY_KEYS } from '@/constants/queryKeys';
import type { ApiNotification } from '@/services/notification.service';
import {
  filterOutChatNotifications,
  fetchNotifications,
  fetchUnreadCountExcludingChat,
  markAllAsRead,
  markOneAsRead,
} from '@/services/notification.service';
import { ChevronLeft } from 'lucide-react-native';
import { chatService } from '@/services/chat.service';
import { fetchUserProfile } from '@/services/users.service';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  React.useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [router, user]);

  const {
    data: notifications,
    isLoading,
    isError,
  } = useQuery<ApiNotification[]>({
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      const list = await fetchNotifications(token);
      return filterOutChatNotifications(list);
    },
    enabled: !!user,
  });

  useQuery<number>({
    queryKey: [...QUERY_KEYS.NOTIFICATIONS, 'unread-count'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      return fetchUnreadCountExcludingChat(token);
    },
    enabled: !!user,
  });

  const handlePressNotification = useCallback(
    async (item: ApiNotification) => {
      if (!user) return;

      // 🔥 NAVIGATION
      const birthdayHandle = (() => {
        if (!/birthday/i.test(item.message)) return null;
        // Backend birthday message includes `It's @username's birthday today!...`
        const m = item.message.match(/@([A-Za-z0-9_]{1,32})/);
        return m?.[1] ?? null;
      })();

      if (item.postId) {
        const qs = item.commentId
          ? `?focusCommentId=${encodeURIComponent(item.commentId)}`
          : '';
        router.push(`/post/${item.postId}${qs}` as never);
      } else if (item.actorId) {
        router.push(`/profile/${item.actorId}` as never);
      } else if (birthdayHandle && item.type === 'system') {
        const congratulateText = `Happy Birthday, @${birthdayHandle}!`;

        Alert.alert('Birthday', item.message, [
          {
            text: 'Congratulate',
            onPress: () => {
              router.push(
                {
                  pathname: '/(tabs)/create',
                  params: { initialText: congratulateText },
                } as never,
              );
            },
          },
          {
            text: 'Chat',
            onPress: async () => {
              try {
                const token = await user.getIdToken();
                const profile = await fetchUserProfile(token, birthdayHandle);

                // Fallback: if we can’t resolve the user, just open the profile.
                if (!profile?.id || !profile.username) {
                  router.push(`/profile/${birthdayHandle}` as never);
                  return;
                }

                const conv = await chatService.getOrCreateDirect(profile.id);
                router.push(
                  {
                    pathname: '/(tabs)/chat',
                    params: {
                      conversationId: conv.id,
                      draft: `Happy birthday, @${profile.username}!`,
                    },
                  } as never,
                );
              } catch {
                router.push(`/profile/${birthdayHandle}` as never);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }

      // ✅ READ LOGIC (your existing code stays the same)
      if (item.readAt) return;
  
      const optimisticReadAt = new Date().toISOString();
      const prevNotifications =
        queryClient.getQueryData<ApiNotification[]>(QUERY_KEYS.NOTIFICATIONS);
      const prevUnread = queryClient.getQueryData<number>([
        ...QUERY_KEYS.NOTIFICATIONS,
        'unread-count',
      ]);
  
      queryClient.setQueryData<ApiNotification[]>(
        QUERY_KEYS.NOTIFICATIONS,
        (prev) =>
          prev?.map((n) =>
            n.id === item.id ? { ...n, readAt: optimisticReadAt } : n,
          ) ?? prev,
      );
  
      queryClient.setQueryData<number>(
        [...QUERY_KEYS.NOTIFICATIONS, 'unread-count'],
        (prevCount) => Math.max((prevCount ?? 0) - 1, 0),
      );
  
      try {
        const token = await user.getIdToken();
        await markOneAsRead(token, item.id);
      } catch {
        queryClient.setQueryData(
          QUERY_KEYS.NOTIFICATIONS,
          prevNotifications,
        );
        queryClient.setQueryData(
          [...QUERY_KEYS.NOTIFICATIONS, 'unread-count'],
          prevUnread,
        );
      }
    },
    [queryClient, router, user],
  );  

  useFocusEffect(
    useCallback(() => {
      return () => {
        const cachedNotifications =
          queryClient.getQueryData<ApiNotification[]>(QUERY_KEYS.NOTIFICATIONS) ?? [];
        const unread = cachedNotifications.filter((n) => !n.readAt);
        if (!user || unread.length === 0) return;

        const optimisticReadAt = new Date().toISOString();
        const prevNotifications = cachedNotifications;
        const prevUnread = queryClient.getQueryData<number | undefined>([
          ...QUERY_KEYS.NOTIFICATIONS,
          'unread-count',
        ]);

        queryClient.setQueryData<ApiNotification[] | undefined>(
          QUERY_KEYS.NOTIFICATIONS,
          unread.length > 0
            ? prevNotifications.map((n) => (n.readAt ? n : { ...n, readAt: optimisticReadAt }))
            : prevNotifications,
        );
        queryClient.setQueryData<number | undefined>(
          [...QUERY_KEYS.NOTIFICATIONS, 'unread-count'],
          0,
        );

        user
          .getIdToken()
          .then((token) => markAllAsRead(token))
          .catch(() => {
            queryClient.setQueryData<ApiNotification[] | undefined>(
              QUERY_KEYS.NOTIFICATIONS,
              prevNotifications,
            );
            queryClient.setQueryData<number | undefined>(
              [...QUERY_KEYS.NOTIFICATIONS, 'unread-count'],
              prevUnread,
            );
          });
      };
    }, [queryClient, user]),
  );

  const renderItem = ({ item }: { item: ApiNotification }) => (
    <Pressable
      onPress={() => handlePressNotification(item)}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#111827',
        backgroundColor: item.readAt ? '#020617' : '#0b1220',
      }}
    >
      {!item.readAt && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: '#38bdf8',
          }}
        />
      )}
      <Text
        style={{
          color: '#f9fafb',
          fontSize: 14,
          marginBottom: 4,
          fontWeight: item.readAt ? '400' : '600',
        }}
      >
        {item.message}
      </Text>
      <Text style={{ color: '#9ca3af', fontSize: 12 }}>{item.type}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#111827',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ paddingRight: 12, paddingVertical: 4 }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', marginRight: 36 }}>
          <Text
            style={{
              color: '#f9fafb',
              fontSize: 18,
              fontWeight: '700',
            }}
          >
            Notifications
          </Text>
        </View>
      </View>

      {isLoading && (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="small" color="#f9fafb" />
        </View>
      )}

      {isError && !isLoading && (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#f87171' }}>
            Failed to load notifications.
          </Text>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={notifications ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <Text style={{ color: '#9ca3af' }}>
                No notifications yet. They&apos;ll appear here when you have
                activity.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

