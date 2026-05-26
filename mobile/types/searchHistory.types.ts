export type ExploreSearchUserHistory = {
  type: 'user';
  historyId: string;
  query: string;
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
};

export type ExploreSearchHashtagHistory = {
  type: 'hashtag';
  historyId: string;
  query: string;
};

export type ExploreSearchHistoryEntry =
  | ExploreSearchUserHistory
  | ExploreSearchHashtagHistory;
