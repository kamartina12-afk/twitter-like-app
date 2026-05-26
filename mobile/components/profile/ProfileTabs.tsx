import React from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { profileStyles } from '@/app/(tabs)/profile.styles';
import { ProfileTabKey } from '@/app/(tabs)/types/types';

type ProfileTabsProps = {
  activeTab: ProfileTabKey;
  onChangeTab: (tab: ProfileTabKey) => void;
  /** Defaults to posts, mentions, and saved (own profile). */
  tabs?: ProfileTabKey[];
};

function ProfileTabsComponent({
  activeTab,
  onChangeTab,
  tabs = ['posts', 'mentions', 'saved'],
}: ProfileTabsProps) {
  return (
    <View style={profileStyles.tabsContainer}>
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        const label = tab === 'posts' ? 'Posts' : tab === 'mentions' ? 'Mentions' : 'Saved';

        return (
          <Pressable
            key={tab}
            style={profileStyles.tabItem}
            onPress={() => {
              onChangeTab(tab);
            }}
          >
            <ThemedText style={[profileStyles.tabLabel, isActive && profileStyles.tabLabelActive]}>
              {label}
            </ThemedText>
            {isActive && <View style={profileStyles.tabIndicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export const ProfileTabs = React.memo(ProfileTabsComponent);

