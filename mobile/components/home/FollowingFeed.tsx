import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { feedServices } from '@/services/feedServices';
import PostCard from '@/components/post/feed/PostCard';

import { homeFeedStyles } from './HomeFeed.styled';
import { FeedPost } from '@/components/post/feed/types/types';

export function FollowingFeed() {
  const { user } = useAuth();

  const {
    data,
    isLoading,
    isError,
  } = useQuery<FeedPost[] | undefined>({
    queryKey: ['feed', 'following'],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const response = await feedServices.fetchFeed(token, 'following');
      // Backend returns { data, page, limit, total, hasMore }
      return Array.isArray(response?.data) ? response.data : [];
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

  if (isError || !data || data.length === 0) {
    return (
      <ThemedView style={homeFeedStyles.feedSection}>
        {/* No following posts available */}
      </ThemedView>
    );
  }

  const posts = Array.isArray(data) ? data : [];

  return (
    <ThemedView style={homeFeedStyles.feedSection}>
      {posts.map((post, index) => (
        <React.Fragment key={post.id}>
          <PostCard post={post} />
          {index < posts.length - 1 && <ThemedView style={homeFeedStyles.feedCard} />}
        </React.Fragment>
      ))}
    </ThemedView>
  );
}

