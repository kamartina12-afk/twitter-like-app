import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPost } from '@/services/post.service';
import { QUERY_KEYS } from '@/constants/queryKeys';

type UseCreatePostOptions = {
  onSuccess?: () => void;
};

export const useCreatePost = (options?: UseCreatePostOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.POSTS,
      });

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.EXPLORE_FEED,
      });

      queryClient.invalidateQueries({
        queryKey: ['profile-posts'],
      });

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
  });
};
