import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import type { FeedPost } from './types/types';
import { homeFeedStyles } from '@/components/home/HomeFeed.styled';
import { ExploreMasonryGrid } from '@/components/explore/ExploreMasonryGrid';
import { hasExploreableMedia } from '@/components/explore/exploreGrid.utils';

type ExplorePostsListProps = {
  posts: FeedPost[];
  isLoading: boolean;
  isError: boolean;
  onEndReached?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onPressCell: (post: FeedPost, isVideo: boolean) => void;
};

export const ExplorePostsList: React.FC<ExplorePostsListProps> = ({
  posts,
  isLoading,
  isError,
  onEndReached,
  hasNextPage,
  isFetchingNextPage,
  onPressCell,
}) => {
  const mediaPosts = useMemo(
    () => posts.filter((post) => hasExploreableMedia(post)),
    [posts],
  );

  const handleNearEnd = useCallback(() => {
    if (hasNextPage && onEndReached && !isFetchingNextPage) {
      onEndReached();
    }
  }, [hasNextPage, onEndReached, isFetchingNextPage]);

  if (isLoading) {
    return (
      <ThemedView style={homeFeedStyles.feedSection}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (isError || mediaPosts.length === 0) {
    return (
      <ThemedView style={homeFeedStyles.feedSection}>
        {/* No explore posts available */}
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[homeFeedStyles.feedSection, { paddingHorizontal: 0, flex: 1 }]}
    >
      <ExploreMasonryGrid
        posts={mediaPosts}
        onPressCell={onPressCell}
        onNearEnd={handleNearEnd}
      />
      {isFetchingNextPage ? (
        <View style={{ paddingVertical: 16 }}>
          <ActivityIndicator />
        </View>
      ) : null}
    </ThemedView>
  );
};

