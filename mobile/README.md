# Mobile app (Expo)

Native client for the Twitter-like app: **Expo SDK 54**, **Expo Router**, **Firebase Authentication**, and the same **NestJS** backend as the web frontend.

## Features

- **Auth:** Login and register (Firebase), protected routes.
- **Home:** Following / For You feeds, post composer (text, images, video, GIF, polls).
- **Explore:** Masonry media grid and full-screen media reel feed.
- **Profile:** Posts, mentions, saved posts; edit profile; other users’ profiles.
- **Chat:** Conversations list, room view, attachments, voice messages (see chat components).
- **Notifications:** In-app notifications screen; push registration hook (Firebase).
- **Search:** User search.

## Tech stack

| Area | Packages |
|------|----------|
| Routing | `expo-router` |
| Data | `@tanstack/react-query`, `axios` |
| Auth | `firebase` |
| Realtime | `socket.io-client` |
| Video UI | `expo-video` (`VideoView`, `useVideoPlayer`) — shared wrapper in `components/media/ExpoVideoPlayer.tsx` |
| Legacy audio | `expo-av` (`Audio` only — voice messages / recording) |
| Media picking | `expo-image-picker` (`mediaTypes`: `'images'` / `'videos'`) |

## Prerequisites

- Node.js 18+
- **Yarn** (lockfile: `yarn.lock`)
- For iOS: Xcode; for Android: Android Studio / emulator

## Setup

```bash
cd mobile
yarn install
```

Copy env vars from the web app’s Firebase keys. Create **`mobile/.env`**:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
# Optional: EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

Point **`EXPO_PUBLIC_API_URL`** at your running backend (device/emulator may need your machine’s LAN IP instead of `localhost`).

## Scripts

| Command | Description |
|--------|-------------|
| `yarn start` / `npx expo start` | Start Metro and Expo dev tools |
| `yarn android` | Open on Android |
| `yarn ios` | Open on iOS |
| `yarn lint` | ESLint (`expo lint`) |

## Project layout

- **`app/`** — Expo Router routes only (screens and `_layout.tsx`). Do not add non-route modules here (e.g. `*.types.ts`) or Router will treat them as missing screens.
- **`types/`** — Shared TypeScript types for forms and screens (import as `@/types/...`).
- **`components/`** — UI (feed, post, explore, chat, profile, auth, etc.).
- **`contexts/`** — `AuthContext`, `ChatSocketContext`, etc.
- **`hooks/`**, **`services/`**, **`constants/`** — API hooks, REST/chat helpers, keys.

## Changelog (mobile-relevant)

See the repo root **[CHANGELOG.md](../CHANGELOG.md)**. Recent highlights:

- **2026-03-22:** **`expo-video`** added for in-app video (replacing `Video` from `expo-av` for UI playback). **`expo-image-picker`** updated to the `mediaTypes` array API. Screen-only types moved from **`app/*.types.ts`** to **`types/`** to fix Expo Router warnings. **`expo-video`** is listed in **`app.json`** plugins.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [expo-video](https://docs.expo.dev/versions/latest/sdk/video/)
