export type SubscriptionTier = "free" | "premium" | "vip";
export type BillingCycle = "monthly" | "yearly";

export type FeatureKey =
  | "genderFilter"
  | "advancedCountryFilters"
  | "interestBasedMatching"
  | "adFree"
  | "priorityMatching"
  | "topPriorityMatching"
  | "hdVideo"
  | "verifiedBadge"
  | "vipBadge"
  | "voiceMessages"
  | "mediaSharing"
  | "profileViewers"
  | "reconnectMatches"
  | "profileThemes"
  | "invisibleMode"
  | "advancedAnalytics"
  | "streamTimeTracking"
  | "connectionStats"
  | "profileBoost"
  | "messageAnyone"
  | "monthlyBonusCoins"
  | "dedicatedSupport";

export interface PlanEntitlements {
  skipLimitPerHour: number | null;
  textMessagesPerDay: number | null;
  maxInterests: number | null;
  maxCallDurationMinutes: number;
  adsEnabled: boolean;
  canMessageNonFollowers: boolean;
  canSendMedia: boolean;
  canSendVoice: boolean;
  canUseGenderFilter: boolean;
  canUseAdvancedCountryFilters: boolean;
  canSeeProfileViewers: boolean;
  canReconnectMatches: boolean;
  hasVerifiedBadge: boolean;
  hasVipBadge: boolean;
  hasProfileThemes: boolean;
  hasInvisibleMode: boolean;
  hasAdvancedAnalytics: boolean;
  hasStreamTimeTracking: boolean;
  hasConnectionStats: boolean;
  priorityMatchingLevel: "standard" | "priority" | "top-priority";
  profileBoostMultiplier: number;
  monthlyBonusCoins: number;
  supportLevel: "standard" | "priority" | "dedicated";
}

export interface SubscriptionPlanConfig {
  id: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  badge: string | null;
  highlighted: boolean;
  entitlements: PlanEntitlements;
}

export interface UserSubscription {
  userId: string;
  plan: SubscriptionTier;
  status: "active" | "trialing" | "past_due" | "canceled";
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  trialUsed: boolean;
  cancelAtPeriodEnd: boolean;
}

export interface UserWallet {
  userId: string;
  coins: number;
  diamonds: number;
  updatedAt?: string;
}

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  coinCost: number;
}

export const GIFT_CATALOG: GiftItem[] = [
  { id: "rose", name: "Rose", emoji: "🌹", coinCost: 10 },
  { id: "heart", name: "Heart", emoji: "❤️", coinCost: 25 },
  { id: "crown", name: "Crown", emoji: "👑", coinCost: 75 },
  { id: "diamond", name: "Diamond", emoji: "💎", coinCost: 150 },
  { id: "rocket", name: "Rocket", emoji: "🚀", coinCost: 300 },
];

export interface CoinPackage {
  id: string;
  coins: number;
  priceUsd: number;
  bonusCoins?: number;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: "coins_100", coins: 100, priceUsd: 1.99 },
  { id: "coins_550", coins: 500, bonusCoins: 50, priceUsd: 8.99 },
  { id: "coins_1200", coins: 1000, bonusCoins: 200, priceUsd: 15.99 },
  { id: "coins_3500", coins: 3000, bonusCoins: 500, priceUsd: 39.99 },
];

export const DEFAULT_PLAN_CONFIGS: Record<
  SubscriptionTier,
  SubscriptionPlanConfig
> = {
  free: {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    badge: null,
    highlighted: false,
    entitlements: {
      skipLimitPerHour: 3,
      textMessagesPerDay: 20,
      maxInterests: 5,
      maxCallDurationMinutes: 3,
      adsEnabled: true,
      canMessageNonFollowers: false,
      canSendMedia: false,
      canSendVoice: false,
      canUseGenderFilter: false,
      canUseAdvancedCountryFilters: false,
      canSeeProfileViewers: false,
      canReconnectMatches: false,
      hasVerifiedBadge: false,
      hasVipBadge: false,
      hasProfileThemes: false,
      hasInvisibleMode: false,
      hasAdvancedAnalytics: false,
      hasStreamTimeTracking: false,
      hasConnectionStats: false,
      priorityMatchingLevel: "standard",
      profileBoostMultiplier: 1,
      monthlyBonusCoins: 0,
      supportLevel: "standard",
    },
  },
  premium: {
    id: "premium",
    name: "Premium",
    monthlyPrice: 9.99,
    yearlyPrice: 79.99,
    badge: "Most Popular",
    highlighted: true,
    entitlements: {
      skipLimitPerHour: null,
      textMessagesPerDay: null,
      maxInterests: null,
      maxCallDurationMinutes: 60,
      adsEnabled: false,
      canMessageNonFollowers: false,
      canSendMedia: true,
      canSendVoice: true,
      canUseGenderFilter: true,
      canUseAdvancedCountryFilters: true,
      canSeeProfileViewers: true,
      canReconnectMatches: true,
      hasVerifiedBadge: true,
      hasVipBadge: false,
      hasProfileThemes: false,
      hasInvisibleMode: false,
      hasAdvancedAnalytics: false,
      hasStreamTimeTracking: false,
      hasConnectionStats: false,
      priorityMatchingLevel: "priority",
      profileBoostMultiplier: 1,
      monthlyBonusCoins: 0,
      supportLevel: "priority",
    },
  },
  vip: {
    id: "vip",
    name: "VIP",
    monthlyPrice: 19.99,
    yearlyPrice: 149.99,
    badge: "Exclusive",
    highlighted: false,
    entitlements: {
      skipLimitPerHour: null,
      textMessagesPerDay: null,
      maxInterests: null,
      maxCallDurationMinutes: 60,
      adsEnabled: false,
      canMessageNonFollowers: true,
      canSendMedia: true,
      canSendVoice: true,
      canUseGenderFilter: true,
      canUseAdvancedCountryFilters: true,
      canSeeProfileViewers: true,
      canReconnectMatches: true,
      hasVerifiedBadge: false,
      hasVipBadge: true,
      hasProfileThemes: true,
      hasInvisibleMode: true,
      hasAdvancedAnalytics: true,
      hasStreamTimeTracking: true,
      hasConnectionStats: true,
      priorityMatchingLevel: "top-priority",
      profileBoostMultiplier: 3,
      monthlyBonusCoins: 500,
      supportLevel: "dedicated",
    },
  },
};

export const FEATURE_MIN_PLAN: Record<FeatureKey, SubscriptionTier> = {
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

export const TIER_WEIGHT: Record<SubscriptionTier, number> = {
  free: 0,
  premium: 1,
  vip: 2,
};

export const hasTierAccess = (
  current: SubscriptionTier,
  minimum: SubscriptionTier,
): boolean => TIER_WEIGHT[current] >= TIER_WEIGHT[minimum];

export const getPlanFromProfile = (
  profile?: {
    premium_plan?: string | null;
    is_premium?: boolean | null;
  } | null,
): SubscriptionTier => {
  if (!profile) return "free";
  if (profile.premium_plan === "vip") return "vip";
  if (profile.premium_plan === "premium") return "premium";
  return profile.is_premium ? "premium" : "free";
};

export const inferPlanFromSubscription = (
  subscription: Pick<
    UserSubscription,
    "status" | "plan" | "trialEndsAt"
  > | null,
): SubscriptionTier => {
  if (!subscription) return "free";
  if (subscription.status === "trialing") return "premium";
  if (subscription.status === "active") return subscription.plan;
  return "free";
};

export const getSuggestedUpgrade = (feature: FeatureKey): SubscriptionTier =>
  FEATURE_MIN_PLAN[feature];

export const isAdminUser = (
  user?: {
    email?: string | null;
    username?: string | null;
  } | null,
): boolean => {
  if (!user?.email) return false;
  const configured = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((item: string) => item.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length === 0) {
    return user.username?.toLowerCase() === "admin";
  }

  return configured.includes(user.email.toLowerCase());
};
