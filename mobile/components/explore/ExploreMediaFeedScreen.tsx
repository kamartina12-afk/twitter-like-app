import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  Text,
  ViewToken,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import PostCard from '@/components/post/feed/PostCard';
import { ExploreVideoReelCard } from '@/components/explore/ExploreVideoReelCard';
import {
  filterVideoPosts,
  isVideoPost,
  seedFirst,
  shuffleWithSeedFirst,
} from '@/components/explore/ExploreMediaFeedScreen.utils';
import { exploreMediaFeedStyles } from '@/components/explore/ExploreMediaFeedScreen.styled';
import { exploreMediaFeedLabels } from '@/components/explore/ExploreMediaFeedScreen.labels';
import { useExplorePosts } from '@/hooks/post/useExplorePosts';
import { useHomeFeed } from '@/hooks/post/useHomeFeed';
import { findFeedPostInCaches } from '@/hooks/post/findCachedFeedPost';
import { getPost } from '@/services/post.service';
import type { FeedPost } from '@/components/post/feed/types/types';

type MediaFeedRouteSource = 'explore' | 'for_you' | 'following';

function parseFeedSourceParam(
  raw: string | string[] | undefined,
): MediaFeedRouteSource {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'for_you' || v === 'following' || v === 'explore') {
    return v;
  }
  return 'explore';
}

function useOrderedVideoFeed(posts: FeedPost[], seedId: string) {
  const [ordered, setOrdered] = useState<FeedPost[]>([]);
  const idsKey = posts.map((p) => p.id).join(',');

  useEffect(() => {
    const videos = filterVideoPosts(posts);
    if (videos.length === 0) {
      setOrdered([]);
      return;
    }

    setOrdered((prev) => {
      if (prev.length === 0) {
        return shuffleWithSeedFirst(videos, seedId);
      }

      const nextById = new Map(videos.map((video) => [video.id, video]));
      const prevIds = new Set(prev.map((p) => p.id));
      const added = videos.filter((v) => !prevIds.has(v.id));

      const shuffled = [...added];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }

      const updatedExisting = prev
        .map((item) => nextById.get(item.id))
        .filter((item): item is FeedPost => Boolean(item));

      return [...updatedExisting, ...shuffled];
    });
  }, [idsKey, seedId, posts]);

  return ordered;
}

export const ExploreMediaFeedScreen: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{
    postId?: string;
    mode?: string;
    feedSource?: string | string[];
  }>();
  const rawId = params.postId;
  const seedId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? '';
  const mode = params.mode === 'video' ? 'video' : 'media';
  const feedSource = useMemo(
    () => parseFeedSourceParam(params.feedSource),
    [params.feedSource],
  );

  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const headerBar = mode === 'video' ? 0 : 44;
  const pageHeight = Math.max(
    320,
    height - insets.top - headerBar - insets.bottom,
  );

  const exploreFeed = useExplorePosts({ enabled: feedSource === 'explore' });
  const forYouFeed = useHomeFeed('for_you', {
    enabled: feedSource === 'for_you',
  });
  const followingFeed = useHomeFeed('following', {
    enabled: feedSource === 'following',
  });

  const posts =
    feedSource === 'explore'
      ? exploreFeed.posts
      : feedSource === 'for_you'
        ? forYouFeed.posts
        : followingFeed.posts;
  const dataUpdatedAt =
    feedSource === 'explore'
      ? exploreFeed.dataUpdatedAt
      : feedSource === 'for_you'
        ? forYouFeed.dataUpdatedAt
        : followingFeed.dataUpdatedAt;
  const fetchNextPage =
    feedSource === 'explore'
      ? exploreFeed.fetchNextPage
      : feedSource === 'for_you'
        ? forYouFeed.fetchNextPage
        : followingFeed.fetchNextPage;
  const hasNextPage =
    feedSource === 'explore'
      ? exploreFeed.hasNextPage
      : feedSource === 'for_you'
        ? forYouFeed.hasNextPage
        : followingFeed.hasNextPage;
  const isFetchingNextPage =
    feedSource === 'explore'
      ? exploreFeed.isFetchingNextPage
      : feedSource === 'for_you'
        ? forYouFeed.isFetchingNextPage
        : followingFeed.isFetchingNextPage;
  const isLoading =
    feedSource === 'explore'
      ? exploreFeed.isLoading
      : feedSource === 'for_you'
        ? forYouFeed.isLoading
        : followingFeed.isLoading;

  const orderedVideosBase = useOrderedVideoFeed(posts, seedId);
  const [seedPostExtra, setSeedPostExtra] = useState<FeedPost | null>(null);
  const [seedFetchDone, setSeedFetchDone] = useState(true);

  useEffect(() => {
    if (mode !== 'video' || !seedId) {
      setSeedPostExtra(null);
      setSeedFetchDone(true);
      return;
    }
    const inExplore = filterVideoPosts(posts).some((p) => p.id === seedId);
    if (inExplore) {
      setSeedPostExtra(null);
      setSeedFetchDone(true);
      return;
    }

    const cached = findFeedPostInCaches(queryClient, seedId);
    if (cached && isVideoPost(cached)) {
      setSeedPostExtra(cached);
      setSeedFetchDone(true);
      return;
    }

    setSeedFetchDone(false);
    let cancelled = false;
    void (async () => {
      try {
        const raw = await getPost(seedId);
        if (
          cancelled ||
          !raw ||
          typeof raw !== 'object' ||
          !isVideoPost(raw as FeedPost)
        ) {
          return;
        }
        setSeedPostExtra(raw as FeedPost);
      } catch {
        if (!cancelled) {
          setSeedPostExtra(null);
        }
      } finally {
        if (!cancelled) {
          setSeedFetchDone(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, seedId, posts, queryClient]);

  const orderedVideos: FeedPost[] = useMemo(() => {
    if (!seedId || mode !== 'video') {
      return orderedVideosBase;
    }
    if (orderedVideosBase.some((p) => p.id === seedId)) {
      return orderedVideosBase;
    }
    const extra = seedPostExtra;
    if (extra != null && extra.id === seedId && isVideoPost(extra)) {
      return [
        extra,
        ...orderedVideosBase.filter((p) => p.id !== extra.id),
      ];
    }
    if (!seedFetchDone) {
      return [];
    }
    return orderedVideosBase;
  }, [mode, orderedVideosBase, seedId, seedPostExtra, seedFetchDone]);

  const videoListExtraKey = useMemo(
    () =>
      orderedVideos
        .map((p) => `${p.id}:${p.viewsCount ?? 0}:${p.likesCount ?? 0}`)
        .join('|'),
    [orderedVideos],
  );

  const videoInitialScrollIndex = useMemo(() => {
    if (!seedId || orderedVideos.length === 0) {
      return undefined;
    }
    const idx = orderedVideos.findIndex((p) => p.id === seedId);
    if (idx <= 0 || idx >= orderedVideos.length) {
      return undefined;
    }
    return idx;
  }, [orderedVideos, seedId]);

  const orderedMedia = useMemo(
    () => seedFirst(posts, seedId),
    [posts, seedId],
  );
  const [activeVideoId, setActiveVideoId] = useState<string>(seedId);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());

  const viewabilityRafRef = useRef<number | null>(null);
  const pendingVisibleIdsRef = useRef<Set<string>>(new Set());
  const fetchNextPageInFlightRef = useRef(false);

  useEffect(
    () => () => {
      if (viewabilityRafRef.current != null) {
        cancelAnimationFrame(viewabilityRafRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    // Reset "in flight" lock once the query finishes fetching next page.
    if (!isFetchingNextPage) {
      fetchNextPageInFlightRef.current = false;
    }
  }, [isFetchingNextPage]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextVisibleIds = new Set<string>();
      for (const token of viewableItems) {
        if (!token.isViewable) continue;
        const item = token.item as FeedPost | null;
        if (!item?.id) continue;
        nextVisibleIds.add(item.id);
      }
      pendingVisibleIdsRef.current = nextVisibleIds;

      if (viewabilityRafRef.current != null) return;
      viewabilityRafRef.current = requestAnimationFrame(() => {
        viewabilityRafRef.current = null;
        setVisiblePostIds(pendingVisibleIdsRef.current);
      });
    },
  ).current;

  const mediaViewabilityConfig = useMemo(
    () => ({
      // "Full screen" in this list: only autoplay when the cell is mostly visible.
      itemVisiblePercentThreshold: 80,
      minimumViewTime: 120,
    }),
    [],
  );

  const mediaListVisibleIdsKey = useMemo(
    () => Array.from(visiblePostIds).sort().join('|'),
    [visiblePostIds],
  );

  const loadMore = useCallback(() => {
    if (!hasNextPage) return;
    if (isFetchingNextPage) return;
    if (fetchNextPageInFlightRef.current) return;

    fetchNextPageInFlightRef.current = true;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderVideoItem = useCallback(
    ({ item }: ListRenderItemInfo<FeedPost>) => (
      <ExploreVideoReelCard
        post={item}
        height={pageHeight}
        isActive={item.id === activeVideoId}
        isScreenFocused={isFocused}
      />
    ),
    [activeVideoId, isFocused, pageHeight],
  );

  const renderMediaPost = useCallback(
    ({ item }: ListRenderItemInfo<FeedPost>) => (
      <PostCard
        post={item}
        horizontalPadding={10}
        isVisible={visiblePostIds.has(item.id)}
        isScreenFocused={isFocused}
        mediaFeedSource={feedSource}
      />
    ),
    [feedSource, isFocused, visiblePostIds],
  );

  useEffect(() => {
    if (!orderedVideos.length) return;
    if (!orderedVideos.some((post) => post.id === activeVideoId)) {
      const first = orderedVideos[0];
      if (first) {
        setActiveVideoId(first.id);
      }
    }
  }, [activeVideoId, orderedVideos]);

  const onVideoViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const firstVisible = viewableItems.find((token) => token.isViewable);
      const visibleIndex =
        typeof firstVisible?.index === 'number' ? firstVisible.index : null;
      const nextId =
        typeof firstVisible?.item === 'object' &&
        firstVisible?.item &&
        'id' in firstVisible.item
          ? String((firstVisible.item as FeedPost).id)
          : null;

      if (nextId) {
        setActiveVideoId(nextId);
      }

      // Prefetch when user gets within the last 1-2 reels.
      const resolvedIndex =
        visibleIndex ??
        (nextId ? orderedVideos.findIndex((p) => p.id === nextId) : -1);
      if (resolvedIndex >= 0 && orderedVideos.length - resolvedIndex <= 2) {
        loadMore();
      }
    },
    [loadMore, orderedVideos.length],
  );

  const videoViewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 80,
      minimumViewTime: 120,
    }),
    [],
  );

  const videoFeedLoading =
    orderedVideos.length === 0 &&
    (isLoading || (!!seedId && !seedFetchDone));

  if (mode === 'video') {
    return (
      <SafeAreaView style={exploreMediaFeedStyles.safe} edges={['top', 'bottom']}>
        {videoFeedLoading ? (
          <ActivityIndicator color="#e5e7eb" style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={orderedVideos}
            extraData={`${dataUpdatedAt}-${videoListExtraKey}`}
            keyExtractor={(item) => item.id}
            initialScrollIndex={videoInitialScrollIndex}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews
            pagingEnabled
            snapToInterval={pageHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            renderItem={renderVideoItem}
            onViewableItemsChanged={onVideoViewableItemsChanged}
            viewabilityConfig={videoViewabilityConfig}
            onEndReached={loadMore}
            onEndReachedThreshold={0.8}
            getItemLayout={(_, index) => ({
              length: pageHeight,
              offset: pageHeight * index,
              index,
            })}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator color="#e5e7eb" />
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
      <View style={exploreMediaFeedStyles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={exploreMediaFeedStyles.backText}>
            {exploreMediaFeedLabels.back}
          </Text>
        </Pressable>
        <Text style={exploreMediaFeedStyles.title}>
          {exploreMediaFeedLabels.mediaTitle}
        </Text>
      </View>

      {isLoading && orderedMedia.length === 0 ? (
        <ActivityIndicator color="#e5e7eb" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={orderedMedia}
          extraData={`${dataUpdatedAt}-${mediaListVisibleIdsKey}`}
          keyExtractor={(item) => item.id}
          renderItem={renderMediaPost}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
          contentContainerStyle={exploreMediaFeedStyles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={mediaViewabilityConfig}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color="#e5e7eb" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};
