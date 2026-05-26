import styled from 'styled-components';

/** Full-width container so the saved tab stretches to the far right */
export const SavedTabContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;

export const SavedTabLayout = styled.div`
  display: flex;
  height: 100%;
  flex: 1;
  min-width: 0;
`;

export const Sidebar = styled.div<{ $isOpen: boolean }>`
  width: ${({ $isOpen }) => ($isOpen ? '28%' : '40px')};
  max-width: ${({ $isOpen }) => ($isOpen ? 260 : 40)}px;
  min-width: ${({ $isOpen }) => ($isOpen ? 120 : 40)}px;
  border-right: 1px solid rgb(var(--border));
  padding: 8px 4px 8px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: width 0.2s ease;
  overflow: hidden;
`;

export const SidebarToggleButton = styled.button<{ $isOpen: boolean }>`
  align-self: ${({ $isOpen }) => ($isOpen ? 'flex-end' : 'center')};
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgb(var(--border));
  background: rgb(var(--background));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

export const CollectionsLabel = styled.span`
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0 2px;
`;

export const CollectionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding-right: 4px;
  max-height: 100%;
`;

export const CollectionFilterButton = styled.button<{ $active?: boolean }>`
  padding: 4px 8px;
  border-radius: 999px;
  border: ${({ $active }) =>
    $active ? '2px solid var(--primary-color, #1d9bf0)' : '1px solid rgb(var(--border))'};
  background: ${({ $active }) => ($active ? 'rgba(29, 155, 240, 0.08)' : 'rgb(var(--background))')};
  cursor: pointer;
  font-size: 0.75rem;
  text-align: left;
`;

export const CollectionItemButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 12px;
  border: ${({ $active }) =>
    $active ? '2px solid var(--primary-color, #1d9bf0)' : '1px solid rgb(var(--border))'};
  background: ${({ $active }) => ($active ? 'rgba(29, 155, 240, 0.08)' : 'rgb(var(--background))')};
  cursor: pointer;
`;

export const CollectionCover = styled.div`
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(135deg, #1d9bf0, #794bc4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const CollectionCoverImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const CollectionCoverLetter = styled.span`
  font-size: 1rem;
  color: white;
  font-weight: 700;
`;

export const CollectionItemContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  flex: 1;
`;

export const CollectionItemName = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

export const ManageCollectionTrigger = styled.div`
  margin-top: 2px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: rgb(var(--muted-foreground));
  display: flex;
  align-items: center;
`;

/** Feed area that stretches to fill remaining space (no max-width) */
export const SavedTabFeedWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: auto;
  padding: 1rem 1rem 1.5rem;
  box-sizing: border-box;
`;

export const SavedPostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  padding: 8px 4px;
  align-items: start;
`;

export const SavedPostCard = styled.div<{ $hasMedia?: boolean }>`
  border-radius: 16px;
  overflow: hidden;
  background: rgb(var(--card));
  border: 1px solid rgb(var(--border));
  cursor: pointer;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
  ${({ $hasMedia }) => (!$hasMedia ? 'min-height: 120px;' : '')}
`;

export const SavedPostMediaWrapper = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.8);
  padding-bottom: 100%;
`;

export const SavedPostMedia = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const SavedPostCardFooter = styled.div`
  padding: 6px 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  background: rgb(var(--card));
  color: rgb(var(--foreground));
`;

export const SavedPostAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const SavedPostAvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const SavedPostAvatarLetter = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
`;

export const SavedPostCardText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
`;

export const SavedPostAuthorName = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SavedPostContentPreview = styled.span<{ $clampLines?: number }>`
  font-size: 0.7rem;
  opacity: 0.9;
  display: -webkit-box;
  -webkit-line-clamp: ${({ $clampLines = 2 }) => $clampLines};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/** Modal form styles (reuse from FeedTab where possible, add SavedTab-specific) */
export const ModalFormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  margin-bottom: 1.25rem;
`;

export const ModalFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

export const ModalLabel = styled.label`
  font-size: 0.8rem;
  color: rgb(var(--muted-foreground));
`;

export const ModalInput = styled.input`
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgb(var(--input));
  background: rgb(var(--background));
  color: rgb(var(--foreground));
  font-size: 0.9rem;
`;

export const DeleteCollectionButton = styled.button`
  align-self: flex-start;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.06);
  color: rgb(239, 68, 68);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
`;

export const ModalActionsRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

export const ModalCancelButton = styled.button`
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  border: 1px solid rgb(var(--border));
  background: rgb(var(--background));
  color: rgb(var(--foreground));
  font-weight: 500;
  cursor: pointer;
`;
