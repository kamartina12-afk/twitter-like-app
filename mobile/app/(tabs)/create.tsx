import React, { useCallback, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import CreatePostCard from '@/components/post/composer/CreatePostCard';
import { useTabPressRefresh } from '@/hooks/useTabPressRefresh';

export default function CreatePostScreen() {
  const params = useLocalSearchParams<{ initialText?: string | string[] }>();
  const scrollRef = useRef<ScrollView>(null);

  const handleCreateTabPressRefresh = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const initialText =
    typeof params.initialText === 'string'
      ? params.initialText
      : Array.isArray(params.initialText)
        ? params.initialText[0]
        : undefined;

  useTabPressRefresh(handleCreateTabPressRefresh);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
              Create post
            </ThemedText>
            <CreatePostCard initialText={initialText} />
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  title: {
    marginBottom: 12,
  },
});
