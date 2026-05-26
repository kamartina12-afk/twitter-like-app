import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { ProfileContentList } from '@/components/profile/ProfileContentList';
import { fetchUserProfile, type PublicUserProfile } from '@/services/users.service';
import { followServices } from '@/services/followServices';
import { blockServices } from '@/services/blockServices';
import { ProfileTabKey } from '@/app/(tabs)/types/types';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { formatReadableDate } from '@/utils/formatDate';

export default function UserProfileScreen() {
  const { id: identifier, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTabKey>('posts');

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery<PublicUserProfile | null>({
    queryKey: ['user-profile', identifier],
    enabled: !!identifier && !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return fetchUserProfile(token, String(identifier));
    },
  });

  const followMutation = useMutation({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['user-profile', identifier] });
      const previousProfile = queryClient.getQueryData<PublicUserProfile | null>([
        'user-profile',
        identifier,
      ]);

      queryClient.setQueryData<PublicUserProfile | null>(['user-profile', identifier], (current) => {
        if (!current) return current;
        const wasFollowing = !!current.isFollowing;
        const nextFollowersCount =
          typeof current.followersCount === 'number'
            ? Math.max(0, current.followersCount + (wasFollowing ? -1 : 1))
            : current.followersCount;
        return {
          ...current,
          isFollowing: !wasFollowing,
          followersCount: nextFollowersCount,
        };
      });

      return { previousProfile };
    },
    mutationFn: async () => {
      if (!user || !profile) return;
      const token = await user.getIdToken();
      await followServices.toggleFollow(token, profile.id, !!profile.isFollowing);
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProfile !== undefined) {
        queryClient.setQueryData(['user-profile', identifier], context.previousProfile);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', identifier] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWING });
      void refreshProfile();
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile) return;
      const token = await user.getIdToken();
      await blockServices.blockUser(token, profile.id);
    },
    onSuccess: () => {
      router.back();
    },
  });

  const isViewingOwnProfile = !!(profile && user && user.uid === profile.id);

  useEffect(() => {
    if (isViewingOwnProfile) {
      if (tab) {
        router.replace({
          pathname: '/(tabs)/profile',
          params: { tab },
        });
        return;
      }
      router.replace('/(tabs)/profile');
    }
  }, [isViewingOwnProfile, router, tab]);

  useEffect(() => {
    if (tab === 'mentions' || tab === 'posts') {
      setActiveTab(tab as ProfileTabKey);
    }
  }, [tab]);

  const joinedDateLabel = useMemo(() => {
    if (!profile?.createdAt) return 'recently';
    const formatted = formatReadableDate(profile.createdAt);
    return formatted || 'recently';
  }, [profile?.createdAt]);

  const displayName = profile?.displayName || profile?.username || 'User';
  const username = profile?.username || 'username';
  const invalidateUserProfileQueriesOnScrollTop = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user-profile', identifier] });
    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    queryClient.invalidateQueries({ queryKey: ['profile-posts', username] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWING });
    queryClient.invalidateQueries({ queryKey: ['mentioned-posts', username] });
    void refreshProfile();
  }, [identifier, queryClient, refreshProfile, username]);

  const avatarInitial = (
    profile?.displayName?.[0] ||
    profile?.username?.[0] ||
    '?'
  ).toUpperCase();

  const listHeader = profile ? (
    <ProfileHeaderCard
      profile={profile}
      avatarInitial={avatarInitial}
      displayName={displayName}
      username={username}
      joinedDateLabel={joinedDateLabel}
      onOpenSettings={() => {}}
      onBack={() => router.back()}
      showSettingsButton={false}
      interactiveStats={false}
      followAction={{
        isFollowing: !!profile.isFollowing,
        loading: followMutation.isPending,
        onPress: () => followMutation.mutate(),
      }}
      onBlockPress={() => blockMutation.mutate()}
      blockLoading={blockMutation.isPending}
    />
  ) : null;

  if (!identifier) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText>User not found.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText>Sign in to view profiles.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (isError || !profile) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <ThemedText>Failed to load this profile.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (isViewingOwnProfile) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ProfileContentList
        activeTab={activeTab}
        username={username}
        listHeaderComponent={listHeader}
        profileTabs={
          <ProfileTabs
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            tabs={['posts', 'mentions']}
          />
        }
        isOwnProfile={false}
        onScrollUpToTop={invalidateUserProfileQueriesOnScrollTop}
        onPullToRefreshHeader={invalidateUserProfileQueriesOnScrollTop}
      />
    </SafeAreaView>
  );
}
