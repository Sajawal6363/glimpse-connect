import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Types matching the database schema
export interface Profile {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  date_of_birth: string;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  country: string;
  country_code: string;
  interests: string[];
  is_verified: boolean;
  is_online: boolean;
  last_seen: string;
  is_banned: boolean;
  ban_expiry: string | null;
  strikes: number;
  is_premium: boolean;
  premium_plan: "free" | "premium" | "vip";
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: "text" | "image" | "voice" | "gif" | "system";
  media_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason:
    | "nudity"
    | "harassment"
    | "spam"
    | "underage"
    | "hate_speech"
    | "violence"
    | "other";
  description: string | null;
  status: "pending" | "reviewed" | "action_taken" | "dismissed";
  created_at: string;
  resolved_at: string | null;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  from_user_id: string | null;
  type:
    | "new_follower"
    | "new_message"
    | "user_online"
    | "system"
    | "warning"
    | "stream_request"
    | "follow_request"
    | "follow_accepted";
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  from_user?: Profile;
}

export interface UserSettings {
  user_id: string;
  show_online_status: boolean;
  allow_non_follower_messages: boolean;
  show_profile_to_strangers: boolean;
  push_notifications: boolean;
  new_follower_alerts: boolean;
  message_notifications: boolean;
  sound_effects: boolean;
  dark_mode: boolean;
  reduced_animations: boolean;
  high_contrast: boolean;
  updated_at: string;
}

export interface StreamSession {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  was_skipped: boolean;
  was_reported: boolean;
  call_type: "random" | "friend" | "group";
  group_id: string | null;
  initiator_id: string | null;
  end_reason:
    | "normal"
    | "skipped"
    | "reported"
    | "disconnected"
    | "declined"
    | "missed"
    | "timeout";
  user1_followed_user2: boolean;
  user2_followed_user1: boolean;
  connection_quality: "good" | "fair" | "poor";
  user1_rating: number | null;
  user2_rating: number | null;
  other_user?: Profile;
  group?: Group;
}

export interface StreamRating {
  id: string;
  session_id: string;
  rater_id: string;
  rated_user_id: string;
  overall_rating: number;
  vibe_rating: number;
  respect_rating: number;
  energy_rating: number;
  would_reconnect: boolean;
  created_at: string;
}

export interface ProfileRatingSummary {
  user_id: string;
  rating_count: number;
  aura_score: number;
  vibe_score: number;
  respect_score: number;
  energy_score: number;
  reconnect_rate: number;
  last_rated_at: string | null;
}

export interface CallParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  duration: number;
  profile?: Profile;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface Conversation {
  user: Profile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  member_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  profile?: Profile;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  type: "text" | "image" | "voice" | "system";
  media_url: string | null;
  created_at: string;
  sender?: Profile;
}

export interface GalleryImage {
  id: string;
  user_id: string;
  image_url: string;
  is_public: boolean;
  caption: string;
  created_at: string;
}

export interface GroupBlock {
  id: string;
  user_id: string;
  group_id: string;
  created_at: string;
}
