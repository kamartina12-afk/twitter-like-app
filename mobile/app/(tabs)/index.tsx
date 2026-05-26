import React, { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  RefreshControl,
  Animated,
  View,
  Text,
  ActivityIndicator,
  ListRenderItem,
  Dimensions,
  Platform,
  ViewToken,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import PostCard from '@/components/post/feed/PostCard';
import { FeedPost } from '@/components/post/feed/types/types';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellOff } from 'lucide-react-native';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { fetchUnreadCountExcludingChat } from '@/services/notification.service';
import { homeStyles } from './index.styles';
import { useHomeFeed } from '@/hooks/post/useHomeFeed';
import { homeFeedStyles } from '@/components/home/HomeFeed.styled';
import { Colors } from '@/constants/theme';
import { useTabPressRefresh } from '@/hooks/useTabPressRefresh';

type HomeTabKey = 'forYou' | 'following';

const HOME_HEADER_HIDE_OFFSET = 150;
const SCROLL_DIR_THRESHOLD = 3;

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<HomeTabKey>('forYou');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const router = useRouter();
  const isScreenFocused = useIsFocused();
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const palette = Colors.dark;

  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerHiddenByScroll = useRef(false);
  const feedListRef = useRef<FlatList<FeedPost>>(null);
  const lastSwipeNavigationAt = useRef(0);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());

  const isForYou = activeTab === 'forYou';
  const feedType = isForYou ? 'for_you' : 'following';

  const {
    posts,
    dataUpdatedAt,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useHomeFeed(feedType);
  const uniquePosts = useMemo(() => {
    const seen = new Set<string>();
    return posts.filter((post) => {
      if (seen.has(post.id)) {
        return false;
      }
      seen.add(post.id);
      return true;
    });
  }, [posts]);

  // Keep the feed from "jumping" when a repost/unrepost causes the backend
  // to insert/remove items near the top of the list.
  const lastDataUpdatedAtRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (lastDataUpdatedAtRef.current == null) {
      lastDataUpdatedAtRef.current = dataUpdatedAt;
      return;
    }

    if (lastDataUpdatedAtRef.current === dataUpdatedAt) return;
    lastDataUpdatedAtRef.current = dataUpdatedAt;

    const offset = lastScrollY.current;
    if (!isScreenFocused) return;
    if (offset <= 0) return;

    // Let FlatList commit the new cells first, then restore scroll.
    requestAnimationFrame(() => {
      feedListRef.current?.scrollToOffset({ offset, animated: false });
    });
  }, [dataUpdatedAt, isScreenFocused]);

  const accentColor = palette.text;

  // TODO: Wire this to a real notification mute setting when available.
  const isMuted = false;

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: [...QUERY_KEYS.NOTIFICATIONS, 'unread-count'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      return fetchUnreadCountExcludingChat(token);
    },
    enabled: !!user,
  });

  const handleOpenNotifications = () => {
    router.push('/notifications');
  };

  const navigateBySwipe = useCallback(
    (target: 'chat' | 'camera') => {
      const now = Date.now();
      if (now - lastSwipeNavigationAt.current < 700) {
        return;
      }
      lastSwipeNavigationAt.current = now;
      if (target === 'chat') {
        router.push('/(tabs)/chat');
        return;
      }
      router.push('/camera');
    },
    [router],
  );

  const SWIPE_EDGE_FRACTION = 0.14;
  const SWIPE_VELOCITY = 0.45;
  const isEdgeSwipeStart = (startX: number) =>
    startX <= SCREEN_WIDTH * SWIPE_EDGE_FRACTION ||
    startX >= SCREEN_WIDTH * (1 - SWIPE_EDGE_FRACTION);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy, x0 } = gestureState;
        if (!isEdgeSwipeStart(x0)) return false;
        return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const { dx, dy, x0 } = gestureState;
        if (!isEdgeSwipeStart(x0)) return false;
        return Math.abs(dx) > Math.abs(dy) * 1.2;
      },
      onPanResponderMove: () => {},
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx, x0 } = gestureState;
        if (!isEdgeSwipeStart(x0)) return;
        const threshold = SCREEN_WIDTH * SWIPE_EDGE_FRACTION;

        if (dx > threshold || vx > SWIPE_VELOCITY) {
          navigateBySwipe('camera');
          return;
        }
        if (dx < -threshold || vx < -SWIPE_VELOCITY) {
          navigateBySwipe('chat');
        }
      },
    })
  ).current;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FEED });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const handleTabPressRefresh = useCallback(() => {
    lastScrollY.current = 0;
    headerHiddenByScroll.current = false;
    Animated.spring(headerTranslateY, {
      toValue: 0,
      friction: 9,
      tension: 68,
      useNativeDriver: true,
    }).start();
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FEED });
  }, [headerTranslateY, queryClient]);

  useTabPressRefresh(handleTabPressRefresh);

  useFocusEffect(
    useCallback(() => {
      // No-op for now, but we keep this hook in case
      // we reintroduce animations tied to focus later.
    }, []),
  );

  const handleFeedScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;

      if (y <= 0) {
        if (headerHiddenByScroll.current) {
          headerHiddenByScroll.current = false;
          Animated.spring(headerTranslateY, {
            toValue: 0,
            friction: 9,
            tension: 68,
            useNativeDriver: true,
          }).start();
        }
        return;
      }

      if (dy < -SCROLL_DIR_THRESHOLD) {
        if (headerHiddenByScroll.current) {
          headerHiddenByScroll.current = false;
          Animated.spring(headerTranslateY, {
            toValue: 0,
            friction: 9,
            tension: 68,
            useNativeDriver: true,
          }).start();
        }
      } else if (dy > SCROLL_DIR_THRESHOLD) {
        if (!headerHiddenByScroll.current) {
          headerHiddenByScroll.current = true;
          Animated.spring(headerTranslateY, {
            toValue: -HOME_HEADER_HIDE_OFFSET,
            friction: 9,
            tension: 68,
            useNativeDriver: true,
          }).start();
        }
      }
    },
    [headerTranslateY],
  );

  useEffect(() => {
    lastScrollY.current = 0;
    headerHiddenByScroll.current = false;
    headerTranslateY.setValue(0);
  }, [activeTab, headerTranslateY]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem: ListRenderItem<FeedPost> = useCallback(
    ({ item }) => (
      <PostCard
        post={item}
        isVisible={visiblePostIds.has(item.id)}
        isScreenFocused={isScreenFocused}
        mediaFeedSource={feedType}
      />
    ),
    [feedType, isScreenFocused, visiblePostIds],
  );

  const viewabilityRafRef = useRef<number | null>(null);
  const pendingVisibleIdsRef = useRef<Set<string>>(new Set());

  useEffect(
    () => () => {
      if (viewabilityRafRef.current != null) {
        cancelAnimationFrame(viewabilityRafRef.current);
      }
    },
    [],
  );

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

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 65,
      minimumViewTime: 120,
    }),
    [],
  );

  const listEmpty = useCallback(() => {
    if (!user) {
      return null;
    }
    if (isLoading) {
      return (
        <ThemedView
          style={{ paddingVertical: 48, alignItems: 'center' }}
          lightColor={palette.background}
          darkColor={palette.background}
        >
          <ActivityIndicator />
        </ThemedView>
      );
    }
    if (isError) {
      return (
        <ThemedView
          style={{ paddingVertical: 48, paddingHorizontal: 16 }}
          lightColor={palette.background}
          darkColor={palette.background}
        >
          <ThemedText style={{ fontSize: 14, color: '#9ca3af' }}>
            Could not load posts. Pull to refresh.
          </ThemedText>
        </ThemedView>
      );
    }
    return (
      <ThemedView
        style={{ paddingVertical: 48, paddingHorizontal: 16 }}
        lightColor={palette.background}
        darkColor={palette.background}
      >
        <ThemedText style={{ fontSize: 14, color: '#9ca3af' }}>
          No posts yet.
        </ThemedText>
      </ThemedView>
    );
  }, [user, isLoading, isError, palette.background]);

  const itemSeparator = useCallback(
    () => <View style={homeFeedStyles.feedCard} />,
    [],
  );

  const listFooter = useCallback(() => {
    if (!isFetchingNextPage) {
      return null;
    }
    return (
      <ThemedView
        style={{ paddingVertical: 16, alignItems: 'center' }}
        lightColor={palette.background}
        darkColor={palette.background}
      >
        <ActivityIndicator />
      </ThemedView>
    );
  }, [isFetchingNextPage, palette.background]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <Animated.View
        style={{
          flex: 1,
        }}
        {...panResponder.panHandlers}
      >
        <ThemedView style={homeStyles.screenContainer}>
        <Animated.View
          style={[
            homeStyles.headerContainer,
            {
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <ThemedView
            style={homeStyles.headerRow}
            lightColor={palette.background}
            darkColor={palette.background}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {profile?.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={{ width: 30, height: 30, borderRadius: 999 }}
                />
              ) : (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    backgroundColor: '#0f172a',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#1f2937',
                  }}
                >
                  <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>
                    {(
                      profile?.displayName?.[0] ||
                      user?.displayName?.[0] ||
                      profile?.username?.[0] ||
                      user?.email?.[0] ||
                      '?'
                    ).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <ThemedText
                type="title"
                style={[
                  homeStyles.titleText,
                  {
                    color: accentColor,
                  },
                ]}
              >
                {profile?.displayName || user?.displayName || 'Home'}
              </ThemedText>
            </View>

            <Pressable
              onPress={handleOpenNotifications}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMuted ? (
                  <BellOff size={24} color="#FFFFFF" />
                ) : (
                  <Bell size={24} color="#FFFFFF" />
                )}

                {!isMuted && unreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      backgroundColor: '#ef4444',
                      borderRadius: 999,
                      minWidth: 16,
                      height: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: '#f9fafb',
                        fontSize: 10,
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </ThemedView>

          <ThemedView
            style={homeStyles.tabsRow}
            lightColor={palette.background}
            darkColor={palette.background}
          >
            <Pressable
              style={homeStyles.tabButton}
              onPress={() => setActiveTab('forYou')}
            >
              <ThemedText
                style={[
                  homeStyles.tabLabel,
                  isForYou && {
                    color: accentColor,
                  },
                ]}
              >
                For you
              </ThemedText>
              <ThemedView
                style={[
                  homeStyles.tabIndicator,
                  isForYou && {
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </Pressable>

            <Pressable
              style={homeStyles.tabButton}
              onPress={() => setActiveTab('following')}
            >
              <ThemedText
                style={[
                  homeStyles.tabLabel,
                  !isForYou && {
                    color: accentColor,
                  },
                ]}
              >
                Following
              </ThemedText>
              <ThemedView
                style={[
                  homeStyles.tabIndicator,
                  !isForYou && {
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </Pressable>
          </ThemedView>
        </Animated.View>

        <FlatList
          ref={feedListRef}
          style={homeStyles.feedScroll}
          contentInsetAdjustmentBehavior={
            Platform.OS === 'ios' ? 'never' : undefined
          }
          data={uniquePosts}
          extraData={dataUpdatedAt}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={itemSeparator}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
          contentContainerStyle={[
            homeStyles.feedSection,
            uniquePosts.length === 0 && { flexGrow: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleFeedScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.text}
              progressBackgroundColor={palette.background}
              colors={[palette.text]}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.6}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
        </ThemedView>
      </Animated.View>
    </SafeAreaView>
  );
}
