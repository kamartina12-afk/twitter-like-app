export type FeedPost = {
    id: string;
    content?: string;
    imageUrl?: string | null;
    gifUrl?: string | null;
    videoUrl?: string | null;
    mediaAspectRatio?: number | null;
    createdAt: string;
    authorId?: string;
    authorUsername?: string;
    authorDisplayName?: string;
    avatarUrl?: string | null;
    likesCount?: number;
    repliesCount?: number;
    repostsCount?: number;
    isLiked?: boolean;
    isReposted?: boolean;
  };