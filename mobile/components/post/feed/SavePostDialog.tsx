import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/queryKeys';
import { useAuth } from '@/contexts/AuthContext';
import { usePostActions } from '@/hooks/post/usePostActions';
import { savedPostsService } from '@/services/savedPosts.service';

import type { FeedPost } from './types/types';
import { saveModalStyles as styles } from './PostCard.styles';

type SelectedCollection = 'none' | '__new__' | string;

const NO_COLLECTION_TOKEN = '__NO_COLLECTION__';

type Props = {
  visible: boolean;
  post: FeedPost | null;
  onClose: () => void;
};

export function SavePostDialog({ visible, post, onClose }: Props) {
  const { user } = useAuth();
  const { saveMutation } = usePostActions();
  const [selectedCollectionName, setSelectedCollectionName] =
    useState<SelectedCollection>('none');
  const [newCollectionName, setNewCollectionName] = useState('');

  const { data: collections = [], isLoading: isCollectionsLoading } = useQuery({
    queryKey: QUERY_KEYS.SAVED_COLLECTIONS,
    enabled: visible && !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return savedPostsService.fetchCollections(token);
    },
  });

  useEffect(() => {
    if (visible) {
      setSelectedCollectionName('none');
      setNewCollectionName('');
    }
  }, [visible, post?.id]);

  if (!post) {
    return null;
  }

  const isSaved = !!post.isSaved;
  const collectionHint =
    post.collectionNames && post.collectionNames.length > 0
      ? `In: ${post.collectionNames.join(', ')}`
      : post.inUnsorted
        ? 'Saved without a collection'
        : null;

  const confirmDisabled =
    saveMutation.isPending ||
    (selectedCollectionName === '__new__' && !newCollectionName.trim());

  const confirmSave = () => {
    if (selectedCollectionName === '__new__' && !newCollectionName.trim()) {
      return;
    }

    const finalName: string | undefined =
      selectedCollectionName === 'none'
        ? NO_COLLECTION_TOKEN
        : selectedCollectionName === '__new__'
          ? newCollectionName.trim()
          : selectedCollectionName;

    saveMutation.mutate(
      {
        postId: post.id,
        collectionName: finalName,
      },
      { onSuccess: () => onClose() },
    );
  };

  const removeSaved = () => {
    saveMutation.mutate({ postId: post.id }, { onSuccess: () => onClose() });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View style={styles.sheet} pointerEvents="box-none">
          <View style={styles.headerRow}>
            <Text style={styles.title}>Save to collection</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Choose a collection, or leave this post without a collection. You can add
            the same post to several collections by saving again with a different
            name.
          </Text>

          {collectionHint ? (
            <Text style={styles.hint}>{collectionHint}</Text>
          ) : null}

          {isCollectionsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#1D9BF0" />
            </View>
          ) : (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              <Pressable
                style={[
                  styles.chip,
                  selectedCollectionName === 'none'
                    ? styles.chipSelected
                    : styles.chipDefault,
                ]}
                onPress={() => setSelectedCollectionName('none')}
              >
                <Text style={styles.chipLabel}>No collection</Text>
              </Pressable>

              {collections.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.chip,
                    selectedCollectionName === c.name
                      ? styles.chipSelected
                      : styles.chipDefault,
                  ]}
                  onPress={() => setSelectedCollectionName(c.name)}
                >
                  <Text style={styles.chipLabel}>{c.name}</Text>
                </Pressable>
              ))}

              <Text style={styles.newLabel}>Or create a new collection</Text>
              <TextInput
                style={styles.newInput}
                placeholder="Collection name"
                placeholderTextColor="#6b7280"
                value={newCollectionName}
                onChangeText={(v) => {
                  setNewCollectionName(v);
                  if (v.trim()) {
                    setSelectedCollectionName('__new__');
                  } else if (selectedCollectionName === '__new__') {
                    setSelectedCollectionName('none');
                  }
                }}
              />
            </ScrollView>
          )}

          <View style={styles.actionsRow}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnLabel}>Cancel</Text>
            </Pressable>
            {isSaved ? (
              <Pressable
                style={styles.dangerBtn}
                onPress={removeSaved}
                disabled={saveMutation.isPending}
              >
                <Text style={styles.dangerBtnLabel}>Remove saved post</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[
                styles.primaryBtn,
                confirmDisabled && styles.primaryBtnDisabled,
              ]}
              onPress={confirmSave}
              disabled={confirmDisabled}
            >
              <Text style={styles.primaryBtnLabel}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
