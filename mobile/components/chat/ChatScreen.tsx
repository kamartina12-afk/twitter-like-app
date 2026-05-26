import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { chatService, type ConversationListItem } from '@/services/chat.service';
import type { ChatAttachment } from '@/services/storage.service';
import { useChat } from '@/hooks/chat/useChat';
import { useConversationTheme } from '@/hooks/chat/useConversationTheme';
import { useSearchUsers } from '@/hooks/search/useSearchUsers';
import { useTabPressRefresh } from '@/hooks/useTabPressRefresh';
import { auth } from '@/lib/firebase';
import ConversationsListView from './ConversationsListView';
import ConversationRoomView from './ConversationRoomView';
import CreateGroupChatModal from './CreateGroupChatModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHAT_SWIPE_EDGE_FRACTION = 0.22;
const CHAT_SWIPE_VELOCITY = 0.45;
const CHAT_EDGE_PX = 40;

export function ChatScreen() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [search, setSearch] = useState('');
  const params = useLocalSearchParams<{
    conversationId?: string | string[];
    draft?: string | string[];
  }>();
  const router = useRouter();
  const lastSwipeToHomeAt = useRef(0);
  const selectedConversationIdRef = useRef<string | null>(null);
  selectedConversationIdRef.current = selectedConversationId;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'] as any;
  const queryClient = useQueryClient();
  const currentUserId = auth.currentUser?.uid ?? undefined;

  const routeConversationId = React.useMemo(() => {
    const raw = params.conversationId;
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
  }, [params.conversationId]);

  const routeDraftText = React.useMemo(() => {
    const raw = params.draft;
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
  }, [params.draft]);

  const draftTextForSelectedConversation =
    routeConversationId && selectedConversationId
      ? selectedConversationId === routeConversationId
        ? routeDraftText
        : undefined
      : undefined;

  const openProfileForConversation = useCallback(
    (conv: ConversationListItem) => {
      if (!currentUserId) return;
      const other = conv.participants.find((p) => p.userId !== currentUserId);
      if (other?.userId) {
        router.push(`/profile/${other.userId}`);
      }
    },
    [currentUserId, router],
  );

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.listConversations(),
  });

  React.useEffect(() => {
    const raw = params.conversationId;
    const id =
      typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (id) {
      setSelectedConversationId(id);
    }
  }, [params.conversationId]);

  const handleChatTabPressRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [queryClient]);

  useTabPressRefresh(handleChatTabPressRefresh);

  useFocusEffect(
    useCallback(() => {
      // No-op: keep hook for potential focus-only side effects later.
    }, []),
  );

  const navigateHomeFromSwipe = useCallback(() => {
    const now = Date.now();
    if (now - lastSwipeToHomeAt.current < 700) {
      return;
    }
    lastSwipeToHomeAt.current = now;
    router.navigate('/(tabs)');
  }, [router]);

  const chatListPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        if (selectedConversationIdRef.current) return false;
        const startX = evt.nativeEvent.pageX;
        return (
          startX < CHAT_EDGE_PX &&
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.15
        );
      },

      onPanResponderMove: (_, gestureState) => {
        // Keep chat content fixed; only use swipe to decide navigation.
        if (gestureState.dx < 0) return;
      },

      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const threshold = SCREEN_WIDTH * CHAT_SWIPE_EDGE_FRACTION;

        if (dx > threshold || vx > CHAT_SWIPE_VELOCITY) {
          navigateHomeFromSwipe();
          return;
        }
      },
    }),
  ).current;

  React.useEffect(() => {
    // Keep tab badge roughly in sync with server truth when conversations load/refresh.
    const unread = conversations.filter((c) => !!c.hasUnread).length;
    queryClient.setQueryData<number | undefined>(
      [...QUERY_KEYS.CHAT_UNREAD, 'count'],
      unread,
    );
  }, [conversations, queryClient]);

  const { data: searchResults = [] } = useSearchUsers(search);

  const {
    messages,
    sendMessage: sendMessageSocket,
    loadMore,
    loading: messagesLoading,
    loadingMore,
    isOtherTyping,
    markMessagesReadOptimistic,
  } = useChat(selectedConversationId);

  const { bubbleColors, cycleTheme } = useConversationTheme(selectedConversationId);

  const sendMessage = React.useCallback(
    async (text: string, attachments?: ChatAttachment[]) => {
      // Optimistically update conversation preview so the last message appears in the chat list immediately.
      if (selectedConversationId && currentUserId) {
        const trimmed = text.trim();
        const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
        const payload = {
          text: trimmed || undefined,
          attachments: hasAttachments ? attachments : undefined,
        };
        const serializedContent = JSON.stringify(payload);

        const createdAt = new Date().toISOString();
        const tempId = `temp-lastmsg-${Date.now()}`;

        queryClient.setQueryData<ConversationListItem[] | undefined>(['conversations'], (existing) =>
          existing?.map((c) =>
            c.id === selectedConversationId
              ? {
                  ...c,
                  updatedAt: createdAt,
                  hasUnread: false,
                  lastMessage: {
                    id: tempId,
                    content: serializedContent,
                    createdAt,
                    senderId: currentUserId,
                  },
                }
              : c,
          ),
        );
      }

      // Send through socket + refresh conversations so server truth (message id/status) replaces optimistic preview.
      await sendMessageSocket(text, attachments);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    [currentUserId, queryClient, selectedConversationId, sendMessageSocket],
  );

  const markConversationReadMutation = useMutation({
    mutationFn: (conversationId: string) => chatService.markConversationRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      Haptics.selectionAsync().catch(() => {});

      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv || !conv.hasUnread) return;

      if (markConversationReadMutation.isPending) return;

      markMessagesReadOptimistic();
      queryClient.setQueryData<ConversationListItem[] | undefined>(['conversations'], (existing) =>
        existing?.map((c) => (c.id === conversationId ? { ...c, hasUnread: false } : c)) ??
        existing,
      );
      queryClient.setQueryData<number | undefined>(
        [...QUERY_KEYS.CHAT_UNREAD, 'count'],
        (prev) => Math.max((prev ?? 0) - 1, 0),
      );
      markConversationReadMutation.mutate(conversationId);
    },
    [
      conversations,
      markConversationReadMutation,
      markMessagesReadOptimistic,
      queryClient,
      setSelectedConversationId,
    ],
  );

  const handleStartChatWithUser = useCallback(
    async (user: any) => {
      try {
        const conv = await chatService.getOrCreateDirect(user.id);
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        setSelectedConversationId(conv.id);
        setSearch('');
      } catch {
        // ignore for now
      }
    },
    [queryClient],
  );

  const createGroupMutation = useMutation({
    mutationFn: (payload: { memberUserIds: string[]; name: string }) =>
      chatService.createGroup(payload.memberUserIds, payload.name),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversationId(conversation.id);
      setCreateGroupOpen(false);
    },
  });

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      edges={['top', 'bottom']}
    >
      <Animated.View
        style={{
          flex: 1,
        }}
        {...chatListPanResponder.panHandlers}
      >
      <ThemedView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        {!selectedConversationId ? (
          <ConversationsListView
            colors={colors}
            conversations={conversations}
            conversationsLoading={conversationsLoading}
            search={search}
            setSearch={setSearch}
            searchResults={searchResults}
            currentUserId={currentUserId}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onStartChatWithUser={handleStartChatWithUser}
            onPressConversationAvatar={openProfileForConversation}
            onOpenCreateGroup={() => setCreateGroupOpen(true)}
          />
        ) : (
          <ConversationRoomView
            colors={colors}
            currentUserId={currentUserId}
            selectedConversation={selectedConversation}
            selectedConversationId={selectedConversationId}
            messages={messages}
            messagesLoading={messagesLoading}
            loadingMore={loadingMore}
            loadMore={loadMore}
            draftText={draftTextForSelectedConversation}
            isOtherTyping={isOtherTyping}
            sendMessage={sendMessage}
            bubbleColors={bubbleColors}
            cycleTheme={cycleTheme}
            onBack={() => setSelectedConversationId(null)}
            onPressProfile={
              selectedConversation
                ? () => openProfileForConversation(selectedConversation)
                : undefined
            }
          />
        )}
        <CreateGroupChatModal
          visible={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          onCreate={async (payload) => {
            await createGroupMutation.mutateAsync(payload);
          }}
        />
      </ThemedView>
      </Animated.View>
    </SafeAreaView>
  );
}

