import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItemInfo, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import PostCard from '@/components/post/feed/PostCard';
import { useAuth } from '@/contexts/AuthContext';
import { profileServices } from '@/services/profileServices';
import type { ProfilePost } from '@/app/(tabs)/types/types';

type ProfileSavedTabProps = {
  ListHeaderComponent: React.ComponentType | React.ReactElement | null;
};

export function ProfileSavedTab({ ListHeaderComponent }: ProfileSavedTabProps) {
  const [visibleCount, setVisibleCount] = useState(10);
  const { user } = useAuth();

  const {
    data: savedPosts = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<ProfilePost[]>({
    queryKey: ['saved-posts'],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return profileServices.fetchSavedPosts(token);
    },
  });

  const visiblePosts = useMemo(
    () => savedPosts.slice(0, visibleCount),
    [savedPosts, visibleCount],
  );

  const handleLoadMore = useCallback(() => {
    if (visiblePosts.length >= savedPosts.length) return;
    setVisibleCount((prev) => prev + 10);
  }, [savedPosts.length, visiblePosts.length]);

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
          <ThemedText>You have no saved posts yet.</ThemedText>
        </ThemedView>
      }
    />
  );
}

