import type { SearchResult } from '@/components/SearchBar/types';

export type ExploreUserHistoryItem = SearchResult & {
  type: 'user';
  historyId: string;
  query: string;
};

export type ExploreHashtagHistoryItem = {
  type: 'hashtag';
  historyId: string;
  query: string;
};

export type ExploreHistoryItem = ExploreUserHistoryItem | ExploreHashtagHistoryItem;
