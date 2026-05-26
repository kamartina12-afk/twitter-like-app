import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

import { auth, db } from '@/lib/firebase';

export type ChatThemeKey = 'default' | 'sunset' | 'forest';

export type ChatThemeDocument = {
  userId: string;
  conversationId: string;
  themeKey: ChatThemeKey;
};

const COLLECTION = 'chatThemes';

const getKey = (userId: string, conversationId: string) => `${userId}_${conversationId}`;

export async function getConversationTheme(
  conversationId: string | null,
): Promise<ChatThemeKey> {
  const user = auth.currentUser;
  if (!user || !conversationId) return 'default';

  const ref = doc(db, COLLECTION, getKey(user.uid, conversationId));
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'unavailable') {
      return 'default';
    }
    throw error;
  }
  if (!snap.exists()) return 'default';

  const data = snap.data() as ChatThemeDocument;
  return data.themeKey ?? 'default';
}

export async function setConversationTheme(
  conversationId: string,
  themeKey: ChatThemeKey,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, COLLECTION, getKey(user.uid, conversationId));
  const payload: ChatThemeDocument = {
    userId: user.uid,
    conversationId,
    themeKey,
  };
  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'unavailable') {
      return;
    }
    throw error;
  }
}

