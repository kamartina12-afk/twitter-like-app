import React, { createContext, useContext, useEffect, useState } from 'react';
import { FirebaseError } from '@firebase/util';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import { API_URL } from '@/constants/api';
import { auth } from '@/lib/firebase';
import { clearDevicePushToken } from '@/services/pushNotifications.service';

type UserProfile = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  birthDate?: string | null;
  country?: string | null;
  createdAt?: string | null;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  totalLikesReceived?: number;
  totalVideoViewsReceived?: number;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string, birthDate: string) => Promise<void>;
  resendVerificationEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function getVerificationEmailErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait a bit and try again.';
    }
    if (error.code === 'auth/network-request-failed') {
      return 'Network error while sending verification email. Check your connection and try again.';
    }
    if (error.code === 'auth/invalid-email') {
      return 'Email address is invalid.';
    }
  }
  return 'Failed to send verification email. Please try again.';
}

async function fetchProfile(firebaseUser: User | null): Promise<UserProfile | null> {
  if (!firebaseUser || !API_URL) {
    return null;
  }

  try {
    const token = await firebaseUser.getIdToken();
    const response = await fetch(`${API_URL}/users/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as UserProfile;
    return data;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const syncCurrentUser = async (
    firebaseUser: User,
    birthDate?: string,
    username?: string,
  ) => {
    if (!API_URL) return;
    const token = await firebaseUser.getIdToken();
    await fetch(`${API_URL}/users/me`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ birthDate, username }),
    });
  };

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      const loadedProfile = await fetchProfile(firebaseUser);
      setProfile(loadedProfile);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await syncCurrentUser(credential.user);
    const loadedProfile = await fetchProfile(credential.user);
    setUser(credential.user);
    setProfile(loadedProfile);
  };

  const register = async (email: string, password: string, username: string, birthDate: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await sendEmailVerification(credential.user);
    } catch (error) {
      await signOut(auth);
      throw new Error(getVerificationEmailErrorMessage(error));
    }
    await syncCurrentUser(credential.user, birthDate.trim(), username.trim());
    const loadedProfile = await fetchProfile(credential.user);
    setUser(credential.user);
    setProfile(loadedProfile);
  };

  const resendVerificationEmail = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    let firebaseUser = auth.currentUser;
    if (!firebaseUser || firebaseUser.email?.toLowerCase() !== normalized) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      firebaseUser = credential.user;
    }
    if (firebaseUser.emailVerified) {
      throw new Error('Your email is already verified.');
    }
    try {
      await sendEmailVerification(firebaseUser);
    } catch (error) {
      throw new Error(getVerificationEmailErrorMessage(error));
    }
    await syncCurrentUser(firebaseUser);
    const loadedProfile = await fetchProfile(firebaseUser);
    setUser(firebaseUser);
    setProfile(loadedProfile);
  };

  const signInWithGoogle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Google sign-in failed. Please try again.');
    }

    await syncCurrentUser(currentUser);
    const loadedProfile = await fetchProfile(currentUser);
    setUser(currentUser);
    setProfile(loadedProfile);
  };

  const logout = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const authToken = await currentUser.getIdToken();
        await clearDevicePushToken({ authToken });
      } catch {
        // Best-effort; proceed with logout even if cleanup fails.
      }
    }
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const currentUser = auth.currentUser;
    const loadedProfile = await fetchProfile(currentUser);
    setProfile(loadedProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        resendVerificationEmail,
        signInWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

