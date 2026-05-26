import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { profileServices } from '@/services/profileServices';
import type { ProfilePost } from '@/app/(tabs)/types/types';

export function useProfilePosts(username: string | undefined, enabled = true) {
  const { user } = useAuth();

  const {
    data: profilePosts = [],
    dataUpdatedAt,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery<ProfilePost[]>({
    queryKey: ['profile-posts', username],
    enabled: enabled && !!username && !!user,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return profileServices.fetchUserPosts(token, username!);
    },
  });

  const sortedProfilePosts = useMemo(
    () =>
      [...profilePosts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [profilePosts],
  );

  return {
    posts: sortedProfilePosts,
    dataUpdatedAt,
    isLoading,
    isError,
    isRefetching,
    refetch,
  };
}

