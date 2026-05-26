import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { blockServices, type BlockedUser } from '@/services/blockServices';
import { EditProfileScreen } from '@/components/profile/EditProfileScreen';

export default function SettingsScreen() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const {
    data: blockedUsers = [],
    isLoading: isBlockedLoading,
    isError: isBlockedError,
  } = useQuery<BlockedUser[]>({
    queryKey: ['blocked-users'],
    enabled: !!user && showBlockedUsers,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return blockServices.fetchBlockedUsers(token);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockedUserId: string) => {
      const token = await user!.getIdToken();
      await blockServices.unblockUser(token, blockedUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
  });

  if (isEditingProfile) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <EditProfileScreen
          onDone={() => {
            setIsEditingProfile(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={22} color="#9ca3af" />
          </Pressable>
          <ThemedText style={{ fontSize: 20, fontWeight: '700' }}>Settings</ThemedText>
        </View>

        {showBlockedUsers ? (
          <>
            <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
              Blocked users
            </ThemedText>

            {isBlockedLoading && (
              <ThemedText style={{ marginVertical: 4 }}>Loading blocked accounts...</ThemedText>
            )}

            {isBlockedError && !isBlockedLoading && (
              <ThemedText style={{ marginVertical: 4, color: '#f97373' }}>
                Failed to load blocked accounts.
              </ThemedText>
            )}

            {!isBlockedLoading && !isBlockedError && blockedUsers.length === 0 && (
              <ThemedText style={{ marginVertical: 4, color: '#9ca3af' }}>
                You haven&apos;t blocked any accounts yet.
              </ThemedText>
            )}

            {!isBlockedLoading && !isBlockedError && blockedUsers.length > 0 && (
              <View style={{ marginTop: 4 }}>
                {blockedUsers.map((blockedUser) => (
                  <View
                    key={blockedUser.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                    }}
                  >
                    <View>
                      <ThemedText style={{ fontWeight: '600' }}>
                        {blockedUser.displayName || blockedUser.username}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: '#9ca3af' }}>
                        @{blockedUser.username}
                      </ThemedText>
                    </View>
                    <Pressable
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: 'rgba(148, 163, 184, 0.6)',
                      }}
                      disabled={unblockMutation.isPending}
                      onPress={() => {
                        unblockMutation.mutate(blockedUser.id);
                      }}
                    >
                      <ThemedText style={{ fontSize: 12 }}>Unblock</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Pressable style={{ paddingVertical: 12, marginTop: 8 }} onPress={() => setShowBlockedUsers(false)}>
              <ThemedText style={{ color: '#9ca3af' }}>Back to settings</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={{ paddingVertical: 12 }}
              onPress={() => {
                setIsEditingProfile(true);
              }}
            >
              <ThemedText>Edit profile</ThemedText>
            </Pressable>

            <Pressable
              style={{ paddingVertical: 12 }}
              onPress={() => {
                setShowBlockedUsers(true);
              }}
            >
              <ThemedText>Blocked users</ThemedText>
            </Pressable>

            <View
              style={{
                marginTop: 8,
                marginBottom: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(148, 163, 184, 0.35)',
                backgroundColor: 'rgba(15, 23, 42, 0.35)',
                paddingHorizontal: 12,
                paddingVertical: 10,
                gap: 8,
              }}
            >
              <ThemedText style={{ fontSize: 15, fontWeight: '700' }}>
                Engagement
              </ThemedText>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <ThemedText style={{ color: '#cbd5e1' }}>Total Reel Views</ThemedText>
                <ThemedText style={{ fontWeight: '700' }}>
                  {profile?.totalVideoViewsReceived ?? 0}
                </ThemedText>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <ThemedText style={{ color: '#cbd5e1' }}>
                  Total Likes (All Posts)
                </ThemedText>
                <ThemedText style={{ fontWeight: '700' }}>
                  {profile?.totalLikesReceived ?? 0}
                </ThemedText>
              </View>
            </View>

            <Pressable style={{ paddingVertical: 12 }}>
              <ThemedText>Language preferences</ThemedText>
            </Pressable>

            <Pressable
              style={{ paddingVertical: 12, marginTop: 8 }}
              onPress={async () => {
                await logout();
                router.replace('/login');
              }}
            >
              <ThemedText style={{ color: '#f97373' }}>Log out</ThemedText>
            </Pressable>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
