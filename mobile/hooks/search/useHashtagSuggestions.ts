import { useQuery } from '@tanstack/react-query';
import { searchHashtags } from '@/services/hashtag.service';
import { useAuth } from '@/contexts/AuthContext';

export const useHashtagSuggestions = (prefix: string | null) => {
  const { user } = useAuth();
  const trimmed = prefix?.trim() ?? '';

  return useQuery({
    queryKey: ['hashtag-suggestions', trimmed],
    enabled: !!user && trimmed.length >= 1,
    queryFn: () => searchHashtags(trimmed),
  });
};
