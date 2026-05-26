'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, UserPlus, UserMinus, Ban, Cake } from 'lucide-react';
import { blockServices, type BlockedUser } from '@/services/blockServices';
import { PostCard } from '@/components/FeedTab/PostCard';
import type { Post } from '@/components/FeedTab/types';
import { feedLabels } from '@/components/FeedTab/utils/labels';
import { feedServices } from '@/components/FeedTab/services/feedServices';
import {
  UserProfileLabels,
  PageContainer,
  Header,
  HeaderContent,
  BackButton,
  HeaderInfo,
  HeaderTitle,
  HeaderSubtitle,
  Container,
  LoadingContainer,
  LoadingText,
  ProfileCard,
  CoverImage,
  ProfileContent,
  ProfileHeader,
  ProfileHeaderLeft,
  Avatar,
  AvatarText,
  DisplayName,
  Username,
  FollowButton,
  Bio,
  MetaInfo,
  MetaItem,
  Stats,
  Stat,
  StatValue,
  StatLabel,
  PostsSection,
  PostsTitle,
  EmptyCard,
  EmptyText,
  BlockButton,
  BirthdayBanner,
  BirthdayContent,
  BlockedMessage,
} from './profile.styles';
import { UserProfile } from './types/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString();
}

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  return <UserProfileContent username={username} />;
}

function UserProfileContent({ username }: { username: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  const queryClient = useQueryClient();
  const [commentModalPost, setCommentModalPost] = useState<Post | null>(null);
  const [repostModalPost, setRepostModalPost] = useState<Post | null>(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<Post | null>(null);
  const [blockConfirmUser, setBlockConfirmUser] = useState<{ id: string; username: string } | null>(
    null,
  );
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['userProfile', username],
    enabled: !!username,
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(`${apiUrl}/users/${username}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      return response.json();
    },
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['userPosts', username],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(`${apiUrl}/posts/user/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load posts');
      return response.json();
    },
    enabled: !!username,
  });

  const { data: blockedUsers = [] } = useQuery<BlockedUser[]>({
    queryKey: ['blocked-users'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return blockServices.fetchBlockedUsers(token);
    },
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const response = await fetch(`${apiUrl}/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle follow');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', username] });
    },
  });

  const handleFollowToggle = () => {
    if (!profile || followMutation.isPending) return;

    followMutation.mutate({
      userId: profile.id,
      isFollowing: profile.isFollowing ?? false,
    });
  };

  const blockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      await blockServices.blockUser(token, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', username] });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      await blockServices.unblockUser(token, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', username] });
    },
  });

  const invalidateUserPosts = () => {
    queryClient.invalidateQueries({ queryKey: ['userPosts', username] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  };

  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return isLiked
        ? feedServices.unlikePost(token, postId)
        : feedServices.likePost(token, postId);
    },
    onSettled: invalidateUserPosts,
  });

  const repostMutation = useMutation({
    mutationFn: async ({
      postId,
      isReposted,
      content,
    }: {
      postId: string;
      isReposted: boolean;
      content?: string;
    }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return isReposted
        ? feedServices.unrepostPost(token, postId)
        : feedServices.repostPost(token, postId, content);
    },
    onSettled: invalidateUserPosts,
  });

  const pollVoteMutation = useMutation({
    mutationFn: async ({ postId, optionId }: { postId: string; optionId: string }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return feedServices.voteOnPoll(token, postId, optionId);
    },
    onSettled: invalidateUserPosts,
  });

  const deletePostMutation = useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return feedServices.deletePost(token, postId);
    },
    onSettled: () => {
      setDeleteConfirmPost(null);
      invalidateUserPosts();
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      await blockServices.blockUser(token, userId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts', username] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const handleToggleSave = async (post: Post) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const result = await feedServices.toggleSavedPost(token, post.id);
      if (result.saved) {
        setSavedPostIds((prev) => new Set(prev).add(post.id));
      } else {
        setSavedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      }
      invalidateUserPosts();
    } catch (e) {
      console.error('Failed to toggle save', e);
    }
  };

  const blockedUserIds = new Set(blockedUsers.map((b) => b.id));

  if (profileLoading) {
    return (
      <LoadingContainer>
        <LoadingText>{UserProfileLabels.loadingProfile}</LoadingText>
      </LoadingContainer>
    );
  }

  if (!profile) {
    return (
      <LoadingContainer>
        <LoadingText>{UserProfileLabels.userNotFound}</LoadingText>
      </LoadingContainer>
    );
  }

  const isOwnProfile = user?.uid === profile.id;
  const isBlocked = blockedUsers.some((b) => b.id === profile.id);

  const birthDateValue = profile.birthDate ? new Date(profile.birthDate) : null;
  const today = new Date();
  const isBirthdayToday =
    !!birthDateValue &&
    birthDateValue.getMonth() === today.getMonth() &&
    birthDateValue.getDate() === today.getDate();

  return (
    <PageContainer>
      <Header>
        <HeaderContent>
          <BackButton onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </BackButton>
          <HeaderInfo>
            <HeaderTitle>{profile.displayName || profile.username}</HeaderTitle>
            <HeaderSubtitle>
              {profile.postsCount || 0} {UserProfileLabels.postsLabel}
            </HeaderSubtitle>
          </HeaderInfo>
        </HeaderContent>
      </Header>

      <Container>
        <ProfileCard>
          <CoverImage
            style={
              profile.coverUrl
                ? {
                    backgroundImage: `url("${profile.coverUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />

          <ProfileContent>
            <ProfileHeader>
              <ProfileHeaderLeft>
                <Avatar>
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Avatar"
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <AvatarText>{(profile.displayName || username)[0]?.toUpperCase()}</AvatarText>
                  )}
                </Avatar>

                <DisplayName>{profile.displayName || username}</DisplayName>
                <Username>@{username}</Username>
              </ProfileHeaderLeft>

              {!isOwnProfile && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!isBlocked && (
                    <FollowButton
                      onClick={handleFollowToggle}
                      $isFollowing={profile.isFollowing || false}
                      disabled={followMutation.isPending}
                    >
                      {profile.isFollowing ? (
                        <>
                          <UserMinus size={16} />
                          {UserProfileLabels.unfollowButton}
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          {UserProfileLabels.followButton}
                        </>
                      )}
                    </FollowButton>
                  )}
                  <BlockButton
                    onClick={() =>
                      isBlocked
                        ? unblockMutation.mutate(profile.id)
                        : blockMutation.mutate(profile.id)
                    }
                    disabled={blockMutation.isPending || unblockMutation.isPending}
                  >
                    <Ban size={16} />
                    {isBlocked ? 'Unblock' : 'Block'}
                  </BlockButton>
                </div>
              )}
            </ProfileHeader>

            {isBirthdayToday && (
              <BirthdayBanner>
                <BirthdayContent>
                  <Cake size={18} />
                  <span>
                    {isOwnProfile
                      ? 'Today is your birthday – let your friends celebrate with you!'
                      : `Today is @${profile.username}'s birthday.`}
                  </span>
                </BirthdayContent>
              </BirthdayBanner>
            )}

            {isBlocked ? (
              <BlockedMessage>
                You blocked @{username}. Their profile details and posts are hidden.
              </BlockedMessage>
            ) : (
              <>
                {profile.bio && <Bio>{profile.bio}</Bio>}

                <MetaInfo>
                  <MetaItem>
                    <Calendar size={16} />
                    <span>
                      {UserProfileLabels.joinedLabel}{' '}
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </MetaItem>
                  {profile.birthDate && profile.isMutualFollower && (
                    <MetaItem>
                      <Calendar size={16} />
                      <span>Birthday: {new Date(profile.birthDate).toLocaleDateString()}</span>
                    </MetaItem>
                  )}
                </MetaInfo>

                <Stats>
                  <Stat>
                    <StatValue>{profile.followingCount || 0}</StatValue>
                    <StatLabel>{UserProfileLabels.followingLabel}</StatLabel>
                  </Stat>
                  <Stat>
                    <StatValue>{profile.followersCount || 0}</StatValue>
                    <StatLabel>{UserProfileLabels.followersLabel}</StatLabel>
                  </Stat>
                </Stats>
              </>
            )}
          </ProfileContent>
        </ProfileCard>

        {!isBlocked && (
          <PostsSection>
            <PostsTitle>{UserProfileLabels.postsTitle}</PostsTitle>

            {posts.length === 0 ? (
              <EmptyCard>
                <EmptyText>{UserProfileLabels.noPostsYet}</EmptyText>
              </EmptyCard>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  formatDate={formatDate}
                  youRepostedLabel={feedLabels.youReposted}
                  repostedLabel={feedLabels.reposted}
                  currentUserId={user?.uid}
                  isSaved={!!user && savedPostIds.has(post.id)}
                  isBlocked={!!post.authorId && blockedUserIds.has(post.authorId)}
                  onComment={setCommentModalPost}
                  onRepost={setRepostModalPost}
                  onDelete={setDeleteConfirmPost}
                  onToggleSave={handleToggleSave}
                  onBlockUser={(id, u) => setBlockConfirmUser({ id, username: u })}
                  likeMutation={likeMutation}
                  repostMutation={repostMutation}
                  pollVoteMutation={pollVoteMutation}
                  deletePostMutation={deletePostMutation}
                  showSaveButton
                  showBlockButton
                />
              ))
            )}
          </PostsSection>
        )}

        {deleteConfirmPost && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
            }}
            onClick={() => setDeleteConfirmPost(null)}
          >
            <div
              style={{
                background: 'rgb(var(--background))',
                padding: '1.5rem',
                borderRadius: '1rem',
                maxWidth: '400px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ marginBottom: '1rem', fontWeight: 600 }}>Delete this post?</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPost(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: '1px solid rgb(var(--border))',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deletePostMutation.mutate({ postId: deleteConfirmPost.id })}
                  disabled={deletePostMutation.isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'rgb(239, 68, 68)',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  {deletePostMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {blockConfirmUser && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
            }}
            onClick={() => setBlockConfirmUser(null)}
          >
            <div
              style={{
                background: 'rgb(var(--background))',
                padding: '1.5rem',
                borderRadius: '1rem',
                maxWidth: '400px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
                Block @{blockConfirmUser.username}? You won&apos;t see their posts.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setBlockConfirmUser(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: '1px solid rgb(var(--border))',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    blockUserMutation.mutate({ userId: blockConfirmUser.id });
                    setBlockConfirmUser(null);
                  }}
                  disabled={blockUserMutation.isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'rgb(var(--destructive))',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Block
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </PageContainer>
  );
}
