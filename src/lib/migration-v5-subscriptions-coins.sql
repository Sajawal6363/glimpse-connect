-- =============================================
-- ConnectLive v5: Subscription + Coins + Gifts
-- =============================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY CHECK (id IN ('free', 'premium', 'vip')),
  name TEXT NOT NULL,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  yearly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  badge TEXT,
  highlighted BOOLEAN DEFAULT FALSE,
  entitlements JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.subscription_plans (id, name, monthly_price, yearly_price, badge, highlighted, entitlements, display_order)
VALUES
  (
    'free',
    'Free',
    0,
    0,
    NULL,
    FALSE,
    '{"skipLimitPerHour":3,"textMessagesPerDay":20,"maxInterests":5,"maxCallDurationMinutes":3,"adsEnabled":true,"canUseGenderFilter":false,"canUseAdvancedCountryFilters":false,"canSendMedia":false,"canSendVoice":false,"canSeeProfileViewers":false,"canMessageNonFollowers":false,"supportLevel":"standard"}'::jsonb,
    1
  ),
  (
    'premium',
    'Premium',
    9.99,
    79.99,
    'Most Popular',
    TRUE,
    '{"skipLimitPerHour":null,"textMessagesPerDay":null,"maxInterests":null,"maxCallDurationMinutes":60,"adsEnabled":false,"canUseGenderFilter":true,"canUseAdvancedCountryFilters":true,"canSendMedia":true,"canSendVoice":true,"canSeeProfileViewers":true,"canReconnectMatches":true,"hasVerifiedBadge":true,"priorityMatchingLevel":"priority","supportLevel":"priority"}'::jsonb,
    2
  ),
  (
    'vip',
    'VIP',
    19.99,
    149.99,
    'Exclusive',
    FALSE,
    '{"skipLimitPerHour":null,"textMessagesPerDay":null,"maxInterests":null,"maxCallDurationMinutes":60,"adsEnabled":false,"canUseGenderFilter":true,"canUseAdvancedCountryFilters":true,"canSendMedia":true,"canSendVoice":true,"canSeeProfileViewers":true,"canReconnectMatches":true,"hasVipBadge":true,"hasProfileThemes":true,"hasInvisibleMode":true,"hasAdvancedAnalytics":true,"hasStreamTimeTracking":true,"hasConnectionStats":true,"priorityMatchingLevel":"top-priority","profileBoostMultiplier":3,"monthlyBonusCoins":500,"canMessageNonFollowers":true,"supportLevel":"dedicated"}'::jsonb,
    3
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  badge = EXCLUDED.badge,
  highlighted = EXCLUDED.highlighted,
  entitlements = EXCLUDED.entitlements,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'premium', 'vip')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')) DEFAULT 'active',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  trial_used BOOLEAN DEFAULT FALSE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, is_current)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  diamonds INTEGER NOT NULL DEFAULT 0 CHECK (diamonds >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'gift_sent', 'gift_received', 'bonus', 'refund', 'admin_adjustment')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON public.coin_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.stream_sessions(id) ON DELETE SET NULL,
  gift_id TEXT NOT NULL,
  gift_name TEXT NOT NULL,
  coin_cost INTEGER NOT NULL CHECK (coin_cost > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_transactions_sender ON public.gift_transactions(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_receiver ON public.gift_transactions(receiver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON public.profile_views(viewed_id, created_at DESC);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can read subscription plans"
ON public.subscription_plans FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can read own subscriptions"
ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Authenticated users can upsert own subscriptions"
ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Authenticated users can update own subscriptions"
ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can read own wallet"
ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can write own wallet"
ON public.user_wallets FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can read own coin transactions"
ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own coin transactions"
ON public.coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can read sent/received gifts"
ON public.gift_transactions FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY IF NOT EXISTS "Users can create sent gifts"
ON public.gift_transactions FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY IF NOT EXISTS "Users can insert profile views"
ON public.profile_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY IF NOT EXISTS "Users can read own profile views"
ON public.profile_views FOR SELECT USING (auth.uid() = viewed_id);
