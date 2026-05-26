import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import {
  getExplorePosts,
  type ExplorePostsResponse,
} from '@/services/post.service';

type ExplorePageParam = number;
type ExploreInfiniteData = InfiniteData<ExplorePostsResponse, ExplorePageParam>;

type UseExplorePostsOptions = {
  enabled?: boolean;
};

export const useExplorePosts = (options?: UseExplorePostsOptions) => {
  const enabled = options?.enabled ?? true;
  const PAGE_SIZE = 20;

  const query = useInfiniteQuery<
    ExplorePostsResponse,
    Error,
    ExploreInfiniteData,
    typeof QUERY_KEYS.EXPLORE_FEED,
    ExplorePageParam
  >({
    queryKey: QUERY_KEYS.EXPLORE_FEED,
    initialPageParam: 1 as ExplorePageParam,
    queryFn: ({ pageParam }) =>
      getExplorePosts({ page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.page + 1) as ExplorePageParam : undefined,
    enabled,
  });

  const posts =
    query.data?.pages.flatMap((page: ExplorePostsResponse) => page.data) ?? [];

  // Explore should never display repost "shell" items (text-only wrappers).
  // We filter them at the hook level so both media- and video-Explore screens stay consistent.
  const filteredPosts = posts.filter((p) => !p.isRepost);

  return {
    posts: filteredPosts,
    dataUpdatedAt: query.dataUpdatedAt,
    isLoading: query.isLoading,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};



