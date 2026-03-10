import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

class RealtimeService {
  private presenceChannel: RealtimeChannel | null = null;
  private signalingChannel: RealtimeChannel | null = null;
  private notificationChannel: RealtimeChannel | null = null;
  private messageChannel: RealtimeChannel | null = null;

  // Track online presence
  trackPresence(userId: string) {
    this.presenceChannel = supabase.channel("online-users", {
      config: { presence: { key: userId } },
    });

    this.presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = this.presenceChannel?.presenceState() || {};
        const onlineIds = Object.keys(state);
        this.onPresenceCallbacks.forEach((cb) => cb(onlineIds));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await this.presenceChannel?.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });
  }

  untrackPresence() {
    if (this.presenceChannel) {
      this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }
  }

  private onPresenceCallbacks: ((onlineIds: string[]) => void)[] = [];

  onPresenceChange(callback: (onlineIds: string[]) => void) {
    this.onPresenceCallbacks.push(callback);
    return () => {
      this.onPresenceCallbacks = this.onPresenceCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  getOnlineUsers(): string[] {
    if (!this.presenceChannel) return [];
    return Object.keys(this.presenceChannel.presenceState());
  }

  // Room-based WebRTC signaling
  joinSignalingRoom(roomId: string, userId: string) {
    this.leaveSignalingRoom();
    this.signalingChannel = supabase.channel(`signal-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    this.signalingChannel
      .on("broadcast", { event: "signal" }, (payload) => {
        if (payload.payload.fromUserId !== userId) {
          this.onSignalCallbacks.forEach((cb) =>
            cb(payload.payload.fromUserId, payload.payload.signal),
          );
        }
      })
      .subscribe();
  }

  leaveSignalingRoom() {
    if (this.signalingChannel) {
      this.signalingChannel.unsubscribe();
      this.signalingChannel = null;
    }
    // Clear stale callbacks so they don't accumulate across calls
    this.onSignalCallbacks = [];
  }

  sendSignal(targetUserId: string, fromUserId: string, signal: unknown) {
    this.signalingChannel?.send({
      type: "broadcast",
      event: "signal",
      payload: { targetUserId, fromUserId, signal },
    });
  }

  private onSignalCallbacks: ((fromUserId: string, signal: unknown) => void)[] =
    [];

  onSignal(callback: (fromUserId: string, signal: unknown) => void) {
    this.onSignalCallbacks.push(callback);
    return () => {
      this.onSignalCallbacks = this.onSignalCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  // Message subscriptions
  subscribeToMessages(userId: string, callback: (message: unknown) => void) {
    this.messageChannel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => callback(payload.new),
      )
      .subscribe();
  }

  unsubscribeFromMessages() {
    if (this.messageChannel) {
      this.messageChannel.unsubscribe();
      this.messageChannel = null;
    }
  }

  // Notification subscriptions
  subscribeToNotifications(
    userId: string,
    callback: (notification: unknown) => void,
  ) {
    this.notificationChannel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callback(payload.new),
      )
      .subscribe();
  }

  unsubscribeFromNotifications() {
    if (this.notificationChannel) {
      this.notificationChannel.unsubscribe();
      this.notificationChannel = null;
    }
  }

  // Cleanup
  disconnect() {
    this.untrackPresence();
    this.leaveSignalingRoom();
    this.unsubscribeFromMessages();
    this.unsubscribeFromNotifications();
  }
}

export const realtimeService = new RealtimeService();
