import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import SearchBar from '@/components/search/SearchBar';
import SearchResultsList from '@/components/search/SearchResultsList';
import RecentSearches from '@/components/search/RecentSearches';
import HashtagSuggestionsList from '@/components/search/HashtagSuggestionsList';
import {
  useSearchHistory,
  useSearchUsers,
} from '@/hooks/search/useSearchUsers';
import { useDebounce } from '@/hooks/useDebounce';
import { useExplorePosts } from '@/hooks/post/useExplorePosts';
import { usePostsByHashtag } from '@/hooks/post/usePostsByHashtag';
import { useHashtagSuggestions } from '@/hooks/search/useHashtagSuggestions';
import { ExplorePostsList } from '@/components/post/feed/ExplorePostsList';
import { ThemedView } from '@/components/themed-view';
import type { ExploreSearchHistoryEntry } from '@/types/searchHistory.types';
import { useTabPressRefresh } from '@/hooks/useTabPressRefresh';

export default function ExploreTab() {
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleExploreTabPressRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['explore'] });
  }, [queryClient]);

  useTabPressRefresh(handleExploreTabPressRefresh);

  const trimmedInput = query.trim();
  const trimmedDebounced = debouncedQuery.trim();

  const isHashtagMode =
    trimmedDebounced.startsWith('#') && trimmedDebounced.length > 1;
  const hashtagName = isHashtagMode
    ? trimmedDebounced.slice(1).trim().toLowerCase()
    : '';
  const hashtagPrefix =
    isHashtagMode && trimmedDebounced.length > 1
      ? trimmedDebounced.slice(1).trim().toLowerCase()
      : null;

  const { data: users } = useSearchUsers(debouncedQuery);
  const { historyQuery, addHistory, deleteHistory } = useSearchHistory();

  const exploreFeed = useExplorePosts({
    enabled: !(isHashtagMode && hashtagName.length > 0),
  });
  const hashtagFeed = usePostsByHashtag(
    isHashtagMode && hashtagName ? hashtagName : null,
  );

  const activePosts = isHashtagMode ? hashtagFeed.posts : exploreFeed.posts;
  const isLoadingPosts = isHashtagMode
    ? hashtagFeed.isLoading
    : exploreFeed.isLoading;
  const isErrorPosts = isHashtagMode
    ? hashtagFeed.isError
    : exploreFeed.isError;
  const fetchNextPage = isHashtagMode
    ? hashtagFeed.fetchNextPage
    : exploreFeed.fetchNextPage;
  const hasNextPage = isHashtagMode
    ? hashtagFeed.hasNextPage
    : exploreFeed.hasNextPage;
  const isFetchingNextPage = isHashtagMode
    ? hashtagFeed.isFetchingNextPage
    : exploreFeed.isFetchingNextPage;

  const { data: hashtagSuggestions = [] } = useHashtagSuggestions(
    isSearchFocused && isHashtagMode && hashtagPrefix ? hashtagPrefix : null,
  );

  const handleHistorySelect = (entry: ExploreSearchHistoryEntry) => {
    if (entry.type === 'user') {
      router.push(`/profile/${String(entry.id)}`);
      setQuery('');
      return;
    }
    const tag =
      entry.query.startsWith('#') ? entry.query : `#${entry.query.replace(/^#/, '')}`;
    setQuery(tag);
  };

  const handleUserPress = (user: { id?: string; username?: string }) => {
    if (!user?.id) return;
    addHistory.mutate({
      query: user.username ?? '',
      type: 'user',
      targetId: user.id,
    });
    router.push(`/profile/${String(user.id)}`);
  };

  const handleHashtagSuggestionSelect = (name: string) => {
    const next = `#${name}`;
    setQuery(next);
    addHistory.mutate({ query: next, type: 'hashtag' });
  };

  const isTyping = trimmedInput.length > 0;
  const hasHistory = (historyQuery.data?.length ?? 0) > 0;

  const isInitialSearchScreen = isSearchFocused && trimmedInput.length === 0;

  const showHistory =
    hasHistory && isInitialSearchScreen && !historyQuery.isLoading;

  const showUserResults =
    !trimmedDebounced.startsWith('#') &&
    isTyping &&
    trimmedDebounced.length > 1 &&
    Array.isArray(users) &&
    users.length > 0;

  const showHashtagSuggestions =
    isSearchFocused &&
    isHashtagMode &&
    !!hashtagPrefix &&
    hashtagPrefix.length >= 1;

  const showExplorePosts = !isInitialSearchScreen && (isHashtagMode || !showUserResults);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <SearchBar
          value={query}
          onChange={setQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => {
            setIsSearchFocused(false);
          }}
        />

        {showHistory && (
          <RecentSearches
            history={historyQuery.data ?? []}
            onSelect={handleHistorySelect}
            onDelete={(id: string) => deleteHistory.mutate(id)}
          />
        )}

        {showHashtagSuggestions && (
          <HashtagSuggestionsList
            suggestions={hashtagSuggestions}
            onSelect={handleHashtagSuggestionSelect}
          />
        )}

        {showUserResults && (
          <SearchResultsList users={users!} onPress={handleUserPress} />
        )}

        {showExplorePosts && (
          <ThemedView style={styles.exploreFeedContainer}>
            <ExplorePostsList
              posts={activePosts}
              isLoading={isLoadingPosts}
              isError={isErrorPosts}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              onPressCell={(post, isVideo) => {
                router.push({
                  pathname: '/explore-media-feed',
                  params: {
                    postId: post.id,
                    mode: isVideo ? 'video' : 'media',
                  },
                });
              }}
            />
          </ThemedView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  exploreFeedContainer: {
    flex: 1,
  },
});
