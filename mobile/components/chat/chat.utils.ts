import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ConversationListItem } from '@/services/chat.service';
import type { MessageContentPayload, ParsedLastMessage } from './chat.types';

export function parseLastMessageContent(
  content: string | undefined | null,
): ParsedLastMessage {
  if (!content) return { text: 'No messages yet', hasAttachments: false };
  try {
    const parsed = JSON.parse(content) as MessageContentPayload;
    if (parsed && typeof parsed === 'object') {
      const text = typeof parsed.text === 'string' ? parsed.text : '';
      const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : undefined;
      if (text) {
        return { text, hasAttachments: !!attachments?.length };
      }
      if (attachments?.length) {
        const first = attachments[0];
        if (first.type.startsWith('image/')) {
          return {
            text: attachments.length > 1 ? `${attachments.length} photos` : 'Photo',
            hasAttachments: true,
          };
        }
        if (first.type.startsWith('video/')) {
          return {
            text: attachments.length > 1 ? `${attachments.length} videos` : 'Video',
            hasAttachments: true,
          };
        }
        if (first.type.startsWith('audio/')) {
          return {
            text: attachments.length > 1 ? `${attachments.length} voice messages` : 'Voice message',
            hasAttachments: true,
          };
        }
        return {
          text: attachments.length > 1 ? `${attachments.length} files` : 'File',
          hasAttachments: true,
        };
      }
    }
  } catch {
    // fall back to raw content
  }
  return { text: content ?? '', hasAttachments: false };
}

export function getConversationDisplayName(
  conv: ConversationListItem,
  currentUserId: string | undefined,
): string {
  const otherParticipants = conv.participants.filter((p) => p.userId !== currentUserId);

  if (conv.type === 'group') {
    if (otherParticipants.length === 0) return 'Group';
    if (otherParticipants.length === 1) {
      return otherParticipants[0].displayName || otherParticipants[0].username;
    }
    return otherParticipants
      .slice(0, 3)
      .map((p) => p.displayName || p.username)
      .join(', ');
  }

  const other = otherParticipants[0];
  return other?.displayName || other?.username || 'Unknown';
}

export function useChatColors() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return colors;
}

