import { create } from "zustand";
import { supabase, type Profile } from "@/lib/supabase";
import { webRTCService } from "@/lib/webrtc";

interface StreamFilters {
  country: string;
  gender: string;
  interests: string[];
}

interface StreamState {
  status: "idle" | "searching" | "connected" | "disconnected";
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  matchedUser: Profile | null;
  isMuted: boolean;
  isCameraOn: boolean;
  callDuration: number;
  filters: StreamFilters;
  faceDetected: boolean;
  faceWarningTimer: number;
  skipCount: number;
  showInterstitial: boolean;
  connectionQuality: "good" | "fair" | "poor";
  chatMessages: { from: string; content: string; timestamp: number }[];

  stopStream: () => void;
  skipStranger: (userId: string) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setFilters: (filters: Partial<StreamFilters>) => void;
  reportUser: (
    reporterId: string,
    reason: string,
    description?: string,
  ) => Promise<void>;
  blockUser: (blockerId: string) => Promise<void>;
  sendChatMessage: (content: string) => void;
  incrementCallDuration: () => void;
  setFaceDetected: (detected: boolean) => void;
  setConnectionQuality: (quality: "good" | "fair" | "poor") => void;
  dismissInterstitial: () => void;
}

export const useStreamStore = create<StreamState>((set, get) => ({
  status: "idle",
  localStream: null,
  remoteStream: null,
  matchedUser: null,
  isMuted: false,
  isCameraOn: true,
  callDuration: 0,
  filters: { country: "", gender: "", interests: [] },
  faceDetected: true,
  faceWarningTimer: 0,
  skipCount: 0,
  showInterstitial: false,
  connectionQuality: "good",
  chatMessages: [],

  stopStream: () => {
    set({
      status: "idle",
      localStream: null,
      remoteStream: null,
      matchedUser: null,
      callDuration: 0,
      chatMessages: [],
    });
  },

  skipStranger: (_userId) => {
    const currentSkipCount = get().skipCount + 1;
    const showInterstitial = currentSkipCount % 5 === 0;

    set({
      skipCount: currentSkipCount,
      showInterstitial,
      remoteStream: null,
      matchedUser: null,
      callDuration: 0,
      chatMessages: [],
    });
  },

  dismissInterstitial: () => {
    set({ showInterstitial: false });
  },

  toggleMute: () => {
    const { isMuted } = get();
    set({ isMuted: !isMuted });
  },

  toggleCamera: () => {
    const { isCameraOn } = get();
    set({ isCameraOn: !isCameraOn });
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  reportUser: async (reporterId, reason, description) => {
    const { matchedUser } = get();
    if (!matchedUser) return;

    const { error } = await supabase.from("reports").insert({
      reporter_id: reporterId,
      reported_id: matchedUser.id,
      reason,
      description: description || null,
    });

    if (error) throw new Error(error.message);

    // Log stream session
    await supabase.from("stream_sessions").insert({
      user1_id: reporterId,
      user2_id: matchedUser.id,
      was_reported: true,
      ended_at: new Date().toISOString(),
    });
  },

  blockUser: async (blockerId) => {
    const { matchedUser } = get();
    if (!matchedUser) return;

    await supabase.from("blocks").insert({
      blocker_id: blockerId,
      blocked_id: matchedUser.id,
    });

    // Disconnect and re-enter queue
    webRTCService.disconnect();
    set({ remoteStream: null, matchedUser: null, status: "searching" });
  },

  sendChatMessage: (content) => {
    webRTCService.sendData({ type: "chat", content, from: "me" });
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        { from: "me", content, timestamp: Date.now() },
      ],
    }));
  },

  incrementCallDuration: () => {
    set((state) => ({ callDuration: state.callDuration + 1 }));
  },

  setFaceDetected: (detected) => {
    set({ faceDetected: detected });
  },

  setConnectionQuality: (quality) => {
    set({ connectionQuality: quality });
  },
}));
