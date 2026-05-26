import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Platform } from 'react-native';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';

WebBrowser.maybeCompleteAuthSession();

type UseGoogleSignInResult = {
  promptGoogleSignIn: () => Promise<boolean>;
  isGoogleReady: boolean;
  missingGoogleConfig: boolean;
};

export function useGoogleSignIn(): UseGoogleSignInResult {
  const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const missingGoogleConfig =
    !expoClientId ||
    !webClientId ||
    (Platform.OS === 'ios' && !iosClientId) ||
    (Platform.OS === 'android' && !androidClientId);

  // useAuthRequest validates platform IDs immediately; provide placeholders to prevent crashes
  // when env vars are missing and keep Google login safely disabled instead.
  const [request, , promptAsync] = Google.useAuthRequest({
    clientId: expoClientId ?? 'missing-expo-client-id',
    iosClientId: iosClientId ?? 'missing-ios-client-id',
    androidClientId: androidClientId ?? 'missing-android-client-id',
    webClientId: webClientId ?? 'missing-web-client-id',
  });

  const promptGoogleSignIn = async (): Promise<boolean> => {
    if (missingGoogleConfig) {
      throw new Error('Google Sign-In is not configured. Add Google client IDs to mobile/.env.');
    }

    const result = await promptAsync();
    if (result.type !== 'success') {
      return false;
    }

    const idToken = result.authentication?.idToken;
    if (!idToken) {
      throw new Error('Google sign-in failed. Please try again.');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    return true;
  };

  return {
    promptGoogleSignIn,
    isGoogleReady: Boolean(request) && !missingGoogleConfig,
    missingGoogleConfig,
  };
}
