import { supabase, type Profile } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface MatchPreferences {
  country?: string;
  gender?: string;
  interests?: string[];
}

interface QueueEntry {
  userId: string;
  preferences: MatchPreferences;
  joinedAt: number;
}

class MatchmakingService {
  private userId: string | null = null;
  private channel: RealtimeChannel | null = null;
  private onMatchCallbacks: ((user: Profile) => void)[] = [];
  private onTimeoutCallbacks: (() => void)[] = [];
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private preferences: MatchPreferences = {};
  private _matched = false;

  async joinQueue(
    userId: string,
    preferences: MatchPreferences,
  ): Promise<void> {
    // Cleanup any previous queue
    await this.leaveQueue();

    this.userId = userId;
    this.preferences = preferences;
    this._matched = false;

    // Use a presence channel so all users in the queue can see each other
    this.channel = supabase.channel("matchmaking-queue", {
      config: {
        presence: { key: userId },
        broadcast: { self: false },
      },
    });

    this.channel
      .on("presence", { event: "sync" }, () => {
        if (this._matched) return;
        this._tryMatch();
      })
      .on("broadcast", { event: "match-request" }, async (payload) => {
        if (this._matched) return;
        const { fromUserId, fromProfile } = payload.payload;
        if (fromUserId && fromProfile && fromUserId !== userId) {
          // Accept the match — the other user initiated
          this._matched = true;
          this._clearTimers();
          this.onMatchCallbacks.forEach((cb) => cb(fromProfile as Profile));
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await this.channel?.track({
            userId,
            preferences,
            joinedAt: Date.now(),
          });
        }
      });

    // Periodically try to match (covers race conditions)
    this.pollInterval = setInterval(() => {
      if (!this._matched) this._tryMatch();
    }, 3000);

    // Timeout after 30 seconds
    this.searchTimeout = setTimeout(() => {
      if (!this._matched) {
        this.onTimeoutCallbacks.forEach((cb) => cb());
      }
    }, 30000);
  }

  private async _tryMatch() {
    if (!this.channel || !this.userId || this._matched) return;

    const state = this.channel.presenceState();
    const entries: QueueEntry[] = [];

    for (const [key, presenceList] of Object.entries(state)) {
      if (key === this.userId) continue;
      const presence = (presenceList as unknown[])[0] as
        | Record<string, unknown>
        | undefined;
      if (presence) {
        entries.push({
          userId: presence.userId as string,
          preferences: (presence.preferences || {}) as MatchPreferences,
          joinedAt: (presence.joinedAt || 0) as number,
        });
      }
    }

    if (entries.length === 0) return;

    // Find the best match based on preferences
    let bestMatch: QueueEntry | null = null;
    let bestScore = -1;

    for (const entry of entries) {
      let score = 0;

      // Country match
      if (
        this.preferences.country &&
        entry.preferences.country === this.preferences.country
      ) {
        score += 3;
      }

      // Gender match
      if (
        this.preferences.gender &&
        entry.preferences.gender === this.preferences.gender
      ) {
        score += 2;
      }

      // Earlier joiners get priority
      score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    // Take the first available if no preference matches
    if (!bestMatch) bestMatch = entries[0];

    if (bestMatch) {
      // Fetch the matched user's profile
      const { data: matchedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", bestMatch.userId)
        .maybeSingle();

      if (!matchedProfile || this._matched) return;

      // Fetch our own profile for the other user
      const { data: ourProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", this.userId)
        .maybeSingle();

      // Send match-request to the other user
      this.channel?.send({
        type: "broadcast",
        event: "match-request",
        payload: {
          fromUserId: this.userId,
          fromProfile: ourProfile,
          targetUserId: bestMatch.userId,
        },
      });

      // We also accept the match on our end
      this._matched = true;
      this._clearTimers();
      this.onMatchCallbacks.forEach((cb) => cb(matchedProfile as Profile));
    }
  }

  private _clearTimers() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async leaveQueue(): Promise<void> {
    this._clearTimers();
    this._matched = false;
    if (this.channel) {
      await this.channel.untrack();
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.userId = null;
  }

  onMatch(callback: (user: Profile) => void) {
    this.onMatchCallbacks.push(callback);
    return () => {
      this.onMatchCallbacks = this.onMatchCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onTimeout(callback: () => void) {
    this.onTimeoutCallbacks.push(callback);
    return () => {
      this.onTimeoutCallbacks = this.onTimeoutCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  async skip(): Promise<void> {
    this._matched = false;
    // Don't leave queue — just reset match state
  }

  getChannel(): RealtimeChannel | null {
    return this.channel;
  }
}

export const matchmakingService = new MatchmakingService();
