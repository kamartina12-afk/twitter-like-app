import type { FeedPost } from '@/components/post/feed/types/types';

/** GET /posts/feed?type=… */
export type FeedType = 'for_you' | 'following';

export type FeedPageResponse = {
  data: FeedPost[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
