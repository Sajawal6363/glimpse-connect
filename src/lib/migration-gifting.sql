-- =============================================
-- VIRTUAL GIFTING SYSTEM
-- Run this in Supabase SQL editor AFTER migration-call-history.sql
-- =============================================

-- User wallet for ConnectCoins
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  coins INTEGER DEFAULT 0 CHECK (coins >= 0),
  diamonds INTEGER DEFAULT 0 CHECK (diamonds >= 0),
  total_coins_purchased INTEGER DEFAULT 0,
  total_coins_spent INTEGER DEFAULT 0,
  total_diamonds_earned INTEGER DEFAULT 0,
  total_gifts_sent INTEGER DEFAULT 0,
  total_gifts_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gift catalog
CREATE TABLE IF NOT EXISTS public.gift_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT NOT NULL,
  coin_cost INTEGER NOT NULL CHECK (coin_cost > 0),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  animation_type TEXT NOT NULL CHECK (animation_type IN ('float', 'burst', 'fullscreen', 'premium')),
  animation_duration INTEGER DEFAULT 2000,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coin purchase transactions
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'gift_sent', 'gift_received', 'refund', 'bonus', 'admin')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT DEFAULT '',
  reference_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gift transactions (when a gift is sent)
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  gift_id UUID REFERENCES public.gift_catalog(id) ON DELETE SET NULL,
  gift_name TEXT NOT NULL,
  gift_emoji TEXT NOT NULL,
  coin_cost INTEGER NOT NULL,
  diamond_value INTEGER NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('stream_random', 'stream_friend', 'stream_group', 'chat', 'profile')),
  session_id UUID REFERENCES public.stream_sessions(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gift leaderboard
CREATE TABLE IF NOT EXISTS public.gift_leaderboard (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  total_sent_value INTEGER DEFAULT 0,
  total_received_value INTEGER DEFAULT 0,
  total_gifts_sent INTEGER DEFAULT 0,
  total_gifts_received INTEGER DEFAULT 0,
  weekly_sent_value INTEGER DEFAULT 0,
  weekly_received_value INTEGER DEFAULT 0,
  rank_position INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_user ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON public.coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_tx_sender ON public.gift_transactions(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_tx_receiver ON public.gift_transactions(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_tx_session ON public.gift_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_gift_catalog_rarity ON public.gift_catalog(rarity, sort_order);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON public.gift_leaderboard(rank_position ASC);

-- RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.user_wallets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage wallets" ON public.user_wallets
  FOR ALL USING (true);

CREATE POLICY "Anyone can view gift catalog" ON public.gift_catalog
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their gift transactions" ON public.gift_transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Public leaderboard read" ON public.gift_leaderboard
  FOR SELECT USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_wallets;

-- =============================================
-- RPC: SEND GIFT (atomic transaction)
-- =============================================
CREATE OR REPLACE FUNCTION send_gift(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_gift_id UUID,
  p_context TEXT,
  p_session_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift gift_catalog%ROWTYPE;
  v_sender_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_sender_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'Cannot send gift to yourself';
  END IF;

  SELECT * INTO v_gift FROM gift_catalog WHERE id = p_gift_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gift not found or inactive';
  END IF;

  SELECT coins INTO v_sender_balance FROM user_wallets WHERE user_id = p_sender_id FOR UPDATE;
  IF v_sender_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF v_sender_balance < v_gift.coin_cost THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  UPDATE user_wallets SET
    coins = coins - v_gift.coin_cost,
    total_coins_spent = total_coins_spent + v_gift.coin_cost,
    total_gifts_sent = total_gifts_sent + 1,
    updated_at = NOW()
  WHERE user_id = p_sender_id;

  INSERT INTO user_wallets (user_id, diamonds, total_diamonds_earned, total_gifts_received)
  VALUES (p_receiver_id, v_gift.coin_cost, v_gift.coin_cost, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    diamonds = user_wallets.diamonds + v_gift.coin_cost,
    total_diamonds_earned = user_wallets.total_diamonds_earned + v_gift.coin_cost,
    total_gifts_received = user_wallets.total_gifts_received + 1,
    updated_at = NOW();

  INSERT INTO gift_transactions (sender_id, receiver_id, gift_id, gift_name, gift_emoji, coin_cost, diamond_value, context, session_id, group_id)
  VALUES (p_sender_id, p_receiver_id, p_gift_id, v_gift.name, v_gift.emoji, v_gift.coin_cost, v_gift.coin_cost, p_context, p_session_id, p_group_id)
  RETURNING id INTO v_transaction_id;

  INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (p_sender_id, 'gift_sent', -v_gift.coin_cost, v_sender_balance - v_gift.coin_cost, 'Sent ' || v_gift.name || ' gift', v_transaction_id::TEXT);

  IF p_session_id IS NOT NULL THEN
    UPDATE stream_sessions SET
      gifts_sent_count = gifts_sent_count + CASE WHEN user1_id = p_sender_id THEN 1 ELSE 0 END,
      gifts_received_count = gifts_received_count + CASE WHEN user1_id = p_receiver_id THEN 1 ELSE 0 END
    WHERE id = p_session_id;
  END IF;

  INSERT INTO gift_leaderboard (user_id, total_sent_value, total_gifts_sent, weekly_sent_value, updated_at)
  VALUES (p_sender_id, v_gift.coin_cost, 1, v_gift.coin_cost, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_sent_value = gift_leaderboard.total_sent_value + v_gift.coin_cost,
    total_gifts_sent = gift_leaderboard.total_gifts_sent + 1,
    weekly_sent_value = gift_leaderboard.weekly_sent_value + v_gift.coin_cost,
    updated_at = NOW();

  INSERT INTO gift_leaderboard (user_id, total_received_value, total_gifts_received, weekly_received_value, updated_at)
  VALUES (p_receiver_id, v_gift.coin_cost, 1, v_gift.coin_cost, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_received_value = gift_leaderboard.total_received_value + v_gift.coin_cost,
    total_gifts_received = gift_leaderboard.total_gifts_received + 1,
    weekly_received_value = gift_leaderboard.weekly_received_value + v_gift.coin_cost,
    updated_at = NOW();

  INSERT INTO notifications (user_id, from_user_id, type, content)
  VALUES (p_receiver_id, p_sender_id, 'system', 'sent you a ' || v_gift.emoji || ' ' || v_gift.name || ' gift!');

  RETURN v_transaction_id;
END;
$$;

-- =============================================
-- RPC: RATE CALL
-- =============================================
CREATE OR REPLACE FUNCTION rate_call(
  p_session_id UUID,
  p_user_id UUID,
  p_rating INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session stream_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_session FROM stream_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.user1_id = p_user_id THEN
    UPDATE stream_sessions SET user1_rating = p_rating WHERE id = p_session_id;
  ELSIF v_session.user2_id = p_user_id THEN
    UPDATE stream_sessions SET user2_rating = p_rating WHERE id = p_session_id;
  ELSE
    RAISE EXCEPTION 'User not part of this session';
  END IF;
END;
$$;

-- =============================================
-- SEED: Gift Catalog
-- =============================================
INSERT INTO gift_catalog (name, slug, emoji, coin_cost, rarity, animation_type, animation_duration, sort_order) VALUES
  ('Heart', 'heart', '❤️', 1, 'common', 'float', 1500, 1),
  ('Thumbs Up', 'thumbs-up', '👍', 5, 'common', 'float', 1500, 2),
  ('Rose', 'rose', '🌹', 10, 'common', 'burst', 2000, 3),
  ('Star', 'star', '⭐', 15, 'common', 'float', 2000, 4),
  ('Coffee', 'coffee', '☕', 25, 'common', 'float', 2000, 5),
  ('Ice Cream', 'ice-cream', '🍦', 30, 'common', 'float', 2000, 6),
  ('Lucky Clover', 'lucky-clover', '🍀', 49, 'common', 'burst', 2500, 7),
  ('Neon Heart', 'neon-heart', '💜', 50, 'rare', 'burst', 2500, 8),
  ('Fire', 'fire', '🔥', 75, 'rare', 'burst', 3000, 9),
  ('Lightning', 'lightning', '⚡', 99, 'rare', 'burst', 3000, 10),
  ('Diamond Ring', 'diamond-ring', '💍', 100, 'rare', 'burst', 3000, 11),
  ('Rocket', 'rocket', '🚀', 150, 'rare', 'fullscreen', 3500, 12),
  ('Unicorn', 'unicorn', '🦄', 199, 'rare', 'fullscreen', 4000, 13),
  ('Crown', 'crown', '👑', 200, 'epic', 'fullscreen', 4000, 14),
  ('Sports Car', 'sports-car', '🏎️', 350, 'epic', 'fullscreen', 4000, 15),
  ('Yacht', 'yacht', '🛥️', 500, 'epic', 'fullscreen', 4500, 16),
  ('Fireworks', 'fireworks', '🎆', 599, 'epic', 'fullscreen', 5000, 17),
  ('Dragon', 'dragon', '🐉', 750, 'epic', 'fullscreen', 5000, 18),
  ('Castle', 'castle', '🏰', 999, 'epic', 'fullscreen', 5000, 19),
  ('Galaxy', 'galaxy', '🌌', 1000, 'legendary', 'premium', 6000, 20),
  ('Planet', 'planet', '🪐', 2000, 'legendary', 'premium', 7000, 21),
  ('Universe', 'universe', '✨', 5000, 'legendary', 'premium', 8000, 22),
  ('ConnectLive Crown', 'connectlive-crown', '💎', 10000, 'legendary', 'premium', 10000, 23)
ON CONFLICT (slug) DO NOTHING;
