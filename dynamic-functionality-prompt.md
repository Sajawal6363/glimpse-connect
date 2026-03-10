# 🔧 GlimpseConnect — Make Everything Dynamic & Fully Functional

## 📌 Context: Current Codebase Analysis

**Repository:** `Sajawal6363/glimpse-connect`
**Tech Stack:** React 18 + Vite + TypeScript + TailwindCSS + ShadCN UI + Framer Motion + React Router DOM + React Query + React Hook Form + Zod

### Current State:

The app has **static UI pages** with **mock data** (`src/lib/mock-data.ts`). Nothing is dynamic — no real auth, no real-time features, no backend integration. All data is hardcoded.

### Existing Pages:

- `Landing.tsx` — Static landing page
- `Login.tsx` — Static login form (no real auth)
- `Register.tsx` — Static register form (no real auth)
- `Stream.tsx` — Static video UI (no WebRTC, no matching)
- `Chat.tsx` — Chat list from mock data
- `ChatDetail.tsx` — Chat messages from mock data
- `Profile.tsx` — Profile from mock data
- `ProfileEdit.tsx` — Profile edit (no persistence)
- `Explore.tsx` — User grid from mock data
- `Settings.tsx` — Static toggles (no persistence)
- `Notifications.tsx` — Static notifications
- `NotFound.tsx` — 404 page

### Existing Components:

- `AppLayout.tsx`, `Navbar.tsx`, `MobileNav.tsx`, `AppSidebar.tsx`, `ParticleBackground.tsx`
- Full ShadCN UI library (`button`, `input`, `select`, `switch`, `badge`, `dialog`, `toast`, `sidebar`, etc.)

### Existing Libraries:

- `mock-data.ts` — Hardcoded users, conversations, messages
- `countries.ts` — Country list with flags
- `interests.ts` — Interest tags
- `utils.ts` — `cn()` utility

---

## 🎯 OBJECTIVE: Transform Static UI → Fully Dynamic Application

Make **every single page and feature** fully functional with real state management, backend integration, real-time capabilities, form validation, persistent storage, and add all missing legal/informational pages.

---

## 📦 PHASE 1: State Management & Backend Infrastructure

### 1.1 Install Required Dependencies

```bash
npm install zustand socket.io-client simple-peer @supabase/supabase-js zod @hookform/resolvers
npm install -D @types/simple-peer
```

### 1.2 Create Supabase Backend Integration (`src/lib/supabase.ts`)

Set up Supabase client for:

- Authentication (email/password + Google OAuth + GitHub OAuth)
- PostgreSQL database (users, follows, messages, reports, blocks, sessions, notifications)
- Real-time subscriptions (presence, messages, notifications)
- Storage (profile images, chat images)
- Row Level Security (RLS) policies

### 1.3 Create Zustand Stores (`src/stores/`)

**`useAuthStore.ts`** — Authentication state:

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  checkAuth: () => Promise<void>;
}
```

**`useStreamStore.ts`** — Streaming state:

```typescript
interface StreamState {
  status: "idle" | "searching" | "connected" | "disconnected";
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peer: SimplePeer.Instance | null;
  matchedUser: User | null;
  isMuted: boolean;
  isCameraOn: boolean;
  callDuration: number;
  filters: { country: string; gender: string; interests: string[] };
  faceDetected: boolean;
  faceWarningTimer: number;
  skipCount: number;
  startStream: () => Promise<void>;
  stopStream: () => void;
  skipStranger: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setFilters: (filters: Partial<StreamFilters>) => void;
  reportUser: (reason: string, description?: string) => Promise<void>;
  blockUser: () => Promise<void>;
}
```

**`useChatStore.ts`** — Chat/messaging state:

```typescript
interface ChatState {
  conversations: Conversation[];
  activeChat: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Set<string>;
  isLoading: boolean;
  fetchConversations: () => Promise<void>;
  fetchMessages: (userId: string) => Promise<void>;
  sendMessage: (
    userId: string,
    content: string,
    type?: MessageType,
  ) => Promise<void>;
  sendImage: (userId: string, file: File) => Promise<void>;
  sendVoiceMessage: (userId: string, blob: Blob) => Promise<void>;
  markAsRead: (userId: string) => Promise<void>;
  setTyping: (userId: string, isTyping: boolean) => void;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
}
```

**`useSocialStore.ts`** — Follow/social state:

```typescript
interface SocialState {
  followers: User[];
  following: User[];
  suggestedUsers: User[];
  onlineUsers: Set<string>;
  blockedUsers: Set<string>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  isMutualFollow: (userId: string) => boolean;
  searchUsers: (query: string) => Promise<User[]>;
  fetchSuggestedUsers: () => Promise<void>;
  subscribeToPresence: () => void;
}
```

**`useSettingsStore.ts`** — Settings with persistence:

```typescript
interface SettingsState {
  showOnlineStatus: boolean;
  allowNonFollowerMessages: boolean;
  showProfileToStrangers: boolean;
  pushNotifications: boolean;
  newFollowerAlerts: boolean;
  messageNotifications: boolean;
  soundEffects: boolean;
  darkMode: boolean;
  reducedAnimations: boolean;
  highContrast: boolean;
  updateSetting: (key: string, value: boolean) => Promise<void>;
  fetchSettings: () => Promise<void>;
}
```

**`useNotificationStore.ts`** — Notifications:

```typescript
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribeToNotifications: () => void;
}
```

---

## 📦 PHASE 2: Make Each Page Dynamic

### 2.1 Authentication System

**`Login.tsx`** — Make fully functional:

- Wire up email/password inputs with `react-hook-form` + `zod` validation
- Email validation (proper format, required)
- Password validation (min 8 chars, required)
- "Forgot password?" sends actual reset email via Supabase
- Google login button triggers `supabase.auth.signInWithOAuth({ provider: 'google' })`
- GitHub login button triggers `supabase.auth.signInWithOAuth({ provider: 'github' })`
- Show loading spinner on submit button during API call
- Show toast error messages on failed login ("Invalid credentials", "Account not found", etc.)
- Redirect to `/stream` on successful login
- If user is already authenticated, redirect away from login page
- "Remember me" checkbox that controls session persistence

**`Register.tsx`** — Make fully functional:

- Multi-step registration form with progress indicator:
  - **Step 1:** Email + Password + Confirm Password
  - **Step 2:** Name + Username (check availability in real-time with debounce) + Date of Birth (18+ validation)
  - **Step 3:** Gender selection + Country selection (from `countries.ts`) + Profile picture upload
  - **Step 4:** Select interests (from `interests.ts`, min 3, max 10) + Bio (optional, max 200 chars)
- All fields validated with Zod schemas
- Username availability check with debounce (300ms) — show green checkmark or red X
- Profile image upload with preview, crop capability
- On submit: create Supabase auth user → insert profile into `users` table → redirect to `/stream`
- Show all validation errors inline under each field
- "Back" button to go to previous step
- Terms of Service & Privacy Policy checkboxes (required) with links to actual pages

### 2.2 Stream Page (`Stream.tsx`) — Core Feature

**Make WebRTC video calling work:**

**Idle State:**

- Show animated "Ready to Connect?" with country/gender/interest filter panel
- Filters actually filter the matching queue
- "Start Streaming" button requests camera/microphone permissions
- Show permission denied error if user blocks camera/mic
- Show user count of people currently online (from Supabase realtime presence)

**Searching State:**

- Animated radar/scanning effect (keep existing animation but make it functional)
- Actually connect to Socket.IO/Supabase Realtime signaling channel
- Matchmaking algorithm:
  1. Send user preferences (country, gender, interests) to matchmaking channel
  2. Server pairs compatible users
  3. Exchange WebRTC SDP offers/answers via signaling
  4. Establish P2P connection using `simple-peer`
- Show "Searching for someone..." with cancel button
- Timeout after 30 seconds → show "No one available. Try different filters?"

**Connected State:**

- Display local video (small PiP) + remote video (large main area)
- **Working call timer** that counts up from 0:00 every second
- **Mute/Unmute button** — actually mutes the audio track: `localStream.getAudioTracks()[0].enabled = false/true`
- **Camera On/Off** — actually disables video track: `localStream.getVideoTracks()[0].enabled = false/true`
- **Skip button** — disconnects current peer, closes WebRTC connection, re-enters matchmaking queue
  - Every 5th skip: show a 5-second interstitial (ad placeholder div for Google AdSense)
  - Smooth transition animation between strangers
- **End Call button** — disconnects and returns to idle state
- **Connection quality indicator** — monitor WebRTC stats (`peer.getStats()`) and show signal bars
- **Follow button** — follow the matched stranger during the call
- **In-call text chat** — slide-in chat panel during video call (send/receive messages via data channel)
- **Report button** — opens modal with report reasons, submits to database
- **Block button** — blocks user, disconnects, re-enters queue

**Face Detection System (implement with TensorFlow.js or simple heuristic):**

- On connection, start checking if user's face is visible every 3 seconds
- Use `navigator.mediaDevices` frame capture + basic canvas analysis (or TensorFlow.js BlazeFace if performance allows)
- If no face detected for 10 seconds:
  - Show countdown timer overlay: "Show your face: 8... 7... 6..."
  - If timer hits 0 → pause local stream, show warning "Camera blocked. Show your face to continue."
  - Resume automatically when face is detected again
- **For simplicity:** If TensorFlow.js is too heavy, implement a "camera covered detection" using average pixel brightness — if screen is mostly black/covered, trigger warning

**NSFW/Misbehavior Detection:**

- Monitor remote video frames every 5 seconds
- If using NSFWJS library: check classification scores
- If NSFW detected: blur remote video immediately, show "Content hidden" overlay, auto-report user
- **For simplicity:** At minimum, implement the report system and manual blur button ("Hide their video") that other user can click

### 2.3 Chat Page (`Chat.tsx`) — Make Dynamic

**Replace mock data with real data:**

- Fetch real conversations from Supabase: `messages` table joined with `users` table
- Only show conversations with **mutual followers** (both users follow each other)
- Show real-time unread message count badges
- Show real online status (green dot) from Supabase presence channel
- **Search functionality** actually filters conversations by user name
- Real-time updates: new messages appear at the top of the list immediately
- Show "Last seen X ago" for offline users
- Pull-to-refresh on mobile
- Empty state: "Follow someone to start chatting! Go to Explore to find people."

### 2.4 Chat Detail Page (`ChatDetail.tsx`) — Make Dynamic

**Real-time messaging:**

- Fetch message history from Supabase `messages` table on mount
- **Send messages:** Insert into `messages` table + broadcast via Supabase Realtime
- **Receive messages:** Subscribe to Supabase Realtime channel for new inserts
- **Typing indicator:** Broadcast typing state via presence channel, show "User is typing..." with animated dots
- **Read receipts:** Mark messages as read when chat is opened, show double checkmarks
- **Image sharing:** Upload image to Supabase Storage → send URL as message with type "image" → render inline
- **Voice messages:** Record audio via `MediaRecorder API` → upload blob to storage → send URL
- **Emoji picker:** Integrate emoji picker (use `emoji-picker-react` or simple emoji grid)
- **Auto-scroll** to bottom on new messages
- **Infinite scroll** for older messages (load 50 at a time, load more when scrolling up)
- **Message reactions:** Long-press/right-click on message → react with emoji
- **Delete message:** Swipe or long-press → "Delete for me" option
- Message input: prevent empty sends, limit to 1000 chars, show char count

### 2.5 Profile Page (`Profile.tsx`) — Make Dynamic

**Replace mock data:**

- Fetch real user data from Supabase `users` table based on `:username` param
- If `username === "me"` → show current authenticated user's profile
- Show real profile image from Supabase Storage (with fallback to first letter avatar)
- Show real follower/following counts from `follows` table
- Show real online status
- **Follow/Unfollow button** that actually works:
  - If already following → show "Unfollow" button (outline style)
  - If not following → show "Follow" button (gradient style)
  - Optimistic UI update on click
- **Message button:** Only enabled if mutual follow. Navigate to `/chat/{userId}`
  - If not mutual follow → show tooltip "You both need to follow each other to chat"
- **Interests** displayed as badges
- **"Joined" date** from `created_at`
- **Verified badge** shown if `isVerified === true`
- Show user's country with flag

### 2.6 Profile Edit Page (`ProfileEdit.tsx`) — Make Dynamic

**All edits persist to database:**

- Pre-fill all fields with current user data from auth store
- **Profile image:** Click to upload new image → preview → crop → upload to Supabase Storage → update user record
- **Name:** Text input with validation (2-50 chars)
- **Username:** Text input with real-time availability check (debounced, shows ✓ or ✗)
- **Bio:** Textarea (max 200 chars) with character counter
- **Country:** Searchable select dropdown from `countries.ts`
- **Gender:** Radio group (Male, Female, Other, Prefer not to say)
- **Date of Birth:** Date picker (must be 18+)
- **Interests:** Multi-select chips from `interests.ts` (min 3, max 10, click to toggle)
- **Save button:** Validates all fields → updates Supabase `users` table → shows success toast → redirects to profile
- **Cancel button:** Discards changes and goes back
- Show loading state during save

### 2.7 Explore Page (`Explore.tsx`) — Make Dynamic

**Replace mock data with real user search:**

- Fetch suggested users from Supabase: users with similar interests, same country, or recently active
- **Search input** actually queries Supabase: `users` table WHERE name ILIKE '%query%' OR username ILIKE '%query%' OR country ILIKE '%query%'
- **Debounced search** (300ms delay)
- **Filter panel** (when Filters button clicked):
  - Country filter (dropdown)
  - Gender filter (radio)
  - Online only toggle
  - Has common interests toggle
- Results load with infinite scroll (20 users per page)
- Each user card shows: avatar, name, username, country flag, interests, online status, verified badge
- Click card → navigate to `/profile/{username}`
- **Quick follow button** on each card (follow without visiting profile)
- Empty state: "No users found matching your criteria"

### 2.8 Settings Page (`Settings.tsx`) — Make Dynamic

**All toggles persist to database:**

- Read settings from `useSettingsStore` on mount
- Each toggle change immediately calls `updateSetting()` → saves to Supabase `user_settings` table
- Show loading indicator on toggle during save
- Show success toast on save

**Account Section — Make links work:**

- "Edit Profile" → Navigate to `/profile/edit`
- "Change Password" → Open modal with: Current Password, New Password, Confirm Password → call `supabase.auth.updateUser({ password })`
- "Two-Factor Authentication" → Toggle that enables/disables 2FA (show setup QR code modal if enabling)

**Privacy Section:**

- "Show Online Status" → Toggle controls whether user appears online to others
- "Allow Messages from Non-Followers" → Toggle controls chat access
- "Show Profile to Strangers" → Toggle controls visibility in Explore
- "Blocked Users" → Navigate to `/settings/blocked` — new page showing blocked users list with unblock buttons

**Danger Zone (add at bottom):**

- "Log Out" button → `supabase.auth.signOut()` → redirect to `/`
- "Delete Account" button → Confirmation dialog ("Are you sure? This cannot be undone. Type DELETE to confirm") → Delete all user data → sign out → redirect to `/`

### 2.9 Notifications Page (`Notifications.tsx`) — Make Dynamic

**Replace static notifications:**

- Fetch from Supabase `notifications` table WHERE `user_id = currentUser.id` ORDER BY `created_at DESC`
- Real-time: subscribe to new notifications via Supabase Realtime
- Types with different icons/colors:
  - `NEW_FOLLOWER`: "Sofia Rivera started following you" — Click → go to their profile
  - `NEW_MESSAGE`: "Alex Chen sent you a message" — Click → go to chat
  - `USER_ONLINE`: "Yuki Tanaka is now online" — Click → go to their profile
  - `SYSTEM`: System announcements
  - `WARNING`: Moderation warnings
- "Mark all as read" button in header
- Individual mark as read on click
- Unread notifications have highlighted background
- **Unread badge count** in Navbar bell icon — real count from store
- Infinite scroll for older notifications
- Empty state: "No notifications yet. Start connecting with people!"

---

## 📦 PHASE 3: Real-Time Infrastructure

### 3.1 Socket/Realtime Service (`src/lib/realtime.ts`)

Create a centralized real-time service:

```typescript
// Uses Supabase Realtime for:
// 1. Presence - track online users
// 2. Broadcast - signaling for WebRTC
// 3. Postgres Changes - new messages, notifications, follows

class RealtimeService {
  private presenceChannel: RealtimeChannel;
  private signalingChannel: RealtimeChannel;
  private notificationChannel: RealtimeChannel;

  // Track online status
  trackPresence(userId: string): void;
  untrackPresence(): void;
  getOnlineUsers(): string[];
  onPresenceChange(callback: (online: string[]) => void): void;

  // WebRTC signaling
  joinMatchmaking(preferences: MatchPreferences): void;
  leaveMatchmaking(): void;
  sendSignal(targetUserId: string, signal: any): void;
  onSignal(callback: (fromUserId: string, signal: any) => void): void;
  onMatch(callback: (matchedUser: User) => void): void;

  // Message subscriptions
  subscribeToMessages(
    userId: string,
    callback: (message: Message) => void,
  ): void;
  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void,
  ): void;

  // Cleanup
  disconnect(): void;
}
```

### 3.2 WebRTC Service (`src/lib/webrtc.ts`)

```typescript
class WebRTCService {
  private peer: SimplePeer.Instance | null;
  private localStream: MediaStream | null;

  async getLocalStream(video: boolean, audio: boolean): Promise<MediaStream>;
  createPeer(initiator: boolean, stream: MediaStream): SimplePeer.Instance;
  handleSignal(signal: SimplePeer.SignalData): void;
  onRemoteStream(callback: (stream: MediaStream) => void): void;
  onDataChannel(callback: (data: any) => void): void;
  sendData(data: any): void; // For in-call chat
  toggleAudio(enabled: boolean): void;
  toggleVideo(enabled: boolean): void;
  getConnectionStats(): Promise<RTCStatsReport>;
  disconnect(): void;
}
```

### 3.3 Matchmaking Service (`src/lib/matchmaking.ts`)

```typescript
// Client-side matchmaking logic using Supabase Realtime Broadcast
class MatchmakingService {
  // Join queue with preferences
  async joinQueue(
    userId: string,
    preferences: {
      country?: string;
      gender?: string;
      interests?: string[];
    },
  ): Promise<void>;

  // Leave queue
  async leaveQueue(userId: string): Promise<void>;

  // Listen for match
  onMatch(callback: (matchedUser: User) => void): void;

  // Skip current match and rejoin queue
  async skip(userId: string): Promise<void>;
}
```

---

## 📦 PHASE 4: Auth Guards & Route Protection

### 4.1 Create Auth Guard Component (`src/components/auth/ProtectedRoute.tsx`)

```typescript
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
```

### 4.2 Create Public-Only Route (`src/components/auth/PublicRoute.tsx`)

```typescript
// Redirect authenticated users away from login/register
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/stream" replace />;
  return <>{children}</>;
};
```

### 4.3 Update `App.tsx` Routes

```tsx
<Routes>
  {/* Public routes */}
  <Route path="/" element={<Landing />} />
  <Route
    path="/login"
    element={
      <PublicRoute>
        <Login />
      </PublicRoute>
    }
  />
  <Route
    path="/register"
    element={
      <PublicRoute>
        <Register />
      </PublicRoute>
    }
  />

  {/* Protected routes */}
  <Route
    path="/stream"
    element={
      <ProtectedRoute>
        <Stream />
      </ProtectedRoute>
    }
  />
  <Route
    path="/chat"
    element={
      <ProtectedRoute>
        <Chat />
      </ProtectedRoute>
    }
  />
  <Route
    path="/chat/:userId"
    element={
      <ProtectedRoute>
        <ChatDetail />
      </ProtectedRoute>
    }
  />
  <Route
    path="/profile/:username"
    element={
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    }
  />
  <Route
    path="/profile/edit"
    element={
      <ProtectedRoute>
        <ProfileEdit />
      </ProtectedRoute>
    }
  />
  <Route
    path="/explore"
    element={
      <ProtectedRoute>
        <Explore />
      </ProtectedRoute>
    }
  />
  <Route
    path="/settings"
    element={
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    }
  />
  <Route
    path="/settings/blocked"
    element={
      <ProtectedRoute>
        <BlockedUsers />
      </ProtectedRoute>
    }
  />
  <Route
    path="/notifications"
    element={
      <ProtectedRoute>
        <Notifications />
      </ProtectedRoute>
    }
  />

  {/* Legal/Info pages (public) */}
  <Route path="/privacy" element={<PrivacyPolicy />} />
  <Route path="/terms" element={<TermsOfService />} />
  <Route path="/community-guidelines" element={<CommunityGuidelines />} />
  <Route path="/cookie-policy" element={<CookiePolicy />} />
  <Route path="/plans" element={<Plans />} />
  <Route path="/about" element={<About />} />
  <Route path="/contact" element={<Contact />} />
  <Route path="/faq" element={<FAQ />} />
  <Route path="/safety" element={<SafetyCenter />} />

  {/* Catch all */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## 📦 PHASE 5: NEW PAGES — Legal, Plans, Info

### 5.1 Privacy Policy Page (`src/pages/PrivacyPolicy.tsx`)

Create a full, professional **Privacy Policy** page with the ConnectLive design system. Include these sections:

- **Last Updated** date
- **Information We Collect**: Personal info (name, email, DOB, country, profile photo), device info, usage data, camera/microphone data during streams, chat messages, IP addresses
- **How We Use Your Information**: Provide services, matchmaking, safety/moderation, analytics, improve experience, communicate with users
- **Video Streaming Data**: Explain that video streams are P2P and not recorded by ConnectLive. Explain face detection is done client-side and no biometric data is stored. Explain content moderation scanning
- **Information Sharing**: No selling data. Sharing with: law enforcement (when required), service providers (hosting, analytics), safety (reports of abuse)
- **Data Retention**: Account data kept while account active, deleted within 30 days of account deletion, chat messages retained for 90 days, moderation logs for 1 year
- **Your Rights**: Access, correct, delete your data. Export data. Opt-out of marketing
- **Cookies & Tracking**: Session cookies, preference cookies, analytics (Google Analytics), advertising (Google AdSense)
- **Children's Privacy**: Service is for 18+ only
- **International Data Transfers**: Data may be processed in different countries
- **Security**: Encryption in transit (TLS), encryption at rest, regular security audits
- **Changes to Policy**: Users notified of material changes
- **Contact**: Email for privacy inquiries

Style: Use the `AppLayout` wrapper for authenticated users, or a simple clean layout for non-authenticated. Use `glass` cards for each section. Accordion/collapsible sections with smooth animation.

### 5.2 Terms of Service Page (`src/pages/TermsOfService.tsx`)

Full **Terms of Service** with these sections:

- **Acceptance of Terms**
- **Eligibility**: Must be 18+, must provide accurate info
- **Account Responsibilities**: Keep credentials secure, responsible for account activity
- **Acceptable Use Policy**: No nudity/sexual content, no harassment/bullying, no hate speech, no spam, no impersonation, no minors, no illegal activity, no commercial solicitation
- **Streaming Conduct Rules**: Must show face during calls, no recording other users, no sharing explicit content, respect others' boundaries, use report/skip for uncomfortable situations
- **Content Ownership**: Users own their content but grant ConnectLive license to display it
- **Moderation & Enforcement**: Strike system (warning → 24h ban → permanent ban), AI-assisted moderation, right to remove content or terminate accounts
- **Intellectual Property**: ConnectLive branding, design, code are owned by ConnectLive
- **Disclaimers**: Service provided "as is", no guarantee of matches, not responsible for user behavior
- **Limitation of Liability**: Maximum liability limited to subscription fees paid
- **Indemnification**: Users indemnify ConnectLive for violations
- **Termination**: Either party can terminate, what happens to data on termination
- **Governing Law**: Specify jurisdiction
- **Dispute Resolution**: Arbitration clause
- **Changes to Terms**: 30-day notice for material changes

### 5.3 Community Guidelines Page (`src/pages/CommunityGuidelines.tsx`)

Visual, friendly **Community Guidelines** page:

- **Our Mission**: Safe, fun, respectful connections
- **Be Respectful**: Treat everyone with dignity, respect cultural differences
- **Keep It Safe**: No nudity, no explicit content, no drugs/weapons on stream
- **Be Authentic**: Show your real face, don't use fake photos, don't impersonate
- **No Harassment**: Zero tolerance for bullying, threats, stalking, doxxing
- **Protect Privacy**: Don't share others' personal info, don't screenshot/record streams
- **Report Bad Behavior**: How to report, what happens when you report
- **Consequences**: Warning → Temp ban → Permanent ban
- Use icons from Lucide for each section. Make it visually engaging with colored cards.

### 5.4 Cookie Policy Page (`src/pages/CookiePolicy.tsx`)

**Cookie Policy** with:

- What are cookies
- Types we use: Essential (auth session), Functional (preferences/settings), Analytics (Google Analytics), Advertising (Google AdSense)
- How to manage cookies (browser settings)
- Third-party cookies (Google, analytics providers)
- Cookie consent banner integration

### 5.5 Pricing/Plans Page (`src/pages/Plans.tsx`)

Create a **stunning pricing page** with:

- **Free Plan** card:
  - Random video matching
  - 5 skips per hour
  - Basic country filter
  - Text chat with mutual followers
  - Limited interests (5 max)
  - Ads shown
  - Standard support
- **Premium Plan** card (highlighted, "Most Popular" badge):
  - $9.99/month or $79.99/year (save 33%)
  - Unlimited skips
  - All country filters
  - Gender filter
  - Interest-based matching
  - Ad-free experience
  - Priority matching (matched first)
  - HD video quality
  - Unlimited interests
  - Verified badge
  - Voice messages in chat
  - See who viewed your profile
  - Priority support
- **VIP Plan** card:
  - $19.99/month or $149.99/year
  - Everything in Premium
  - Custom profile themes
  - Exclusive VIP badge
  - Invisible mode (appear offline while using)
  - Advanced analytics (stream time, connection stats)
  - Dedicated support

Design: Side-by-side cards with glassmorphism. Free = subtle, Premium = neon blue glow border, VIP = neon purple/gold glow. Toggle for monthly/yearly pricing with animation. "Get Started" buttons (link to register or upgrade flow).

### 5.6 About Page (`src/pages/About.tsx`)

**About ConnectLive** page:

- Hero section with app mission
- "Our Story" — why we built this
- "How It Works" — 3 steps with illustrations (Sign Up → Start Streaming → Connect)
- "Safety First" — our commitment to user safety
- Team section (optional, can be generic)
- Stats section (users, countries, connections made)
- "Join Us" CTA

### 5.7 Contact Page (`src/pages/Contact.tsx`)

**Contact Us** page with:

- Contact form (Name, Email, Subject dropdown, Message) — validated with Zod
- Form submission → insert into `contact_messages` table in Supabase OR send email
- Show success message after submission
- FAQ section (link to FAQ page)
- Social media links
- Support email display

### 5.8 FAQ Page (`src/pages/FAQ.tsx`)

**Frequently Asked Questions** with accordion (use ShadCN Accordion):

- **General**: What is ConnectLive?, Is it free?, What countries are supported?
- **Account**: How to create account?, How to delete account?, How to change password?, How to verify profile?
- **Streaming**: How does matching work?, Can I choose who to talk to?, What if someone is inappropriate?, Why do I need to show my face?, Can I record calls?
- **Chat**: How does chat work?, Can I message anyone?, What are mutual follows?
- **Privacy & Safety**: Is my video recorded?, How does content moderation work?, How to report someone?, How to block someone?
- **Premium**: What does Premium include?, How to cancel subscription?, Refund policy?
- **Technical**: Supported browsers?, Camera/mic not working?, Connection issues?

### 5.9 Safety Center Page (`src/pages/SafetyCenter.tsx`)

**Safety Center** — dedicated safety resource:

- "Your Safety Is Our Priority" hero
- Safety features overview: Face detection, content moderation, report system, block system
- Tips for safe streaming: Don't share personal info, trust your instincts, use report/skip buttons, don't meet strangers IRL
- Parental information: This is 18+ only
- How to report: Step-by-step guide with screenshots/illustrations
- Emergency resources: Links to relevant helplines (cyberbullying, harassment)
- Transparency report: How many reports processed, actions taken (can be placeholder data)

### 5.10 Blocked Users Page (`src/pages/BlockedUsers.tsx`)

- List all blocked users from `blocks` table
- Each entry: avatar, name, username, date blocked, "Unblock" button
- Unblock confirmation dialog
- Empty state: "You haven't blocked anyone"

---

## 📦 PHASE 6: Enhanced Components & UX

### 6.1 Update Navbar (`Navbar.tsx`)

- Show current user's actual avatar (from Supabase Storage)
- Show real notification count badge on bell icon
- Show user's first name initial if no avatar
- Make profile link go to actual user profile

### 6.2 Update Landing Page Footer

Add footer with links to: About, Privacy Policy, Terms of Service, Community Guidelines, Cookie Policy, Contact, FAQ, Safety Center, Plans

### 6.3 Cookie Consent Banner (`src/components/CookieConsent.tsx`)

- Show on first visit (check localStorage)
- "Accept All", "Essential Only", "Customize" buttons
- Save preference to localStorage
- GDPR compliant wording

### 6.4 Google AdSense Integration (`src/components/ads/`)

Create ad placeholder components:

- `BannerAd.tsx` — 728x90 banner (bottom of stream page)
- `InterstitialAd.tsx` — Full-screen ad (shown between skips)
- `NativeAd.tsx` — In-feed ad (in explore/chat lists)
  All should have `data-ad-slot` and `data-ad-client` attributes ready for Google AdSense approval. Show placeholder "Advertisement" boxes with proper sizing until AdSense is approved.

### 6.5 Add `ads.txt` to `public/` folder

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

---

## 📦 PHASE 7: Database Schema (Supabase SQL)

Create `src/lib/schema.sql` with full Supabase database setup:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  interests TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_banned BOOLEAN DEFAULT FALSE,
  ban_expiry TIMESTAMP WITH TIME ZONE,
  strikes INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_plan TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follows
CREATE TABLE public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice', 'gif', 'system')),
  media_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports
CREATE TABLE public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reported_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('nudity', 'harassment', 'spam', 'underage', 'hate_speech', 'violence', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Blocks
CREATE TABLE public.blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('new_follower', 'new_message', 'user_online', 'system', 'warning')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Settings
CREATE TABLE public.user_settings (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  show_online_status BOOLEAN DEFAULT TRUE,
  allow_non_follower_messages BOOLEAN DEFAULT FALSE,
  show_profile_to_strangers BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  new_follower_alerts BOOLEAN DEFAULT TRUE,
  message_notifications BOOLEAN DEFAULT TRUE,
  sound_effects BOOLEAN DEFAULT FALSE,
  dark_mode BOOLEAN DEFAULT TRUE,
  reduced_animations BOOLEAN DEFAULT FALSE,
  high_contrast BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stream Sessions (for analytics)
CREATE TABLE public.stream_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- seconds
  was_skipped BOOLEAN DEFAULT FALSE,
  was_reported BOOLEAN DEFAULT FALSE
);

-- Contact Messages
CREATE TABLE public.contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_profiles_country ON public.profiles(country);
CREATE INDEX idx_profiles_online ON public.profiles(is_online);
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (examples)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can read their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can manage their follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY "Users can read their notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can manage their blocks" ON public.blocks FOR ALL USING (auth.uid() = blocker_id);
```

---

## 📦 PHASE 8: Environment Variables

Create `.env.example`:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google AdSense
VITE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX

# WebRTC STUN/TURN
VITE_STUN_URL=stun:stun.l.google.com:19302
VITE_TURN_URL=
VITE_TURN_USERNAME=
VITE_TURN_PASSWORD=

# App
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=ConnectLive
```

---

## 📦 PHASE 9: Custom Hooks (`src/hooks/`)

Create these custom hooks:

- **`useWebRTC.ts`** — Manages peer connection, local/remote streams, ICE candidates
- **`useMatchmaking.ts`** — Manages queue join/leave, match events
- **`useFaceDetection.ts`** — Canvas-based brightness analysis for face detection
- **`useOnlineStatus.ts`** — Subscribe to Supabase presence for online/offline tracking
- **`useChat.ts`** — Message fetching, sending, real-time subscription
- **`useMediaStream.ts`** — Camera/mic access, stream management, track toggling
- **`useInfiniteScroll.ts`** — Generic infinite scroll hook with intersection observer
- **`useDebounce.ts`** — Debounce values for search inputs

---

## ✅ Summary of ALL Files to Create/Modify

### New Files:

```
src/lib/supabase.ts
src/lib/realtime.ts
src/lib/webrtc.ts
src/lib/matchmaking.ts
src/lib/schema.sql
src/lib/validators.ts           (Zod schemas for all forms)

src/stores/useAuthStore.ts
src/stores/useStreamStore.ts
src/stores/useChatStore.ts
src/stores/useSocialStore.ts
src/stores/useSettingsStore.ts
src/stores/useNotificationStore.ts

src/hooks/useWebRTC.ts
src/hooks/useMatchmaking.ts
src/hooks/useFaceDetection.ts
src/hooks/useOnlineStatus.ts
src/hooks/useChat.ts
src/hooks/useMediaStream.ts
src/hooks/useInfiniteScroll.ts
src/hooks/useDebounce.ts

src/components/auth/ProtectedRoute.tsx
src/components/auth/PublicRoute.tsx
src/components/ads/BannerAd.tsx
src/components/ads/InterstitialAd.tsx
src/components/ads/NativeAd.tsx
src/components/CookieConsent.tsx

src/pages/PrivacyPolicy.tsx
src/pages/TermsOfService.tsx
src/pages/CommunityGuidelines.tsx
src/pages/CookiePolicy.tsx
src/pages/Plans.tsx
src/pages/About.tsx
src/pages/Contact.tsx
src/pages/FAQ.tsx
src/pages/SafetyCenter.tsx
src/pages/BlockedUsers.tsx

public/ads.txt
.env.example
```

### Files to Modify (make dynamic):

```
src/App.tsx                     (add new routes, auth guards)
src/pages/Login.tsx             (real auth)
src/pages/Register.tsx          (real auth + multi-step)
src/pages/Stream.tsx            (WebRTC + matchmaking)
src/pages/Chat.tsx              (real data + realtime)
src/pages/ChatDetail.tsx        (real messaging)
src/pages/Profile.tsx           (real data)
src/pages/ProfileEdit.tsx       (real data persistence)
src/pages/Explore.tsx           (real search + data)
src/pages/Settings.tsx          (persistence + working links)
src/pages/Notifications.tsx     (real data + realtime)
src/pages/Landing.tsx           (add footer links)
src/components/layout/Navbar.tsx (real user data + notification count)
```

### Files to Eventually Remove:

```
src/lib/mock-data.ts            (replace all references with real data)
```

---

## 🎨 Design Consistency Rules

- All new pages MUST use the existing design system: `glass` class, gradient backgrounds, `neon-glow-blue`, `neon-text-blue`, `ParticleBackground`, glassmorphism cards
- Use `framer-motion` for page transitions and element animations
- Use `AppLayout` wrapper for authenticated pages
- Use simple centered layout with particle background for public pages (like Login/Register pattern)
- All forms use `react-hook-form` + `zod`
- All API calls show loading states (skeleton loaders or spinners)
- All errors show toast notifications
- All success actions show toast confirmations
- Mobile-responsive with bottom nav
- Dark theme throughout
