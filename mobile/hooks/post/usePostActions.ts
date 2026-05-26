import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { API_URL } from '@/constants/api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import type { FeedPageResponse } from '@/types/feed.types';
import { useAuth } from '@/contexts/AuthContext';
import { deletePost } from '@/services/post.service';
import { savedPostsService } from '@/services/savedPosts.service';
import { updatePostAcrossAllCaches } from './postCache.utils';

export const usePostActions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const likeMutation = useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      if (!user || !API_URL) {
        throw new Error('Not authenticated');
      }
      const token = await user.getIdToken();
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`${API_URL}/likes/${encodeURIComponent(postId)}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }

      // Backend like endpoints don't need the response in the UI,
      // but we try to consume JSON if present to avoid unhandled promises.
      try {
        return await response.json();
      } catch {
        return undefined;
      }
    },
    onMutate: async ({
      postId,
      isLiked,
    }: {
      postId: string;
      isLiked: boolean;
    }) => {
      const nextIsLiked = !isLiked;
      const likesDelta = nextIsLiked ? 1 : -1;

      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.FEED });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.EXPLORE_FEED });
      await queryClient.cancelQueries({ queryKey: ['profile-posts'] });
      await queryClient.cancelQueries({ queryKey: ['saved-posts'] });
      await queryClient.cancelQueries({ queryKey: ['mentioned-posts'] });

      const previousForYou = queryClient.getQueryData<InfiniteData<FeedPageResponse>>(
        QUERY_KEYS.FEED_FOR_YOU,
      );
      const previousFollowing = queryClient.getQueryData<InfiniteData<FeedPageResponse>>(
        QUERY_KEYS.FEED_FOLLOWING,
      );
      const previousExplore = queryClient.getQueryData<InfiniteData<FeedPageResponse>>(
        QUERY_KEYS.EXPLORE_FEED,
      );
      const previousProfilePosts = queryClient.getQueriesData({ queryKey: ['profile-posts'] });
      const previousSavedPosts = queryClient.getQueryData(['saved-posts']);
      const previousMentionedPosts = queryClient.getQueriesData({
        queryKey: ['mentioned-posts'],
      });

      updatePostAcrossAllCaches(queryClient, postId, (post) => ({
        ...post,
        isLiked: nextIsLiked,
        likesCount: Math.max(0, (post.likesCount ?? 0) + likesDelta),
      }));

      return {
        previousForYou,
        previousFollowing,
        previousExplore,
        previousProfilePosts,
        previousSavedPosts,
        previousMentionedPosts,
      };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousForYou !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.FEED_FOR_YOU, context.previousForYou);
      }
      if (context?.previousFollowing !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.FEED_FOLLOWING, context.previousFollowing);
      }
      if (context?.previousExplore !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.EXPLORE_FEED, context.previousExplore);
      }
      if (context?.previousProfilePosts?.length) {
        context.previousProfilePosts.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      if (context?.previousSavedPosts !== undefined) {
        queryClient.setQueryData(['saved-posts'], context.previousSavedPosts);
      }
      if (context?.previousMentionedPosts?.length) {
        context.previousMentionedPosts.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.FEED,
        refetchType: 'inactive',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.EXPLORE_FEED,
        refetchType: 'inactive',
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      postId,
      collectionName,
    }: {
      postId: string;
      /** Omit for global unsave / unsorted-only toggle per backend rules */
      collectionName?: string;
    }) => {
      if (!user || !API_URL) {
        throw new Error('Not authenticated');
      }

      const token = await user.getIdToken();
      return savedPostsService.toggleSavedPost(token, postId, collectionName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FEED });
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SAVED_COLLECTIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPLORE_FEED });
    },
  });

  const repostMutation = useMutation({
    mutationFn: async ({ postId, isReposted }: { postId: string; isReposted: boolean }) => {
      if (!user || !API_URL) {
        throw new Error('Not authenticated');
      }
      const token = await user.getIdToken();

      // When already reposted, hit the unrepost endpoint with the original post id.
      if (isReposted) {
        const response = await fetch(
          `${API_URL}/posts/unrepost/${encodeURIComponent(postId)}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to unrepost');
        }
        return;
      }

      // Otherwise create a simple repost of the target post, without extra content/media.
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ originalPostId: postId }),
      });

      if (!response.ok) {
        throw new Error('Failed to repost');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FEED });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPLORE_FEED });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      if (!user || !API_URL) {
        throw new Error('Not authenticated');
      }
      return deletePost(postId);
    },
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.FEED });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.EXPLORE_FEED });

      const previousForYou = queryClient.getQueryData<InfiniteData<FeedPageResponse>>(
        QUERY_KEYS.FEED_FOR_YOU,
      );
      const previousFollowing = queryClient.getQueryData<InfiniteData<FeedPageResponse>>(
        QUERY_KEYS.FEED_FOLLOWING,
      );
      const previousExplore = queryClient.getQueryData(QUERY_KEYS.EXPLORE_FEED);

      const filterPages = (old: InfiniteData<FeedPageResponse> | undefined) => {
        if (!old?.pages?.length) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((p) => p.id !== postId),
          })),
        };
      };

      queryClient.setQueryData(QUERY_KEYS.FEED_FOR_YOU, filterPages);
      queryClient.setQueryData(QUERY_KEYS.FEED_FOLLOWING, filterPages);
      queryClient.setQueryData(QUERY_KEYS.EXPLORE_FEED, filterPages);

      return {
        previousForYou,
        previousFollowing,
        previousExplore,
      };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousForYou !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.FEED_FOR_YOU, context.previousForYou);
      }
      if (context?.previousFollowing !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.FEED_FOLLOWING, context.previousFollowing);
      }
      if (context?.previousExplore !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.EXPLORE_FEED, context.previousExplore);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FEED });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPLORE_FEED });
    },
  });

  return {
    likeMutation,
    repostMutation,
    saveMutation,
    deleteMutation,
  };
};

