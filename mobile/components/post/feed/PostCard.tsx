import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Maximize2 } from 'lucide-react-native';
import PostHeader from './PostHeader';
import { PostContent } from './PostContent';
import PostMedia, { PostMediaItem } from './PostMedia';
import PostPoll from './PostPoll';
import PostActions from './PostActions';
import PostMetrics from './PostMetrics';
import styles from './PostCard.styles';
import { useAuth } from '@/contexts/AuthContext';
import { FeedPost, Comment } from './types/types';
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
import { followServices } from '@/services/followServices';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { recordPostView } from '@/services/post.service';
import { updatePostAcrossAllCaches } from '@/hooks/post/postCache.utils';
import { usePostActions } from '@/hooks/post/usePostActions';
import { useAppIsActive } from '@/hooks/useAppIsActive';

function PostCardComponent({
  post,
  isVisible = false,
  horizontalPadding = 16,
  /** When false (e.g. other tab focused or modal on top), video pauses. Defaults true for simple lists. */
  isScreenFocused = true,
  initialCommentsOpen = false,
  focusCommentId = null,
  /** When opening fullscreen video reels, which home/explore feed to continue (default: explore). */
  mediaFeedSource = 'explore' as 'for_you' | 'following' | 'explore',
}: {
  post: FeedPost;
  isVisible?: boolean;
  horizontalPadding?: number;
  isScreenFocused?: boolean;
  /** Open comments sheet on mount (e.g. notification deep link). */
  initialCommentsOpen?: boolean;
  /** Scroll/highlight this comment in the sheet. */
  focusCommentId?: string | null;
  mediaFeedSource?: 'for_you' | 'following' | 'explore';
}) {
  const parseImageUrls = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter(
        (u): u is string =>
          typeof u === 'string' && /^https?:\/\//i.test(u.trim()),
      );
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (u): u is string =>
                typeof u === 'string' && /^https?:\/\//i.test(u.trim()),
            );
          }
        } catch {
          return [];
        }
        return [];
      }
      return /^https?:\/\//i.test(trimmed) ? [trimmed] : [];
    }
    return [];
  };

  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { likeMutation } = usePostActions();
  const appIsActive = useAppIsActive();
  const [isCommentsOpen, setIsCommentsOpen] = useState(initialCommentsOpen);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const isOwnPost = !!post.authorId && user?.uid === post.authorId;
  const wasVisibleRef = useRef(false);
  const viewRecordedRef = useRef(false);
  const viewedSessionsRef = useRef<Set<string>>(new Set());
  

// unique session per screen (feed / reels / detail etc.)
  const screenType = pathname ?? 'unknown';
   const sessionKey = `${post.id}-${screenType}`; 

  const mediaActive =
    isVisible && isScreenFocused && appIsActive;

    useEffect(() => {
      if (!mediaActive) {
        viewRecordedRef.current = false;
      }
    }, [mediaActive]);
    

  const { data: following = [] } = useQuery({
    queryKey: QUERY_KEYS.ME_FOLLOWING,
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      return followServices.fetchFollowing(token);
    },
  });

  const isFollowingAuthor = !!post.authorId && following.some((item) => item.id === post.authorId);
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !post.authorId || isOwnPost) return;
      const token = await user.getIdToken();
      await followServices.toggleFollow(token, post.authorId, isFollowingAuthor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWING });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ME_FOLLOWERS });
    },
  });

  const mainMedia: PostMediaItem[] = [];
  const hasVideoMedia = !!post.videoUrl || !!post.originalPostVideoUrl;

  useEffect(() => {
    viewRecordedRef.current = false;
  }, [post.id]);

  /** Repost shells do not own media; views are stored on the original post. */
  const viewCachePostId = post.originalPostId ?? post.id;

  const recordViewIfNew = useCallback(() => {
    if (viewRecordedRef.current) {
      return;
    }
    if (viewedSessionsRef.current.has(sessionKey)) {
      return;
    }
    viewRecordedRef.current = true;
    viewedSessionsRef.current.add(sessionKey);

    updatePostAcrossAllCaches(queryClient, viewCachePostId, (cachePost) => ({
      ...cachePost,
      viewsCount: (cachePost.viewsCount ?? 0) + 1,
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
        viewRecordedRef.current = false;
        updatePostAcrossAllCaches(queryClient, viewCachePostId, (cachePost) => ({
          ...cachePost,
          viewsCount: Math.max(0, (cachePost.viewsCount ?? 0) - 1),
        }));
      });
  }, [post.id, queryClient, sessionKey, viewCachePostId]);

  const reelExploreSeedId = post.originalPostId ?? post.id;
  const openVideoReels = useCallback(() => {
    router.push({
      pathname: '/explore-media-feed',
      params: {
        postId: reelExploreSeedId,
        mode: 'video',
        ...(mediaFeedSource !== 'explore' && { feedSource: mediaFeedSource }),
      },
    });
  }, [mediaFeedSource, reelExploreSeedId, router]);
  if (post.videoUrl) {
    mainMedia.push({
      kind: 'video',
      uri: post.videoUrl,
      aspectRatio: post.mediaAspectRatio ?? undefined,
    });
  } else {
    if (post.imageUrl) {
      parseImageUrls(post.imageUrl).forEach((img) => {
        mainMedia.push({
          kind: 'image',
          uri: img,
          aspectRatio: post.mediaAspectRatio ?? undefined,
        });
      });
    }
    if (post.gifUrl) {
      mainMedia.push({
        kind: 'gif',
        uri: post.gifUrl,
        aspectRatio: post.mediaAspectRatio ?? undefined,
      });
    }
  }

  const openComments = async () => {
    setIsCommentsOpen(true);
    await loadComments();
  };

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

  useEffect(() => {
    if (!initialCommentsOpen || !user) return;
    setIsCommentsOpen(true);
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for deep-link screen
  }, []);

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
        updatePostAcrossAllCaches(queryClient, post.id, (p) => ({
          ...p,
          repliesCount: (p.repliesCount ?? 0) + 1,
        }));
      } else {
        await loadComments();
      }
    } catch {
      // ignore for now, UI stays as-is
    }
  };

  const doubleTapLike = useCallback(() => {
    if (!user) return;
    /** Like-only (Instagram-style); avoids rapid double-taps toggling unlike and driving the count down. */
    if (post.isLiked) return;
    likeMutation.mutate({
      postId: post.id,
      isLiked: false,
    });
  }, [user, post.id, post.isLiked, likeMutation]);

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

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish && status.isLooping) {
      // allow new view on loop
      viewRecordedRef.current = false;
    }
  };
  

  useEffect(() => {
    if (hasVideoMedia) {
      return;
    }
    const inView = isVisible && isScreenFocused && appIsActive;
    const becameVisible = inView && !wasVisibleRef.current;
    wasVisibleRef.current = inView;

    if (!becameVisible) {
      return;
    }

    recordViewIfNew();
  }, [appIsActive, hasVideoMedia, isScreenFocused, isVisible, recordViewIfNew]);

  useEffect(() => {
    if (!hasVideoMedia || !mediaActive) {
      return;
    }
  
    // prevent duplicate in same session
    if (viewedSessionsRef.current.has(sessionKey)) {
      return;
    }
  
    const timer = setTimeout(() => {
      recordViewIfNew();
    }, 2000);
  
    return () => clearTimeout(timer);
  }, [hasVideoMedia, mediaActive, sessionKey, recordViewIfNew]);
  

  return (
    <View style={[styles.card, { paddingHorizontal: horizontalPadding }]}>
      <>
        <View style={styles.cardHeaderRow}>
          <PostHeader post={post} />
          {post.authorId && !isOwnPost && (
            <Pressable
              onPress={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              style={[
                styles.followButton,
                isFollowingAuthor ? styles.followButtonInactive : styles.followButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowingAuthor ? styles.followButtonTextInactive : styles.followButtonTextActive,
                ]}
              >
                {followMutation.isPending ? '…' : isFollowingAuthor ? 'Unfollow' : 'Follow'}
              </Text>
            </Pressable>
          )}
        </View>

        {post.isRepost && (
          <Text style={styles.repostLabelText}>
            Reposted from @{post.originalAuthorUsername || 'unknown'}
          </Text>
        )}

        <PostContent text={post.content} />

        {mainMedia.length > 0 && (
          <View style={styles.mediaWrap}>
            <PostMedia
              items={mainMedia}
              autoplay={mediaActive}
              onVideoPlayToEnd={hasVideoMedia ? recordViewIfNew : undefined}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onDoubleTapLike={doubleTapLike}
            />
            {hasVideoMedia && (
              <Pressable
                onPress={openVideoReels}
                style={styles.expandReelFab}
                accessibilityLabel="Open video reels"
                hitSlop={6}
              >
                <Maximize2 color="#fff" size={20} strokeWidth={2.2} />
              </Pressable>
            )}
          </View>
        )}

        {!post.isRepost && !!post.poll && (
          <PostPoll postId={post.id} poll={post.poll} />
        )}

        {post.isRepost &&
            (post.originalPostContent ||
              post.originalPostImageUrl ||
              post.originalPostGifUrl ||
              post.originalPostVideoUrl ||
              post.poll) && (
              <View style={styles.repostContainer}>
              {post.originalPostContent && (
                <PostContent
                  text={post.originalPostContent}
                  collapsedLines={2}
                  textStyle={styles.repostContentText}
                />
              )}
              {(post.originalPostVideoUrl ||
                post.originalPostImageUrl ||
                post.originalPostGifUrl) && (
                <View style={styles.mediaWrap}>
                  <PostMedia
                    items={
                      post.originalPostVideoUrl
                        ? [{
                          kind: 'video',
                          uri: post.originalPostVideoUrl,
                          aspectRatio: post.originalPostMediaAspectRatio ?? undefined,
                        }]
                        : post.originalPostGifUrl
                          ? [{
                            kind: 'gif',
                            uri: post.originalPostGifUrl,
                            aspectRatio: post.originalPostMediaAspectRatio ?? undefined,
                          }]
                          : [{
                            kind: 'image',
                            uri: post.originalPostImageUrl!,
                            aspectRatio: post.originalPostMediaAspectRatio ?? undefined,
                          }]
                    }
                    autoplay={mediaActive}
                    onVideoPlayToEnd={
                      post.originalPostVideoUrl ? recordViewIfNew : undefined
                    }
                    onDoubleTapLike={doubleTapLike}
                  />
                  {!!post.originalPostVideoUrl && (
                    <Pressable
                      onPress={openVideoReels}
                      style={styles.expandReelFab}
                      accessibilityLabel="Open video reels"
                      hitSlop={6}
                    >
                      <Maximize2 color="#fff" size={20} strokeWidth={2.2} />
                    </Pressable>
                  )}
                </View>
              )}

              {!!post.poll && <PostPoll postId={post.id} poll={post.poll} />}
            </View>
            )}

        {hasVideoMedia && !post.isRepost && <PostMetrics post={post} />}

        <PostActions
          post={post}
          onCommentPress={openComments}
          onBookmarkPress={() => setIsSaveDialogOpen(true)}
        />
      </>

      <SavePostDialog
        visible={isSaveDialogOpen}
        post={post}
        onClose={() => setIsSaveDialogOpen(false)}
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
        focusCommentId={focusCommentId}
      />
    </View>
  );
}

const PostCard = memo(PostCardComponent);
PostCard.displayName = 'PostCard';

export default PostCard
