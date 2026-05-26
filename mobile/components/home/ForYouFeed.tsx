import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { feedServices } from '@/services/feedServices';
import PostCard from '@/components/post/feed/PostCard';
import { FeedPost } from '@/components/post/feed/types/types';
import { homeFeedStyles } from './HomeFeed.styled';

export function ForYouFeed() {
  const { user } = useAuth();

  const {
    data,
    isLoading,
    isError,
  } = useQuery<
    | {
        data: FeedPost[];
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
      }
    | undefined
  >({
    queryKey: ['feed', 'for_you'],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const response = await feedServices.fetchFeed(token, 'for_you');
      // Backend returns { data, page, limit, total, hasMore }
      return response;
    },
  });

  if (!user) {
    return (
      <ThemedView style={homeFeedStyles.feedSection}>
        {/* Not authenticated */}
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={homeFeedStyles.feedSection}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const posts = data?.data ?? [];

  if (isError || !posts || posts.length === 0) {
    return (
      <ThemedView style={homeFeedStyles.feedSection}>
        {/* No posts available */}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={homeFeedStyles.feedSection}>
      {posts.map((post, index) => (
        <React.Fragment key={post.id}>
          <PostCard post={post} />
          {index < posts.length - 1 && (
            <ThemedView style={homeFeedStyles.feedCard} />
          )}
        </React.Fragment>
      ))}
    </ThemedView>
  );
}

