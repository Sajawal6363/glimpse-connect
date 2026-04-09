import { supabase, type Profile } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface MatchPreferences {
  country?: string;
  gender?: string;
  interests?: string[];
  /** The user's own profile gender (male/female/other) — used by others to filter */
  profileGender?: string;
  /** The user's own profile country_code (e.g. "PK") — used by others to filter */
  profileCountry?: string;
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

    // Clear stale callbacks to prevent accumulation on re-queue
    this.onMatchCallbacks = [];
    this.onTimeoutCallbacks = [];

    // Use a presence channel so all users in the queue can see each other
    const channelName = `matchmaking-queue`;
    this.channel = supabase.channel(channelName, {
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
      .on("presence", { event: "join" }, () => {
        // Also try matching immediately when a new user joins
        if (this._matched) return;
        setTimeout(() => this._tryMatch(), 500);
      })
      .on("broadcast", { event: "match-request" }, async (payload) => {
        if (this._matched) return;
        const { fromUserId, fromProfile, targetUserId } = payload.payload;
        // Only accept if this match-request is aimed at us
        if (targetUserId && targetUserId !== userId) return;
        if (fromUserId && fromProfile && fromUserId !== userId) {
          // Accept the match — the other user initiated
          this._matched = true;
          this._clearTimers();
          // Leave presence so we don't get matched again
          this.channel?.untrack();
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
          // Immediate match attempt after joining
          setTimeout(() => this._tryMatch(), 1000);
        }
      });

    // Periodically try to match (covers race conditions)
    this.pollInterval = setInterval(() => {
      if (!this._matched) this._tryMatch();
    }, 2000);

    // Timeout after 120 seconds (increased for low-traffic)
    this.searchTimeout = setTimeout(() => {
      if (!this._matched) {
        this.onTimeoutCallbacks.forEach((cb) => cb());
      }
    }, 120000);
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
        // Only consider entries that are not too old (60s max — prevents stale matches)
        const joinedAt = (presence.joinedAt || 0) as number;
        if (Date.now() - joinedAt > 120_000) continue;

        entries.push({
          userId: presence.userId as string,
          preferences: (presence.preferences || {}) as MatchPreferences,
          joinedAt,
        });
      }
    }

    if (entries.length === 0) return;

    // ── STRICT FILTERING ──
    // Match against the other user's ACTUAL profile data.
    // If I set gender filter "female" → the other user's profileGender must be "female".
    // If I set country filter "PK" → the other user's profileCountry must be "PK".
    // Also respect the reverse: the other user's filters must match MY profile data.

    const myGenderFilter = this.preferences.gender; // what I want to see
    const myCountryFilter = this.preferences.country; // what I want to see
    const myProfileGender = this.preferences.profileGender; // what I am
    const myProfileCountry = this.preferences.profileCountry; // where I'm from

    const eligible = entries.filter((entry) => {
      const theirGenderFilter = entry.preferences.gender;
      const theirCountryFilter = entry.preferences.country;
      const theirProfileGender = entry.preferences.profileGender;
      const theirProfileCountry = entry.preferences.profileCountry;

      // MY gender filter vs THEIR actual profile gender
      if (
        myGenderFilter &&
        theirProfileGender &&
        myGenderFilter !== theirProfileGender
      ) {
        return false;
      }

      // THEIR gender filter vs MY actual profile gender
      if (
        theirGenderFilter &&
        myProfileGender &&
        theirGenderFilter !== myProfileGender
      ) {
        return false;
      }

      // MY country filter vs THEIR actual profile country
      if (
        myCountryFilter &&
        theirProfileCountry &&
        myCountryFilter !== theirProfileCountry
      ) {
        return false;
      }

      // THEIR country filter vs MY actual profile country
      if (
        theirCountryFilter &&
        myProfileCountry &&
        theirCountryFilter !== myProfileCountry
      ) {
        return false;
      }

      return true;
    });

    // Find the best match based on preference scoring among eligible users
    let bestMatch: QueueEntry | null = null;
    let bestScore = -1;

    for (const entry of eligible) {
      let score = 0;

      // Exact country filter → profile match (highest priority)
      if (
        myCountryFilter &&
        entry.preferences.profileCountry === myCountryFilter
      ) {
        score += 5;
      }

      // Exact gender filter → profile match
      if (
        myGenderFilter &&
        entry.preferences.profileGender === myGenderFilter
      ) {
        score += 4;
      }

      // Same country (both from same place, even without filter)
      if (
        myProfileCountry &&
        entry.preferences.profileCountry === myProfileCountry
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

    // Fall back to first eligible if scoring didn't pick one
    if (!bestMatch && eligible.length > 0) bestMatch = eligible[0];

    // If NO eligible users exist (strict filter removed everyone), skip
    if (!bestMatch) return;

    if (!bestMatch) return;

    // DETERMINISTIC INITIATOR: Only the user with the smaller ID sends match-request.
    // The other side waits for the broadcast to avoid double-match race conditions.
    if (this.userId > bestMatch.userId) return;

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

    // Send match-request to the other user, including the targetUserId
    const resp = await this.channel?.send({
      type: "broadcast",
      event: "match-request",
      payload: {
        fromUserId: this.userId,
        fromProfile: ourProfile,
        targetUserId: bestMatch.userId,
      },
    });

    if (resp !== "ok") {
      console.error("[Matchmaking] Failed to send match-request", resp);
      return;
    }

    // We also accept the match on our end
    this._matched = true;
    this._clearTimers();
    // Leave presence so we don't get matched again
    this.channel?.untrack();
    this.onMatchCallbacks.forEach((cb) => cb(matchedProfile as Profile));
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
