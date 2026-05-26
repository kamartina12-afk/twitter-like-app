export type FeedPost = {
  id: string;
  content?: string;
  imageUrl?: string[] | null;
  gifUrl?: string | null;
  videoUrl?: string | null;
  mediaAspectRatio?: number | null;
  createdAt: string;
  authorId?: string;
  authorUsername?: string;
  authorDisplayName?: string;
  avatarUrl?: string | null;
  likesCount?: number;
  viewsCount?: number;
  repliesCount?: number;
  repostsCount?: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isRepost?: boolean;
  originalPostId?: string;
  originalAuthorId?: string;
  originalAuthorUsername?: string;
  originalPostContent?: string | null;
  originalPostImageUrl?: string | null;
  originalPostGifUrl?: string | null;
  originalPostVideoUrl?: string | null;
  originalPostMediaAspectRatio?: number | null;
  poll?: {
    id: string;
    question?: string | null;
    expiresAt?: string | null;
    isActive?: boolean;
    totalVotes?: number;
    currentUserVoteOptionId?: string;
    options?: PollOption[] | null;
  } | null;

  /** Feed / profile when authenticated; `/saved-posts/me` includes collection fields */
  isSaved?: boolean;
  collectionName?: string | null;
  collectionNames?: string[];
  inUnsorted?: boolean;
};

export type PostActionsProps = {
  post: {
    id: string;
    authorId?: string;
    repliesCount?: number;
    repostsCount?: number;
    likesCount?: number;
    isLiked?: boolean;
    isReposted?: boolean;
    isSaved?: boolean;
    isRepost?: boolean;
    originalPostId?: string | null;
  };
  onCommentPress?: () => void;
  onBookmarkPress: () => void;
  /** `reelSidebar`: vertical TikTok-style rail (like → comment → repost → save). */
  /** `reelRow`: same actions as sidebar in a horizontal row (e.g. above caption on reels). */
  variant?: 'default' | 'reel' | 'reelSidebar' | 'reelRow';
};

export type PollOption = {
  id: string;
  text: string;
  votesCount?: number;
};

export type PostPollProps = {
  postId: string;
  poll?: {
    id: string;
    question?: string | null;
    expiresAt?: string | null;
    isActive?: boolean;
    totalVotes?: number;
    currentUserVoteOptionId?: string;
    options?: PollOption[] | null;
  } | null;
};

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
  };
  likesCount: number;
  isLikedByMe: boolean;
  replies: Comment[];
};

export type CommentsModalProps = {
  visible: boolean;
  isLoading: boolean;
  comments: Comment[];
  commentText: string;
  onChangeCommentText: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  /** Replying to a comment (or null for root). */
  replyTo: Comment | null;
  onReplyTo: (comment: Comment | null) => void;
  onToggleLike: (commentId: string) => void;
  /** Scroll to / highlight this comment after load. */
  focusCommentId?: string | null;
  /**
   * Reels: horizontal videos shrink above the sheet; vertical stays full-bleed with sheet overlay.
   * Omit for feed posts (same bottom sheet; no video pairing).
   */
  reelLayout?: 'horizontal' | 'vertical';
};
  