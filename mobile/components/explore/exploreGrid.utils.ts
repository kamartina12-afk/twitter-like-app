import type { FeedPost } from '@/components/post/feed/types/types';

export const ASPECT_MIN = 0.55;
export const ASPECT_MAX = 1.85;

export function clampAspectRatio(ratio: number | null | undefined): number {
  if (ratio == null || Number.isNaN(ratio) || ratio <= 0) {
    return 1;
  }
  return Math.min(ASPECT_MAX, Math.max(ASPECT_MIN, ratio));
}

export function getExploreGridMedia(post: FeedPost): {
  uri: string | null;
  isVideo: boolean;
  aspectRatio: number;
} {
  // Repost shells are text-only; media lives on the root post and must not surface as its own explore tile.
  if (post.isRepost) {
    return {
      uri: null,
      isVideo: false,
      aspectRatio: 1,
    };
  }

  let uri: string | null = null;
  if (post.videoUrl) {
    uri = post.videoUrl;
  } else if (post.gifUrl) {
    uri = post.gifUrl;
  } else if (Array.isArray(post.imageUrl)) {
    const arr = post.imageUrl;
    uri = arr[0] ?? null;
  } else if (typeof (post as any).imageUrl === 'string') {
    const url = ((post as any).imageUrl as string).trim();
    if (url.length > 0) {
      uri = url;
    }
  }
  return {
    uri,
    isVideo: !!post.videoUrl,
    aspectRatio: clampAspectRatio(post.mediaAspectRatio),
  };
}

export type MasonryCell = {
  post: FeedPost;
  height: number;
};

export const GRID_COLUMNS = 3;

export function buildMasonryColumns(
  posts: FeedPost[],
  columnWidth: number,
  gap: number,
  numColumns: number,
): MasonryCell[][] {
  const cols: MasonryCell[][] = Array.from({ length: numColumns }, () => []);
  const heights = Array(numColumns).fill(0);

  for (const post of posts) {
    const media = getExploreGridMedia(post);
    if (!media.uri) {
      continue;
    }

    const itemHeight = columnWidth / media.aspectRatio;

    let col = 0;
    for (let i = 1; i < numColumns; i++) {
      if (heights[i] < heights[col]) {
        col = i;
      }
    }

    cols[col].push({ post, height: itemHeight });
    heights[col] += itemHeight + gap;
  }

  return cols;
}

export function hasExploreableMedia(post: FeedPost): boolean {
  return !!getExploreGridMedia(post).uri;
}
