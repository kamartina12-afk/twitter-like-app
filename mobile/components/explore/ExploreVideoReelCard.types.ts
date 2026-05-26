import type { FeedPost } from '@/components/post/feed/types/types';

export type ExploreVideoReelCardProps = {
  post: FeedPost;
  height: number;
  isActive: boolean;
  isScreenFocused?: boolean;
};
