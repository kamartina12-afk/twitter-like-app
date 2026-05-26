import type { QueryClient, InfiniteData } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/queryKeys';
import type { FeedPost } from '@/components/post/feed/types/types';
import type { FeedPageResponse } from '@/types/feed.types';

function findInInfinite(
  data: InfiniteData<FeedPageResponse> | undefined,
  postId: string,
): FeedPost | undefined {
  if (!data?.pages?.length) {
    return undefined;
  }
  for (const page of data.pages) {
    const hit = page.data.find((p) => p.id === postId);
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

/** Resolves a post from React Query caches (feeds, explore, hashtag, profile, saved, mentions). */
export function findFeedPostInCaches(
  queryClient: QueryClient,
  postId: string,
): FeedPost | undefined {
  const infiniteKeys = [
    QUERY_KEYS.FEED_FOR_YOU,
    QUERY_KEYS.FEED_FOLLOWING,
    QUERY_KEYS.EXPLORE_FEED,
  ] as const;

  for (const key of infiniteKeys) {
    const hit = findInInfinite(
      queryClient.getQueryData(key),
      postId,
    );
    if (hit) {
      return hit;
    }
  }

  const hashtagEntries = queryClient.getQueriesData<
    InfiniteData<FeedPageResponse>
  >({
    queryKey: ['explore', 'hashtag-posts'],
  });
  for (const [, data] of hashtagEntries) {
    const hit = findInInfinite(data, postId);
    if (hit) {
      return hit;
    }
  }

  const profileEntries = queryClient.getQueriesData<FeedPost[]>({
    queryKey: ['profile-posts'],
  });
  for (const [, arr] of profileEntries) {
    const hit = arr?.find((p) => p.id === postId);
    if (hit) {
      return hit;
    }
  }

  const saved = queryClient.getQueryData<FeedPost[]>(['saved-posts']);
  const fromSaved = saved?.find((p) => p.id === postId);
  if (fromSaved) {
    return fromSaved;
  }

  const mentionedEntries = queryClient.getQueriesData<FeedPost[]>({
    queryKey: ['mentioned-posts'],
  });
  for (const [, arr] of mentionedEntries) {
    const hit = arr?.find((p) => p.id === postId);
    if (hit) {
      return hit;
    }
  }

  return undefined;
}
