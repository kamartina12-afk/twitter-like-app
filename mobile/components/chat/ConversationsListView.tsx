import React from 'react';
import { SectionList, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import SearchBar from '@/components/search/SearchBar';
import SearchResultsList from '@/components/search/SearchResultsList';
import type { ConversationListItem } from '@/services/chat.service';

import ChatListItem from './ChatListItem';

type ConversationsListViewProps = {
  colors: any;
  conversations: ConversationListItem[];
  conversationsLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  searchResults: any[];
  currentUserId: string | undefined;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onStartChatWithUser: (user: any) => void;
  onPressConversationAvatar?: (item: ConversationListItem) => void;
  onOpenCreateGroup: () => void;
};

const ConversationsListView: React.FC<ConversationsListViewProps> = ({
  colors,
  conversations,
  conversationsLoading,
  search,
  setSearch,
  searchResults,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  onStartChatWithUser,
  onPressConversationAvatar,
  onOpenCreateGroup,
}) => {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ThemedText style={{ fontSize: 22, fontWeight: '700' }}>Messages</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemedText
            onPress={onOpenCreateGroup}
            style={{ fontSize: 14, fontWeight: '600', color: colors.tint }}
          >
            New group
          </ThemedText>
        </View>
      </View>
      <SearchBar value={search} onChange={setSearch} />
      {search.length > 1 ? (
        <View style={{ flex: 1 }}>
          <SearchResultsList users={searchResults} onPress={onStartChatWithUser} />
        </View>
      ) : conversationsLoading ? (
        <View style={{ padding: 16 }}>
          <ThemedText>Loading conversations…</ThemedText>
        </View>
      ) : conversations.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
            gap: 8,
          }}
        >
          <ThemedText style={{ fontSize: 20, fontWeight: '700' }}>
            Start a conversation
          </ThemedText>
          <ThemedText style={{ textAlign: 'center', opacity: 0.8 }}>
            You don&apos;t have any chats yet. Start chatting by searching for users above.
          </ThemedText>
        </View>
      ) : (
        <SectionList
          sections={[
            ...conversations.filter((c) => c.hasUnread).length
              ? [{ title: 'Unread', data: conversations.filter((c) => c.hasUnread) }]
              : [],
            ...conversations.filter((c) => !c.hasUnread).length
              ? [{ title: 'Chats', data: conversations.filter((c) => !c.hasUnread) }]
              : [],
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatListItem
              item={item}
              selected={item.id === selectedConversationId}
              currentUserId={currentUserId}
              onPress={() => onSelectConversation(item.id)}
              onPressAvatar={
                onPressConversationAvatar ? () => onPressConversationAvatar(item) : undefined
              }
            />
          )}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 6,
                backgroundColor: colors.background,
              }}
            >
              <ThemedText style={{ fontSize: 14, fontWeight: '600', opacity: 0.8 }}>
                {section.title}
              </ThemedText>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default ConversationsListView;

