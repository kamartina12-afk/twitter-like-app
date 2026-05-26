import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { storage } from '@/lib/firebase';

/**
 * React Native's `fetch(uri).blob()` is unreliable for gallery `file://` / `content://` / `ph://`
 * URIs (especially for video). XHR + blob matches the common RN + Firebase pattern.
 */
export const readLocalUriAsBlob = (uri: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      resolve(xhr.response as Blob);
    };
    xhr.onerror = () => {
      reject(new Error('Failed to read local media file'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send();
  });

const AVATAR_MAX_SIZE = 2 * 1024 * 1024;

const validateImage = (file: Blob, maxSize: number) => {
  if ('type' in file && !file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (file.size > maxSize) {
    throw new Error('Image is too large');
  }
};

export const uploadAvatar = async (file: Blob, userId: string): Promise<string> => {
  validateImage(file, AVATAR_MAX_SIZE);

  const storageRef = ref(storage, `avatars/${userId}/${Date.now()}`);

  const snapshot = await uploadBytes(storageRef, file);

  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
};

export const uploadCover = async (file: Blob, userId: string): Promise<string> => {
  validateImage(file, AVATAR_MAX_SIZE);

  const storageRef = ref(storage, `covers/${userId}/${Date.now()}`);

  const snapshot = await uploadBytes(storageRef, file);

  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
};

export const uploadPostMedia = async (
  file: Blob,
  userId: string,
  options?: { contentType?: string },
): Promise<string> => {
  const extension = options?.contentType?.split('/')?.[1]?.split(';')?.[0] ?? 'bin';
  const path = `posts/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const storageRef = ref(storage, path);

  const snapshot = await uploadBytes(
    storageRef,
    file,
    options?.contentType ? { contentType: options.contentType } : undefined,
  );

  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
};

export type ChatAttachment = {
  url: string;
  type: string;
  name: string;
  size: number;
};

export const uploadChatFile = async (
  file: Blob,
  options: { userId: string; name: string; type: string; size: number },
): Promise<ChatAttachment> => {
  const safeName = options.name.replace(/[^\w.\-]/g, '_');
  const ext = safeName.includes('.') ? safeName.split('.').pop() : undefined;
  const path = `chat/${options.userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}${ext ? `.${ext}` : ''}`;

  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: options.type,
  });
  const url = await getDownloadURL(snapshot.ref);

  return {
    url,
    type: options.type,
    name: options.name,
    size: options.size,
  };
};

