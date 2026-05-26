'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Smile } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import EmojiPicker from 'emoji-picker-react';
import {
  Container,
  ProfileCard,
  CoverImage,
  ProfileContent,
  ProfileHeader,
  ProfileHeaderLeft,
  Avatar,
  AvatarText,
  DisplayName,
  Username,
  EditButton,
  EditForm,
  InputGroup,
  Label,
  Input,
  Textarea,
  SaveButton,
  Bio,
  MetaInfo,
  MetaItem,
  Stats,
  Stat,
  StatValue,
  StatLabel,
  PostsSection,
  PostsTitle,
  LoadingCard,
  LoadingText,
  EmptyCard,
  EmptyText,
  SuggestionsList,
  SuggestionItem,
} from './ProfileTab.styles';
import { PostCard } from '@/components/FeedTab/PostCard';
import type { Post } from '@/components/FeedTab/types';
import { UserProfile, UpdateProfileForm, UpdateProfilePayload } from './types';
import { profileLabels } from './utils/labels';
import { formatDate } from './utils/utils';
import { profileServices } from './services/profileServices';
import { uploadAvatar, uploadCover } from '@/services/storage.service';
import { useEffect } from 'react';
import { feedLabels } from '@/components/FeedTab/utils/labels';
import { feedServices } from '@/components/FeedTab/services/feedServices';
import { blockServices } from '@/services/blockServices';

export default function ProfileTab() {
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [commentModalPost, setCommentModalPost] = useState<Post | null>(null);
  const [repostModalPost, setRepostModalPost] = useState<Post | null>(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<Post | null>(null);
  const [blockConfirmUser, setBlockConfirmUser] = useState<{ id: string; username: string } | null>(
    null,
  );
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      return profileServices.fetchProfile(token);
    },
    enabled: !!user,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['userPosts', profile?.username],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token || !profile?.username) throw new Error('Not authenticated');
      return profileServices.fetchUserPosts(token, profile.username);
    },
    enabled: !!profile?.username && !!user,
  });

  const invalidateUserPosts = () => {
    queryClient.invalidateQueries({ queryKey: ['userPosts', profile?.username] });
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
      setBlockedUserIds((prev) => new Set(prev).add(variables.userId));
      invalidateUserPosts();
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

  useEffect(() => {
    const loadSavedAndBlocked = async () => {
      if (!user) {
        setSavedPostIds(new Set());
        setBlockedUserIds(new Set());
        return;
      }
      try {
        const token = await user.getIdToken();
        const saved = await feedServices.fetchSavedPosts(token);
        setSavedPostIds(new Set((saved as { id: string }[]).map((p) => p.id)));
        const blocked = await blockServices.fetchBlockedUsers(token);
        setBlockedUserIds(new Set(blocked.map((b) => b.id)));
      } catch (e) {
        console.error('Failed to load saved/blocked', e);
      }
    };
    void loadSavedAndBlocked();
  }, [user]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting },
  } = useForm<UpdateProfileForm>({
    defaultValues: {
      displayName: profile?.displayName || '',
      bio: profile?.bio || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfilePayload) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      console.log('mutation', data);
      return profileServices.updateProfile(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
    },
  });

  const onSubmit = async (data: UpdateProfileForm) => {
    let avatarUrl = profile?.avatarUrl;
    let coverUrl = profile?.coverUrl;

    if (data.avatar && data.avatar.length > 0) {
      const file = data.avatar[0];
      avatarUrl = await uploadAvatar(file, user?.uid || '');
    }

    if (data.cover && data.cover.length > 0) {
      const file = data.cover[0];
      coverUrl = await uploadCover(file, user?.uid || '');
    }

    setAvatarPreview(null);
    setCoverPreview(null);

    updateProfileMutation.mutate({
      displayName: data.displayName,
      bio: data.bio,
      avatarUrl,
      coverUrl,
    });
  };

  const handleEditClick = () => {
    if (isEditing) {
      setIsEditing(false);
      reset();
      setAvatarPreview(null);
      setCoverPreview(null);
    } else {
      setIsEditing(true);
      reset({
        displayName: profile?.displayName || '',
        bio: profile?.bio || '',
      });
    }
  };

  const avatarInitial = (
    profile?.displayName?.[0] ||
    user?.displayName?.[0] ||
    profile?.username?.[0] ||
    user?.email?.[0] ||
    '?'
  ).toUpperCase();

  if (profileLoading) {
    return (
      <LoadingCard>
        <LoadingText>{profileLabels.loadingProfile}</LoadingText>
      </LoadingCard>
    );
  }

  return (
    <Container>
      <ProfileCard>
        <CoverImage
          style={
            coverPreview || profile?.coverUrl
              ? {
                  backgroundImage: `url("${coverPreview || profile?.coverUrl || ''}")`,
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
                {avatarPreview || profile?.avatarUrl ? (
                  <img
                    src={avatarPreview || profile?.avatarUrl || ''}
                    alt="Avatar"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <AvatarText>{avatarInitial}</AvatarText>
                )}
              </Avatar>

              <DisplayName>{profile?.displayName || user?.displayName}</DisplayName>
              <Username>@{user?.displayName}</Username>
            </ProfileHeaderLeft>

            <EditButton onClick={handleEditClick}>
              {isEditing ? profileLabels.cancel : profileLabels.editProfile}
            </EditButton>
          </ProfileHeader>

          {isEditing ? (
            <EditForm onSubmit={handleSubmit(onSubmit)}>
              <InputGroup>
                <Label>{profileLabels.displayName}</Label>
                <Input type="text" {...register('displayName')} />
              </InputGroup>

              <InputGroup>
                <Label>{profileLabels.bio}</Label>
                <div style={{ position: 'relative' }}>
                  <Textarea rows={3} {...register('bio')} style={{ paddingRight: '36px' }} />
                  <div
                    style={{
                      position: 'absolute',
                      right: '6px',
                      bottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgb(var(--accent))',
                          }}
                          title="Add emoji"
                        >
                          <Smile size={18} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border border-border bg-white shadow-xl rounded-2xl">
                        <EmojiPicker
                          onEmojiClick={(emoji) => {
                            const current = getValues('bio') || '';
                            setValue('bio', `${current}${emoji.emoji}`);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </InputGroup>

              <InputGroup>
                <Label>Avatar</Label>
                <Input
                  type="file"
                  accept="image/*"
                  {...register('avatar', {
                    onChange: (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        setAvatarPreview((prev) => {
                          if (prev) {
                            URL.revokeObjectURL(prev);
                          }
                          return URL.createObjectURL(file);
                        });
                      } else {
                        setAvatarPreview((prev) => {
                          if (prev) {
                            URL.revokeObjectURL(prev);
                          }
                          return null;
                        });
                      }
                    },
                  })}
                />
              </InputGroup>

              <InputGroup>
                <Label>Cover image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  {...register('cover', {
                    onChange: (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        setCoverPreview((prev) => {
                          if (prev) {
                            URL.revokeObjectURL(prev);
                          }
                          return URL.createObjectURL(file);
                        });
                      } else {
                        setCoverPreview((prev) => {
                          if (prev) {
                            URL.revokeObjectURL(prev);
                          }
                          return null;
                        });
                      }
                    },
                  })}
                />
              </InputGroup>

              <SaveButton type="submit" disabled={isSubmitting}>
                {profileLabels.save}
              </SaveButton>
            </EditForm>
          ) : (
            <>
              {profile?.bio && <Bio>{profile.bio}</Bio>}

              <MetaInfo>
                <MetaItem>
                  <Calendar size={16} />
                  <span>
                    {profileLabels.joinedDate} {formatDate(profile?.createdAt || '')}
                  </span>
                </MetaItem>
              </MetaInfo>

              <Stats>
                <Stat>
                  <StatValue>{profile?.followingCount || 0}</StatValue>
                  <StatLabel>{profileLabels.following}</StatLabel>
                </Stat>
                <Stat>
                  <StatValue>{profile?.followersCount || 0}</StatValue>
                  <StatLabel>{profileLabels.followers}</StatLabel>
                </Stat>
                <Stat>
                  <StatValue>{profile?.postsCount || 0}</StatValue>
                  <StatLabel>{profileLabels.posts}</StatLabel>
                </Stat>
              </Stats>
            </>
          )}
        </ProfileContent>
      </ProfileCard>

      <PostsSection>
        <PostsTitle>{profileLabels.posts}</PostsTitle>

        {postsLoading ? (
          <LoadingCard>
            <LoadingText>{profileLabels.loadingPosts}</LoadingText>
          </LoadingCard>
        ) : posts.length === 0 ? (
          <EmptyCard>
            <EmptyText>{profileLabels.noPosts}</EmptyText>
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
              onRepost={(p) => setRepostModalPost(p)}
              onDelete={setDeleteConfirmPost}
              onToggleSave={handleToggleSave}
              onBlockUser={(id, username) => setBlockConfirmUser({ id, username })}
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
  );
}
