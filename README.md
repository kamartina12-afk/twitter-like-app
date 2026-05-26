# Twitter Clone Application

A modern Twitter-like social media application built with Next.js and NestJS, featuring real-time chat, user authentication with Firebase, and a responsive design with dark mode support.

## Features

- **User Authentication**: Secure registration and login with **Firebase Authentication** (token-based)
- **Post Creation**: Create posts with text and images (supports base64 image uploads)
- **Social Interactions**:
  - Like and unlike posts
  - Comment on posts
  - Repost functionality (regular repost and quote repost)
- **User Profiles**:
  - Customizable user profiles
  - View user posts and statistics
  - Follow/unfollow users
- **Feed System**:
  - Personalized feed showing posts from followed users
  - Pagination support for efficient loading
- **Real-time Chat**:
  - Direct conversations between users
  - WebSocket-based messaging (Socket.IO)
  - Conversation list and message history
- **AI Suggestions**: Optional AI-powered post suggestions (Google Gemini)
- **Search**: Search for users by username or email
- **Theme Support**: Light and dark mode toggle
- **Mobile app (Expo)**: Native client under **`mobile/`** — same backend and Firebase auth; feed, explore, chat, profiles, and more (see **`mobile/README.md`**).

## Technology Stack

### Backend

- **NestJS** - Progressive Node.js framework
- **Prisma** - ORM for database management
- **PostgreSQL** - Relational database
- **Firebase Admin** - Token verification and authentication
- **Socket.IO** - Real-time WebSocket communication for chat
- **Google Generative AI (Gemini)** - Optional AI post suggestions
- **Docker** - Containerization (Dockerfile + docker-compose)

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TanStack Query (React Query)** - Data fetching and state management
- **Styled Components** - CSS-in-JS styling
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Hook Form** - Form management
- **Firebase Client SDK** - Sign-in and token management

### Mobile (`mobile/`)

- **Expo SDK 54** - Universal app with **Expo Router**
- **expo-video** - In-feed and explore video playback (replacing deprecated `Video` from `expo-av` for UI video)
- **expo-image-picker** - Media picking with current `mediaTypes` API
- **TanStack Query**, **Firebase**, **Socket.IO client** - Aligned with backend APIs

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** (v12 or higher)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd twitter-app
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Database (Prisma)
DATABASE_URL=postgresql://user:password@localhost:5432/twitter

# JWT (optional, for legacy or internal use)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=7d

# Firebase Admin (for token verification)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional: AI post suggestions
GEMINI_API_KEY=your-gemini-api-key
```

**Important**: Use a secure `JWT_SECRET` and valid Firebase credentials in production.

### 3. Database Setup

Create a PostgreSQL database, then run Prisma migrations from the `backend` directory:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

### 5. Mobile app (optional)

```bash
cd mobile
yarn install
```

Create a **`mobile/.env`** (or use **`.env`** in `mobile/`) with at least:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
# Plus the same EXPO_PUBLIC_FIREBASE_* variables as the web app (see mobile app config).
```

Start the dev server:

```bash
cd mobile
npx expo start
```

Details: **`mobile/README.md`**.

## Rate limiting and third‑party APIs

To prevent accidental cost explosions in production, the backend now enforces rate limiting around all API traffic and, more strictly, around the routes that call paid third‑party providers:

- **Global backend limit:** `ThrottlerModule` applies a default limit of **60 requests per 60 seconds per client** across all REST controllers. Clients exceeding this will receive `429 Too Many Requests`.
- **Gemini AI (`/geminiAi/*`):** All Gemini‑backed endpoints (post suggestions, inspiration, moderation, hashtag checks, text fixes, image descriptions, Kitty Bot chat) are further capped at **20 requests per 60 seconds per client**, reducing the risk of runaway Google Generative AI usage.
- **Stocks (`/stocks/:symbol`, `/stocks/:symbol/history`):** These endpoints proxy to the **Alpha Vantage** stock API and are limited to **5 requests per 60 seconds per client** to stay aligned with typical free‑tier limits.
- **Football matches (`/matches`, `/matches/:id`):** These endpoints use the **API‑Sports (football)** provider and are limited to **10 requests per 60 seconds per client**.

Client‑side integrations such as **Giphy** GIF search are triggered manually from the UI and use the browser to call Giphy with your API key; they are not currently backed by server‑side rate limiting, so you should provision the Giphy key with suitable limits/quotas in your Giphy account.

## Running the Application

### Start Backend Server

```bash
cd backend
npm run start:dev
```

The backend server will start on `http://localhost:3001`

### Start Frontend Application

```bash
cd frontend
npm run dev
```

The frontend application will start on `http://localhost:3000`

## Production readiness check

Before deploying, run a full lint + production build from the **project root**:

```bash
# Lint both apps, then build backend + frontend (catches TypeScript and build errors)
npm run check:prod
```

This runs `lint` then `build` (backend then frontend). If any step fails, fix the errors before deploying.

**Optional: run the built app locally**

1. Ensure `.env` (backend) and `.env.local` (frontend) are set with production-like values.
2. From project root:
   ```bash
   npm run build
   ```
3. Start backend: `cd backend && npm run start:prod` (serves from `dist/`).
4. In another terminal, start frontend: `cd frontend && npm run start` (serves from `.next/`).
5. Open the app and smoke-test (login, feed, chat, etc.).

**Root scripts**

| Script | Description |
|--------|-------------|
| `npm run build` | Build backend + frontend for production |
| `npm run lint` | Lint backend + frontend |
| `npm run check:prod` | Lint + build (recommended pre-deploy check) |
| `npm run test` | Run backend unit tests |

## Development

### Backend Commands

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests

### Frontend Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
twitter-app/
├── mobile/                 # Expo (iOS / Android / web) — see mobile/README.md
├── backend/
│   ├── src/
│   │   ├── ai/            # AI post suggestions (Gemini)
│   │   ├── auth/          # Authentication module
│   │   ├── chat/          # WebSocket chat gateway
│   │   ├── comment/       # Comments functionality
│   │   ├── conversation/ # Conversation REST API
│   │   ├── follow/        # Follow/unfollow system
│   │   ├── firebase/      # Firebase token verification
│   │   ├── like/          # Like functionality
│   │   ├── message/       # Message REST API
│   │   ├── post/          # Posts management
│   │   ├── prisma/        # Prisma service
│   │   ├── users/         # User management
│   │   └── main.ts        # Application entry point
│   ├── prisma/            # Schema and migrations
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
│
└── frontend/
    ├── app/               # Next.js app directory
    │   ├── home/          # Home feed page
    │   ├── login/         # Login page
    │   ├── register/      # Registration page
    │   ├── profile/       # User profile pages
    │   └── api/           # API proxy routes
    ├── components/        # Reusable components
    │   ├── Chat/          # Chat UI (sidebar, messages, input)
    │   ├── auth/          # Login/Register dialog cards
    │   └── ui/            # Shared UI (dialog, card, input, etc.)
    ├── contexts/          # Auth, Theme, ChatSocket
    ├── services/          # API and chat services
    └── package.json
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Posts

- `GET /posts` - Get all posts (paginated)
- `GET /posts/feed` - Get personalized feed
- `POST /posts` - Create new post or repost
- `GET /posts/user/:username` - Get user's posts
- `GET /posts/:id` - Get single post
- `DELETE /posts/:id` - Delete post
- `DELETE /posts/unrepost/:id` - Remove repost

### Users

- `GET /users/search?q=query` - Search users
- `GET /users/profile` - Get current user profile
- `PATCH /users/profile` - Update profile
- `GET /users/:username` - Get user by username
- `POST /users/:userId/follow` - Follow user
- `POST /users/:userId/unfollow` - Unfollow user

### Likes

- `POST /likes/:postId` - Like a post
- `DELETE /likes/:postId` - Unlike a post

### Comments

- `GET /comments/:postId` - Get post comments
- `POST /comments/:postId` - Create comment

### Conversations & Chat

- `GET /conversations` - List conversations for current user
- `POST /conversations` - Create or get existing conversation (e.g. with another user)
- `GET /conversations/:id/messages` - Get messages in a conversation
- **WebSocket** (path `/socket.io`): `conversation:join`, `conversation:leave`, `message:send`; server emits `message:new` for new messages. Authenticate with Firebase token in `auth.token` or `query.token`.

### AI (optional)

- `POST /ai/suggest` - Get AI-generated post suggestion for a topic (requires `GEMINI_API_KEY`).

## Security Features

- Firebase token verification for API and WebSocket
- Protected routes with `FirebaseAuthGuard`
- CORS configuration
- Input validation and sanitization

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full list of changes.

### 2026-03-22 – Mobile app (Expo), post video fields, feed updates

- **Database / API:** Posts can store **`videoUrl`** and **`mediaAspectRatio`**; Prisma migration and backend post/notifications/saved-posts/users updates.
- **Web feed:** Feed **`Post`** types and **`PostCard`** adjusted for posts that include video-related fields from the API.
- **Mobile:** New **Expo Router** app under **`mobile/`** (auth, tabs, chat, explore, profiles). **expo-video** for playback; **expo-image-picker** `mediaTypes` arrays; shared screen types moved to **`mobile/types/`** so **`app/`** stays route-only.

### 2026-03-08 – Backend overhaul, Chat, Firebase auth

- **Database:** Switched from TypeORM to **Prisma**; added migrations for `User`, `Post`, `Comment`, `Like`, `Follow`, and new **Conversation**, **ConversationParticipant**, and **Message** models.
- **Auth:** Replaced JWT/Passport with **Firebase Authentication**. Backend validates Firebase ID tokens via `FirebaseModule` and `FirebaseAuthGuard`; user passwords no longer stored.
- **Real-time Chat:** Added **WebSocket** chat using Socket.IO (`ChatGateway`). Users join conversation rooms, send messages with `message:send`, and receive `message:new`. REST APIs for conversations and messages under `ConversationModule` and `MessageModule`.
- **AI module:** Optional **AI service** (Google Gemini) for post suggestions; `POST /ai/suggest` and `AiModule` added.
- **Docker:** Added `Dockerfile` and `docker-compose.yml` for backend.
- **Frontend – Chat UI:** New Chat components: `ChatLayout`, `ChatSidebar`, `ChatContainer`, `ChatHeader`, `MessageList`, `MessageBubble`, `ChatInput`; `ChatSocketContext` for WebSocket connection; `chatServices` and storage helpers.
- **Frontend – Auth:** Login and register flows available as dialog cards (`LoginDialogCard`, `RegisterDialogCard`); Firebase client integration in `lib/firebase.ts` and `AuthContext`.
- **Frontend – UI:** New shared components: `Avatar`, `Button`, `Card`, `Dialog`, `Field`, `Input`, `Label`, `ScrollArea`, `Separator` (e.g. shadcn-style).

### 2026-03-05 – Frontend UI updates

- **Landing page redesigned to match X-style entry:** The main Next.js entry page (`frontend/app/page.tsx`) now shows a large `X` logo on the left and “Happening now / Join X today” hero copy with primary actions on the right.
- **Login and register as modals from entry page:** From the entry page, “Create account” and “Sign in” now open the existing register and login flows inside modal dialogs (using a new `Dialog` UI component in `frontend/components/ui/dialog.tsx`), while the dedicated `/login` and `/register` routes remain available.
- **Card styling refreshed:** Shared card UI (`frontend/components/ui/card.tsx`) no longer shows outer borders, uses a softer, lighter background, and has a rounder radius for a cleaner, floating look.
- **Input styling refreshed:** Form inputs (`frontend/components/ui/input.tsx`) keep their borders but are now pill-shaped with a lighter gray border and subtle background to better match the updated cards.
- **Register layout tweak:** On the register page (`frontend/app/register/page.tsx`), the “Join X today” heading and description have been moved above the card on the right side, leaving only the circular `X` symbol on the left for stronger visual balance.

## License

UNLICENSED
