import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';

import { commentsModalStyles as styles } from './PostCard.styles';
import { CommentsModalProps, Comment } from './types/types';
import {
  flattenCommentTree,
  type FlatCommentRow,
} from '@/components/post/feed/comments.utils';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_MAX = Math.min(SCREEN_H * 0.62, 520);
const OPEN_DURATION = 320;
const CLOSE_DURATION = 260;
const ROW_ESTIMATE = 96;

export function CommentsModal({
  visible,
  isLoading,
  comments,
  commentText,
  onChangeCommentText,
  onClose,
  onSubmit,
  replyTo,
  onReplyTo,
  onToggleLike,
  focusCommentId,
  reelLayout,
}: CommentsModalProps) {
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const listRef = useRef<FlatList<FlatCommentRow>>(null);
  const didScrollToFocus = useRef(false);

  const sheetMaxHeight = useMemo(() => {
    if (reelLayout === 'vertical') {
      return Math.min(SCREEN_H * 0.58, 500);
    }
    return SHEET_MAX;
  }, [reelLayout]);

  const flatRows = useMemo(
    () => flattenCommentTree(comments),
    [comments],
  );

  const closeAnimated = useCallback(() => {
    translateY.value = withTiming(
      SCREEN_H,
      { duration: CLOSE_DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setSheetVisible)(false);
          runOnJS(onClose)();
        }
      },
    );
    backdropOpacity.value = withTiming(0, { duration: CLOSE_DURATION });
  }, [backdropOpacity, onClose, translateY]);

  useEffect(() => {
    if (visible) {
      setSheetVisible(true);
      translateY.value = SCREEN_H;
      backdropOpacity.value = 0;
      translateY.value = withTiming(0, {
        duration: OPEN_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: OPEN_DURATION });
    }
  }, [visible, backdropOpacity, translateY]);

  useEffect(() => {
    if (!visible && sheetVisible) {
      translateY.value = withTiming(
        SCREEN_H,
        { duration: CLOSE_DURATION, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(setSheetVisible)(false);
          }
        },
      );
      backdropOpacity.value = withTiming(0, { duration: CLOSE_DURATION });
    }
  }, [visible, sheetVisible, backdropOpacity, translateY]);

  useEffect(() => {
    didScrollToFocus.current = false;
  }, [focusCommentId, visible]);

  useEffect(() => {
    if (
      !visible ||
      !focusCommentId ||
      isLoading ||
      flatRows.length === 0 ||
      didScrollToFocus.current
    ) {
      return;
    }
    const idx = flatRows.findIndex((r) => r.id === focusCommentId);
    if (idx < 0) return;

    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0.35,
      });
      didScrollToFocus.current = true;
    }, 400);
    return () => clearTimeout(t);
  }, [visible, focusCommentId, isLoading, flatRows]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = dragStartY.value + e.translationY;
      translateY.value = next > 0 ? next : 0;
      const maxFade = sheetMaxHeight;
      const p = Math.min(1, translateY.value / maxFade);
      backdropOpacity.value = 1 - p;
    })
    .onEnd((e) => {
      const shouldClose =
        translateY.value > sheetMaxHeight * 0.22 || e.velocityY > 900;
      if (shouldClose) {
        runOnJS(closeAnimated)();
      } else {
        translateY.value = withTiming(0, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(1, { duration: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.55,
  }));

  const hasComments = comments.length > 0;

  const renderComment = useCallback(
    ({ item }: { item: FlatCommentRow }) => {
      const highlighted = focusCommentId === item.id;
      return (
        <View
          style={[
            styles.commentItem,
            { paddingLeft: 4 + item.depth * 14 },
            highlighted && styles.commentRowHighlighted,
          ]}
        >
          <Text style={styles.commentAuthor}>
            {item.user.displayName || item.user.username}
          </Text>
          <Text style={styles.commentHandle}>@{item.user.username}</Text>
          <Text style={styles.commentBody}>{item.content}</Text>
          <View style={styles.commentActionsRow}>
            <Pressable
              onPress={() => onToggleLike(item.id)}
              style={styles.commentLikeButton}
              hitSlop={8}
            >
              <Heart
                size={18}
                color={item.isLikedByMe ? '#f43f5e' : '#a1a1aa'}
                fill={item.isLikedByMe ? '#f43f5e' : 'transparent'}
              />
              {(item.likesCount ?? 0) > 0 && (
                <Text style={styles.commentLikeCount}>{item.likesCount}</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                const c: Comment = {
                  id: item.id,
                  content: item.content,
                  createdAt: item.createdAt,
                  parentId: item.parentId,
                  user: item.user,
                  likesCount: item.likesCount,
                  isLikedByMe: item.isLikedByMe,
                  replies: [],
                };
                onReplyTo(c);
              }}
              style={styles.commentReplyButton}
              hitSlop={8}
            >
              <Text style={styles.commentReplyLabel}>Reply</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [focusCommentId, onReplyTo, onToggleLike],
  );

  const keyExtractor = useCallback((item: FlatCommentRow) => item.id, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ROW_ESTIMATE,
      offset: ROW_ESTIMATE * index,
      index,
    }),
    [],
  );

  return (
    <Modal
      visible={sheetVisible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={closeAnimated}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={0}
          style={styles.sheetKeyboard}
        >
          <View style={styles.sheetBackdropWrap}>
            <Animated.View style={[styles.sheetBackdropDim, backdropStyle]} />
            <Pressable style={styles.sheetBackdropPress} onPress={closeAnimated} />

            <Animated.View
              style={[
                styles.sheetOuter,
                { maxHeight: sheetMaxHeight + insets.bottom + 24 },
                sheetStyle,
              ]}
            >
              <View
                style={[
                  styles.sheetInner,
                  {
                    maxHeight: sheetMaxHeight,
                    paddingBottom: Math.max(insets.bottom, 12),
                  },
                ]}
              >
                <GestureDetector gesture={panGesture}>
                  <View>
                    <View style={styles.sheetGrabberWrap}>
                      <View style={styles.sheetGrabber} />
                    </View>

                    <Text style={styles.sheetTitle}>Comments</Text>
                  </View>
                </GestureDetector>

                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#1D9BF0" />
                  </View>
                ) : !hasComments ? (
                  <Text style={styles.emptyText}>
                    No comments yet. Be the first to reply.
                  </Text>
                ) : (
                  <FlatList
                    ref={listRef}
                    data={flatRows}
                    keyExtractor={keyExtractor}
                    renderItem={renderComment}
                    getItemLayout={getItemLayout}
                    onScrollToIndexFailed={(info) => {
                      const wait = new Promise((r) => setTimeout(r, 100));
                      wait.then(() => {
                        listRef.current?.scrollToIndex({
                          index: info.index,
                          animated: true,
                          viewPosition: 0.35,
                        });
                      });
                    }}
                    style={styles.commentsFlatList}
                    contentContainerStyle={styles.commentsFlatListContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  />
                )}

                <View style={styles.inputBlock}>
                  {replyTo && (
                    <View style={styles.replyToBanner}>
                      <Text style={styles.replyToBannerText} numberOfLines={1}>
                        Replying to @{replyTo.user.username}
                      </Text>
                      <Pressable onPress={() => onReplyTo(null)}>
                        <Text style={styles.replyToBannerClear}>Cancel</Text>
                      </Pressable>
                    </View>
                  )}
                  <TextInput
                    placeholder={
                      replyTo
                        ? `Reply to @${replyTo.user.username}…`
                        : 'Add a comment…'
                    }
                    placeholderTextColor="#6b7280"
                    value={commentText}
                    onChangeText={onChangeCommentText}
                    multiline
                    style={styles.input}
                  />
                  <Pressable
                    onPress={onSubmit}
                    style={[
                      styles.submitButton,
                      !commentText.trim() && styles.submitButtonDisabled,
                    ]}
                    disabled={!commentText.trim()}
                  >
                    <Text style={styles.submitButtonLabel}>Post</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
