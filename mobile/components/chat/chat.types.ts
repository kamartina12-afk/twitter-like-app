import type { ChatAttachment } from '@/services/storage.service';
import type { ConversationListItem } from '@/services/chat.service';

export type ParsedLastMessage = {
  text: string;
  hasAttachments: boolean;
};

export type MessageContentPayload = {
  text?: string;
  attachments?: ChatAttachment[];
};

export type ChatListItemProps = {
  item: ConversationListItem;
  selected: boolean;
  currentUserId?: string;
  onPress: () => void;
  /** When set, the avatar opens this (e.g. profile) instead of the conversation. */
  onPressAvatar?: () => void;
};

export type MessageInputProps = {
  onSend: (text: string, attachments?: ChatAttachment[]) => Promise<void> | void;
  disabled?: boolean;
  currentUserId?: string;
  /** Pre-fills the message input (used e.g. from notifications). */
  initialText?: string;
  mentionCandidates?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }[];
};

