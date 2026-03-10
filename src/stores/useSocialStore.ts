import { create } from "zustand";
import { supabase, type Profile, type Follow } from "@/lib/supabase";

interface SocialState {
  followers: Profile[];
  following: Profile[];
  pendingRequests: (Follow & { from_user?: Profile })[];
  sentRequests: Follow[];
  suggestedUsers: Profile[];
  searchResults: Profile[];
  onlineUsers: Set<string>;
  blockedUsers: Set<string>;
  isLoading: boolean;

  // Follow request system
  sendFollowRequest: (
    currentUserId: string,
    targetUserId: string,
  ) => Promise<void>;
  cancelFollowRequest: (
    currentUserId: string,
    targetUserId: string,
  ) => Promise<void>;
  acceptFollowRequest: (
    followId: string,
    currentUserId: string,
  ) => Promise<void>;
  rejectFollowRequest: (
    followId: string,
    currentUserId: string,
  ) => Promise<void>;
  unfollowUser: (currentUserId: string, targetUserId: string) => Promise<void>;

  // Block
  blockUser: (currentUserId: string, targetUserId: string) => Promise<void>;
  unblockUser: (currentUserId: string, targetUserId: string) => Promise<void>;

  // Queries
  isFollowing: (targetUserId: string) => boolean;
  isMutualFollow: (targetUserId: string) => boolean;
  hasPendingRequest: (targetUserId: string) => "sent" | "received" | false;
  getFollowStatus: (
    targetUserId: string,
  ) => "none" | "pending_sent" | "pending_received" | "following" | "mutual";

  // Fetches
  searchUsers: (query: string) => Promise<Profile[]>;
  fetchSuggestedUsers: (userId: string) => Promise<void>;
  fetchFollowers: (userId: string) => Promise<void>;
  fetchFollowing: (userId: string) => Promise<void>;
  fetchBlockedUsers: (userId: string) => Promise<void>;
  fetchPendingRequests: (userId: string) => Promise<void>;
  fetchSentRequests: (userId: string) => Promise<void>;
  fetchMutualFriends: (userId: string) => Promise<Profile[]>;
  setOnlineUsers: (ids: string[]) => void;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  followers: [],
  following: [],
  pendingRequests: [],
  sentRequests: [],
  suggestedUsers: [],
  searchResults: [],
  onlineUsers: new Set(),
  blockedUsers: new Set(),
  isLoading: false,

  // ===== FOLLOW REQUEST SYSTEM =====

  sendFollowRequest: async (currentUserId, targetUserId) => {
    const { data, error } = await supabase
      .from("follows")
      .insert({
        follower_id: currentUserId,
        following_id: targetUserId,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("notifications").insert({
      user_id: targetUserId,
      from_user_id: currentUserId,
      type: "follow_request",
      content: "sent you a follow request",
    });

    set((state) => ({
      sentRequests: [...state.sentRequests, data as Follow],
    }));
  },

  cancelFollowRequest: async (currentUserId, targetUserId) => {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .eq("status", "pending");

    set((state) => ({
      sentRequests: state.sentRequests.filter(
        (r) => r.following_id !== targetUserId,
      ),
    }));
  },

  acceptFollowRequest: async (followId, currentUserId) => {
    const { error } = await supabase.rpc("accept_follow_request", {
      p_follow_id: followId,
      p_user_id: currentUserId,
    });

    if (error) {
      await supabase
        .from("follows")
        .update({ status: "accepted" })
        .eq("id", followId)
        .eq("following_id", currentUserId);
    }

    const request = get().pendingRequests.find((r) => r.id === followId);
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== followId),
      followers: request?.from_user
        ? [...state.followers, request.from_user]
        : state.followers,
    }));
  },

  rejectFollowRequest: async (followId, currentUserId) => {
    const { error } = await supabase.rpc("reject_follow_request", {
      p_follow_id: followId,
      p_user_id: currentUserId,
    });

    if (error) {
      await supabase
        .from("follows")
        .delete()
        .eq("id", followId)
        .eq("following_id", currentUserId)
        .eq("status", "pending");
    }

    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== followId),
    }));
  },

  unfollowUser: async (currentUserId, targetUserId) => {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId);
    if (error) throw new Error(error.message);

    set((state) => ({
      following: state.following.filter((u) => u.id !== targetUserId),
    }));
  },

  // ===== BLOCK =====

  blockUser: async (currentUserId, targetUserId) => {
    const { error } = await supabase.from("blocks").upsert(
      {
        blocker_id: currentUserId,
        blocked_id: targetUserId,
      },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );

    if (error) throw new Error(error.message);

    // Remove all follow relationships in both directions
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId);
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", targetUserId)
      .eq("following_id", currentUserId);

    set((state) => ({
      blockedUsers: new Set([...state.blockedUsers, targetUserId]),
      following: state.following.filter((u) => u.id !== targetUserId),
      followers: state.followers.filter((u) => u.id !== targetUserId),
    }));
  },

  unblockUser: async (currentUserId, targetUserId) => {
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", currentUserId)
      .eq("blocked_id", targetUserId);

    if (error) throw new Error(error.message);

    set((state) => {
      const newBlocked = new Set(state.blockedUsers);
      newBlocked.delete(targetUserId);
      return { blockedUsers: newBlocked };
    });
  },

  // ===== QUERIES =====

  isFollowing: (targetUserId) => {
    return get().following.some((u) => u.id === targetUserId);
  },

  isMutualFollow: (targetUserId) => {
    const { following, followers } = get();
    return (
      following.some((u) => u.id === targetUserId) &&
      followers.some((u) => u.id === targetUserId)
    );
  },

  hasPendingRequest: (targetUserId) => {
    const { sentRequests, pendingRequests } = get();
    if (sentRequests.some((r) => r.following_id === targetUserId))
      return "sent";
    if (pendingRequests.some((r) => r.follower_id === targetUserId))
      return "received";
    return false;
  },

  getFollowStatus: (targetUserId) => {
    const { following, followers, sentRequests, pendingRequests } = get();
    const isFollowingThem = following.some((u) => u.id === targetUserId);
    const theyFollowMe = followers.some((u) => u.id === targetUserId);

    if (isFollowingThem && theyFollowMe) return "mutual";
    if (isFollowingThem) return "following";
    if (sentRequests.some((r) => r.following_id === targetUserId))
      return "pending_sent";
    if (pendingRequests.some((r) => r.follower_id === targetUserId))
      return "pending_received";
    return "none";
  },

  // ===== FETCHES =====

  searchUsers: async (query) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or(
        `name.ilike.%${query}%,username.ilike.%${query}%,country.ilike.%${query}%`,
      )
      .limit(20);

    const results = (!error && data ? data : []) as Profile[];
    set({ searchResults: results, isLoading: false });
    return results;
  },

  fetchSuggestedUsers: async (userId) => {
    set({ isLoading: true });
    const blockedIds = [...get().blockedUsers];

    let query = supabase
      .from("profiles")
      .select("*")
      .neq("id", userId)
      .eq("is_banned", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (blockedIds.length > 0) {
      query = query.not("id", "in", `(${blockedIds.join(",")})`);
    }

    const { data, error } = await query;

    if (!error && data) {
      set({ suggestedUsers: data as Profile[], isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  fetchFollowers: async (userId) => {
    const { data } = await supabase
      .from("follows")
      .select("follower_id, profiles!follows_follower_id_fkey(*)")
      .eq("following_id", userId)
      .eq("status", "accepted");

    if (data) {
      const followers = data
        .map((f: Record<string, unknown>) => f.profiles as Profile)
        .filter(Boolean);
      set({ followers });
    }
  },

  fetchFollowing: async (userId) => {
    const { data } = await supabase
      .from("follows")
      .select("following_id, profiles!follows_following_id_fkey(*)")
      .eq("follower_id", userId)
      .eq("status", "accepted");

    if (data) {
      const following = data
        .map((f: Record<string, unknown>) => f.profiles as Profile)
        .filter(Boolean);
      set({ following });
    }
  },

  fetchBlockedUsers: async (userId) => {
    const { data } = await supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", userId);

    if (data) {
      set({ blockedUsers: new Set(data.map((b) => b.blocked_id)) });
    }
  },

  fetchPendingRequests: async (userId) => {
    const { data } = await supabase
      .from("follows")
      .select("*, from_user:profiles!follows_follower_id_fkey(*)")
      .eq("following_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data) {
      const requests = data.map((r: Record<string, unknown>) => ({
        ...(r as Follow),
        from_user: r.from_user as Profile | undefined,
      }));
      set({ pendingRequests: requests });
    }
  },

  fetchSentRequests: async (userId) => {
    const { data } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", userId)
      .eq("status", "pending");

    if (data) {
      set({ sentRequests: data as Follow[] });
    }
  },

  fetchMutualFriends: async (userId) => {
    const { data: myFollowing } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)
      .eq("status", "accepted");

    const { data: myFollowers } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", userId)
      .eq("status", "accepted");

    if (!myFollowing || !myFollowers) return [];

    const followingIds = new Set(myFollowing.map((f) => f.following_id));
    const followerIds = new Set(myFollowers.map((f) => f.follower_id));
    const mutualIds = [...followingIds].filter((id) => followerIds.has(id));

    if (mutualIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", mutualIds);

    return (profiles as Profile[]) || [];
  },

  setOnlineUsers: (ids) => {
    set({ onlineUsers: new Set(ids) });
  },
}));
