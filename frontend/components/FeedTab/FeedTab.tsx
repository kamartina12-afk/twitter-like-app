'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, X, Smile, BarChart2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import EmojiPicker from 'emoji-picker-react';
import {
  CommentAuthor,
  CommentContent,
  CommentDate,
  CommentHeader,
  CommentInputContainer,
  CommentItem,
  CommentsSection,
  CommentsSectionTitle,
  CommentUsername,
  Container,
  CreatePostCard,
  CreatePostForm,
  EmptyCard,
  EmptySubtext,
  EmptyText,
  FeedContainer,
  FeedSection,
  FeedTabButton,
  FeedTabsRow,
  LoadingCard,
  LoadingText,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
  OriginalPostAuthor,
  OriginalPostCard,
  OriginalPostContent,
  OriginalPostHeader,
  OriginalPostUsername,
  PostButton,
  PostButtonContainer,
  PostTextarea,
} from './FeedTab.styles';
import { PostCard } from './PostCard';
import { Post, Comment, CreatePostForm as CreatePostFormType } from './types';
import { feedLabels } from './utils/labels';
import { formatDate, readFileAsDataURL } from './utils/utils';
import { feedServices } from './services/feedServices';
import { blockServices } from '@/services/blockServices';
import { hashtagServices } from '@/services/hashtagServices';
import { useComposer } from '../../contexts/ComposerContext';

type FeedTabProps = {
  /**
   * When set, the feed will show posts for this hashtag using the
   * backend hashtag endpoint instead of the regular timeline feed.
   */
  activeHashtag?: string | null;

  /**
   * Called when the user clicks a hashtag inside a post so the
   * parent layout can keep the sidebar/feed in sync.
   */
  onHashtagSelect?: (hashtag: string) => void;
};

export default function FeedTab({ activeHashtag, onHashtagSelect }: FeedTabProps) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { state, dispatch } = useComposer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [gifResults, setGifResults] = useState<
    { id: string; title: string; previewUrl: string; originalUrl: string }[]
  >([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [commentModalPost, setCommentModalPost] = useState<Post | null>(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [feedType, setFeedType] = useState<'for_you' | 'following'>('for_you');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<
    { id: string; username: string; displayName?: string; avatarUrl?: string | null }[]
  >([]);
  const [isMentionListOpen, setIsMentionListOpen] = useState(false);
  const [activeMentionContext, setActiveMentionContext] = useState<'post' | 'comment' | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveDialogPost, setSaveDialogPost] = useState<Post | null>(null);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string | 'none'>('none');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [blockConfirmUser, setBlockConfirmUser] = useState<{ id: string; username: string } | null>(
    null,
  );
  const [savedPostCollections, setSavedPostCollections] = useState<
    Record<
      string,
      {
        collections: string[];
        hasUnsorted: boolean;
      }
    >
  >({});
  const [isPollEnabled, setIsPollEnabled] = useState(false);
  const [repostModalPost, setRepostModalPost] = useState<Post | null>(null);
  const [repostText, setRepostText] = useState('');
  const pollVoteMutation = useMutation({
    mutationFn: async ({ postId, optionId }: { postId: string; optionId: string }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return feedServices.voteOnPoll(token, postId, optionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const refreshSavedState = async (token: string) => {
    const saved = await feedServices.fetchSavedPosts(token);

    const ids = new Set<string>();
    const collectionMap: Record<
      string,
      {
        collections: Set<string>;
        hasUnsorted: boolean;
      }
    > = {};

    saved.forEach((p: Post) => {
      ids.add(p.id);
      if (p.collectionNames) {
        collectionMap[p.id] = {
          collections: new Set(p.collectionNames),
          hasUnsorted: p.inUnsorted ?? false,
        };
      } else {
        const existing = collectionMap[p.id] ?? {
          collections: new Set<string>(),
          hasUnsorted: false,
        };
        if (p.collectionName) {
          existing.collections.add(p.collectionName);
        } else {
          existing.hasUnsorted = true;
        }
        collectionMap[p.id] = existing;
      }
    });

    setSavedPostIds(ids);
    setSavedPostCollections(
      Object.fromEntries(
        Object.entries(collectionMap).map(([postId, value]) => [
          postId,
          {
            collections: Array.from(value.collections),
            hasUnsorted: value.hasUnsorted,
          },
        ]),
      ),
    );

    const cols = await feedServices.fetchSavedCollections(token);
    setCollections(cols || []);
  };

  useEffect(() => {
    const loadSaved = async () => {
      if (!user) {
        setSavedPostIds(new Set());
        setBlockedUserIds(new Set());
        return;
      }
      try {
        const token = await user.getIdToken();
        await refreshSavedState(token);

        // Load blocked users so we can visually react in the feed
        try {
          const blocked = await blockServices.fetchBlockedUsers(token);
          setBlockedUserIds(new Set(blocked.map((b) => b.id)));
        } catch (error) {
          console.error('Failed to load blocked users', error);
        }
      } catch (error) {
        console.error('Failed to load saved posts', error);
      }
    };
    void loadSaved();
  }, [user]);

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', commentModalPost?.id],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token || !commentModalPost) throw new Error('Not authenticated');
      return feedServices.fetchComments(token, commentModalPost.id);
    },
    enabled: !!commentModalPost && !!user,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
    getValues,
    setValue,
  } = useForm<CreatePostFormType>({
    defaultValues: {
      content: '',
      pollQuestion: '',
      pollOption1: '',
      pollOption2: '',
      pollOption3: '',
      pollOption4: '',
      pollDurationMinutes: 1440, // 1 day
    },
  });

  const loadMentionSuggestions = async (rawQuery: string) => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;
      const trimmed = rawQuery.trim();
      const results = await feedServices.fetchMentionSuggestions(token, trimmed);
      setMentionSuggestions(results || []);
      setIsMentionListOpen(true);
    } catch (error) {
      console.error('Failed to load mention suggestions', error);
      setMentionSuggestions([]);
      setIsMentionListOpen(false);
    }
  };

  const handleMentionDetectionForPost = (value: string) => {
    const match = value.match(/(^|\s)@([\w]{0,32})$/);
    if (match) {
      const query = match[2];
      setActiveMentionContext('post');
      setMentionQuery(query);
      void loadMentionSuggestions(query);
    } else {
      setIsMentionListOpen(false);
      setMentionSuggestions([]);
      setMentionQuery('');
      setActiveMentionContext(null);
    }
  };

  const handleMentionDetectionForComment = (value: string) => {
    const match = value.match(/(^|\s)@([\w]{0,32})$/);
    if (match) {
      const query = match[2];
      setActiveMentionContext('comment');
      setMentionQuery(query);
      void loadMentionSuggestions(query);
    } else {
      setIsMentionListOpen(false);
      setMentionSuggestions([]);
      setMentionQuery('');
      setActiveMentionContext(null);
    }
  };

  const insertMention = (username: string) => {
    if (activeMentionContext === 'post') {
      const current = getValues('content') || '';
      const updated = current.replace(/(^|\s)@[\w]{0,32}$/, `$1@${username} `);
      setValue('content', updated);
    } else if (activeMentionContext === 'comment') {
      const current = commentText;
      const updated = current.replace(/(^|\s)@[\w]{0,32}$/, `$1@${username} `);
      setCommentText(updated);
    }

    setIsMentionListOpen(false);
    setMentionSuggestions([]);
    setMentionQuery('');
    setActiveMentionContext(null);
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['feed', feedType, activeHashtag ?? 'all'],
    queryFn: async ({ pageParam = 1 }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      if (activeHashtag) {
        return hashtagServices.fetchPostsByHashtag<Post>(token, activeHashtag, pageParam, 10);
      }

      return feedServices.fetchFeed(token, pageParam, 10, feedType);
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  const posts = data?.pages.flatMap((page) => page.data) ?? [];
  console.log(posts);

  const handleToggleSave = async (post: Post) => {
    if (!user) return;

    // Always open dialog to manage / choose collections,
    // regardless of whether the post is already saved.
    setSaveDialogPost(post);
    setSelectedCollectionName('none');
    setNewCollectionName('');
    setIsSaveDialogOpen(true);
  };

  const confirmSaveToCollection = async () => {
    if (!user || !saveDialogPost) return;

    const finalName =
      selectedCollectionName === 'none'
        ? '__NO_COLLECTION__'
        : selectedCollectionName === '__new__'
          ? newCollectionName.trim() || undefined
          : selectedCollectionName;

    try {
      const token = await user.getIdToken();
      const result = await feedServices.toggleSavedPost(token, saveDialogPost.id, finalName);
      if (result.saved) {
        // Ensure the post is marked as saved locally
        setSavedPostIds((prev) => {
          const next = new Set(prev);
          next.add(saveDialogPost.id);
          return next;
        });
      }

      // Refresh saved posts & collections so per-post membership stays accurate
      await refreshSavedState(token);
    } catch (error) {
      console.error('Failed to save post to collection', error);
    } finally {
      setIsSaveDialogOpen(false);
      setSaveDialogPost(null);
      setNewCollectionName('');
      setSelectedCollectionName('none');
    }
  };

  const blockUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      await blockServices.blockUser(token, userId);
    },
    onSuccess: (_, variables) => {
      setBlockedUserIds((prev) => {
        const next = new Set(prev);
        next.add(variables.userId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostFormType) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      let pollPayload:
        | {
            question?: string;
            options: string[];
            expiresAt: string;
          }
        | undefined;

      if (isPollEnabled) {
        const options = [
          data.pollOption1?.trim(),
          data.pollOption2?.trim(),
          data.pollOption3?.trim(),
          data.pollOption4?.trim(),
        ].filter(Boolean) as string[];

        if (options.length >= 2) {
          const minutes = data.pollDurationMinutes ?? 1440;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + minutes * 60 * 1000);
          pollPayload = {
            question: data.pollQuestion?.trim() || undefined,
            options,
            expiresAt: expiresAt.toISOString(),
          };
        }
      }

      return feedServices.createPost(
        token,
        data.content,
        state.imageUrl || undefined,
        state.gifUrl || undefined,
        state.videoUrl || undefined,
        pollPayload,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      reset({
        content: '',
        pollQuestion: '',
        pollOption1: '',
        pollOption2: '',
        pollOption3: '',
        pollOption4: '',
        pollDurationMinutes: 1440,
      });
      dispatch({ type: 'SET_IMAGE_URL', imageUrl: undefined });
      dispatch({ type: 'SET_GIF_URL', gifUrl: undefined });
      dispatch({ type: 'SET_VIDEO_URL', videoUrl: undefined });
      setGifResults([]);
      setGifSearchTerm('');
      setIsGifPickerOpen(false);
      setIsPollEnabled(false);
    },
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return isLiked
        ? feedServices.unlikePost(token, postId)
        : feedServices.likePost(token, postId);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return feedServices.createComment(token, postId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['comments', commentModalPost?.id] });
      setCommentText('');
    },
  });

  const repostMutation = useMutation({
    mutationFn: async ({
      postId,
      isReposted,
      content,
    }: {
      postId: string;
      isReposted: boolean;
      content?: string;
    }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return isReposted
        ? feedServices.unrepostPost(token, postId)
        : feedServices.repostPost(token, postId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return feedServices.deletePost(token, postId);
    },
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ['feed', feedType] });
      const previousData = queryClient.getQueryData(['feed', feedType]);

      queryClient.setQueryData(['feed', feedType], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.filter((post: Post) => post.id !== postId),
          })),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(['feed', feedType], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const onSubmit = async (data: CreatePostFormType) => {
    const hasPoll =
      isPollEnabled &&
      (data.pollOption1?.trim() ||
        data.pollOption2?.trim() ||
        data.pollOption3?.trim() ||
        data.pollOption4?.trim());
    const hasContent =
      data.content.trim() || state.imageUrl || state.gifUrl || state.videoUrl || hasPoll;
    if (!hasContent) return;

    createPostMutation.mutate(data);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await readFileAsDataURL(file);
        if (file.type.startsWith('video/')) {
          dispatch({ type: 'SET_VIDEO_URL', videoUrl: dataUrl });
          dispatch({ type: 'SET_IMAGE_URL', imageUrl: undefined });
          dispatch({ type: 'SET_GIF_URL', gifUrl: undefined });
        } else {
          dispatch({ type: 'SET_IMAGE_URL', imageUrl: dataUrl });
          dispatch({ type: 'SET_VIDEO_URL', videoUrl: undefined });
          dispatch({ type: 'SET_GIF_URL', gifUrl: undefined });
        }
      } catch (error) {
        alert('Please select a valid image or video file');
      }
    }
  };

  const handleGifSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = gifSearchTerm.trim();
    if (!term) return;

    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (!apiKey) {
      console.error('GIPHY API key is not configured');
      return;
    }

    try {
      setIsSearchingGifs(true);
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
          term,
        )}&limit=24&rating=pg-13`,
      );
      const json = await response.json();
      const items =
        json?.data?.map((item: any) => ({
          id: item.id as string,
          title: (item.title as string) || 'GIF',
          previewUrl:
            (item.images?.fixed_height_small_still?.url as string) ||
            (item.images?.fixed_height_small?.url as string) ||
            (item.images?.downsized_still?.url as string) ||
            (item.images?.downsized?.url as string),
          originalUrl:
            (item.images?.original?.url as string) ||
            (item.images?.downsized_large?.url as string) ||
            (item.images?.downsized?.url as string),
        })) ?? [];
      setGifResults(items.filter((g: any) => g.previewUrl && g.originalUrl));
    } catch (error) {
      console.error('Failed to search GIFs', error);
    } finally {
      setIsSearchingGifs(false);
    }
  };

  return (
    <Container>
      <FeedContainer>
        <FeedTabsRow>
          <FeedTabButton
            $active={!activeHashtag && feedType === 'for_you'}
            onClick={() => setFeedType('for_you')}
            type="button"
          >
            {feedLabels.forYouTab}
          </FeedTabButton>
          <FeedTabButton
            $active={!activeHashtag && feedType === 'following'}
            onClick={() => setFeedType('following')}
            type="button"
          >
            {feedLabels.followingTab}
          </FeedTabButton>
        </FeedTabsRow>
        <CreatePostCard>
          <CreatePostForm onSubmit={handleSubmit(onSubmit)}>
            <PostTextarea
              placeholder={feedLabels.createPostPlaceholder}
              rows={3}
              {...register('content', { required: true })}
              onChange={(e) => {
                const value = e.target.value;
                setValue('content', value);
                handleMentionDetectionForPost(value);
              }}
            />
            {isMentionListOpen &&
              activeMentionContext === 'post' &&
              mentionSuggestions.length > 0 && (
                <div
                  style={{
                    marginTop: '4px',
                    borderRadius: '12px',
                    border: '1px solid rgb(var(--border))',
                    background: 'rgb(var(--background))',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '4px 0',
                  }}
                >
                  {mentionSuggestions.map((userSuggestion) => (
                    <button
                      key={userSuggestion.id}
                      type="button"
                      onClick={() => insertMention(userSuggestion.username)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '999px',
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {(userSuggestion.displayName || userSuggestion.username)[0]?.toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          {userSuggestion.displayName || userSuggestion.username}
                        </span>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'rgb(var(--muted-foreground))',
                          }}
                        >
                          @{userSuggestion.username}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            {state.imageUrl && (
              <div style={{ position: 'relative', margin: '10px 0' }}>
                <img
                  src={state.imageUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '12px',
                    objectFit: 'contain',
                    backgroundColor: 'rgb(var(--card))',
                  }}
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_IMAGE_URL', imageUrl: undefined })}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            )}
            {state.videoUrl && (
              <div style={{ position: 'relative', margin: '10px 0' }}>
                <video
                  src={state.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '12px',
                    objectFit: 'contain',
                    backgroundColor: 'rgb(var(--card))',
                    display: 'block',
                  }}
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_VIDEO_URL', videoUrl: undefined })}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            )}
            {state.gifUrl && (
              <div style={{ position: 'relative', margin: '10px 0' }}>
                <img
                  src={state.gifUrl}
                  alt="Selected GIF"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '12px',
                    objectFit: 'contain',
                    backgroundColor: 'rgb(var(--card))',
                  }}
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_GIF_URL', gifUrl: undefined })}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            )}
            {isPollEnabled && (
              <div
                style={{
                  marginTop: '12px',
                  borderTop: '1px solid rgba(148, 163, 184, 0.3)',
                  paddingTop: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Poll question (optional)"
                    {...register('pollQuestion')}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.5)',
                      background: 'rgba(15, 23, 42, 0.02)',
                      color: 'inherit',
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Option 1"
                    {...register('pollOption1')}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.5)',
                      background: 'rgba(15, 23, 42, 0.02)',
                      color: 'inherit',
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Option 2"
                    {...register('pollOption2')}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.5)',
                      background: 'rgba(15, 23, 42, 0.02)',
                      color: 'inherit',
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Option 3 (optional)"
                    {...register('pollOption3')}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.5)',
                      background: 'rgba(15, 23, 42, 0.02)',
                      color: 'inherit',
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Option 4 (optional)"
                    {...register('pollOption4')}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.5)',
                      background: 'rgba(15, 23, 42, 0.02)',
                      color: 'inherit',
                      fontSize: '14px',
                    }}
                  />

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ color: 'rgb(var(--muted-foreground))' }}>Poll duration</span>
                    <select
                      {...register('pollDurationMinutes', { valueAsNumber: true })}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.5)',
                        background: 'rgba(15, 23, 42, 0.02)',
                        color: 'inherit',
                        fontSize: '12px',
                      }}
                    >
                      <option value={5}>5 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={60 * 24}>1 day</option>
                      <option value={60 * 24 * 3}>3 days</option>
                      <option value={60 * 24 * 7}>7 days</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            <PostButtonContainer>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgb(var(--accent))',
                  }}
                  title={feedLabels.addImage}
                >
                  <ImageIcon size={20} />
                </button>
                <Popover key="feed-create-post-emoji">
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-describedby="feed-create-post-emoji-content"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgb(var(--accent))',
                      }}
                      title="Add emoji"
                    >
                      <Smile size={20} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    id="feed-create-post-emoji-content"
                    className="w-auto p-0 border border-border bg-white shadow-xl rounded-2xl"
                  >
                    <EmojiPicker
                      onEmojiClick={(emoji) => {
                        const current = getValues('content') || '';
                        setValue('content', `${current}${emoji.emoji}`);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <button
                  type="button"
                  onClick={() => {
                    setIsGifPickerOpen(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 10px',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgb(var(--accent))',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                  title="Add GIF"
                >
                  GIF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPollEnabled((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: '1px solid rgba(var(--accent), 0.55)',
                    background: isPollEnabled
                      ? 'rgba(var(--accent), 0.16)'
                      : 'rgba(var(--accent), 0.04)',
                    color: 'rgb(var(--accent-foreground))',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <BarChart2 size={16} />
                  <span>{isPollEnabled ? 'Poll enabled' : 'Add poll'}</span>
                </button>
              </div>
              <PostButton type="submit" disabled={isSubmitting}>
                {feedLabels.postButton}
              </PostButton>
            </PostButtonContainer>
          </CreatePostForm>
        </CreatePostCard>

        {activeHashtag && (
          <div
            style={{
              marginTop: '0.75rem',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: 'rgb(var(--muted-foreground))',
            }}
          >
            <span>Showing posts for</span>
            <button
              type="button"
              onClick={() => onHashtagSelect?.('')}
              style={{
                borderRadius: '999px',
                border: '1px solid rgba(var(--accent), 0.8)',
                padding: '0.16rem 0.7rem',
                background: 'rgba(var(--accent), 0.12)',
                color: 'rgb(var(--accent-foreground))',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              #{activeHashtag}
            </button>
            <button
              type="button"
              onClick={() => onHashtagSelect?.('')}
              style={{
                marginLeft: 'auto',
                fontSize: '0.8rem',
                color: 'rgb(var(--muted-foreground))',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        )}

        <FeedSection>
          {isLoading ? (
            <LoadingCard>
              <LoadingText>{feedLabels.loadingPosts}</LoadingText>
            </LoadingCard>
          ) : posts.length === 0 ? (
            <EmptyCard>
              <EmptyText>
                {feedType === 'following' ? feedLabels.followingEmpty : feedLabels.noPosts}
              </EmptyText>
              <EmptySubtext>
                {feedType === 'following'
                  ? feedLabels.followingEmptySubtitle
                  : feedLabels.noPostsSubtitle}
              </EmptySubtext>
            </EmptyCard>
          ) : (
            posts.map((post: Post) => (
              <PostCard
                key={`${post.isRepost ? 'repost' : 'post'}-${post.id}-${post.authorId || ''}`}
                post={post}
                formatDate={formatDate}
                youRepostedLabel={feedLabels.youReposted}
                repostedLabel={feedLabels.reposted}
                currentUserId={user?.uid}
                isSaved={!!user && savedPostIds.has(post.id)}
                isBlocked={!!post.authorId && blockedUserIds.has(post.authorId)}
                onHashtagSelect={onHashtagSelect}
                onComment={setCommentModalPost}
                onRepost={(p) => {
                  setRepostModalPost(p);
                  setRepostText('');
                }}
                onDelete={setDeleteConfirmPost}
                onToggleSave={handleToggleSave}
                onBlockUser={(id, username) => setBlockConfirmUser({ id, username })}
                likeMutation={likeMutation}
                repostMutation={repostMutation}
                pollVoteMutation={pollVoteMutation}
                deletePostMutation={deletePostMutation}
                showSaveButton
                showBlockButton
              />
            ))
          )}
          {hasNextPage && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <PostButton
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                type="button"
              >
                {isFetchingNextPage ? feedLabels.loading : feedLabels.loadMore}
              </PostButton>
            </div>
          )}
        </FeedSection>
      </FeedContainer>
      {commentModalPost && (
        <ModalOverlay onClick={() => setCommentModalPost(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                {feedLabels.replyTo} @{commentModalPost?.authorUsername}
              </ModalTitle>
              <ModalCloseButton onClick={() => setCommentModalPost(null)}>
                <X size={24} />
              </ModalCloseButton>
            </ModalHeader>

            <OriginalPostCard
              style={{
                // Fixed soft gray card so it never appears white and keeps text readable in all themes
                background: '#f3f4f6',
                borderColor: '#e5e7eb',
              }}
            >
              <OriginalPostHeader>
                <OriginalPostAuthor style={{ color: '#111827' }}>
                  {commentModalPost?.authorDisplayName || commentModalPost?.authorUsername}
                </OriginalPostAuthor>
                <OriginalPostUsername style={{ color: '#4b5563' }}>
                  @{commentModalPost?.authorUsername}
                </OriginalPostUsername>
              </OriginalPostHeader>
              <OriginalPostContent style={{ color: '#111827' }}>
                {commentModalPost?.content}
              </OriginalPostContent>
            </OriginalPostCard>

            {comments.length > 0 && (
              <CommentsSection>
                <CommentsSectionTitle>
                  {feedLabels.comments} ({comments.length})
                </CommentsSectionTitle>
                {comments.map((comment: Comment) => (
                  <CommentItem
                    key={comment.id}
                    style={{
                      background: '#e5e7eb', // light gray
                      borderColor: '#d1d5db',
                    }}
                  >
                    <CommentHeader>
                      <CommentAuthor style={{ color: '#111827' }}>
                        {comment.user.displayName || comment.user.username}
                      </CommentAuthor>
                      <CommentUsername style={{ color: '#4b5563' }}>
                        @{comment.user.username}
                      </CommentUsername>
                      <CommentDate style={{ color: '#9ca3af' }}>
                        {formatDate(comment.createdAt)}
                      </CommentDate>
                    </CommentHeader>
                    <CommentContent style={{ color: '#111827' }}>{comment.content}</CommentContent>
                  </CommentItem>
                ))}
              </CommentsSection>
            )}

            <PostTextarea
              value={commentText}
              onChange={(e) => {
                const value = e.target.value;
                setCommentText(value);
                handleMentionDetectionForComment(value);
              }}
              placeholder={feedLabels.writeReply}
              style={{
                minHeight: '100px',
                resize: 'vertical',
                border: '1px solid rgb(var(--border))',
              }}
            />
            {isMentionListOpen &&
              activeMentionContext === 'comment' &&
              mentionSuggestions.length > 0 && (
                <div
                  style={{
                    marginTop: '4px',
                    borderRadius: '12px',
                    border: '1px solid rgb(var(--border))',
                    background: 'rgb(var(--background))',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '4px 0',
                  }}
                >
                  {mentionSuggestions.map((userSuggestion) => (
                    <button
                      key={userSuggestion.id}
                      type="button"
                      onClick={() => insertMention(userSuggestion.username)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '999px',
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {(userSuggestion.displayName || userSuggestion.username)[0]?.toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          {userSuggestion.displayName || userSuggestion.username}
                        </span>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'rgb(var(--muted-foreground))',
                          }}
                        >
                          @{userSuggestion.username}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            <CommentInputContainer>
              <PostButton
                onClick={async () => {
                  const trimmed = commentText.trim();
                  if (!trimmed || !commentModalPost) return;

                  commentMutation.mutate({ postId: commentModalPost.id, content: trimmed });
                }}
                disabled={!commentText.trim() || commentMutation.isPending}
                type="button"
              >
                {commentMutation.isPending ? feedLabels.replying : feedLabels.reply}
              </PostButton>
            </CommentInputContainer>
          </ModalContent>
        </ModalOverlay>
      )}

      {deleteConfirmPost && (
        <ModalOverlay onClick={() => setDeleteConfirmPost(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Delete tweet?</ModalTitle>
              <ModalCloseButton onClick={() => setDeleteConfirmPost(null)}>
                <X size={24} />
              </ModalCloseButton>
            </ModalHeader>

            <p
              style={{
                marginBottom: '1.25rem',
                color: 'rgb(var(--muted-foreground))',
                fontSize: '0.95rem',
              }}
            >
              This can&apos;t be undone and it will be removed from everyone&apos;s timeline.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setDeleteConfirmPost(null)}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: '999px',
                  border: '1px solid rgb(var(--border))',
                  background: 'rgb(var(--background))',
                  color: 'rgb(var(--foreground))',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <PostButton
                type="button"
                onClick={() => {
                  if (!deleteConfirmPost) return;
                  deletePostMutation.mutate({ postId: deleteConfirmPost.id });
                  setDeleteConfirmPost(null);
                }}
                disabled={deletePostMutation.isPending}
                style={{ opacity: deletePostMutation.isPending ? 0.6 : 1 }}
              >
                Delete
              </PostButton>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {repostModalPost && (
        <ModalOverlay
          onClick={() => {
            if (repostMutation.isPending) return;
            setRepostModalPost(null);
            setRepostText('');
          }}
        >
          <ModalContent
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <ModalHeader>
              <ModalTitle>Repost</ModalTitle>
              <ModalCloseButton
                onClick={() => {
                  if (repostMutation.isPending) return;
                  setRepostModalPost(null);
                  setRepostText('');
                }}
              >
                <X size={24} />
              </ModalCloseButton>
            </ModalHeader>

            <OriginalPostCard
              style={{
                background: '#f3f4f6',
                borderColor: '#e5e7eb',
                marginBottom: '12px',
              }}
            >
              <OriginalPostHeader>
                <OriginalPostAuthor style={{ color: '#111827' }}>
                  {repostModalPost.authorDisplayName || repostModalPost.authorUsername}
                </OriginalPostAuthor>
                <OriginalPostUsername style={{ color: '#4b5563' }}>
                  @{repostModalPost.authorUsername}
                </OriginalPostUsername>
              </OriginalPostHeader>
              <OriginalPostContent style={{ color: '#111827' }}>
                {repostModalPost.content}
              </OriginalPostContent>
            </OriginalPostCard>

            <div style={{ position: 'relative' }}>
              <PostTextarea
                value={repostText}
                onChange={(e) => setRepostText(e.target.value)}
                placeholder="Add a comment to your repost (optional)"
                style={{
                  minHeight: '100px',
                  resize: 'vertical',
                  border: '1px solid rgb(var(--border))',
                  paddingRight: '40px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  bottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Popover key="feed-repost-emoji">
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-describedby="feed-repost-emoji-content"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgb(var(--accent))',
                      }}
                      title="Add emoji"
                    >
                      <Smile size={18} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    id="feed-repost-emoji-content"
                    className="!z-[1500] w-auto p-0 border border-border bg-white shadow-xl rounded-2xl"
                  >
                    <EmojiPicker
                      onEmojiClick={(emoji) => {
                        setRepostText((current) => `${current}${emoji.emoji}`);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <CommentInputContainer>
              <PostButton
                type="button"
                disabled={repostMutation.isPending}
                onClick={() => {
                  if (!repostModalPost) return;
                  const targetPostId = repostModalPost.isRepost
                    ? repostModalPost.originalPostId!
                    : repostModalPost.id;

                  const trimmed = repostText.trim();

                  repostMutation.mutate(
                    {
                      postId: targetPostId,
                      isReposted: false,
                      content: trimmed || undefined,
                    },
                    {
                      onSettled: () => {
                        setRepostModalPost(null);
                        setRepostText('');
                      },
                    } as any,
                  );
                }}
              >
                {repostMutation.isPending ? 'Reposting...' : 'Repost'}
              </PostButton>
            </CommentInputContainer>
          </ModalContent>
        </ModalOverlay>
      )}

      {blockConfirmUser && (
        <ModalOverlay
          onClick={() => {
            setBlockConfirmUser(null);
          }}
        >
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Block @{blockConfirmUser.username}?</ModalTitle>
              <ModalCloseButton
                onClick={() => {
                  setBlockConfirmUser(null);
                }}
              >
                <X size={24} />
              </ModalCloseButton>
            </ModalHeader>

            <p
              style={{
                marginBottom: '1.25rem',
                color: 'rgb(var(--muted-foreground))',
                fontSize: '0.95rem',
              }}
            >
              They will no longer be able to follow you, see your posts, or start a conversation
              with you. You will also no longer see their posts in your feed.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setBlockConfirmUser(null)}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: '999px',
                  border: '1px solid rgb(var(--border))',
                  background: 'rgb(var(--background))',
                  color: 'rgb(var(--foreground))',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <PostButton
                type="button"
                onClick={() => {
                  const current = blockConfirmUser;
                  if (!current) return;
                  blockUserMutation.mutate({ userId: current.id });
                  setBlockConfirmUser(null);
                }}
                disabled={blockUserMutation.isPending}
                style={{ opacity: blockUserMutation.isPending ? 0.6 : 1 }}
              >
                Block
              </PostButton>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {isGifPickerOpen && (
        <ModalOverlay
          onClick={() => {
            setIsGifPickerOpen(false);
          }}
        >
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Select a GIF</ModalTitle>
              <ModalCloseButton
                onClick={() => {
                  setIsGifPickerOpen(false);
                }}
              >
                <X size={24} />
              </ModalCloseButton>
            </ModalHeader>

            <form
              onSubmit={handleGifSearch}
              style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}
            >
              <input
                type="text"
                value={gifSearchTerm}
                onChange={(e) => setGifSearchTerm(e.target.value)}
                placeholder="Search GIFs"
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgb(var(--input))',
                  background: 'rgb(var(--background))',
                  color: 'rgb(var(--foreground))',
                }}
              />
              <PostButton type="submit" disabled={isSearchingGifs}>
                {isSearchingGifs ? feedLabels.loading : 'Search'}
              </PostButton>
            </form>

            {gifResults.length === 0 && !isSearchingGifs ? (
              <div style={{ color: 'rgb(var(--muted-foreground))', fontSize: '0.875rem' }}>
                Try searching for a reaction like &quot;happy&quot; or &quot;wow&quot;.
              </div>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '8px',
                maxHeight: '320px',
                overflowY: 'auto',
                marginTop: '0.5rem',
              }}
            >
              {gifResults.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_GIF_URL', gifUrl: gif.originalUrl });
                    dispatch({ type: 'SET_IMAGE_URL', imageUrl: undefined });
                    dispatch({ type: 'SET_VIDEO_URL', videoUrl: undefined });
                    setIsGifPickerOpen(false);
                  }}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                  title={gif.title}
                >
                  <img
                    src={gif.previewUrl}
                    alt={gif.title}
                    style={{
                      width: '100%',
                      borderRadius: '0.5rem',
                      objectFit: 'cover',
                    }}
                  />
                </button>
              ))}
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {isSaveDialogOpen && saveDialogPost && (
        <ModalOverlay
          onClick={() => {
            setIsSaveDialogOpen(false);
            setSaveDialogPost(null);
          }}
        >
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Save to collection</ModalTitle>
              <ModalCloseButton
                onClick={() => {
                  setIsSaveDialogOpen(false);
                  setSaveDialogPost(null);
                }}
              >
                <X size={24} />
              </ModalCloseButton>
            </ModalHeader>

            <p
              style={{
                marginBottom: '0.75rem',
                fontSize: '0.9rem',
                color: 'rgb(var(--muted-foreground))',
              }}
            >
              Choose a collection for this post, or leave it without a collection.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCollectionName('none')}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '999px',
                  border:
                    selectedCollectionName === 'none'
                      ? '2px solid rgb(var(--accent))'
                      : '1px solid rgb(var(--border))',
                  background:
                    selectedCollectionName === 'none'
                      ? 'rgba(var(--accent), 0.08)'
                      : 'rgb(var(--background))',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                No collection
              </button>

              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => setSelectedCollectionName(collection.name)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '999px',
                    border:
                      selectedCollectionName === collection.name
                        ? '2px solid rgb(var(--accent))'
                        : '1px solid rgb(var(--border))',
                    background:
                      selectedCollectionName === collection.name
                        ? 'rgba(var(--accent), 0.08)'
                        : 'rgb(var(--background))',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  {collection.name}
                </button>
              ))}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  marginTop: '0.5rem',
                }}
              >
                <label
                  htmlFor="new-collection-name"
                  style={{
                    fontSize: '0.8rem',
                    color: 'rgb(var(--muted-foreground))',
                  }}
                >
                  Or create a new collection
                </label>
                <input
                  id="new-collection-name"
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewCollectionName(value);
                    if (value.trim()) {
                      setSelectedCollectionName('__new__');
                    } else if (selectedCollectionName === '__new__') {
                      setSelectedCollectionName('none');
                    }
                  }}
                  placeholder="Collection name"
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '999px',
                    border: '1px solid rgb(var(--input))',
                    background: 'rgb(var(--background))',
                    color: 'rgb(var(--foreground))',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsSaveDialogOpen(false);
                  setSaveDialogPost(null);
                }}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: '999px',
                  border: '1px solid rgb(var(--border))',
                  background: 'rgb(var(--background))',
                  color: 'rgb(var(--foreground))',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              {savedPostIds.has(saveDialogPost.id) && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!user || !saveDialogPost) return;
                    try {
                      const token = await user.getIdToken();
                      await feedServices.toggleSavedPost(token, saveDialogPost.id);
                      await refreshSavedState(token);
                    } catch (error) {
                      console.error('Failed to remove saved post', error);
                    } finally {
                      setIsSaveDialogOpen(false);
                      setSaveDialogPost(null);
                    }
                  }}
                  style={{
                    padding: '0.45rem 1.1rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    background: 'rgba(239, 68, 68, 0.06)',
                    color: 'rgb(239, 68, 68)',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Remove saved post
                </button>
              )}
              <PostButton
                type="button"
                onClick={confirmSaveToCollection}
                disabled={selectedCollectionName === '__new__' && !newCollectionName.trim()}
              >
                Save
              </PostButton>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
}
