import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItemInfo, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import PostCard from '@/components/post/feed/PostCard';
import type { ProfilePost } from '@/app/(tabs)/types/types';
import { useProfilePosts } from './useProfilePosts';

type ProfilePostsTabProps = {
  username: string;
  ListHeaderComponent: React.ComponentType | React.ReactElement | null;
};

export function ProfilePostsTab({ username, ListHeaderComponent }: ProfilePostsTabProps) {
  const [visibleCount, setVisibleCount] = useState(10);
  const { posts, isLoading, isError, isRefetching, refetch } = useProfilePosts(username);

  const visiblePosts = useMemo(
    () => posts.slice(0, visibleCount),
    [posts, visibleCount],
  );

  const handleLoadMore = useCallback(() => {
    if (visiblePosts.length >= posts.length) return;
    setVisibleCount((prev) => prev + 10);
  }, [posts.length, visiblePosts.length]);

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

  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText>Failed to load your posts.</ThemedText>
      </ThemedView>
    );
  }

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
      refreshing={isRefetching}
      onRefresh={refetch}
      ListEmptyComponent={
        <ThemedView
          style={{
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
        >
          <ThemedText>You have not posted yet.</ThemedText>
        </ThemedView>
      }
    />
  );
}

