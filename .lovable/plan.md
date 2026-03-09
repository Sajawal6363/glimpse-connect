

# ConnectLive — Phase 1: UI/UX Design System & Foundation

## Overview
Build the stunning futuristic design system and all core page layouts with mock data. This establishes the visual identity before wiring up backend features.

---

## 1. Design System & Theme Setup
- Dark theme with neon accent colors (electric blue `#00D4FF`, neon purple `#B24BF3`, cyber green `#00FF9D`)
- Glassmorphism card components (frosted glass with backdrop-blur)
- Custom color tokens in Tailwind config
- Gradient mesh animated background component
- Particle background effect (CSS-based floating dots/stars)
- Glow effects and neon border utilities

## 2. Core Layout Components
- **Morphing Sidebar** — slides/collapses with smooth animation, neon-highlighted active items, glassmorphism style
- **Top Navbar** — minimal, with user avatar, notification bell, and online status indicator
- **Mobile Bottom Navigation** — icon-based nav bar with glow effect on active tab
- **Page Transition Wrapper** — fade + scale animations between routes

## 3. Landing Page
- Hero section with animated gradient background and particle effects
- App title "ConnectLive" with neon glow text effect
- Feature showcase cards (glassmorphism) highlighting: Video Streaming, Safety, Chat, Social
- "Get Started" CTA button with hover glow animation
- Stats section (mock: "10K+ Users Online", "50M+ Connections Made")

## 4. Authentication Pages (UI Only, mock)
- **Login Page** — email/password form + social login buttons (Google, Facebook, Apple) with glassmorphism card
- **Register Page** — multi-step form: Email → Profile Details (name, username, DOB, gender, country with flag dropdown, interests tags, profile picture upload area) → Complete
- Step indicator with neon progress bar
- Age verification (18+ check on DOB)

## 5. Stream/Video Page (UI Layout, mock)
- Asymmetric layout: large stranger video area + smaller self-view PiP
- Dynamic rounded/organic video containers (not rectangles)
- **Stream Controls** floating bar: Mute, Camera toggle, Skip (with flip animation), End call
- **"Searching for stranger" animation** — radar/scanning effect with pulsing rings and particles
- **"Connected!" animation** — dramatic reveal
- Call duration timer display
- Country & gender filter panel (slide-in)
- Connection quality indicator (signal bars with color)
- Mock face detection warning overlay with countdown

## 6. Chat & Messaging Pages (UI Only)
- **Chat List** — conversations with online indicators (green dot), last message preview, unread badges
- **Chat Detail** — message bubbles with spring-in animation, typing indicator, emoji reactions area
- Glassmorphism chat input bar
- Online/offline status indicators

## 7. Profile Page
- **Profile Header** — large avatar with glow ring, username, verified badge, country flag, bio
- Followers/Following counts with tap-to-view
- Interests displayed as neon-bordered tags
- Follow/Unfollow button with animation
- Activity/stats section

## 8. Explore/Discover Page
- Search bar with glassmorphism styling
- User cards grid — avatar, name, country flag, online status, shared interests
- Filter by country, interests
- "Suggested for you" section

## 9. Settings Page
- Clean grouped settings: Account, Privacy, Notifications, Appearance
- Toggle switches with neon accent
- Theme toggle (dark/light — dark as default)

## 10. Shared Components & Animations
- Custom loading skeletons with shimmer effect
- Notification toast with blur backdrop (slide from top)
- Floating action button with radial menu expansion
- Micro-animations on all hover/click interactions
- Country selector dropdown with flag emojis (195+ countries)
- Interest tag picker component

## Routes
- `/` — Landing page
- `/login` — Login
- `/register` — Register (multi-step)
- `/stream` — Video streaming page
- `/chat` — Chat list
- `/chat/:userId` — Chat detail
- `/profile/:username` — User profile
- `/profile/edit` — Edit profile
- `/explore` — Discover users
- `/settings` — Settings
- `/notifications` — Notifications

All pages will use mock data initially. Backend (Lovable Cloud + Supabase) will be connected in a follow-up phase.

