import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { followersStyles } from './followers.styles';
import { followersLabels } from './labels/followers.labels';
import { QUERY_KEYS } from '@/constants/queryKeys';
import type { FollowersList, FollowersMode } from '@/types/followers.types';
import { computeNotFollowingBack, getInitials, selectActiveList } from './utils/followers.utils';
import { followServices } from '@/services/followServices';
import { blockServices } from '@/services/blockServices';

export default function FollowersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ mode?: string }>();

  const initialMode: FollowersMode =
    params.mode === 'followers' || params.mode === 'notFollowingBack'
      ? (params.mode as FollowersMode)
      : 'following';

  const [mode, setMode] = useState<FollowersMode>(initialMode);

  const {
    data: followers = [],
    isLoading: followersLoading,
    isRefetching: followersRefetching,
    refetch: refetchFollowers,
  } = useQuery<FollowersList>({
    queryKey: QUERY_KEYS.ME_FOLLOWERS,
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return followServices.fetchFollowers(token);
    },
  });

  const {
    data: following = [],
    isLoading: followingLoading,
    isRefetching: followingRefetching,
    refetch: refetchFollowing,
  } = useQuery<FollowersList>({
    queryKey: QUERY_KEYS.ME_FOLLOWING,
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return followServices.fetchFollowing(token);
    },
  });

  const notFollowingBack = useMemo(
    () => computeNotFollowingBack(following, followers),
    [following, followers],
  );

  const activeList = useMemo(
    () => selectActiveList(mode, followers, following, notFollowingBack),
    [mode, followers, following, notFollowingBack],
  );

  const followingIds = useMemo(
    () => new Set(following.map((u) => u.id)),
    [following],
  );

  const isLoading = followersLoading || followingLoading;
  const isRefetching = followersRefetching || followingRefetching;

  const followMutation = useMutation({
    mutationFn: async ({
      userId,
      isCurrentlyFollowing,
    }: {
      userId: string;
      isCurrentlyFollowing: boolean;
    }) => {
      const token = await user!.getIdToken();
      await followServices.toggleFollow(token, userId, isCurrentlyFollowing);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWING });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = await user!.getIdToken();
      await blockServices.blockUser(token, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWING });
    },
  });

  const renderItem = ({ item }: { item: FollowersList[number] }) => {
    const isFollowingUser = followingIds.has(item.id);

    return (
      <View style={followersStyles.itemRow}>
        <Pressable
          style={followersStyles.userInfoPressable}
          onPress={() => router.push(`/profile/${item.id}`)}
        >
          <View style={followersStyles.avatar}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={followersStyles.avatarImage} />
            ) : (
              <ThemedText style={followersStyles.avatarText}>
                {getInitials(item.displayName, item.username)}
              </ThemedText>
            )}
          </View>
          <View style={followersStyles.userTextContainer}>
            <ThemedText style={followersStyles.displayName}>
              {item.displayName || item.username}
            </ThemedText>
            <ThemedText style={followersStyles.username}>@{item.username}</ThemedText>
          </View>
        </Pressable>

        <View style={followersStyles.actionsRow}>
          <Pressable
            style={[
              followersStyles.followButton,
              !isFollowingUser && followersStyles.followButtonPrimary,
            ]}
            disabled={followMutation.isPending}
            onPress={() =>
              followMutation.mutate({
                userId: item.id,
                isCurrentlyFollowing: isFollowingUser,
              })
            }
          >
            <ThemedText
              style={[
                followersStyles.followButtonText,
                !isFollowingUser && followersStyles.followButtonTextPrimary,
              ]}
            >
              {isFollowingUser
                ? followersLabels.unfollowButton
                : followersLabels.followButton}
            </ThemedText>
          </Pressable>

          <Pressable
            style={followersStyles.blockButton}
            disabled={blockMutation.isPending}
            onPress={() => blockMutation.mutate(item.id)}
          >
            <ThemedText style={followersStyles.blockButtonText}>
              {followersLabels.blockButton}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={followersStyles.safeArea}>
      <ThemedView style={followersStyles.container}>
        <View style={followersStyles.headerRow}>
          <Pressable
            style={followersStyles.backButton}
            onPress={() => router.back()}
          >
            <ThemedText>{followersLabels.backButton}</ThemedText>
          </Pressable>
          <ThemedText style={followersStyles.headerTitle}>
            {followersLabels.screenTitle}
          </ThemedText>
        </View>

        <View style={followersStyles.tabsRow}>
          <Pressable
            style={[
              followersStyles.tabButton,
              mode === 'following' && followersStyles.tabButtonActive,
            ]}
            onPress={() => setMode('following')}
          >
            <ThemedText
              style={[
                followersStyles.tabLabel,
                mode === 'following' && followersStyles.tabLabelActive,
              ]}
            >
              {followersLabels.followingTab}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              followersStyles.tabButton,
              mode === 'followers' && followersStyles.tabButtonActive,
            ]}
            onPress={() => setMode('followers')}
          >
            <ThemedText
              style={[
                followersStyles.tabLabel,
                mode === 'followers' && followersStyles.tabLabelActive,
              ]}
            >
              {followersLabels.followersTab}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              followersStyles.tabButton,
              mode === 'notFollowingBack' && followersStyles.tabButtonActive,
            ]}
            onPress={() => setMode('notFollowingBack')}
          >
            <ThemedText
              style={[
                followersStyles.tabLabel,
                mode === 'notFollowingBack' && followersStyles.tabLabelActive,
              ]}
            >
              {followersLabels.notFollowingBackTab}
            </ThemedText>
          </Pressable>
        </View>

        {isLoading && (
          <View>
            <ActivityIndicator />
            <ThemedText style={followersStyles.loadingText}>
              {followersLabels.loadingText}
            </ThemedText>
          </View>
        )}

        {!isLoading && activeList.length === 0 && (
          <ThemedText style={followersStyles.emptyText}>
            {mode === 'following'
              ? followersLabels.emptyFollowing
              : mode === 'followers'
                ? followersLabels.emptyFollowers
                : followersLabels.emptyNotFollowingBack}
          </ThemedText>
        )}

        {!isLoading && activeList.length > 0 && (
          <FlatList
            data={activeList}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={followersStyles.listContent}
            refreshing={isRefetching}
            onRefresh={() => {
              refetchFollowers();
              refetchFollowing();
            }}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

