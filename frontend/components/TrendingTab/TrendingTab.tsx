'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { hashtagServices, type TrendingHashtag } from '@/services/hashtagServices';
import type { TrendingScope, TrendingTabProps } from './types';
import {
  HashtagChip,
  HashtagsContainer,
  HelperText,
  InfoText,
  ScopeButton,
  ScopeToggle,
  TrendingCard,
  TrendingHeader,
  TrendingSubtitle,
  TrendingTitle,
} from './TrendingTab.styles';

const MAX_TRENDING_HASHTAGS = 5;

export default function TrendingTab({
  initialScope = 'global',
  activeHashtag,
  onHashtagSelect,
}: TrendingTabProps) {
  const { user } = useAuth();
  const [localActiveHashtag, setLocalActiveHashtag] = useState<string | null>(null);
  const [scope, setScope] = useState<TrendingScope>(initialScope);

  const { data: trending = [], isLoading: isLoadingTrending } = useQuery<TrendingHashtag[]>({
    queryKey: ['hashtags', 'trending', scope],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      return hashtagServices.fetchTrending(token, MAX_TRENDING_HASHTAGS, 1, scope);
    },
    enabled: !!user,
  });

  const visibleTrending = trending.slice(0, MAX_TRENDING_HASHTAGS);
  const selectedHashtag = activeHashtag ?? localActiveHashtag ?? visibleTrending[0]?.name ?? null;

  return (
    <TrendingCard>
      <TrendingHeader>
        <TrendingTitle>
          {scope === 'global' ? 'Trending worldwide' : 'Trending near you'}
        </TrendingTitle>
        <TrendingSubtitle>Discover what's being talked about right now.</TrendingSubtitle>
      </TrendingHeader>

      <ScopeToggle>
        <ScopeButton type="button" $active={scope === 'global'} onClick={() => setScope('global')}>
          Worldwide
        </ScopeButton>
        <ScopeButton
          type="button"
          $active={scope === 'country'}
          onClick={() => setScope('country')}
        >
          Near you
        </ScopeButton>
      </ScopeToggle>

      <HashtagsContainer>
        {isLoadingTrending && <InfoText>Loading trending hashtags...</InfoText>}

        {!isLoadingTrending && visibleTrending.length === 0 && (
          <InfoText>No trending hashtags yet. Start a conversation with a #hashtag.</InfoText>
        )}

        {visibleTrending.map((tag) => {
          const isActive = selectedHashtag === tag.name;
          return (
            <HashtagChip
              key={tag.id}
              type="button"
              $active={isActive}
              onClick={() => {
                setLocalActiveHashtag(tag.name);
                onHashtagSelect?.(tag.name);
              }}
            >
              <span>#{tag.name}</span>
              <InfoText>
                {tag.postsCount} post{tag.postsCount === 1 ? '' : 's'}
              </InfoText>
            </HashtagChip>
          );
        })}
      </HashtagsContainer>

      {!selectedHashtag && visibleTrending.length > 0 && (
        <HelperText>Select a hashtag above to explore related posts.</HelperText>
      )}
    </TrendingCard>
  );
}
