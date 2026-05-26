'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar/SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import type { ExploreHistoryItem, ExploreUserHistoryItem } from './types';
import type { SearchResult } from '@/components/SearchBar/types';
import { searchHistoryServices } from '@/services/searchHistoryServices';

export default function ExploreTab() {
  const [history, setHistory] = useState<ExploreUserHistoryItem[]>([]);
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: serverHistory = [] } = useQuery<ExploreHistoryItem[]>({
    queryKey: ['searchHistory'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      return searchHistoryServices.fetchHistory(token);
    },
    enabled: !!user,
  });

  useEffect(() => {
    const usersOnly = serverHistory.filter(
      (item): item is ExploreUserHistoryItem => item.type === 'user',
    );
    if (usersOnly.length) {
      setHistory(usersOnly);
    }
  }, [serverHistory]);

  const updateHistory = (selectedUser: SearchResult) => {
    setHistory((prev) => {
      const existing = prev.filter((u) => u.id !== selectedUser.id);
      const withHistoryId: ExploreUserHistoryItem = {
        ...selectedUser,
        type: 'user',
        query: selectedUser.username,
        historyId: crypto.randomUUID(),
      };
      return [withHistoryId, ...existing].slice(0, 25);
    });

    queryClient.setQueryData<ExploreHistoryItem[] | undefined>(['searchHistory'], (prev) => {
      const list = prev ?? [];
      const existing = list.filter((u) => u.type !== 'user' || u.id !== selectedUser.id);
      const withHistoryId: ExploreUserHistoryItem = {
        ...selectedUser,
        type: 'user',
        query: selectedUser.username,
        historyId: crypto.randomUUID(),
      };
      return [withHistoryId, ...existing].slice(0, 25);
    });

    void (async () => {
      try {
        const token = await user?.getIdToken();
        if (!token) return;
        await searchHistoryServices.addUserSearch(token, selectedUser);
      } catch {
        // ignore history persistence errors
      }
    })();
  };

  const handleHistoryRemove = async (historyId: string) => {
    setHistory((prev) => prev.filter((item) => item.historyId !== historyId));
    queryClient.setQueryData<ExploreHistoryItem[] | undefined>(['searchHistory'], (prev) =>
      (prev ?? []).filter((item) => item.historyId !== historyId),
    );

    try {
      const token = await user?.getIdToken();
      if (!token) return;
      await searchHistoryServices.deleteEntry(token, historyId);
    } catch {
      // ignore delete failures for now
    }
  };

  const handleUserSelect = (user: SearchResult) => {
    updateHistory(user);
    router.push(`/profile/${user.username}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-xl mx-auto w-full">
      <SearchBar onUserSelect={handleUserSelect} />

      {history.length > 0 && (
        <div className="mt-2">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Recently searched</h2>
          <ul className="flex flex-col gap-2">
            {history.map((user) => (
              <li key={user.historyId}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/profile/${user.username}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/profile/${user.username}`);
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 hover:bg-accent/70 text-left justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary overflow-hidden">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '9999px',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <span>{(user.displayName || user.username)[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {user.displayName || user.username}
                      </span>
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleHistoryRemove(user.historyId);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
