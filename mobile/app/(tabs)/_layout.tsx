import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { HapticTab } from '@/components/haptic-tab';
import HomeIcon from '@/assets/icons/Home.svg';
import AddCircleIcon from '@/assets/icons/AddCircle.svg';
import SearchSquareIcon from '@/assets/icons/SearchSquare.svg';
import ChatSquareThin from '@/assets/icons/ChatSquareThin.svg';
import ProfileThin from '@/assets/icons/ProfileThin.svg';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { QUERY_KEYS } from '@/constants/queryKeys';

export default function TabLayout() {
  const tabPalette = Colors.dark;
  const { isAuthenticated, isLoading } = useAuth();
  const { data: chatUnreadCount = 0 } = useQuery<number>({
    queryKey: [...QUERY_KEYS.CHAT_UNREAD, 'count'],
    queryFn: async () => 0,
    enabled: false,
    initialData: 0,
    staleTime: Infinity,
  });

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabPalette.tabIconSelected,
        tabBarInactiveTintColor: tabPalette.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarStyle: {
          backgroundColor: tabPalette.background,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          left: 12,
          right: 12,
          bottom: 20,
          marginHorizontal: 0,
          marginBottom: 0,
          borderRadius: 14,
          height: 50,
          paddingTop: 0,
          paddingBottom: 0,
          overflow: 'hidden',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <HomeIcon width={28} height={28} opacity={focused ? 1 : 0.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => {
            return (
              <View style={{ width: 28, height: 28 }}>
                <ChatSquareThin
                  width={28}
                  height={28}
                  opacity={focused ? 1 : 0.6}
                />
                {chatUnreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -6,
                      backgroundColor: '#ef4444',
                      borderRadius: 999,
                      minWidth: 16,
                      height: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                      borderWidth: 2,
                      borderColor: tabPalette.background,
                    }}
                  >
                    <Text
                      style={{
                        color: '#f9fafb',
                        fontSize: 10,
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                    >
                      {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Post',
          tabBarIcon: ({ focused }) => (
            <AddCircleIcon width={28} height={28} opacity={focused ? 1 : 0.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => (
            <SearchSquareIcon width={28} height={28} opacity={focused ? 1 : 0.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => {
            return (
              <ProfileThin
                width={26}
                height={26}
                opacity={focused ? 1 : 0.6}
                fill="#FFFFFF"
              />
            );
          },
        }}
      />
    </Tabs>
  );
}
