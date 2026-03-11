import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

class RealtimeService {
  private presenceChannel: RealtimeChannel | null = null;
  private signalingChannel: RealtimeChannel | null = null;
  private notificationChannel: RealtimeChannel | null = null;
  private messageChannel: RealtimeChannel | null = null;
  private currentSignalingRoomId: string | null = null;
  private signalingReady = false;

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
  joinSignalingRoom(roomId: string, userId: string): Promise<void> {
    // If we're already in this exact room and the channel is ready, don't re-join
    if (
      this.currentSignalingRoomId === roomId &&
      this.signalingChannel &&
      this.signalingReady
    ) {
      console.log(
        "[Realtime] Already in signaling room",
        roomId,
        "— skipping re-join",
      );
      return Promise.resolve();
    }

    // If joining a different room, clean up the old one
    if (this.signalingChannel) {
      console.log(
        "[Realtime] Leaving old signaling room",
        this.currentSignalingRoomId,
      );
      this.signalingChannel.unsubscribe();
      this.signalingChannel = null;
    }
    // NOTE: Do NOT clear onSignalCallbacks here — they're managed by FriendStream

    this.currentSignalingRoomId = roomId;
    this.signalingReady = false;

    this.signalingChannel = supabase.channel(`signal-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error("[Realtime] Signaling room subscribe timeout after 10s");
        reject(new Error("Signaling room subscribe timeout"));
      }, 10_000);

      this.signalingChannel
        ?.on("broadcast", { event: "signal" }, (payload) => {
          const fromUserId = payload.payload.fromUserId;
          const signal = payload.payload.signal;
          if (fromUserId !== userId) {
            console.log(
              "[Realtime] Received signal:",
              (signal as Record<string, unknown>).type,
              "from",
              fromUserId.slice(0, 8),
            );
            this.onSignalCallbacks.forEach((cb) => cb(fromUserId, signal));
          }
        })
        .subscribe((status) => {
          console.log(
            "[Realtime] Signaling channel status:",
            status,
            "room:",
            roomId,
          );
          if (status === "SUBSCRIBED") {
            this.signalingReady = true;
            clearTimeout(timeout);
            resolve();
          }
        });
    });
  }

  leaveSignalingRoom() {
    if (this.signalingChannel) {
      console.log(
        "[Realtime] Leaving signaling room",
        this.currentSignalingRoomId,
      );
      this.signalingChannel.unsubscribe();
      this.signalingChannel = null;
    }
    this.currentSignalingRoomId = null;
    this.signalingReady = false;
    // Clear stale callbacks so they don't accumulate across calls
    this.onSignalCallbacks = [];
  }

  sendSignal(targetUserId: string, fromUserId: string, signal: unknown) {
    if (!this.signalingChannel || !this.signalingReady) {
      console.warn(
        "[Realtime] sendSignal called but channel not ready! ready:",
        this.signalingReady,
        "channel:",
        !!this.signalingChannel,
      );
      return;
    }
    console.log(
      "[Realtime] Sending signal:",
      (signal as Record<string, unknown>).type,
      "to",
      targetUserId.slice(0, 8),
    );
    this.signalingChannel.send({
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
