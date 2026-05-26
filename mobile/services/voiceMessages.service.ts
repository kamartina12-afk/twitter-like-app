import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { ChatAttachment } from '@/services/storage.service';

type SaveVoiceMessagesOptions = {
  conversationId: string;
  senderId: string;
  attachments?: ChatAttachment[];
};

export const saveVoiceMessagesToFirestore = async ({
  conversationId,
  senderId,
  attachments,
}: SaveVoiceMessagesOptions): Promise<void> => {
  if (!attachments || !attachments.length) return;

  const audioAttachments = attachments.filter((att) => att.type.startsWith('audio/'));
  if (!audioAttachments.length) return;

  const colRef = collection(db, 'voiceMessages');

  await Promise.all(
    audioAttachments.map((att) =>
      addDoc(colRef, {
        conversationId,
        senderId,
        url: att.url,
        type: att.type,
        name: att.name,
        size: att.size,
        createdAt: serverTimestamp(),
      }),
    ),
  );
};

