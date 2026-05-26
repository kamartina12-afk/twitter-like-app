'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  FeedSection,
  EmptyCard,
  EmptyText,
  EmptySubtext,
  PostButton,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseButton,
} from '@/components/FeedTab/FeedTab.styles';
import {
  SavedTabContainer,
  SavedTabLayout,
  Sidebar,
  SidebarToggleButton,
  CollectionsLabel,
  CollectionsList,
  CollectionFilterButton,
  CollectionItemButton,
  CollectionCover,
  CollectionCoverImage,
  CollectionCoverLetter,
  CollectionItemContent,
  CollectionItemName,
  ManageCollectionTrigger,
  SavedTabFeedWrapper,
  SavedPostsGrid,
  SavedPostCard,
  SavedPostMediaWrapper,
  SavedPostMedia,
  SavedPostCardFooter,
  SavedPostAvatar,
  SavedPostAvatarImage,
  SavedPostAvatarLetter,
  SavedPostCardText,
  SavedPostAuthorName,
  SavedPostContentPreview,
  ModalFormSection,
  ModalFieldGroup,
  ModalLabel,
  ModalInput,
  DeleteCollectionButton,
  ModalActionsRow,
  ModalCancelButton,
} from './SavedTab.styles';
import type { Post } from '@/components/FeedTab/types';
import type { SavedCollection, SavedTabProps } from './types';
import { formatDate } from '@/components/FeedTab/utils/utils';
import { feedServices } from '@/components/FeedTab/services/feedServices';
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SavedTab({ searchQuery = '' }: SavedTabProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [activeCollectionFilter, setActiveCollectionFilter] = useState<'all' | 'none' | string>(
    'all',
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isManagingCollection, setIsManagingCollection] = useState(false);
  const [collectionToManage, setCollectionToManage] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const loadSaved = async () => {
      if (!user) {
        setSavedPosts([]);
        setCollections([]);
        return;
      }
      try {
        const token = await user.getIdToken();
        const posts = await feedServices.fetchSavedPosts(token);
        setSavedPosts(posts);
        const cols = await feedServices.fetchSavedCollections(token);
        setCollections(cols || []);
      } catch (error) {
        console.error('Failed to load saved posts', error);
        setSavedPosts([]);
        setCollections([]);
      }
    };
    void loadSaved();
  }, [user]);

  const handleToggleSave = async (post: Post) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const result = await feedServices.toggleSavedPost(token, post.id);
      if (!result.saved) {
        setSavedPosts((prev) => prev.filter((p) => p.id !== post.id));
      }
    } catch (error) {
      console.error('Failed to remove saved post', error);
    }
  };

  const handleOpenManageCollection = (collection: { id: string; name: string }) => {
    setCollectionToManage(collection);
    setRenameValue(collection.name);
    setIsManagingCollection(true);
  };

  const handleRenameCollection = async () => {
    if (!user || !collectionToManage) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === collectionToManage.name) {
      setIsManagingCollection(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const updated = await feedServices.renameSavedCollection(
        token,
        collectionToManage.id,
        trimmed,
      );

      setCollections((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, name: updated.name } : c)),
      );

      setSavedPosts((prev) =>
        prev.map((p) => {
          const names = p.collectionNames ?? [];
          if (!names.includes(collectionToManage.name)) return p;
          const next = names.map((n) => (n === collectionToManage.name ? updated.name : n));
          return {
            ...p,
            collectionName:
              p.collectionName === collectionToManage.name ? updated.name : p.collectionName,
            collectionNames: next,
          };
        }),
      );
    } catch (error) {
      console.error('Failed to rename collection', error);
    } finally {
      setIsManagingCollection(false);
      setCollectionToManage(null);
    }
  };

  const handleDeleteCollection = async () => {
    if (!user || !collectionToManage) return;

    const confirmed = window.confirm(
      'Delete this collection? Saved posts will remain but without a collection.',
    );
    if (!confirmed) return;

    try {
      const token = await user.getIdToken();
      await feedServices.deleteSavedCollection(token, collectionToManage.id);

      setCollections((prev) => prev.filter((c) => c.id !== collectionToManage.id));

      setSavedPosts((prev) =>
        prev.map((p) => {
          const names = p.collectionNames ?? [];
          if (!names.includes(collectionToManage.name)) return p;
          const next = names.filter((n) => n !== collectionToManage.name);
          return {
            ...p,
            collectionName: next[0] ?? null,
            collectionNames: next,
            inUnsorted: next.length === 0 ? true : p.inUnsorted,
          };
        }),
      );

      if (activeCollectionFilter === collectionToManage.name) {
        setActiveCollectionFilter('all');
      }
    } catch (error) {
      console.error('Failed to delete collection', error);
    } finally {
      setIsManagingCollection(false);
      setCollectionToManage(null);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPosts =
    activeCollectionFilter === 'all'
      ? savedPosts
      : activeCollectionFilter === 'none'
        ? savedPosts.filter((p) => p.inUnsorted && (p.collectionNames?.length ?? 0) === 0)
        : savedPosts.filter((p) => p.collectionNames?.includes(activeCollectionFilter));

  const searchFilteredPosts = !normalizedQuery.length
    ? filteredPosts
    : filteredPosts.filter((p) => {
        const content = (p.isRepost ? p.originalPostContent : p.content) || '';
        const author = (p.authorDisplayName || p.authorUsername || '').toString().toLowerCase();
        const collectionNamesStr = (p.collectionNames ?? []).join(' ').toLowerCase();
        const haystack = `${content} ${author} ${collectionNamesStr}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });

  const hasPosts = searchFilteredPosts.length > 0;

  return (
    <SavedTabContainer>
      <SavedTabLayout>
        <Sidebar $isOpen={isSidebarOpen}>
          <SidebarToggleButton
            type="button"
            $isOpen={isSidebarOpen}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title={isSidebarOpen ? 'Collapse collections' : 'Expand collections'}
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </SidebarToggleButton>

          {isSidebarOpen && (
            <>
              <CollectionsLabel>Collections</CollectionsLabel>
              <CollectionsList>
                <CollectionFilterButton
                  type="button"
                  $active={activeCollectionFilter === 'all'}
                  onClick={() => setActiveCollectionFilter('all')}
                >
                  All saved
                </CollectionFilterButton>

                {collections.map((collection) => {
                  const cover = collection.coverPost ?? null;
                  const imageSrc =
                    (cover?.isRepost ? cover.originalPostGifUrl : cover?.gifUrl) ||
                    (cover?.isRepost ? cover.originalPostImageUrl : cover?.imageUrl) ||
                    cover?.avatarUrl;
                  const isActive = activeCollectionFilter === collection.name;

                  return (
                    <CollectionItemButton
                      key={collection.id}
                      type="button"
                      $active={isActive}
                      onClick={() => setActiveCollectionFilter(collection.name)}
                    >
                      <CollectionCover>
                        {imageSrc ? (
                          <CollectionCoverImage src={imageSrc} alt={collection.name} />
                        ) : (
                          <CollectionCoverLetter>
                            {collection.name[0]?.toUpperCase() ?? '#'}
                          </CollectionCoverLetter>
                        )}
                      </CollectionCover>
                      <CollectionItemContent>
                        <CollectionItemName>{collection.name}</CollectionItemName>
                        <ManageCollectionTrigger
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenManageCollection(collection);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenManageCollection(collection);
                            }
                          }}
                          title="Manage collection"
                        >
                          <MoreHorizontal size={14} />
                        </ManageCollectionTrigger>
                      </CollectionItemContent>
                    </CollectionItemButton>
                  );
                })}
              </CollectionsList>
            </>
          )}
        </Sidebar>

        <SavedTabFeedWrapper>
          <FeedSection>
            {!hasPosts ? (
              <EmptyCard>
                <EmptyText>No saved posts yet</EmptyText>
                <EmptySubtext>
                  Tap the bookmark icon on any post in your feed to save it here for later.
                </EmptySubtext>
              </EmptyCard>
            ) : (
              <SavedPostsGrid>
                {searchFilteredPosts.map((post) => {
                  const imageOrGifMediaSrc =
                    (post.isRepost ? post.originalPostGifUrl : post.gifUrl) ||
                    (post.isRepost ? post.originalPostImageUrl : post.imageUrl);
                  const videoMediaSrc = post.isRepost ? post.originalPostVideoUrl : post.videoUrl;
                  const hasMedia = !!(imageOrGifMediaSrc || videoMediaSrc);

                  return (
                    <SavedPostCard
                      key={post.id}
                      $hasMedia={hasMedia}
                      title={post.isRepost ? post.originalPostContent || '' : post.content || ''}
                    >
                      {hasMedia && (
                        <SavedPostMediaWrapper>
                          {videoMediaSrc ? (
                            <video
                              src={videoMediaSrc}
                              controls
                              playsInline
                              preload="metadata"
                              style={{
                                width: '100%',
                                maxHeight: '300px',
                                objectFit: 'contain',
                                backgroundColor: 'rgb(var(--card))',
                                display: 'block',
                                borderRadius: 'inherit',
                              }}
                            />
                          ) : (
                            <SavedPostMedia src={imageOrGifMediaSrc} alt="Saved media" />
                          )}
                        </SavedPostMediaWrapper>
                      )}
                      <SavedPostCardFooter>
                        <SavedPostAvatar>
                          {post.avatarUrl ? (
                            <SavedPostAvatarImage src={post.avatarUrl} alt={post.authorUsername} />
                          ) : (
                            <SavedPostAvatarLetter>
                              {(post.authorDisplayName || post.authorUsername)[0]?.toUpperCase()}
                            </SavedPostAvatarLetter>
                          )}
                        </SavedPostAvatar>
                        <SavedPostCardText>
                          <SavedPostAuthorName>
                            {post.authorDisplayName || post.authorUsername}
                          </SavedPostAuthorName>
                          <SavedPostContentPreview $clampLines={hasMedia ? 2 : 3}>
                            {post.isRepost ? post.originalPostContent : post.content}
                          </SavedPostContentPreview>
                        </SavedPostCardText>
                      </SavedPostCardFooter>
                    </SavedPostCard>
                  );
                })}
              </SavedPostsGrid>
            )}
          </FeedSection>
        </SavedTabFeedWrapper>
      </SavedTabLayout>

      {isManagingCollection && collectionToManage && (
        <ModalOverlay
          onClick={() => {
            setIsManagingCollection(false);
            setCollectionToManage(null);
          }}
        >
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Manage collection</ModalTitle>
              <ModalCloseButton
                onClick={() => {
                  setIsManagingCollection(false);
                  setCollectionToManage(null);
                }}
              >
                <MoreHorizontal size={20} />
              </ModalCloseButton>
            </ModalHeader>

            <ModalFormSection>
              <ModalFieldGroup>
                <ModalLabel htmlFor="collection-name">Collection name</ModalLabel>
                <ModalInput
                  id="collection-name"
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                />
              </ModalFieldGroup>

              <DeleteCollectionButton type="button" onClick={handleDeleteCollection}>
                Delete collection
              </DeleteCollectionButton>
            </ModalFormSection>

            <ModalActionsRow>
              <ModalCancelButton
                type="button"
                onClick={() => {
                  setIsManagingCollection(false);
                  setCollectionToManage(null);
                }}
              >
                Cancel
              </ModalCancelButton>
              <PostButton
                type="button"
                onClick={handleRenameCollection}
                disabled={!renameValue.trim()}
              >
                Save changes
              </PostButton>
            </ModalActionsRow>
          </ModalContent>
        </ModalOverlay>
      )}
    </SavedTabContainer>
  );
}
