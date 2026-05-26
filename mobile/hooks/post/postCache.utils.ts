import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/queryKeys';
import type { FeedPageResponse } from '@/types/feed.types';

type PostLikeViewShape = {
  id: string;
  originalPostId?: string | null;
  likesCount?: number;
  isLiked?: boolean;
  viewsCount?: number;
  repliesCount?: number;
};

type FeedPageLikeViewShape = {
  data: PostLikeViewShape[];
};

const updatePostInArray = <T extends PostLikeViewShape>(
  items: T[] | undefined,
  postId: string,
  updater: (post: T) => T,
): T[] | undefined => {
  if (!items?.length) {
    return items;
  }

  return items.map((item) => (item.id === postId ? updater(item) : item));
};

const updatePostInPaginatedResponse = <T extends FeedPageLikeViewShape>(
  response: T | undefined,
  postId: string,
  updater: (post: PostLikeViewShape) => PostLikeViewShape,
): T | undefined => {
  if (!response?.data?.length) {
    return response;
  }

  return {
    ...response,
    data: response.data.map((post) =>
      post.id === postId ? updater(post) : post,
    ),
  };
};

const updatePostInInfinitePages = (
  old:
    | InfiniteData<FeedPageResponse>
    | InfiniteData<FeedPageLikeViewShape>
    | undefined,
  postId: string,
  updater: (post: PostLikeViewShape) => PostLikeViewShape,
) => {
  if (!old?.pages?.length) {
    return old;
  }

  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      data: page.data.map((post) => (post.id === postId ? updater(post) : post)),
    })),
  };
};

export const updatePostAcrossAllCaches = (
  queryClient: QueryClient,
  postId: string,
  updater: (post: PostLikeViewShape) => PostLikeViewShape,
) => {
  // Infinite home feeds
  queryClient.setQueryData(QUERY_KEYS.FEED_FOR_YOU, (old: unknown) =>
    updatePostInInfinitePages(
      old as InfiniteData<FeedPageResponse> | undefined,
      postId,
      updater,
    ),
  );
  queryClient.setQueryData(QUERY_KEYS.FEED_FOLLOWING, (old: unknown) =>
    updatePostInInfinitePages(
      old as InfiniteData<FeedPageResponse> | undefined,
      postId,
      updater,
    ),
  );
  // Infinite explore feeds (global + hashtag)
  queryClient.setQueryData(QUERY_KEYS.EXPLORE_FEED, (old: unknown) =>
    updatePostInInfinitePages(
      old as InfiniteData<FeedPageResponse> | undefined,
      postId,
      updater,
    ),
  );
  queryClient.setQueriesData(
    { queryKey: ['explore', 'hashtag-posts'] },
    (old) =>
      updatePostInInfinitePages(
        old as InfiniteData<FeedPageResponse> | undefined,
        postId,
        updater,
      ),
  );

  // Non-infinite home feed variants used in some screens/components.
  queryClient.setQueryData(['feed', 'for_you'], (old: unknown) => {
    if (Array.isArray(old)) {
      return updatePostInArray(
        old as PostLikeViewShape[],
        postId,
        (post) => updater(post),
      );
    }
    return updatePostInPaginatedResponse(
      old as FeedPageLikeViewShape | undefined,
      postId,
      updater,
    );
  });
  queryClient.setQueryData(['feed', 'following'], (old: unknown) => {
    if (Array.isArray(old)) {
      return updatePostInArray(
        old as PostLikeViewShape[],
        postId,
        (post) => updater(post),
      );
    }
    return updatePostInPaginatedResponse(
      old as FeedPageLikeViewShape | undefined,
      postId,
      updater,
    );
  });

  // Profile / saved / mentions lists.
  queryClient.setQueriesData({ queryKey: ['profile-posts'] }, (old) =>
    updatePostInArray(old as PostLikeViewShape[] | undefined, postId, (post) =>
      updater(post),
    ),
  );
  queryClient.setQueryData(['saved-posts'], (old: unknown) =>
    updatePostInArray(
      old as PostLikeViewShape[] | undefined,
      postId,
      (post) => updater(post),
    ),
  );
  queryClient.setQueriesData({ queryKey: ['mentioned-posts'] }, (old) =>
    updatePostInArray(old as PostLikeViewShape[] | undefined, postId, (post) =>
      updater(post),
    ),
  );
};
