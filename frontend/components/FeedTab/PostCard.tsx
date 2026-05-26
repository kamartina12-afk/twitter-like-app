'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, Heart, Repeat2, Bookmark, Ban, Trash2 } from 'lucide-react';
import {
  PostCard as StyledPostCard,
  PostContent,
  PostAvatar,
  PostAvatarText,
  PostBody,
  PostHeader,
  PostAuthorName,
  PostAuthorUsername,
  PostDivider,
  PostDate,
  PostText,
  PostMediaWrapper,
  PostMedia,
  PostActions,
  PostActionButton,
  PostActionCount,
  OriginalPostCard,
  OriginalPostHeader,
  OriginalPostAuthor,
  OriginalPostUsername,
  OriginalPostContent,
} from './FeedTab.styles';
import type { Post } from './types';
import type { PostCardProps } from './types';

export function PostCard({
  post,
  formatDate,
  youRepostedLabel,
  repostedLabel,
  currentUserId,
  isSaved,
  isBlocked,
  onHashtagSelect,
  onComment,
  onRepost,
  onDelete,
  onToggleSave,
  onBlockUser,
  likeMutation,
  repostMutation,
  pollVoteMutation,
  deletePostMutation,
  showSaveButton = true,
  showBlockButton = true,
}: PostCardProps) {
  const router = useRouter();

  if (isBlocked) {
    return (
      <StyledPostCard>
        <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.9rem' }}>
          You blocked @{post.authorUsername}. Their posts are hidden.
        </div>
      </StyledPostCard>
    );
  }

  const renderPoll = (poll: NonNullable<Post['poll']>, postId: string) => {
    const baseGradient = 'linear-gradient(90deg, #38bdf8, #6366f1, #ec4899)';
    const neutralBg = 'rgba(15, 23, 42, 0.04)';
    return (
      <div
        key={poll.id}
        style={{
          marginTop: '12px',
          padding: '10px 12px',
          borderRadius: '12px',
          border: '1px solid rgba(148, 163, 184, 0.5)',
          background: 'rgba(15, 23, 42, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {poll.question && (
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>
            {poll.question}
          </div>
        )}
        {poll.options.map((option) => {
          const total = poll.totalVotes ?? 0;
          const votes = option.votesCount ?? 0;
          const percentage = total > 0 ? Math.round((votes / total) * 100) : 0;
          const isSelected = poll.currentUserVoteOptionId === option.id;
          const isDisabled = !poll.isActive || pollVoteMutation.isPending || !currentUserId;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isDisabled}
              onClick={() => pollVoteMutation.mutate({ postId, optionId: option.id })}
              style={{
                position: 'relative',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '999px',
                border: isSelected ? '0px solid transparent' : '1px solid rgba(148, 163, 184, 0.6)',
                background: isSelected ? baseGradient : neutralBg,
                cursor: isDisabled ? 'default' : 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                overflow: 'hidden',
                transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
                color: isSelected ? '#ffffff' : 'inherit',
              }}
            >
              <span style={{ position: 'relative', zIndex: 1, fontWeight: isSelected ? 600 : 500 }}>
                {option.text}
              </span>
              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontSize: '0.8rem',
                  color: isSelected ? '#e5e7eb' : 'rgb(var(--muted-foreground))',
                }}
              >
                {percentage}%
              </span>
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${percentage}%`,
                  minWidth: percentage > 0 ? '10%' : '0',
                  background: isSelected ? 'rgba(15, 23, 42, 0.18)' : 'rgba(56, 189, 248, 0.25)',
                  opacity: 1,
                  transition: 'width 160ms ease',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              />
            </button>
          );
        })}
        <div
          style={{
            marginTop: '4px',
            fontSize: '0.75rem',
            color: 'rgb(var(--muted-foreground))',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{poll.totalVotes} votes</span>
          <span>{poll.isActive ? 'Poll ends soon' : 'Poll ended'}</span>
        </div>
      </div>
    );
  };

  return (
    <StyledPostCard key={`${post.isRepost ? 'repost' : 'post'}-${post.id}-${post.authorId || ''}`}>
      {post.isRepost && (
        <div
          style={{
            fontSize: '13px',
            color: '#666',
            marginBottom: '8px',
            paddingLeft: '50px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Repeat2 size={14} />
          <span
            onClick={() => router.push(`/profile/${post.authorUsername}`)}
            style={{ cursor: 'pointer', fontWeight: 500 }}
          >
            {post.authorId === currentUserId ? youRepostedLabel : post.authorUsername}
          </span>
          <span>{repostedLabel}</span>
        </div>
      )}
      <PostContent>
        <PostAvatar
          onClick={() => router.push(`/profile/${post.authorUsername}`)}
          style={{ cursor: 'pointer' }}
        >
          {post.avatarUrl ? (
            <img
              src={post.avatarUrl}
              alt={post.authorUsername}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <PostAvatarText>
              {(post.authorDisplayName || post.authorUsername)[0]?.toUpperCase()}
            </PostAvatarText>
          )}
        </PostAvatar>

        <PostBody>
          <PostHeader>
            <PostAuthorName
              onClick={() => router.push(`/profile/${post.authorUsername}`)}
              style={{ cursor: 'pointer' }}
            >
              {post.authorDisplayName || post.authorUsername}
            </PostAuthorName>
            <PostAuthorUsername
              onClick={() =>
                router.push(
                  `/profile/${post.isRepost ? post.originalAuthorUsername : post.authorUsername}`,
                )
              }
              style={{ cursor: 'pointer' }}
            >
              @{post.isRepost ? post.originalAuthorUsername : post.authorUsername}
            </PostAuthorUsername>
            <PostDivider>·</PostDivider>
            <PostDate>{formatDate(post.createdAt)}</PostDate>
            {showSaveButton && currentUserId && (
              <button
                type="button"
                onClick={() => onToggleSave(post)}
                style={{
                  marginLeft: 'auto',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  color: isSaved ? 'rgb(var(--accent))' : 'rgb(var(--muted-foreground))',
                }}
                title={isSaved ? 'Unsave post' : 'Save post'}
              >
                <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            )}
            {showBlockButton && post.authorId !== currentUserId && (
              <button
                type="button"
                onClick={() => onBlockUser(post.authorId!, post.authorUsername)}
                style={{
                  marginLeft: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  color: 'rgb(var(--muted-foreground))',
                }}
                title="Block user"
              >
                <Ban size={16} />
              </button>
            )}
          </PostHeader>

          {!post.isRepost && post.content && <PostText>{post.content}</PostText>}

          {post.hashtags && post.hashtags.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.35rem',
                marginBottom: '0.5rem',
              }}
            >
              {post.hashtags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onHashtagSelect?.(tag)}
                  style={{
                    borderRadius: '999px',
                    border: '1px solid rgba(var(--accent), 0.8)',
                    padding: '0.12rem 0.6rem',
                    fontSize: '0.8rem',
                    background: 'rgba(var(--accent), 0.1)',
                    color: 'rgb(var(--accent-foreground))',
                    cursor: 'pointer',
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {post.isRepost && (
            <>
              {post.content && <PostText>{post.content}</PostText>}
              <OriginalPostCard>
                <OriginalPostHeader>
                  <OriginalPostAuthor>{post.originalAuthorUsername}</OriginalPostAuthor>
                  <OriginalPostUsername>@{post.originalAuthorUsername}</OriginalPostUsername>
                </OriginalPostHeader>
                <OriginalPostContent>{post.originalPostContent}</OriginalPostContent>
                {(post.originalPostGifUrl ||
                  post.originalPostImageUrl ||
                  post.originalPostVideoUrl) && (
                  <PostMediaWrapper>
                    {post.originalPostVideoUrl ? (
                      <video
                        src={post.originalPostVideoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        style={{
                          width: '100%',
                          maxHeight: '360px',
                          objectFit: 'contain',
                          background: 'rgb(var(--card))',
                          display: 'block',
                          borderRadius: 'inherit',
                        }}
                      />
                    ) : (
                      <PostMedia
                        src={post.originalPostGifUrl || post.originalPostImageUrl}
                        alt="Original post media"
                      />
                    )}
                  </PostMediaWrapper>
                )}
                {post.originalPostPoll && renderPoll(post.originalPostPoll, post.originalPostId!)}
              </OriginalPostCard>
            </>
          )}

          {!post.isRepost && (post.gifUrl || post.imageUrl || post.videoUrl) && (
            <PostMediaWrapper>
              {post.videoUrl ? (
                <video
                  src={post.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    width: '100%',
                    maxHeight: '360px',
                    objectFit: 'contain',
                    background: 'rgb(var(--card))',
                    display: 'block',
                    borderRadius: 'inherit',
                  }}
                />
              ) : (
                <PostMedia src={post.gifUrl || post.imageUrl} alt="Post media" />
              )}
            </PostMediaWrapper>
          )}

          {post.poll && renderPoll(post.poll, post.id)}

          <PostActions>
            <PostActionButton onClick={() => onComment(post)}>
              <MessageSquare size={20} />
              <PostActionCount>{post.repliesCount || 0}</PostActionCount>
            </PostActionButton>

            {post.authorId !== currentUserId && (
              <PostActionButton
                onClick={() => {
                  if (post.isReposted) {
                    repostMutation.mutate({
                      postId: post.isRepost ? post.originalPostId! : post.id,
                      isReposted: true,
                    });
                    return;
                  }
                  onRepost(post);
                }}
                disabled={repostMutation.isPending}
                style={{ opacity: repostMutation.isPending ? 0.6 : 1 }}
              >
                <Repeat2
                  size={20}
                  color={post.isReposted ? 'rgb(var(--repost))' : 'currentColor'}
                />
                <PostActionCount
                  style={{ color: post.isReposted ? 'rgb(var(--repost))' : 'inherit' }}
                >
                  {post.repostsCount || 0}
                </PostActionCount>
              </PostActionButton>
            )}

            <PostActionButton
              onClick={() => likeMutation.mutate({ postId: post.id, isLiked: post.isLiked })}
              disabled={likeMutation.isPending}
              style={{ opacity: likeMutation.isPending ? 0.6 : 1 }}
            >
              <Heart
                size={20}
                color={post.isLiked ? 'rgb(var(--accent))' : 'currentColor'}
                fill={post.isLiked ? 'currentColor' : 'none'}
              />
              <PostActionCount style={{ color: post.isLiked ? 'rgb(var(--accent))' : 'inherit' }}>
                {post.likesCount || 0}
              </PostActionCount>
            </PostActionButton>
            {post.authorId === currentUserId && (
              <PostActionButton
                onClick={() => onDelete(post)}
                disabled={deletePostMutation.isPending}
                style={{ opacity: deletePostMutation.isPending ? 0.6 : 1 }}
              >
                <Trash2 size={20} />
              </PostActionButton>
            )}
          </PostActions>
        </PostBody>
      </PostContent>
    </StyledPostCard>
  );
}
