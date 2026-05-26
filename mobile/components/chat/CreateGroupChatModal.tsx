import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { followServices, type FollowUser } from '@/services/followServices';
import { auth } from '@/lib/firebase';
import { useSearchUsers } from '@/hooks/search/useSearchUsers';

type SelectableUser = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type CreateGroupChatModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (payload: { memberUserIds: string[]; name: string }) => Promise<unknown>;
};

export default function CreateGroupChatModal({
  visible,
  onClose,
  onCreate,
}: CreateGroupChatModalProps) {
  const [groupName, setGroupName] = useState('');
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersError, setFollowersError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: searchResults = [] } = useSearchUsers(search, { enabled: visible });

  useEffect(() => {
    if (!visible) {
      setGroupName('');
      setFollowers([]);
      setFollowersLoading(false);
      setFollowersError(null);
      setSearch('');
      setSelectedIds(new Set());
      setIsCreating(false);
      setCreateError(null);
      return;
    }

    const loadFollowers = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setFollowersLoading(true);
      setFollowersError(null);
      try {
        const token = await user.getIdToken();
        const list = await followServices.fetchFollowers(token);
        setFollowers(list);
      } catch (error: any) {
        setFollowersError(error?.message ?? 'Failed to load followers');
      } finally {
        setFollowersLoading(false);
      }
    };

    void loadFollowers();
  }, [visible]);

  const allCandidates = useMemo(() => {
    const searchUsers = (searchResults as SelectableUser[]) ?? [];
    const merged = [...followers];
    for (const user of searchUsers) {
      if (!merged.some((f) => f.id === user.id)) {
        merged.push(user);
      }
    }
    return merged;
  }, [followers, searchResults]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName || selectedIds.size === 0) {
      setCreateError('Add group name and at least one participant');
      return;
    }

    setCreateError(null);
    setIsCreating(true);
    try {
      await onCreate({ memberUserIds: Array.from(selectedIds), name: trimmedName });
      onClose();
    } catch (error: any) {
      setCreateError(error?.message ?? 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#0f172a',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '85%',
            padding: 16,
            gap: 12,
          }}
        >
          <ThemedText style={{ fontSize: 20, fontWeight: '700' }}>Create group chat</ThemedText>

          <TextInput
            placeholder="Group name"
            placeholderTextColor="#9ca3af"
            value={groupName}
            onChangeText={setGroupName}
            style={{
              borderWidth: 1,
              borderColor: '#334155',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: '#f8fafc',
            }}
          />

          <TextInput
            placeholder="Search users to add"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: '#334155',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: '#f8fafc',
            }}
          />

          <ThemedText style={{ opacity: 0.85 }}>{selectedIds.size} selected</ThemedText>

          {followersLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator />
            </View>
          ) : followersError ? (
            <ThemedText style={{ color: '#f87171' }}>{followersError}</ThemedText>
          ) : (
            <FlatList
              data={allCandidates}
              keyExtractor={(item) => item.id}
              style={{ minHeight: 200 }}
              renderItem={({ item }) => {
                const checked = selectedIds.has(item.id);
                const name = item.displayName || item.username;
                return (
                  <Pressable
                    onPress={() => toggleSelected(item.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: '#1e293b',
                    }}
                  >
                    <View>
                      <ThemedText style={{ fontWeight: '600' }}>{name}</ThemedText>
                      <ThemedText style={{ opacity: 0.7 }}>@{item.username}</ThemedText>
                    </View>
                    <ThemedText style={{ color: checked ? '#22c55e' : '#94a3b8' }}>
                      {checked ? 'Selected' : 'Select'}
                    </ThemedText>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <ThemedText style={{ opacity: 0.8, paddingVertical: 10 }}>
                  No followers or search results.
                </ThemedText>
              }
            />
          )}

          {createError ? <ThemedText style={{ color: '#f87171' }}>{createError}</ThemedText> : null}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              disabled={isCreating}
              onPress={handleCreate}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: isCreating ? '#334155' : '#2563eb',
              }}
            >
              <ThemedText style={{ color: '#f8fafc', fontWeight: '700' }}>
                {isCreating ? 'Creating...' : 'Create group'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
