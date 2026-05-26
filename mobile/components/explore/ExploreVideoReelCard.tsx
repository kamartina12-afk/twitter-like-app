import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { ExpoVideoPlayer } from '@/components/media/ExpoVideoPlayer';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import PostActions from '@/components/post/feed/PostActions';
import { PostContent } from '@/components/post/feed/PostContent';
import PostPoll from '@/components/post/feed/PostPoll';
import { CommentsModal } from '@/components/post/feed/CommentsModal';
import {
  insertCommentInTree,
  mapApiCommentToComment,
  updateCommentLikeInTree,
} from '@/components/post/feed/comments.utils';
import {
  fetchCommentsForPost,
  postComment,
  toggleCommentLike,
} from '@/services/comment.service';
import { SavePostDialog } from '@/components/post/feed/SavePostDialog';
import { updatePostAcrossAllCaches } from '@/hooks/post/postCache.utils';
import { usePostActions } from '@/hooks/post/usePostActions';
import { recordPostView } from '@/services/post.service';
import { followServices } from '@/services/followServices';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { exploreVideoReelStyles } from '@/components/explore/ExploreVideoReelCard.styled';
import { exploreVideoReelLabels } from '@/components/explore/ExploreVideoReelCard.labels';
import type { Comment } from '@/components/post/feed/types/types';
import type { ExploreVideoReelCardProps } from '@/components/explore/ExploreVideoReelCard.types';
import { useAppIsActive } from '@/hooks/useAppIsActive';

const HORIZONTAL_VIDEO_ASPECT_RATIO = 1;

const ExploreVideoReelCardInner: React.FC<ExploreVideoReelCardProps> = ({
  post,
  height,
  isActive,
  isScreenFocused = true,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { likeMutation } = usePostActions();
  const appIsActive = useAppIsActive();
  const viewAttemptedRef = useRef(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const shrinkForComments = useSharedValue(0);

  const uri = post.isRepost
    ? post.originalPostVideoUrl
    : post.videoUrl;
  const mediaAspectRatio =
    (post.isRepost ? post.originalPostMediaAspectRatio : post.mediaAspectRatio) ??
    null;
  const isHorizontalVideo =
    typeof mediaAspectRatio === 'number' &&
    mediaAspectRatio > HORIZONTAL_VIDEO_ASPECT_RATIO;

  const [replyBump, setReplyBump] = useState(0);
  const postForActions = useMemo(
    () => ({
      ...post,
      repliesCount: (post.repliesCount ?? 0) + replyBump,
    }),
    [post, replyBump],
  );

  const handle = post.isRepost
    ? post.originalAuthorUsername
    : post.authorUsername;

  const profileParam = post.isRepost
    ? post.originalAuthorUsername ?? post.originalAuthorId ?? post.authorId
    : post.authorId ?? post.authorUsername;

  const contentAuthorId = post.isRepost
    ? post.originalAuthorId ?? post.authorId
    : post.authorId;

  const { data: following = [] } = useQuery({
    queryKey: QUERY_KEYS.ME_FOLLOWING,
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return followServices.fetchFollowing(token);
    },
  });

  const isOwnContent =
    !!contentAuthorId && user?.uid === contentAuthorId;
  const isFollowingAuthor =
    !!contentAuthorId &&
    following.some((item) => item.id === contentAuthorId);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !contentAuthorId || isOwnContent) return;
      const token = await user.getIdToken();
      await followServices.toggleFollow(
        token,
        contentAuthorId,
        isFollowingAuthor,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWING });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWERS });
    },
  });

  const openAuthorProfile = () => {
    if (!profileParam) return;
    setIsPausedByUser(true);
    router.push(`/profile/${profileParam}`);
  };

  const avatarUri = post.isRepost ? null : post.avatarUrl;
  const initialLetter = (
    (handle ?? exploreVideoReelLabels.unknownAuthor).replace(/^@/, '').slice(0, 1) || '?'
  ).toUpperCase();

  const loadComments = async () => {
    if (!user) return;
    try {
      setIsLoadingComments(true);
      const data = await fetchCommentsForPost(post.id);
      const mapped = data
        .map((row) => mapApiCommentToComment(row))
        .filter((c): c is Comment => c != null);
      setComments(mapped);
    } catch {
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const openComments = async () => {
    setIsCommentsOpen(true);
    await loadComments();
  };

  useEffect(() => {
    const shouldShrink = isCommentsOpen && isHorizontalVideo;
    shrinkForComments.value = withTiming(shouldShrink ? 1 : 0, { duration: 320 });
  }, [isCommentsOpen, isHorizontalVideo, shrinkForComments]);

  const videoAnimatedStyle = useAnimatedStyle(() => {
    const collapsedH = height * 0.42;
    const h = height - (height - collapsedH) * shrinkForComments.value;
    return { height: h };
  });

  useEffect(() => {
    if (!isActive && isPausedByUser) {
      setIsPausedByUser(false);
    }
  }, [isActive, isPausedByUser]);

  useEffect(() => {
    setReplyBump(0);
  }, [post.id, post.repliesCount]);

  useEffect(() => {
    viewAttemptedRef.current = false;
  }, [post.id]);

  const viewCachePostId = post.originalPostId ?? post.id;

  const isPlaying =
    isScreenFocused && isActive && !isPausedByUser && appIsActive;

  const recordViewIfNew = useCallback(() => {
    if (viewAttemptedRef.current) {
      return;
    }
    viewAttemptedRef.current = true;

    updatePostAcrossAllCaches(queryClient, viewCachePostId, (p) => ({
      ...p,
      viewsCount: (p.viewsCount ?? 0) + 1,
    }));

    void recordPostView(post.id)
      .then((recorded) => {
        if (!recorded) {
          updatePostAcrossAllCaches(queryClient, viewCachePostId, (cachePost) => ({
            ...cachePost,
            viewsCount: Math.max(0, (cachePost.viewsCount ?? 0) - 1),
          }));
        }
      })
      .catch(() => {
        viewAttemptedRef.current = false;
        updatePostAcrossAllCaches(queryClient, viewCachePostId, (cachePost) => ({
          ...cachePost,
          viewsCount: Math.max(0, (cachePost.viewsCount ?? 0) - 1),
        }));
      });
  }, [post.id, queryClient, viewCachePostId]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const timer = setTimeout(() => {
      recordViewIfNew();
    }, 2000);
    return () => clearTimeout(timer);
  }, [isPlaying, recordViewIfNew]);

  const togglePause = () => {
    setIsPausedByUser((prev) => !prev);
  };

  const doubleTapLike = useCallback(() => {
    if (!user) return;
    if (post.isLiked) return;
    likeMutation.mutate({
      postId: post.id,
      isLiked: false,
    });
  }, [user, post.id, post.isLiked, likeMutation]);

  const submitComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || !user) return;

    try {
      const raw = await postComment({
        postId: post.id,
        content: trimmed,
        parentId: replyTo?.id ?? null,
      });
      const mapped = mapApiCommentToComment(raw);
      setCommentText('');
      setReplyTo(null);
      if (mapped) {
        setComments((prev) => insertCommentInTree(prev, mapped));
        setReplyBump((b) => b + 1);
        updatePostAcrossAllCaches(queryClient, post.id, (p) => ({
          ...p,
          repliesCount: (p.repliesCount ?? 0) + 1,
        }));
      } else {
        await loadComments();
      }
    } catch {
      // keep UI unchanged on error
    }
  };

  const handleToggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!user) return;
      try {
        const { liked } = await toggleCommentLike(commentId);
        setComments((prev) => updateCommentLikeInTree(prev, commentId, liked));
      } catch {
        // ignore
      }
    },
    [user],
  );

  if (!uri) {
    return null;
  }

  const railBottomPad = Math.max(insets.bottom, 10) + 6;
  const bottomPad = Math.max(insets.bottom, 10) + 8;

  return (
    <View style={[exploreVideoReelStyles.root, { height }]}>
      <Animated.View
        style={[
          exploreVideoReelStyles.videoFrame,
          isHorizontalVideo && exploreVideoReelStyles.horizontalVideoFrame,
          videoAnimatedStyle,
        ]}
      >
        <ExpoVideoPlayer
          key={uri}
          uri={uri}
          style={exploreVideoReelStyles.video}
          contentFit="contain"
          nativeControls={false}
          autoplay={isPlaying}
          loop
          onPress={togglePause}
          onDoublePress={doubleTapLike}
          onPlayToEnd={recordViewIfNew}
        />
      </Animated.View>

      <View
        style={[
          exploreVideoReelStyles.rightRail,
          isCommentsOpen && exploreVideoReelStyles.rightRailHiddenWhenComments,
          {
            paddingBottom: railBottomPad,
            top: Math.max(insets.top + 6, 44),
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={exploreVideoReelStyles.rightRailStack}>
          <View style={exploreVideoReelStyles.avatarOuter}>
            <Pressable
              onPress={openAuthorProfile}
              disabled={!profileParam}
              style={exploreVideoReelStyles.avatarPressable}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={exploreVideoReelStyles.avatarImage}
                />
              ) : (
                <View style={exploreVideoReelStyles.avatarInitials}>
                  <Text style={exploreVideoReelStyles.avatarInitialsText}>
                    {initialLetter}
                  </Text>
                </View>
              )}
            </Pressable>
            {contentAuthorId && !isOwnContent && !isFollowingAuthor && (
              <View style={exploreVideoReelStyles.followPlusWrap}>
                <Pressable
                  onPress={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  style={exploreVideoReelStyles.followPlusButton}
                  hitSlop={8}
                >
                  <Plus size={16} color="#fff" strokeWidth={3} />
                </Pressable>
              </View>
            )}
          </View>

          <PostActions
            post={postForActions}
            onCommentPress={openComments}
            onBookmarkPress={() => setSaveOpen(true)}
            variant="reelSidebar"
          />
        </View>
      </View>

      <View
        style={[
          exploreVideoReelStyles.bottom,
          isCommentsOpen && exploreVideoReelStyles.bottomHiddenWhenComments,
          { paddingBottom: bottomPad },
        ]}
      >
        <>
          <View style={exploreVideoReelStyles.bottomHeaderRow}>
            <Pressable onPress={openAuthorProfile} disabled={!profileParam}>
              <Text style={exploreVideoReelStyles.bottomHandle}>
                @{handle ?? exploreVideoReelLabels.unknownAuthor}
              </Text>
            </Pressable>
          </View>

          <PostContent
            text={post.content}
            collapsedLines={2}
            textStyle={exploreVideoReelStyles.bottomContentText}
            readMoreTextStyle={exploreVideoReelStyles.readMoreOnDark}
          />

          {!post.isRepost && !!post.poll && (
            <PostPoll postId={post.id} poll={post.poll} />
          )}

          {post.isRepost &&
            (post.originalPostContent || post.poll) && (
              <View style={exploreVideoReelStyles.repostContainer}>
                {post.originalPostContent && (
                  <PostContent
                    text={post.originalPostContent}
                    collapsedLines={2}
                    textStyle={exploreVideoReelStyles.repostContentText}
                    readMoreTextStyle={exploreVideoReelStyles.readMoreOnDark}
                  />
                )}
                {!!post.poll && <PostPoll postId={post.id} poll={post.poll} />}
              </View>
            )}
        </>
      </View>

      <SavePostDialog
        visible={saveOpen}
        post={post}
        onClose={() => setSaveOpen(false)}
      />

      <CommentsModal
        visible={isCommentsOpen}
        isLoading={isLoadingComments}
        comments={comments}
        commentText={commentText}
        onChangeCommentText={setCommentText}
        onClose={() => {
          setReplyTo(null);
          setIsCommentsOpen(false);
        }}
        onSubmit={submitComment}
        replyTo={replyTo}
        onReplyTo={setReplyTo}
        onToggleLike={handleToggleCommentLike}
        reelLayout={isHorizontalVideo ? 'horizontal' : 'vertical'}
      />
    </View>
  );
};

export const ExploreVideoReelCard = memo(ExploreVideoReelCardInner);
