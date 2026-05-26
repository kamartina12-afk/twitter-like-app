import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

/** Parses Firebase Storage download URLs (`firebasestorage.googleapis.com/v0/b/.../o/...`). */
export function parseFirebaseStorageDownloadUrl(
  url: string,
): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'firebasestorage.googleapis.com') {
      return null;
    }
    const match = u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!match) {
      return null;
    }
    return {
      bucket: match[1],
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

@Injectable()
export class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && rawPrivateKey) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: rawPrivateKey.replace(/\\n/g, '\n'),
            }),
          });
        } catch (error) {
          console.error('Failed to initialize Firebase Admin SDK', error);
        }
      } else {
        console.warn(
          'Firebase Admin SDK not initialized: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY environment variables.',
        );
      }
    }
  }

  async verifyToken(token: string) {
    return admin.auth().verifyIdToken(token);
  }

  /**
   * Deletes an object in Firebase Storage from a client download URL.
   * No-ops when Admin is not initialized, URL is not a Firebase Storage URL, or the file is already gone.
   */
  async deleteStorageObjectByDownloadUrl(url: string): Promise<void> {
    if (!admin.apps.length) {
      return;
    }
    const parsed = parseFirebaseStorageDownloadUrl(url);
    if (!parsed) {
      return;
    }
    try {
      await admin.storage().bucket(parsed.bucket).file(parsed.path).delete();
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 404) {
        return;
      }
      console.error('Failed to delete Firebase Storage object', {
        path: parsed.path,
        bucket: parsed.bucket,
        err,
      });
    }
  }
}
