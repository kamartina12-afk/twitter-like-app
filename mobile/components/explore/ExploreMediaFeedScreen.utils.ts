import type { FeedPost } from '@/components/post/feed/types/types';
import { hasExploreableMedia } from '@/components/explore/exploreGrid.utils';

export function isVideoPost(post: FeedPost): boolean {
  // Repost shells must not surface as their own explore items.
  if (post.isRepost) return false;
  return !!post.videoUrl;
}

export function seedFirst(posts: FeedPost[], seedId: string): FeedPost[] {
  const seed = posts.find((p) => p.id === seedId);
  const rest = posts.filter((p) => p.id !== seedId);
  return seed ? [seed, ...rest] : posts;
}

export function filterVideoPosts(posts: FeedPost[]): FeedPost[] {
  return posts.filter(isVideoPost);
}

export function shuffleWithSeedFirst(
  posts: FeedPost[],
  seedId: string,
): FeedPost[] {
  const videos = filterVideoPosts(posts);
  const seed = videos.find((p) => p.id === seedId);
  const rest = videos.filter((p) => p.id !== seedId);
  const shuffled = [...rest];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  return seed ? [seed, ...shuffled] : shuffled;
}

export function filterExploreMediaPosts(posts: FeedPost[]): FeedPost[] {
  return posts.filter((p) => hasExploreableMedia(p));
}
