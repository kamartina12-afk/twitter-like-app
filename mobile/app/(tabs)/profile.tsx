import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import {
  ProfileContentList,
  type ProfileContentListRef,
} from '@/components/profile/ProfileContentList';
import { useTabPressRefresh } from '@/hooks/useTabPressRefresh';
import { ProfileTabKey } from './types/types';
import { formatReadableDate } from '@/utils/formatDate';
import { QUERY_KEYS } from '@/constants/queryKeys';

export default function ProfileScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const displayName = profile?.displayName || user?.displayName || user?.email || 'Your profile';
  const username = profile?.username || user?.email?.split('@')[0] || 'username';

  const avatarInitial =
    (profile?.displayName?.[0] ||
      user?.displayName?.[0] ||
      profile?.username?.[0] ||
      user?.email?.[0] ||
      '?'
    ).toUpperCase();

  const [activeTab, setActiveTab] = useState<ProfileTabKey>('posts');
  const profileListRef = useRef<ProfileContentListRef>(null);

  const joinedDateLabel = useMemo(() => {
    const source = profile?.createdAt || profile?.birthDate;
    if (!source) return 'recently';
    const formatted = formatReadableDate(source);
    return formatted || 'recently';
  }, [profile?.createdAt, profile?.birthDate]);

  const listHeader = (
    <ProfileHeaderCard
      profile={profile ?? {}}
      avatarInitial={avatarInitial}
      displayName={displayName}
      username={username}
      joinedDateLabel={joinedDateLabel}
      onOpenSettings={() => {
        router.push('/settings');
      }}
    />
  );

  const profileTabs = (
    <ProfileTabs activeTab={activeTab} onChangeTab={setActiveTab} />
  );

  useEffect(() => {
    if (tab === 'posts' || tab === 'mentions' || tab === 'saved') {
      setActiveTab(tab as ProfileTabKey);
    }
  }, [tab]);

  const invalidateProfileQueriesOnScrollTop = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWING });
    queryClient.invalidateQueries({ queryKey: ['profile-posts', username] });
    queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
    queryClient.invalidateQueries({ queryKey: ['mentioned-posts', username] });
  }, [queryClient, username]);

  const handleProfileTabPressRefresh = useCallback(() => {
    profileListRef.current?.scrollToTop();
    invalidateProfileQueriesOnScrollTop();
    void refreshProfile();
  }, [invalidateProfileQueriesOnScrollTop, refreshProfile]);

  useTabPressRefresh(handleProfileTabPressRefresh);

  if (!profile || !user) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText>Loading profile...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ProfileContentList
        ref={profileListRef}
        activeTab={activeTab}
        username={username}
        listHeaderComponent={listHeader}
        profileTabs={profileTabs}
        onScrollUpToTop={invalidateProfileQueriesOnScrollTop}
        onPullToRefreshHeader={() => refreshProfile()}
      />
    </SafeAreaView>
  );
}

