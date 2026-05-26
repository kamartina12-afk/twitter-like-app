import React from 'react';
import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  useChatColors,
  getConversationDisplayName,
  parseLastMessageContent,
} from './chat.utils';
import type { ChatListItemProps } from './chat.types';

const ChatListItem = ({ item, selected, currentUserId, onPress, onPressAvatar }: ChatListItemProps) => {
  const colors = useChatColors();

  const otherParticipants = item.participants.filter(
    (p) => p.userId !== currentUserId
  );
  const other = otherParticipants[0] ?? item.participants[0];

  const name = getConversationDisplayName(item, currentUserId);

  // ✅ SAFELY parse last message
  const lastMessage = item.lastMessage;
  const { text: lastPreview } = parseLastMessageContent(
    lastMessage?.content ?? undefined
  );

  // ✅ WHO SENT IT
  const isLastFromCurrentUser =
    lastMessage?.senderId === currentUserId;

  // ✅ AVATAR
  const avatarUrl = other?.avatarUrl ?? null;
  const initials =
    (other?.displayName || other?.username || '?')[0]?.toUpperCase() ?? '?';

  const openFromAvatar = () => {
    if (onPressAvatar) {
      onPressAvatar();
      return;
    }
    onPress();
  };

  const rowStyle = {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: selected
      ? colors.tint + '22'
      : item.hasUnread
        ? colors.tint + '11'
        : 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: colors.icon,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  };

  return (
    <View style={rowStyle}>
      <Pressable
        // onPress={openFromAvatar}
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: '#020617',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
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
          <Text style={{ color: '#e5e7eb', fontWeight: '700' }}>
            {initials}
          </Text>
        )}
      </Pressable>

      <TouchableOpacity style={{ flex: 1, marginRight: 8 }} onPress={onPress} activeOpacity={0.7}>
        {/* NAME */}
        <ThemedText
          numberOfLines={1}
          style={{
            fontWeight: item.hasUnread ? '700' : '500',
            marginBottom: 2,
            color: colors.text,
          }}
        >
          {name}
        </ThemedText>

        {/* LAST MESSAGE */}
        {lastPreview ? (
          <ThemedText numberOfLines={1} style={{ fontSize: 13 }}>
            {/* "You:" prefix */}
            {isLastFromCurrentUser && (
              <Text style={{ color: colors.icon }}>
                You:{' '}
              </Text>
            )}

            <Text
              style={{
                color: isLastFromCurrentUser
                  ? colors.icon // your message = subtle
                  : item.hasUnread
                  ? colors.tint // unread = highlight
                  : colors.text, // normal
                fontWeight: item.hasUnread && !isLastFromCurrentUser ? '600' : '400',
              }}
            >
              {lastPreview}
            </Text>
          </ThemedText>
        ) : (
          <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
            No messages yet
          </ThemedText>
        )}
      </TouchableOpacity>

      {item.hasUnread && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.tint,
          }}
        />
      )}
    </View>
  );
};

export default ChatListItem;
