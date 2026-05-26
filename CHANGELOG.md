# Changelog

All notable changes to this project are documented in this file.

## 2026-03-22 – Mobile app (Expo), post video fields, feed updates

### Added

- **Mobile (`mobile/`):** Expo SDK 54 app with **Expo Router** (tabs, auth screens, profile, explore, chat, notifications). Shared **Firebase** auth, **TanStack Query**, feed/explore/post UI, chat (Socket.IO + voice attachments), profile tabs, search, and push notification hooks.
- **Backend – post media:** `Post` model fields **`videoUrl`** and **`mediaAspectRatio`**; Prisma migration `20260322111513_add_post_video_and_aspect_ratio`. Post create/read paths and related services updated to support video URLs and aspect ratio where applicable.
- **Mobile – video playback:** **`expo-video`** (`VideoView` / `useVideoPlayer`) via shared **`components/media/ExpoVideoPlayer.tsx`**. The **`expo-video`** config plugin is registered in `mobile/app.json`.
- **Mobile – shared types:** Form and screen-only TypeScript types live under **`mobile/types/`** (e.g. register/login/followers) so they are not mistaken for Expo Router routes.

### Changed

- **Backend:** `PostService` / `PostController` for video-capable posts; **`notification.service`** / **`notification.controller`** adjustments; **`saved-posts.service`** and **`users.service`** aligned with new post fields; **`main.ts`** updated as needed for the app bootstrap.
- **Frontend:** **`frontend/components/FeedTab/PostCard.tsx`** and **`frontend/components/FeedTab/types/index.ts`** updated so the web feed types and card align with API posts that can include video-related data.
- **Mobile – image picker:** Replaced deprecated **`ImagePicker.MediaTypeOptions`** with **`mediaTypes`** arrays using **`'images'`** / **`'videos'`** (see Expo ImagePicker docs).
- **Mobile – Expo Router:** Removed non-route **`.types.ts`** files from **`mobile/app/`** (they were treated as routes and triggered “missing default export” warnings). Imports now use **`@/types/...`**.

### Removed

- **Mobile:** In-app route files **`app/register.types.ts`**, **`app/login.types.ts`**, **`app/followers.types.ts`** (replaced by **`mobile/types/`**).

---

## 2026-03-12 – Rate limiting for third-party APIs

### Added

- **Global API rate limiting:** Introduced `@nestjs/throttler` with a default limit of **60 requests per 60 seconds per client** across the backend to reduce abuse risk in production.
- **Gemini AI protection:** All `/geminiAi/*` endpoints are now capped at **20 requests per 60 seconds per client**, helping prevent runaway Google Generative AI usage and unexpected billing spikes.
- **Stocks API protection:** Stock quote and history endpoints (`GET /stocks/:symbol`, `GET /stocks/:symbol/history`) are limited to **5 requests per 60 seconds per client** to stay within typical Alpha Vantage free‑tier constraints.
- **Football fixtures protection:** Live match and fixture detail endpoints (`GET /matches`, `GET /matches/:id`) are limited to **10 requests per 60 seconds per client** to guard against accidental or malicious overuse of the API‑Sports integration.

## 2026-03-08 – Backend overhaul, Chat, Firebase auth

### Added

- **Prisma:** Database layer migrated from TypeORM to Prisma. New schema includes `User`, `Post`, `Comment`, `Like`, `Follow`, `Conversation`, `ConversationParticipant`, and `Message`. Migrations added under `backend/prisma/migrations/`.
- **Firebase Authentication:** Backend now validates Firebase ID tokens via `FirebaseModule` and `FirebaseAuthGuard`. User passwords are no longer stored; auth is token-based.
- **Real-time Chat:**
  - WebSocket chat using Socket.IO in `ChatGateway` (`backend/src/chat/`). Events: `conversation:join`, `conversation:leave`, `message:send`; server emits `message:new`.
  - REST APIs for conversations and messages: `ConversationModule`, `MessageModule` (list conversations, create/get conversation, get messages).
- **AI module:** Optional Google Gemini integration in `AiModule` / `AiService` for post suggestions. Endpoint: `POST /ai/suggest` (requires `GEMINI_API_KEY`).
- **Docker:** `backend/Dockerfile` and `backend/docker-compose.yml` for running the backend in containers.
- **Frontend – Chat:** New Chat UI: `ChatLayout`, `ChatSidebar`, `ChatContainer`, `ChatHeader`, `MessageList`, `MessageBubble`, `ChatInput`; `ChatSocketContext` for Socket.IO; `chatServices` and storage helpers.
- **Frontend – Auth:** `LoginDialogCard` and `RegisterDialogCard` components; Firebase client setup in `lib/firebase.ts`; `AuthContext` updated for Firebase.
- **Frontend – UI:** New shared components: `Avatar`, `Button`, `Card`, `Dialog`, `Field`, `Input`, `Label`, `ScrollArea`, `Separator`.

### Changed

- **Backend:** All entity-based modules (comment, follow, like, post, users) now use Prisma instead of TypeORM; entity files removed.
- **Auth:** JWT/Passport guards removed; replaced by Firebase token verification. Environment variables now include `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` and `DATABASE_URL` for Prisma.
- **Frontend:** Login/register can be used from entry page via dialogs; Firebase env vars (`NEXT_PUBLIC_FIREBASE_*`) required for auth.

### Removed

- **Backend:** TypeORM entities (`user.entity.ts`, `post.entity.ts`, `comment.entity.ts`, `like.entity.ts`, `follow.entity.ts`), JWT strategy and guard (`jwt.strategy.ts`, `jwt-auth.guard.ts`). `package-lock.json` replaced by `yarn.lock` in backend/frontend.

---

## 2026-03-05 – Frontend UI updates

### Changed

- **Landing page:** Redesigned to match X-style entry. Main entry page (`frontend/app/page.tsx`) shows a large `X` logo on the left and “Happening now / Join X today” hero copy with primary actions on the right.
- **Login and register:** From the entry page, “Create account” and “Sign in” open register and login flows inside modal dialogs (using `frontend/components/ui/dialog.tsx`). Dedicated `/login` and `/register` routes still available.
- **Card styling:** Shared card UI (`frontend/components/ui/card.tsx`) no longer shows outer borders; uses a softer, lighter background and rounder radius.
- **Input styling:** Form inputs (`frontend/components/ui/input.tsx`) are pill-shaped with a lighter gray border and subtle background.
- **Register layout:** On the register page, the “Join X today” heading and description are above the card on the right; circular `X` symbol remains on the left.
