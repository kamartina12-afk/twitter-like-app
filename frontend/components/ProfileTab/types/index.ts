export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  gifUrl?: string;
  videoUrl?: string;
  createdAt: string;
  likesCount: number;
  repliesCount: number;
  repostsCount: number;
  isLiked: boolean;
  isReposted: boolean;
}

export interface UpdateProfileForm {
  displayName: string;
  bio: string;
  avatar?: FileList;
  cover?: FileList;
}

export interface UpdateProfilePayload {
  displayName: string;
  bio: string;
  avatarUrl?: string;
  coverUrl?: string;
}
