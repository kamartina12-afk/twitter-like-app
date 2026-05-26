import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ChevronLeft } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import type { ConversationListItem } from '@/services/chat.service';
import type { Message } from '@/hooks/chat/useChat';
import type { ChatAttachment } from '@/services/storage.service';

import MessageInput from './MessageInput';
import VoiceMessageBubble from './VoiceMessageBubble';
import { getConversationDisplayName } from './chat.utils';

type BubbleColors = {
  ownBubble: string;
  otherBubble: string;
};

function getBubbleTextColor(backgroundHex: string) {
  const hex = backgroundHex.replace('#', '');
  const normalized = hex.length === 3 ? hex.split('').map((c) => `${c}${c}`).join('') : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0F172A' : '#F8FAFC';
}

type ConversationRoomViewProps = {
  colors: any;
  currentUserId: string | undefined;
  selectedConversation: ConversationListItem | null;
  selectedConversationId: string;
  messages: Message[];
  messagesLoading: boolean;
  loadingMore: boolean;
  /** Pre-fills the message composer (used when navigating from notifications). */
  draftText?: string;
  loadMore: () => void;
  isOtherTyping: boolean;
  sendMessage: (text: string, attachments?: ChatAttachment[]) => Promise<void> | void;
  bubbleColors: BubbleColors;
  cycleTheme: () => void;
  onBack: () => void;
  onPressProfile?: () => void;
};

const ConversationRoomView: React.FC<ConversationRoomViewProps> = ({
  colors,
  currentUserId,
  selectedConversation,
  selectedConversationId,
  messages,
  messagesLoading,
  loadingMore,
  draftText,
  loadMore,
  isOtherTyping,
  sendMessage,
  bubbleColors,
  cycleTheme,
  onBack,
  onPressProfile,
}) => {
  const listRef = useRef<FlatList<Message> | null>(null);
  const keyboardVisibleRef = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const bottomInset = Math.max(insets.bottom, tabBarHeight + 8);

  useEffect(() => {
    // When the keyboard opens, keep the chat scrolled to the newest messages.
    const sub = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardVisibleRef.current = true;
      // RN gives keyboard "end" height (px). Use it to ensure the input isn't covered.
      setKeyboardHeight((e?.endCoordinates?.height as number) ?? 0);
      listRef.current?.scrollToEnd({ animated: true });
    });
    const subHide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardVisibleRef.current = false;
      setKeyboardHeight(0);
    });
    return () => {
      sub.remove();
      subHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!keyboardVisibleRef.current) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        paddingBottom: keyboardVisibleRef.current
          ? keyboardHeight + insets.bottom
          : bottomInset,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={tabBarHeight + 8}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 8,
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={onBack}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <ChevronLeft size={20} color={colors.tint} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {selectedConversation ? (
            (() => {
              const otherParticipants = selectedConversation.participants.filter(
                (p) => p.userId !== currentUserId,
              );
              const other = otherParticipants[0] ?? selectedConversation.participants[0];
              const avatarUrl = other?.avatarUrl ?? null;
              const initials =
                (other?.displayName || other?.username || '?')[0]?.toUpperCase() ?? '?';
              return (
                <Pressable
                  onPress={onPressProfile}
                  disabled={!onPressProfile}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#020617',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ color: '#e5e7eb', fontWeight: '700' }}>{initials}</Text>
                  )}
                </Pressable>
              );
            })()
          ) : null}
          <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>
            {selectedConversation
              ? getConversationDisplayName(selectedConversation, currentUserId)
              : 'Chat'}
          </ThemedText>
        </View>
        <Pressable
          onPress={cycleTheme}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: bubbleColors.ownBubble,
              marginRight: 2,
            }}
          />
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: bubbleColors.otherBubble,
            }}
          />
        </Pressable>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 8,
          paddingVertical: 4,
          backgroundColor: colors.background,
        }}
      >
        {messagesLoading ? (
          <ThemedText>Loading messages…</ThemedText>
        ) : (
          <FlatList
            ref={listRef}
            data={[...messages].reverse()}
            keyExtractor={(item) => item.id}
            inverted
            onEndReached={() => {
              if (!loadingMore) {
                loadMore();
              }
            }}
            onEndReachedThreshold={0.2}
            renderItem={({ item }) => {
              const isOwn = currentUserId ? item.senderId === currentUserId : false;
              const timeLabel = item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : undefined;

              let statusLabel: string | null = null;
              if (isOwn) {
                if (item.status === 'sending') {
                  statusLabel = 'Sending...';
                } else if (item.status === 'read') {
                  statusLabel = 'Read';
                } else if (item.status === 'sent') {
                  statusLabel = 'Sent';
                } else if (item.status === 'delivered') {
                  statusLabel = 'Delivered';
                }
              }

              const bubbleColor = isOwn ? bubbleColors.ownBubble : bubbleColors.otherBubble;
              const bubbleTextColor = getBubbleTextColor(bubbleColor);
              const isUnseenOwn =
                isOwn && (item.status === 'sent' || item.status === 'delivered');

              return (
                <View
                  style={{
                    marginVertical: 4,
                    alignSelf: isOwn ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: bubbleColor,
                    }}
                  >
                    {item.text ? (
                      <ThemedText
                        style={{
                          color: bubbleTextColor,
                        }}
                      >
                        {item.text}
                      </ThemedText>
                    ) : null}
                    {item.attachments?.map((att) => renderAttachment(att, item.text, isOwn, bubbleColors, colors))}
                  </View>
                  {(timeLabel || statusLabel) && (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        marginTop: 2,
                        gap: 4,
                      }}
                    >
                      {timeLabel ? (
                        <ThemedText style={{ fontSize: 10, opacity: 0.6 }}>
                          {timeLabel}
                        </ThemedText>
                      ) : null}
                      {statusLabel ? (
                        <ThemedText
                          style={{
                            fontSize: 10,
                            opacity: item.status === 'read' ? 0.9 : 0.85,
                            color:
                              item.status === 'read'
                                ? colors.tint
                                : isUnseenOwn
                                  ? '#F59E0B'
                                  : colors.text,
                            fontWeight: isUnseenOwn ? '700' : '500',
                          }}
                        >
                          {isUnseenOwn ? `${statusLabel} · Unseen` : statusLabel}
                        </ThemedText>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
        {isOtherTyping ? (
          <ThemedText style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            Typing…
          </ThemedText>
        ) : null}
      </View>
      <MessageInput
        onSend={sendMessage}
        disabled={!selectedConversationId}
        currentUserId={currentUserId}
        initialText={draftText}
        mentionCandidates={
          selectedConversation?.participants
            .filter((p) => p.userId !== currentUserId)
            .map((p) => ({
              id: p.userId,
              username: p.username,
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
            })) ?? []
        }
      />
    </KeyboardAvoidingView>
  );
};

function ChatImageAttachment({
  uri,
  hasText,
}: {
  uri: string;
  hasText: string | undefined;
}) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setAspectRatio(null);

    // Fetch the natural size so we can preserve aspect ratio correctly.
    Image.getSize(
      uri,
      (w, h) => {
        if (cancelled) return;
        if (h <= 0) return;
        setAspectRatio(w / h);
      },
      () => {
        if (cancelled) return;
        setAspectRatio(null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  // Keep it prominent but clearly not "full screen".
  const maxWidth = screenWidth * 0.62;
  const maxHeight = screenHeight * 0.42;

  // If we don't have the aspect ratio yet, fall back to a safe default
  // (it will correct itself after Image.getSize resolves).
  const ratio = aspectRatio ?? 4 / 3;

  // Start from width limit, then ensure height also stays within maxHeight.
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width,
        height,
        borderRadius: 12,
        marginTop: hasText ? 6 : 0,
      }}
      resizeMode="contain"
    />
  );
}

function renderAttachment(
  att: ChatAttachment,
  hasText: string | undefined,
  isOwn: boolean,
  bubbleColors: BubbleColors,
  colors: any,
) {
  if (att.type.startsWith('image/')) {
    return (
      <ChatImageAttachment uri={att.url} hasText={hasText} key={att.url} />
    );
  }
  if (att.type.startsWith('audio/')) {
    return (
      <View
        key={att.url}
        style={{
          marginTop: hasText ? 6 : 0,
        }}
      >
        <VoiceMessageBubble
          uri={att.url}
          isOwn={isOwn}
          bubbleColorOverride={isOwn ? bubbleColors.ownBubble : bubbleColors.otherBubble}
        />
      </View>
    );
  }

  return (
    <View
      key={att.url}
      style={{
        marginTop: hasText ? 6 : 0,
      }}
    >
      <ThemedText
        style={{
          color: getBubbleTextColor(isOwn ? bubbleColors.ownBubble : bubbleColors.otherBubble),
          fontSize: 12,
        }}
      >
        File: {att.name}
      </ThemedText>
    </View>
  );
}

export default ConversationRoomView;

