import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  View,
  ViewToken,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { profileServices } from '@/services/profileServices';
import { useProfilePosts } from '@/components/profile/useProfilePosts';
import PostCard from '@/components/post/feed/PostCard';
import type { ProfilePost, ProfileTabKey } from '@/app/(tabs)/types/types';
import { Colors } from '@/constants/theme';

export type ProfileContentListRef = {
  scrollToTop: () => void;
};

function renderProfileHeader(
  header: React.ComponentType | React.ReactElement | null,
): React.ReactNode {
  if (!header) return null;
  if (React.isValidElement(header)) return header;
  const HeaderComponent = header;
  return <HeaderComponent />;
}

type ProfileContentListProps = {
  activeTab: ProfileTabKey;
  username: string;
  /** Cover, avatar, bio, stats — scrolls with the list (same scroll container as posts). */
  listHeaderComponent: React.ComponentType | React.ReactElement | null;
  /** Posts / Mentions / Saved — part of the list header so the whole profile scrolls together. */
  profileTabs: React.ReactElement;
  /** When false, empty-state copy refers to the profile owner (“they”) not “you”. */
  isOwnProfile?: boolean;
  onScrollUpToTop?: () => void;
  onPullToRefreshHeader?: () => void | Promise<void>;
};

export const ProfileContentList = React.forwardRef<
  ProfileContentListRef,
  ProfileContentListProps
>(function ProfileContentList(
  {
    activeTab,
    username,
    listHeaderComponent,
    profileTabs,
    isOwnProfile = true,
    onScrollUpToTop,
    onPullToRefreshHeader,
  },
  ref,
) {
  const { user } = useAuth();
  const isScreenFocused = useIsFocused();
  const [visibleCount, setVisibleCount] = useState(10);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());
  const hasLeftTopRef = useRef(false);
  const flatListRef = useRef<FlatList<ProfilePost>>(null);
  const listBackground = Colors.dark.background;

  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
  }));

  const shouldFetchProfilePosts = activeTab === 'posts';
  const shouldFetchSavedPosts = activeTab === 'saved';

  const {
    posts: profilePosts,
    dataUpdatedAt: profilePostsUpdatedAt,
    isLoading: isProfilePostsLoading,
    isError: isProfilePostsError,
    isRefetching: isProfilePostsRefetching,
    refetch: refetchProfilePosts,
  } = useProfilePosts(username, shouldFetchProfilePosts);

  const {
    data: savedPosts = [],
    dataUpdatedAt: savedPostsUpdatedAt,
    isLoading: isSavedLoading,
    isRefetching: isSavedRefetching,
    refetch: refetchSavedPosts,
    isError: isSavedError,
  } = useQuery<ProfilePost[]>({
    queryKey: ['saved-posts'],
    enabled: shouldFetchSavedPosts && !!user,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return profileServices.fetchSavedPosts(token);
    },
  });

  const {
    data: mentionedPosts = [],
    dataUpdatedAt: mentionedPostsUpdatedAt,
    isLoading: isMentionedPostsLoading,
    isError: isMentionedPostsError,
    isRefetching: isMentionedPostsRefetching,
    refetch: refetchMentionedPosts,
  } = useQuery<ProfilePost[]>({
    queryKey: ['mentioned-posts', username],
    enabled: activeTab === 'mentions' && !!user,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return profileServices.fetchMentionedPosts(token, username);
    },
  });

  const activeData = useMemo(() => {
    if (activeTab === 'saved') {
      return savedPosts;
    }
    if (activeTab === 'mentions') return mentionedPosts;
    return profilePosts;
  }, [activeTab, mentionedPosts, profilePosts, savedPosts]);

  const visiblePosts = useMemo(() => activeData.slice(0, visibleCount), [activeData, visibleCount]);

  const listExtraData = useMemo(() => {
    const sourceTick =
      activeTab === 'saved'
        ? savedPostsUpdatedAt
        : activeTab === 'mentions'
          ? mentionedPostsUpdatedAt
          : profilePostsUpdatedAt;
    return `${isScreenFocused}:${sourceTick}`;
  }, [
    activeTab,
    isScreenFocused,
    mentionedPostsUpdatedAt,
    profilePostsUpdatedAt,
    savedPostsUpdatedAt,
  ]);

  const isLoading =
    activeTab === 'saved'
      ? isSavedLoading
      : activeTab === 'mentions'
        ? isMentionedPostsLoading
        : isProfilePostsLoading;
  const isError =
    activeTab === 'saved'
      ? isSavedError
      : activeTab === 'mentions'
        ? isMentionedPostsError
        : isProfilePostsError;
  const isRefetching =
    activeTab === 'saved'
      ? isSavedRefetching
      : activeTab === 'mentions'
        ? isMentionedPostsRefetching
        : isProfilePostsRefetching;

  const onRefresh = useCallback(() => {
    void onPullToRefreshHeader?.();
    if (activeTab === 'saved') {
      void refetchSavedPosts();
      return;
    }
    if (activeTab === 'mentions') {
      void refetchMentionedPosts();
      return;
    }
    void refetchProfilePosts();
  }, [activeTab, onPullToRefreshHeader, refetchMentionedPosts, refetchProfilePosts, refetchSavedPosts]);

  const handleLoadMore = useCallback(() => {
    if (visiblePosts.length >= activeData.length) return;
    setVisibleCount((prev) => prev + 10);
  }, [activeData.length, visiblePosts.length]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;

      if (offsetY > 24) {
        hasLeftTopRef.current = true;
        return;
      }

      if (offsetY <= 0 && hasLeftTopRef.current) {
        hasLeftTopRef.current = false;
        onScrollUpToTop?.();
      }
    },
    [onScrollUpToTop],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ProfilePost>) => (
      <PostCard
        post={item}
        isVisible={visiblePostIds.has(item.id)}
        isScreenFocused={isScreenFocused}
      />
    ),
    [isScreenFocused, visiblePostIds],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextVisibleIds = new Set<string>();
      for (const token of viewableItems) {
        if (!token.isViewable) continue;
        const item = token.item as ProfilePost | null;
        if (!item?.id) continue;
        nextVisibleIds.add(item.id);
      }
      setVisiblePostIds(nextVisibleIds);
    },
  ).current;

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 65,
      minimumViewTime: 120,
    }),
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

  React.useEffect(() => {
    setVisibleCount(10);
    setVisiblePostIds(new Set());
  }, [activeTab]);

  const flatListData = useMemo(() => {
    if (isLoading || isError) {
      return [];
    }
    return visiblePosts;
  }, [isError, isLoading, visiblePosts]);

  const listHeaderElement = useMemo(
    () => (
      <View>
        {renderProfileHeader(listHeaderComponent)}
        <View style={{ backgroundColor: listBackground }}>{profileTabs}</View>
      </View>
    ),
    [listBackground, listHeaderComponent, profileTabs],
  );

  const listEmptyComponent = useMemo(() => {
    if (isLoading) {
      return (
        <ThemedView
          style={{
            paddingVertical: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator />
        </ThemedView>
      );
    }
    if (isError) {
      return (
        <ThemedView style={{ paddingHorizontal: 16, paddingVertical: 32 }}>
          <ThemedText>
            Failed to load{' '}
            {activeTab === 'saved'
              ? 'saved posts'
              : activeTab === 'mentions'
                ? 'mentions'
                : 'posts'}
            .
          </ThemedText>
        </ThemedView>
      );
    }
    if (activeData.length === 0) {
      return (
        <ThemedView
          style={{
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
        >
          <ThemedText>
            {activeTab === 'saved'
              ? isOwnProfile
                ? 'You have no saved posts yet.'
                : 'No saved posts to show.'
              : activeTab === 'mentions'
                ? isOwnProfile
                  ? 'You have no mentions yet.'
                  : 'No mentions yet.'
                : isOwnProfile
                  ? 'You have not posted yet.'
                  : 'No posts yet.'}
          </ThemedText>
        </ThemedView>
      );
    }
    return null;
  }, [activeData.length, activeTab, isError, isLoading, isOwnProfile]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={isRefetching}
        onRefresh={onRefresh}
        tintColor="#9ca3af"
        progressViewOffset={0}
      />
    ),
    [isRefetching, onRefresh],
  );

  const contentContainerStyle = useMemo(
    () => ({
      paddingBottom: 24,
      flexGrow: flatListData.length === 0 ? 1 : undefined,
    }),
    [flatListData.length],
  );

  return (
    <FlatList<ProfilePost>
      ref={flatListRef}
      style={{ flex: 1, backgroundColor: listBackground }}
      data={flatListData}
      extraData={listExtraData}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={listHeaderElement}
      ListEmptyComponent={listEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      ItemSeparatorComponent={renderSeparator}
      renderItem={renderItem}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.6}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
    />
  );
});

ProfileContentList.displayName = 'ProfileContentList';

