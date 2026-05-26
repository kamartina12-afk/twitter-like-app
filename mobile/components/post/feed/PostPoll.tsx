import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import styles from './PostCard.styles';
import { PollOption, PostPollProps } from './types/types';
import { voteOnPoll } from '@/services/post.service';
import { useMutation } from '@tanstack/react-query';

function formatTimeRemaining(expiresAt?: string | null): string | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return null;

  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) {
    return 'Final results';
  }

  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) {
    return `${minutes} min left`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} left`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export default function PostPoll({ postId, poll }: PostPollProps) {
  const options: PollOption[] = poll?.options ?? [];

  if (!options.length) {
    return null;
  }

  const totalVotesFromOptions =
    options.reduce((sum, opt) => sum + (opt.votesCount ?? 0), 0) ?? 0;
  const totalVotes = poll?.totalVotes ?? totalVotesFromOptions;

  const timeRemainingLabel = useMemo(
    () => formatTimeRemaining(poll?.expiresAt),
    [poll?.expiresAt],
  );

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      await voteOnPoll(postId, optionId);
    },
  });

  return (
    <View style={styles.poll}>
      {poll?.question ? (
        <Text style={styles.pollQuestionText}>{poll.question}</Text>
      ) : null}

      {options.map((opt) => {
        const votes = opt.votesCount ?? 0;
        const percentage =
          totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        const isSelected = poll?.currentUserVoteOptionId === opt.id;
        const isDisabled =
          poll?.isActive === false ||
          !!poll?.currentUserVoteOptionId ||
          voteMutation.isPending;

        const handlePress = () => {
          if (isDisabled) return;
          voteMutation.mutate(opt.id);
        };

        return (
          <Pressable
            key={opt.id}
            style={[
              styles.pollOption,
              isSelected ? styles.pollOptionSelected : null,
            ]}
            onPress={handlePress}
            disabled={isDisabled}
          >
            <View style={styles.pollOptionHeader}>
              <Text style={styles.pollOptionText}>{opt.text}</Text>
              {totalVotes > 0 && (
                <Text style={styles.pollOptionMeta}>
                  {percentage}% • {votes} vote{votes === 1 ? '' : 's'}
                </Text>
              )}
            </View>
            {totalVotes > 0 && (
              <View style={styles.pollOptionBarBackground}>
                <View
                  style={[
                    styles.pollOptionBarFill,
                    { width: `${percentage}%` },
                  ]}
                />
              </View>
            )}
          </Pressable>
        );
      })}

      {(typeof totalVotes === 'number' && totalVotes > 0) || timeRemainingLabel ? (
        <Text style={styles.pollFooterText}>
          {typeof totalVotes === 'number' && totalVotes > 0
            ? `${totalVotes} vote${totalVotes === 1 ? '' : 's'}`
            : ''}
          {poll?.isActive === false && !timeRemainingLabel ? ' • Final results' : ''}
          {timeRemainingLabel
            ? `${typeof totalVotes === 'number' && totalVotes > 0 ? ' • ' : ''}${timeRemainingLabel}`
            : ''}
        </Text>
      ) : null}
    </View>
  );
}
