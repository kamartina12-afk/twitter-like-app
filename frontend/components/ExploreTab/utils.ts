import type { ExploreHistoryItem, ExploreUserHistoryItem } from './types';

export const HISTORY_KEY = 'twitter-like-explore-history';

export const buildHistoryKey = (userId?: string | null) =>
  userId ? `${HISTORY_KEY}:${userId}` : HISTORY_KEY;

export function parseHistory(raw: string | null): ExploreHistoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ExploreHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildNextHistory(
  previous: ExploreUserHistoryItem[],
  user: ExploreUserHistoryItem,
  maxEntries = 25,
): ExploreUserHistoryItem[] {
  return [user, ...previous.filter((u) => u.id !== user.id)].slice(0, maxEntries);
}
