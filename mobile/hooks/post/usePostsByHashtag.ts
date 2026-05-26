import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import {
  getPostsByHashtag,
  type ExplorePostsResponse,
} from '@/services/post.service';

type PageParam = number;
type Infinite = InfiniteData<ExplorePostsResponse, PageParam>;

export const usePostsByHashtag = (hashtagName: string | null) => {
  const enabled = !!hashtagName && hashtagName.length > 0;
  const PAGE_SIZE = 20;

  const query = useInfiniteQuery<
    ExplorePostsResponse,
    Error,
    Infinite,
    ReturnType<typeof QUERY_KEYS.HASHTAG_POSTS>,
    PageParam
  >({
    queryKey: QUERY_KEYS.HASHTAG_POSTS(hashtagName ?? ''),
    initialPageParam: 1 as PageParam,
    queryFn: ({ pageParam }) =>
      getPostsByHashtag(hashtagName!, { page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.page + 1) as PageParam : undefined,
    enabled,
  });

  const posts =
    query.data?.pages.flatMap((page: ExplorePostsResponse) => page.data) ?? [];

  const filteredPosts = posts.filter((p) => !p.isRepost);

  return {
    posts: filteredPosts,
    isLoading: query.isLoading,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};
