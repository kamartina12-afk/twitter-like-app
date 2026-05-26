import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchUsers } from '@/services/users.service';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import type { ExploreSearchHistoryEntry } from '@/types/searchHistory.types';

const API = process.env.EXPO_PUBLIC_API_URL;

export type AddSearchHistoryInput =
  | { query: string; type: 'user'; targetId: string }
  | { query: string; type: 'hashtag' };

type UseSearchUsersOptions = {
  enabled?: boolean;
};

export const useSearchUsers = (query: string, options?: UseSearchUsersOptions) => {
  const { user } = useAuth();
  const searchEnabled = options?.enabled ?? true;
  const normalizedQuery = query.trim().replace(/^@+/, '');

  return useQuery({
    queryKey: ['search-users', normalizedQuery],
    enabled:
      searchEnabled &&
      !!user &&
      normalizedQuery.length > 0 &&
      !query.trim().startsWith('#'),
    queryFn: async () => {
      const token = await user!.getIdToken();
      return searchUsers(token, normalizedQuery);
    },
  });
};

export const useSearchHistory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const historyQuery = useQuery({
    queryKey: ['search-history'],
    enabled: !!user,
    queryFn: async (): Promise<ExploreSearchHistoryEntry[]> => {
      const token = await user!.getIdToken();
      const { data } = await axios.get(`${API}/search-history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const raw = Array.isArray(data) ? data : [];
      return raw.filter(
        (row: { type?: string }) => row.type === 'user' || row.type === 'hashtag',
      ) as ExploreSearchHistoryEntry[];
    },
  });

  const addHistory = useMutation({
    mutationFn: async (input: AddSearchHistoryInput) => {
      const token = await user!.getIdToken();
      return axios.post(
        `${API}/search-history`,
        {
          query: input.query.trim(),
          type: input.type,
          targetId: input.type === 'user' ? input.targetId : null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    },
  });

  const deleteHistory = useMutation({
    mutationFn: async (id: string) => {
      const token = await user!.getIdToken();
      return axios.delete(`${API}/search-history/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    },
  });

  return { historyQuery, addHistory, deleteHistory };
};
