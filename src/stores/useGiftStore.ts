import { create } from "zustand";
import { supabase, type Gift, type GiftTransaction, type UserWallet, type CoinTransaction, type GiftLeaderboardEntry, type Profile } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface GiftState {
  wallet: UserWallet | null;
  gifts: Gift[];
  sentHistory: GiftTransaction[];
  receivedHistory: GiftTransaction[];
  leaderboard: GiftLeaderboardEntry[];
  coinTransactions: CoinTransaction[];
  isLoading: boolean;
  isSending: boolean;
  activeAnimation: GiftTransaction | null;
  incomingGiftQueue: GiftTransaction[];

  // Wallet
  fetchWallet: (userId: string) => Promise<void>;
  ensureWallet: (userId: string) => Promise<void>;

  // Gift catalog
  fetchGifts: () => Promise<void>;
  getGiftsByRarity: (rarity: string) => Gift[];

  // Send gift
  sendGift: (params: {
    senderId: string;
    receiverId: string;
    giftId: string;
    context: string;
    sessionId?: string;
    groupId?: string;
  }) => Promise<GiftTransaction | null>;

  // Purchase coins (mock — real Stripe integration goes here)
  purchaseCoins: (userId: string, coins: number, price: number) => Promise<void>;

  // History
  fetchSentGifts: (userId: string) => Promise<void>;
  fetchReceivedGifts: (userId: string) => Promise<void>;
  fetchCoinTransactions: (userId: string) => Promise<void>;

  // Leaderboard
  fetchLeaderboard: () => Promise<void>;

  // Animation queue
  triggerAnimation: (gift: GiftTransaction) => void;
  clearAnimation: () => void;
  addIncomingGift: (gift: GiftTransaction) => void;
  removeIncomingGift: (id: string) => void;

  // Real-time subscription
  subscribeToGifts: (userId: string, callback: (gift: GiftTransaction) => void) => void;
  unsubscribeFromGifts: () => void;
}

export const useGiftStore = create<GiftState>((set, get) => ({
  wallet: null,
  gifts: [],
  sentHistory: [],
  receivedHistory: [],
  leaderboard: [],
  coinTransactions: [],
  isLoading: false,
  isSending: false,
  activeAnimation: null,
  incomingGiftQueue: [],

  fetchWallet: async (userId: string) => {
    const { data } = await supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) set({ wallet: data as UserWallet });
  },

  ensureWallet: async (userId: string) => {
    const { data: existing } = await supabase
      .from("user_wallets")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_wallets").insert({ user_id: userId, coins: 0, diamonds: 0 });
    }
    await get().fetchWallet(userId);
  },

  fetchGifts: async () => {
    set({ isLoading: true });
    const { data } = await supabase
      .from("gift_catalog")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (data) set({ gifts: data as Gift[] });
    set({ isLoading: false });
  },

  getGiftsByRarity: (rarity: string) => {
    return get().gifts.filter((g) => g.rarity === rarity);
  },

  sendGift: async ({ senderId, receiverId, giftId, context, sessionId, groupId }) => {
    set({ isSending: true });
    try {
      const { data, error } = await supabase.rpc("send_gift", {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_gift_id: giftId,
        p_context: context,
        p_session_id: sessionId ?? null,
        p_group_id: groupId ?? null,
      });

      if (error) throw new Error(error.message);

      // Refresh wallet
      await get().fetchWallet(senderId);

      // Fetch the transaction for animation
      const { data: tx } = await supabase
        .from("gift_transactions")
        .select("*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)")
        .eq("id", data)
        .single();

      if (tx) {
        const txTyped = tx as GiftTransaction & { sender: Profile; receiver: Profile };
        get().triggerAnimation(txTyped);
        return txTyped;
      }
      return null;
    } catch (err) {
      console.error("sendGift error:", err);
      return null;
    } finally {
      set({ isSending: false });
    }
  },

  purchaseCoins: async (userId: string, coins: number, price: number) => {
    // Mock implementation — replace with real Stripe integration
    set({ isLoading: true });
    try {
      // In production: call Stripe, get payment confirmation, then call a Supabase RPC
      // For now, directly credit coins (dev/demo mode only)
      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("coins")
        .eq("user_id", userId)
        .single();

      const currentCoins = (wallet as UserWallet | null)?.coins ?? 0;

      await supabase.from("user_wallets").upsert({
        user_id: userId,
        coins: currentCoins + coins,
        total_coins_purchased: currentCoins + coins,
        updated_at: new Date().toISOString(),
      });

      await supabase.from("coin_transactions").insert({
        user_id: userId,
        type: "purchase",
        amount: coins,
        balance_after: currentCoins + coins,
        description: `Purchased ${coins} ConnectCoins for $${price}`,
      });

      await get().fetchWallet(userId);
    } catch (err) {
      console.error("purchaseCoins error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSentGifts: async (userId: string) => {
    const { data } = await supabase
      .from("gift_transactions")
      .select("*, receiver:profiles!receiver_id(id, username, name, avatar_url)")
      .eq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) set({ sentHistory: data as unknown as GiftTransaction[] });
  },

  fetchReceivedGifts: async (userId: string) => {
    const { data } = await supabase
      .from("gift_transactions")
      .select("*, sender:profiles!sender_id(id, username, name, avatar_url)")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) set({ receivedHistory: data as unknown as GiftTransaction[] });
  },

  fetchCoinTransactions: async (userId: string) => {
    const { data } = await supabase
      .from("coin_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) set({ coinTransactions: data as CoinTransaction[] });
  },

  fetchLeaderboard: async () => {
    const { data } = await supabase
      .from("gift_leaderboard")
      .select("*, profile:profiles!user_id(id, username, name, avatar_url, is_verified)")
      .order("total_sent_value", { ascending: false })
      .limit(100);
    if (data) set({ leaderboard: data as unknown as GiftLeaderboardEntry[] });
  },

  triggerAnimation: (gift: GiftTransaction) => {
    set({ activeAnimation: gift });
  },

  clearAnimation: () => {
    set({ activeAnimation: null });
  },

  addIncomingGift: (gift: GiftTransaction) => {
    set((state) => ({
      incomingGiftQueue: [gift, ...state.incomingGiftQueue].slice(0, 5),
    }));
    setTimeout(() => {
      get().removeIncomingGift(gift.id);
    }, 4000);
  },

  removeIncomingGift: (id: string) => {
    set((state) => ({
      incomingGiftQueue: state.incomingGiftQueue.filter((g) => g.id !== id),
    }));
  },

  subscribeToGifts: (userId: string, callback: (gift: GiftTransaction) => void) => {
    supabase
      .channel(`gifts:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gift_transactions",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const raw = payload.new as GiftTransaction;
          // Fetch sender profile
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, username, name, avatar_url")
            .eq("id", raw.sender_id)
            .single();
          const gift = { ...raw, sender: sender as Profile };
          callback(gift);
          get().addIncomingGift(gift);
          get().triggerAnimation(gift);
        }
      )
      .subscribe();
  },

  unsubscribeFromGifts: () => {
    supabase.channel("gifts").unsubscribe();
  },
}));
