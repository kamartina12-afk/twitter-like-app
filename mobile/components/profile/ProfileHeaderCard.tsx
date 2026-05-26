import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { profileStyles } from '@/app/(tabs)/profile.styles';

type ProfileHeaderData = {
  coverUrl?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  followingCount?: number;
  followersCount?: number;
  postsCount?: number;
};

type FollowAction = {
  isFollowing: boolean;
  loading: boolean;
  onPress: () => void;
};

type ProfileHeaderCardProps = {
  profile: ProfileHeaderData;
  avatarInitial: string;
  displayName: string;
  username: string;
  joinedDateLabel: string;
  onOpenSettings: () => void;
  /** When set, overlays the cover and shows a back control (e.g. another user’s profile). */
  onBack?: () => void;
  showSettingsButton?: boolean;
  /** When false, following / follower counts are not navigable (viewer is not the profile owner). */
  interactiveStats?: boolean;
  followAction?: FollowAction | null;
  onBlockPress?: () => void;
  blockLoading?: boolean;
};

function ProfileHeaderCardComponent({
  profile,
  avatarInitial,
  displayName,
  username,
  joinedDateLabel,
  onOpenSettings,
  onBack,
  showSettingsButton = true,
  interactiveStats = true,
  followAction,
  onBlockPress,
  blockLoading,
}: ProfileHeaderCardProps) {
  const router = useRouter();

  const followingStat = (
    <View style={profileStyles.statItem}>
      <ThemedText style={profileStyles.statValue}>{profile.followingCount ?? 0}</ThemedText>
      <ThemedText style={profileStyles.statLabel}>Following</ThemedText>
    </View>
  );

  const followersStat = (
    <View style={profileStyles.statItem}>
      <ThemedText style={profileStyles.statValue}>{profile.followersCount ?? 0}</ThemedText>
      <ThemedText style={profileStyles.statLabel}>Followers</ThemedText>
    </View>
  );

  return (
    <ThemedView style={profileStyles.card}>
      <View style={profileStyles.coverContainer}>
        {profile.coverUrl ? (
          <Image source={{ uri: profile.coverUrl }} style={profileStyles.coverImage} resizeMode="cover" />
        ) : (
          <View style={profileStyles.coverPlaceholder} />
        )}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={profileStyles.settingsButton}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ChevronLeft size={24} color="#e5e7eb" />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <View style={[profileStyles.headerActions, { marginLeft: 'auto' }]}>
            {followAction ? (
              <Pressable
                onPress={followAction.onPress}
                disabled={followAction.loading}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: followAction.isFollowing ? 'transparent' : '#38bdf8',
                  borderWidth: followAction.isFollowing ? 1 : 0,
                  borderColor: 'rgba(148, 163, 184, 0.6)',
                }}
              >
                <ThemedText
                  style={{
                    fontWeight: '700',
                    fontSize: 13,
                    color: followAction.isFollowing ? '#e5e7eb' : '#020617',
                  }}
                >
                  {followAction.loading ? '…' : followAction.isFollowing ? 'Unfollow' : 'Follow'}
                </ThemedText>
              </Pressable>
            ) : null}
            {onBlockPress ? (
              <Pressable
                onPress={onBlockPress}
                disabled={blockLoading}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: 'rgba(248, 113, 113, 0.8)',
                  backgroundColor: 'rgba(127, 29, 29, 0.35)',
                }}
              >
                <ThemedText style={{ fontWeight: '700', fontSize: 13, color: '#fca5a5' }}>
                  {blockLoading ? 'Blocking…' : 'Block'}
                </ThemedText>
              </Pressable>
            ) : null}
            {showSettingsButton ? (
              <Pressable style={profileStyles.settingsButton} onPress={onOpenSettings}>
                <IconSymbol name="gearshape.fill" size={20} color="#9ca3af" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <View style={profileStyles.headerRow}>
        <View style={profileStyles.avatarWrapper}>
          <View style={profileStyles.avatar}>
          {profile.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={{ width: '100%', height: '100%', borderRadius: 999 }}
            />
          ) : (
            <ThemedText style={profileStyles.avatarText}>{avatarInitial}</ThemedText>
          )}
          </View>
        </View>
        <View style={profileStyles.nameContainer}>
          <ThemedText style={profileStyles.displayName}>{displayName}</ThemedText>
          <ThemedText style={profileStyles.username}>@{username}</ThemedText>
        </View>
      </View>

      {profile.bio ? <ThemedText style={profileStyles.bio}>{profile.bio}</ThemedText> : null}

      <View style={profileStyles.metaRow}>
        <ThemedText style={profileStyles.metaText}>Joined {joinedDateLabel}</ThemedText>
      </View>

      <View style={profileStyles.statsRow}>
        {interactiveStats ? (
          <Pressable
            style={profileStyles.statItemPressable}
            onPress={() => {
              router.push('/followers?mode=following');
            }}
          >
            {followingStat}
          </Pressable>
        ) : (
          <View style={profileStyles.statItemPressable}>{followingStat}</View>
        )}
        {interactiveStats ? (
          <Pressable
            style={profileStyles.statItemPressable}
            onPress={() => {
              router.push('/followers?mode=followers');
            }}
          >
            {followersStat}
          </Pressable>
        ) : (
          <View style={profileStyles.statItemPressable}>{followersStat}</View>
        )}
        <View style={profileStyles.statItem}>
          <ThemedText style={profileStyles.statValue}>{profile.postsCount ?? 0}</ThemedText>
          <ThemedText style={profileStyles.statLabel}>Posts</ThemedText>
        </View>
      </View>

    </ThemedView>
  );
}

export const ProfileHeaderCard = React.memo(ProfileHeaderCardComponent);

