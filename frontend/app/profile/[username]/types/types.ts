interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  birthDate?: string;
  isMutualFollower?: boolean;
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  likesCount: number;
  repliesCount: number;
  imageUrl?: string;
  gifUrl?: string;
  videoUrl?: string;
}

export type { UserProfile, Post };
