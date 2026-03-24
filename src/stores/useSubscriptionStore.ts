import { create } from "zustand";
import { supabase, type Profile } from "@/lib/supabase";
import {
  COIN_PACKAGES,
  DEFAULT_PLAN_CONFIGS,
  GIFT_CATALOG,
  inferPlanFromSubscription,
  type BillingCycle,
  type FeatureKey,
  type GiftItem,
  type SubscriptionPlanConfig,
  type SubscriptionTier,
  type UserSubscription,
  type UserWallet,
  getPlanFromProfile,
  hasTierAccess,
} from "@/lib/subscription";
import { useAuthStore } from "@/stores/useAuthStore";

const SUBSCRIPTION_USAGE_KEY = "connectlive_subscription_usage";

interface UsageCounters {
  skipWindowStart: number;
  skipsUsedInWindow: number;
}

interface UpgradePromptState {
  open: boolean;
  feature: FeatureKey | null;
  title: string;
  description: string;
  suggestedPlan: SubscriptionTier;
}

interface SubscriptionState {
  isLoading: boolean;
  isInitialized: boolean;
  currentPlan: SubscriptionTier;
  planConfigs: Record<SubscriptionTier, SubscriptionPlanConfig>;
  subscription: UserSubscription | null;
  wallet: UserWallet | null;
  usageCounters: UsageCounters;
  prompt: UpgradePromptState;
  trialDays: number;
  isAdmin: boolean;
  initialize: (profile: Profile | null) => Promise<void>;
  refreshRemoteState: (userId: string) => Promise<void>;
  hasFeatureAccess: (feature: FeatureKey) => boolean;
  requireFeature: (
    feature: FeatureKey,
    prompt?: { title?: string; description?: string },
  ) => boolean;
  clearPrompt: () => void;
  getCurrentEntitlements: () => SubscriptionPlanConfig["entitlements"];
  consumeSkip: () => { ok: boolean; remaining: number | null };
  getRemainingSkips: () => number | null;
  canSendMedia: () => boolean;
  canSendVoice: () => boolean;
  canMessageNonFollowers: () => boolean;
  canUseGenderFilter: () => boolean;
  getMaxCallDurationSeconds: () => number;
  getMaxInterests: () => number | null;
  getDailyTextMessageLimit: () => number | null;
  canSendTextMessageToday: (userId: string) => Promise<boolean>;
  changePlan: (
    userId: string,
    plan: SubscriptionTier,
    billingCycle: BillingCycle,
    trial?: boolean,
  ) => Promise<void>;
  startPremiumTrial: (userId: string) => Promise<void>;
  purchaseCoins: (
    userId: string,
    packageId: string,
    paymentRef?: string,
  ) => Promise<{ added: number }>;
  sendGift: (
    senderId: string,
    receiverId: string,
    giftId: string,
    context?: { sessionId?: string | null },
  ) => Promise<void>;
  giftCatalog: GiftItem[];
  coinPackages: typeof COIN_PACKAGES;
}

const nowIso = () => new Date().toISOString();
const addDaysIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const readUsage = (): UsageCounters => {
  if (typeof window === "undefined") {
    return { skipWindowStart: Date.now(), skipsUsedInWindow: 0 };
  }

  try {
    const raw = localStorage.getItem(SUBSCRIPTION_USAGE_KEY);
    if (!raw) return { skipWindowStart: Date.now(), skipsUsedInWindow: 0 };
    const parsed = JSON.parse(raw) as UsageCounters;
    return {
      skipWindowStart: parsed.skipWindowStart || Date.now(),
      skipsUsedInWindow: parsed.skipsUsedInWindow || 0,
    };
  } catch {
    return { skipWindowStart: Date.now(), skipsUsedInWindow: 0 };
  }
};

const persistUsage = (usage: UsageCounters) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(SUBSCRIPTION_USAGE_KEY, JSON.stringify(usage));
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isLoading: false,
  isInitialized: false,
  currentPlan: "free",
  planConfigs: DEFAULT_PLAN_CONFIGS,
  subscription: null,
  wallet: null,
  usageCounters: readUsage(),
  prompt: {
    open: false,
    feature: null,
    title: "Upgrade to unlock this feature",
    description: "This feature is available on higher plans.",
    suggestedPlan: "premium",
  },
  trialDays: 3,
  isAdmin: false,
  giftCatalog: GIFT_CATALOG,
  coinPackages: COIN_PACKAGES,

  initialize: async (profile) => {
    if (!profile) {
      set({
        currentPlan: "free",
        subscription: null,
        wallet: null,
        isInitialized: true,
        isAdmin: false,
      });
      return;
    }

    set({
      isLoading: true,
      currentPlan: getPlanFromProfile(profile),
      usageCounters: readUsage(),
      isAdmin: profile.username?.toLowerCase() === "admin",
    });

    await get().refreshRemoteState(profile.id);

    const authState = useAuthStore.getState();
    set({
      isLoading: false,
      isInitialized: true,
      isAdmin:
        profile.username?.toLowerCase() === "admin" ||
        authState.user?.username?.toLowerCase() === "admin",
    });
  },

  refreshRemoteState: async (userId) => {
    const [plansResult, subscriptionResult, walletResult] = await Promise.all([
      supabase
        .from("subscription_plans")
        .select(
          "id,name,monthly_price,yearly_price,badge,highlighted,entitlements",
        )
        .order("display_order", { ascending: true }),
      supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_current", true)
        .maybeSingle(),
      supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (!plansResult.error && plansResult.data?.length) {
      const next = { ...DEFAULT_PLAN_CONFIGS };
      for (const row of plansResult.data) {
        const planId = row.id as SubscriptionTier;
        if (!(planId in next)) continue;
        next[planId] = {
          ...next[planId],
          name: row.name || next[planId].name,
          monthlyPrice: row.monthly_price ?? next[planId].monthlyPrice,
          yearlyPrice: row.yearly_price ?? next[planId].yearlyPrice,
          badge: row.badge ?? next[planId].badge,
          highlighted: row.highlighted ?? next[planId].highlighted,
          entitlements: {
            ...next[planId].entitlements,
            ...((row.entitlements as Record<string, unknown>) || {}),
          },
        };
      }
      set({ planConfigs: next });
    }

    if (!subscriptionResult.error && subscriptionResult.data) {
      const subscription = {
        userId: subscriptionResult.data.user_id,
        plan: subscriptionResult.data.plan,
        status: subscriptionResult.data.status,
        billingCycle: subscriptionResult.data.billing_cycle,
        currentPeriodStart: subscriptionResult.data.current_period_start,
        currentPeriodEnd: subscriptionResult.data.current_period_end,
        trialEndsAt: subscriptionResult.data.trial_ends_at,
        trialUsed: Boolean(subscriptionResult.data.trial_used),
        cancelAtPeriodEnd: Boolean(
          subscriptionResult.data.cancel_at_period_end,
        ),
      } as UserSubscription;

      set({
        subscription,
        currentPlan: inferPlanFromSubscription(subscription),
      });
    }

    if (!walletResult.error && walletResult.data) {
      set({
        wallet: {
          userId: walletResult.data.user_id,
          coins: walletResult.data.coins || 0,
          diamonds: walletResult.data.diamonds || 0,
          updatedAt: walletResult.data.updated_at,
        },
      });
    } else {
      set({ wallet: { userId, coins: 0, diamonds: 0 } });
    }
  },

  hasFeatureAccess: (feature) => {
    const { currentPlan } = get();
    const minimum: Record<FeatureKey, SubscriptionTier> = {
      genderFilter: "premium",
      advancedCountryFilters: "premium",
      interestBasedMatching: "premium",
      adFree: "premium",
      priorityMatching: "premium",
      topPriorityMatching: "vip",
      hdVideo: "premium",
      verifiedBadge: "premium",
      vipBadge: "vip",
      voiceMessages: "premium",
      mediaSharing: "premium",
      profileViewers: "premium",
      reconnectMatches: "premium",
      profileThemes: "vip",
      invisibleMode: "vip",
      advancedAnalytics: "vip",
      streamTimeTracking: "vip",
      connectionStats: "vip",
      profileBoost: "vip",
      messageAnyone: "vip",
      monthlyBonusCoins: "vip",
      dedicatedSupport: "vip",
    };

    return hasTierAccess(currentPlan, minimum[feature]);
  },

  requireFeature: (feature, prompt) => {
    if (get().hasFeatureAccess(feature)) return true;

    const suggestedPlan =
      feature === "topPriorityMatching" ||
      feature === "vipBadge" ||
      feature === "messageAnyone" ||
      feature === "profileThemes" ||
      feature === "invisibleMode" ||
      feature === "advancedAnalytics" ||
      feature === "streamTimeTracking" ||
      feature === "connectionStats" ||
      feature === "profileBoost" ||
      feature === "monthlyBonusCoins" ||
      feature === "dedicatedSupport"
        ? "vip"
        : "premium";

    set({
      prompt: {
        open: true,
        feature,
        title: prompt?.title || "Upgrade required",
        description:
          prompt?.description || "This feature is locked on your current plan.",
        suggestedPlan,
      },
    });

    return false;
  },

  clearPrompt: () => {
    set((state) => ({
      prompt: { ...state.prompt, open: false, feature: null },
    }));
  },

  getCurrentEntitlements: () => {
    const state = get();
    return state.planConfigs[state.currentPlan].entitlements;
  },

  consumeSkip: () => {
    const entitlements = get().getCurrentEntitlements();
    const limit = entitlements.skipLimitPerHour;

    if (!limit) {
      return { ok: true, remaining: null };
    }

    const now = Date.now();
    const current = get().usageCounters;
    const windowAge = now - current.skipWindowStart;

    let nextUsage = current;
    if (windowAge >= 60 * 60 * 1000) {
      nextUsage = { skipWindowStart: now, skipsUsedInWindow: 0 };
    }

    if (nextUsage.skipsUsedInWindow >= limit) {
      const remaining = Math.max(0, limit - nextUsage.skipsUsedInWindow);
      return { ok: false, remaining };
    }

    const updated = {
      ...nextUsage,
      skipsUsedInWindow: nextUsage.skipsUsedInWindow + 1,
    };

    persistUsage(updated);
    set({ usageCounters: updated });

    return {
      ok: true,
      remaining: Math.max(0, limit - updated.skipsUsedInWindow),
    };
  },

  getRemainingSkips: () => {
    const entitlements = get().getCurrentEntitlements();
    if (!entitlements.skipLimitPerHour) return null;

    const usage = get().usageCounters;
    const now = Date.now();
    if (now - usage.skipWindowStart >= 60 * 60 * 1000) {
      return entitlements.skipLimitPerHour;
    }

    return Math.max(0, entitlements.skipLimitPerHour - usage.skipsUsedInWindow);
  },

  canSendMedia: () => get().getCurrentEntitlements().canSendMedia,
  canSendVoice: () => get().getCurrentEntitlements().canSendVoice,
  canMessageNonFollowers: () =>
    get().getCurrentEntitlements().canMessageNonFollowers,
  canUseGenderFilter: () => get().getCurrentEntitlements().canUseGenderFilter,
  getMaxCallDurationSeconds: () =>
    get().getCurrentEntitlements().maxCallDurationMinutes * 60,
  getMaxInterests: () => get().getCurrentEntitlements().maxInterests,
  getDailyTextMessageLimit: () =>
    get().getCurrentEntitlements().textMessagesPerDay,

  canSendTextMessageToday: async (userId) => {
    const limit = get().getDailyTextMessageLimit();
    if (!limit) return true;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .eq("type", "text")
      .gte("created_at", dayStart.toISOString());

    if (error) return true;
    return (count || 0) < limit;
  },

  changePlan: async (userId, plan, billingCycle, trial = false) => {
    const start = nowIso();
    const periodEnd = addDaysIso(billingCycle === "yearly" ? 365 : 30);

    const subscriptionPayload = {
      user_id: userId,
      plan,
      status: trial ? "trialing" : "active",
      billing_cycle: billingCycle,
      current_period_start: start,
      current_period_end: trial ? addDaysIso(get().trialDays) : periodEnd,
      trial_ends_at: trial ? addDaysIso(get().trialDays) : null,
      trial_used: trial ? true : undefined,
      cancel_at_period_end: false,
      is_current: true,
      updated_at: start,
    };

    await supabase.from("user_subscriptions").upsert(subscriptionPayload, {
      onConflict: "user_id,is_current",
    });

    await supabase
      .from("profiles")
      .update({
        is_premium: plan !== "free",
        premium_plan: plan,
        is_verified: plan === "premium",
        updated_at: start,
      })
      .eq("id", userId);

    const authStore = useAuthStore.getState();
    if (authStore.user?.id === userId) {
      await authStore.updateProfile({
        is_premium: plan !== "free",
        premium_plan: plan,
        is_verified: plan === "premium",
      });
    }

    await get().refreshRemoteState(userId);
    set({ currentPlan: plan });
  },

  startPremiumTrial: async (userId) => {
    const existing = get().subscription;
    if (existing?.trialUsed) {
      throw new Error("Free trial already used on this account.");
    }

    await get().changePlan(userId, "premium", "monthly", true);
  },

  purchaseCoins: async (userId, packageId, paymentRef) => {
    const pack = COIN_PACKAGES.find((item) => item.id === packageId);
    if (!pack) throw new Error("Coin package not found.");

    const amountToAdd = pack.coins + (pack.bonusCoins || 0);

    const currentCoins = get().wallet?.coins || 0;
    const currentDiamonds = get().wallet?.diamonds || 0;

    await supabase.from("user_wallets").upsert(
      {
        user_id: userId,
        coins: currentCoins + amountToAdd,
        diamonds: currentDiamonds,
        updated_at: nowIso(),
      },
      { onConflict: "user_id" },
    );

    await supabase.from("coin_transactions").insert({
      user_id: userId,
      amount: amountToAdd,
      transaction_type: "purchase",
      metadata: {
        packageId,
        paymentRef: paymentRef || null,
        usdAmount: pack.priceUsd,
      },
    });

    set({
      wallet: {
        userId,
        coins: currentCoins + amountToAdd,
        diamonds: currentDiamonds,
        updatedAt: nowIso(),
      },
    });

    return { added: amountToAdd };
  },

  sendGift: async (senderId, receiverId, giftId, context) => {
    const gift = GIFT_CATALOG.find((item) => item.id === giftId);
    if (!gift) throw new Error("Gift not found.");

    const senderWallet = get().wallet;
    const senderCoins = senderWallet?.coins || 0;
    if (senderCoins < gift.coinCost) {
      throw new Error("Not enough coins.");
    }

    const { data: receiverWalletRow } = await supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", receiverId)
      .maybeSingle();

    const receiverCoins = receiverWalletRow?.coins || 0;
    const receiverDiamonds = receiverWalletRow?.diamonds || 0;

    await Promise.all([
      supabase.from("user_wallets").upsert(
        {
          user_id: senderId,
          coins: senderCoins - gift.coinCost,
          diamonds: senderWallet?.diamonds || 0,
          updated_at: nowIso(),
        },
        { onConflict: "user_id" },
      ),
      supabase.from("user_wallets").upsert(
        {
          user_id: receiverId,
          coins: receiverCoins,
          diamonds: receiverDiamonds + gift.coinCost,
          updated_at: nowIso(),
        },
        { onConflict: "user_id" },
      ),
      supabase.from("gift_transactions").insert({
        sender_id: senderId,
        receiver_id: receiverId,
        gift_id: gift.id,
        gift_name: gift.name,
        coin_cost: gift.coinCost,
        session_id: context?.sessionId || null,
      }),
      supabase.from("coin_transactions").insert({
        user_id: senderId,
        amount: -gift.coinCost,
        transaction_type: "gift_sent",
        metadata: {
          giftId: gift.id,
          receiverId,
          sessionId: context?.sessionId || null,
        },
      }),
      supabase.from("coin_transactions").insert({
        user_id: receiverId,
        amount: gift.coinCost,
        transaction_type: "gift_received",
        metadata: {
          giftId: gift.id,
          senderId,
          sessionId: context?.sessionId || null,
        },
      }),
    ]);

    set((state) => ({
      wallet: state.wallet
        ? {
            ...state.wallet,
            coins: state.wallet.coins - gift.coinCost,
            updatedAt: nowIso(),
          }
        : state.wallet,
    }));
  },
}));
