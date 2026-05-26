import { useInfiniteQuery } from '@tanstack/react-query';

import type { FeedPost } from '@/components/post/feed/types/types';
import { useAuth } from '@/contexts/AuthContext';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { feedServices } from '@/services/feedServices';
import type { FeedPageResponse, FeedType } from '@/types/feed.types';

export type { FeedPageResponse, FeedType } from '@/types/feed.types';

type UseHomeFeedOptions = {
  enabled?: boolean;
};

export function useHomeFeed(feedType: FeedType, options?: UseHomeFeedOptions) {
  const { user } = useAuth();
  const PAGE_SIZE = 20;
  const enabled = options?.enabled ?? true;

  const query = useInfiniteQuery<FeedPageResponse, Error>({
    queryKey:
      feedType === 'for_you' ? QUERY_KEYS.FEED_FOR_YOU : QUERY_KEYS.FEED_FOLLOWING,
    queryFn: async ({ pageParam }) => {
      const token = await user!.getIdToken();
      return feedServices.fetchFeed(token, feedType, pageParam as number, PAGE_SIZE);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!user && enabled,
  });

  const posts = flattenFeedPages(query.data);

  return { ...query, posts };
}

export function flattenFeedPages(
  data: { pages: FeedPageResponse[] } | undefined,
): FeedPost[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}
