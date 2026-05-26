/**
 * User row returned by GET /users/me/followers and GET /users/me/following
 * (maps Prisma User; extra fields from JSON are ignored by consumers).
 */
export type FollowListUser = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
};
