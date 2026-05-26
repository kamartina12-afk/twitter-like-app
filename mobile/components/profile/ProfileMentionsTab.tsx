import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItemInfo, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import PostCard from '@/components/post/feed/PostCard';
import type { ProfilePost } from '@/app/(tabs)/types/types';

type ProfileMentionsTabProps = {
  username: string;
  ListHeaderComponent: React.ComponentType | React.ReactElement | null;
};

export function ProfileMentionsTab({ username, ListHeaderComponent }: ProfileMentionsTabProps) {
  const [visibleCount, setVisibleCount] = useState(10);

  const mentionsPosts = useMemo(() => {
    const posts: ProfilePost[] = []; // mentions are derived from posts if you later share this query
    const handle = `@${username.toLowerCase()}`;
    return posts.filter((post) => {
      const text =
        (post.isRepost ? post.originalPostContent || post.content : post.content) || '';
      return text.toLowerCase().includes(handle);
    });
  }, [username]);

  const visiblePosts = useMemo(
    () => mentionsPosts.slice(0, visibleCount),
    [mentionsPosts, visibleCount],
  );

  const handleLoadMore = useCallback(() => {
    if (visiblePosts.length >= mentionsPosts.length) return;
    setVisibleCount((prev) => prev + 10);
  }, [mentionsPosts.length, visiblePosts.length]);

  const renderPost = useCallback(
    ({ item }: ListRenderItemInfo<ProfilePost>) => <PostCard post={item} />,
    [],
  );

  const renderSeparator = useCallback(
    () => (
      <View
        style={{
          borderBottomWidth: 1,
          borderColor: '#1f2937',
        }}
      />
    ),
    [],
  );

  return (
    <FlatList<ProfilePost>
      data={visiblePosts}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={{ paddingBottom: 24 }}
      ItemSeparatorComponent={renderSeparator}
      renderItem={renderPost}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        <ThemedView
          style={{
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
        >
          <ThemedText>You have no mentions yet.</ThemedText>
        </ThemedView>
      }
    />
  );
}

