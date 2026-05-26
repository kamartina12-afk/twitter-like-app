import type { FollowersList, FollowersMode } from '@/types/followers.types';

export function computeNotFollowingBack(
  following: FollowersList,
  followers: FollowersList,
): FollowersList {
  if (!following.length || !followers.length) return [];
  const followerIds = new Set(followers.map((f) => f.id));
  return following.filter((f) => !followerIds.has(f.id));
}

export function selectActiveList(
  mode: FollowersMode,
  followers: FollowersList,
  following: FollowersList,
  notFollowingBack: FollowersList,
): FollowersList {
  if (mode === 'followers') return followers;
  if (mode === 'following') return following;
  return notFollowingBack;
}

export function getInitials(displayName?: string | null, username?: string): string {
  const source = (displayName || username || '').trim();
  if (!source.length) return '?';
  return source[0]?.toUpperCase() ?? '?';
}

export default function FollowersUtilsRoute() {
  return null;
}

