import { UseMutationResult } from '@tanstack/react-query';

export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  gifUrl?: string;
  videoUrl?: string;
  avatarUrl?: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName?: string;
  createdAt: string;
  likesCount: number;
  repliesCount: number;
  repostsCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isRepost?: boolean;
  reposterId?: string;
  reposterUsername?: string;
  originalPostId?: string;
  originalAuthorId?: string;
  originalAuthorUsername?: string;
  originalPostContent?: string;
  originalPostImageUrl?: string;
  originalPostGifUrl?: string;
  originalPostVideoUrl?: string;
  originalPostPoll?: {
    id: string;
    question?: string;
    expiresAt: string;
    isActive: boolean;
    totalVotes: number;
    options: {
      id: string;
      text: string;
      votesCount: number;
    }[];
    currentUserVoteOptionId?: string;
  } | null;
  collectionName?: string | null;
  collectionNames?: string[];
  inUnsorted?: boolean;
  hashtags?: string[];
  poll?: {
    id: string;
    question?: string;
    expiresAt: string;
    isActive: boolean;
    totalVotes: number;
    options: {
      id: string;
      text: string;
      votesCount: number;
    }[];
    currentUserVoteOptionId?: string;
  } | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
  };
}

export interface CreatePostForm {
  postId?: string;
  isReposted?: boolean;
  content: string;
  imageUrl?: string;
  gifUrl?: string;
  videoUrl?: string;
  pollQuestion?: string;
  pollOption1?: string;
  pollOption2?: string;
  pollOption3?: string;
  pollOption4?: string;
  pollDurationMinutes?: number;
}

export type PostCardProps = {
  post: Post;
  formatDate: (date: string) => string;
  youRepostedLabel: string;
  repostedLabel: string;
  currentUserId: string | undefined;
  isSaved: boolean;
  isBlocked: boolean;
  onHashtagSelect?: (tag: string) => void;
  onComment: (post: Post) => void;
  onRepost: (post: Post) => void;
  onDelete: (post: Post) => void;
  onToggleSave: (post: Post) => void;
  onBlockUser: (id: string, username: string) => void;
  likeMutation: UseMutationResult<void, Error, { postId: string; isLiked: boolean }>;
  repostMutation: UseMutationResult<
    void,
    Error,
    {
      postId: string;
      isReposted: boolean;
      content?: string;
      imageUrl?: string;
      gifUrl?: string;
      videoUrl?: string;
    }
  >;
  pollVoteMutation: UseMutationResult<unknown, Error, { postId: string; optionId: string }>;
  deletePostMutation: UseMutationResult<void, Error, { postId: string }>;
  showSaveButton?: boolean;
  showBlockButton?: boolean;
};
