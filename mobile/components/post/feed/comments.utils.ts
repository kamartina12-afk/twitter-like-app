import type { Comment } from './types/types';

export function mapApiCommentToComment(raw: unknown): Comment | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const u = r.user as Record<string, unknown> | undefined;
  if (!r.id || typeof r.content !== 'string' || typeof u?.username !== 'string') {
    return null;
  }
  const uid = typeof u.id === 'string' ? u.id : '';
  const repliesRaw = r.replies;
  const replies: Comment[] =
    Array.isArray(repliesRaw) && repliesRaw.length > 0
      ? repliesRaw
          .map((x) => mapApiCommentToComment(x))
          .filter((x): x is Comment => x != null)
      : [];

  return {
    id: String(r.id),
    content: r.content,
    createdAt:
      typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    parentId:
      r.parentId === null || typeof r.parentId === 'string'
        ? (r.parentId as string | null)
        : null,
    user: {
      id: uid,
      username: u.username,
      displayName:
        u.displayName != null && typeof u.displayName === 'string'
          ? u.displayName
          : null,
    },
    likesCount: typeof r.likesCount === 'number' ? r.likesCount : 0,
    isLikedByMe: r.isLikedByMe === true,
    replies,
  };
}

export type FlatCommentRow = Omit<Comment, 'replies'> & { depth: number };

export function flattenCommentTree(
  nodes: Comment[],
  depth = 0,
): FlatCommentRow[] {
  const out: FlatCommentRow[] = [];
  for (const n of nodes) {
    const { replies, ...rest } = n;
    out.push({ ...rest, depth });
    if (replies?.length) {
      out.push(...flattenCommentTree(replies, depth + 1));
    }
  }
  return out;
}

export function updateCommentLikeInTree(
  tree: Comment[],
  commentId: string,
  liked: boolean,
): Comment[] {
  return tree.map((c) => {
    if (c.id === commentId) {
      const was = c.isLikedByMe;
      const delta = (liked ? 1 : 0) - (was ? 1 : 0);
      return {
        ...c,
        isLikedByMe: liked,
        likesCount: Math.max(0, (c.likesCount ?? 0) + delta),
      };
    }
    if (c.replies?.length) {
      return {
        ...c,
        replies: updateCommentLikeInTree(c.replies, commentId, liked),
      };
    }
    return c;
  });
}

export function insertCommentInTree(tree: Comment[], newComment: Comment): Comment[] {
  const pid = newComment.parentId;
  if (!pid) {
    return [newComment, ...tree];
  }

  return tree.map((c) => {
    if (c.id === pid) {
      return {
        ...c,
        replies: [...(c.replies ?? []), newComment],
      };
    }
    if (c.replies?.length) {
      return {
        ...c,
        replies: insertCommentInTree(c.replies, newComment),
      };
    }
    return c;
  });
}
