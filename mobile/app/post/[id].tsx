import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';

import PostCard from '@/components/post/feed/PostCard';
import type { FeedPost } from '@/components/post/feed/types/types';
import { useAuth } from '@/contexts/AuthContext';
import { getPost } from '@/services/post.service';

export default function PostDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    focusCommentId?: string;
  }>();

  const rawId = params.id;
  const postId = typeof rawId === 'string' ? rawId : rawId?.[0] ?? '';
  const rawFocus = params.focusCommentId;
  const focusCommentId =
    typeof rawFocus === 'string'
      ? rawFocus
      : rawFocus?.[0] ?? null;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [router, user]);

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery<FeedPost>({
    queryKey: ['post-detail', postId],
    queryFn: () => getPost(postId),
    enabled: !!user && postId.length > 0,
  });

  if (!postId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
        <Text style={{ color: '#f87171', padding: 16 }}>Invalid post.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#020617',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="#f9fafb" />
      </SafeAreaView>
    );
  }

  if (isError || !post) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
        <View style={{ padding: 16 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ marginBottom: 16 }}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={{ color: '#f87171' }}>Could not load this post.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#111827',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 8 }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text
          style={{
            color: '#f9fafb',
            fontSize: 17,
            fontWeight: '700',
            marginLeft: 4,
          }}
        >
          Post
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
      >
        <PostCard
          post={post}
          isVisible
          isScreenFocused
          initialCommentsOpen
          focusCommentId={focusCommentId}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
