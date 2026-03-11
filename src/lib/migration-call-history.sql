-- =============================================
-- CALL HISTORY ENHANCEMENT
-- Extends existing stream_sessions table
-- Run this in Supabase SQL editor
-- =============================================

-- Add missing columns to stream_sessions for comprehensive tracking
ALTER TABLE public.stream_sessions
  ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'random' CHECK (call_type IN ('random', 'friend', 'group')),
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS initiator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS end_reason TEXT DEFAULT 'normal' CHECK (end_reason IN ('normal', 'skipped', 'reported', 'disconnected', 'declined', 'missed', 'timeout')),
  ADD COLUMN IF NOT EXISTS user1_followed_user2 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS user2_followed_user1 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gifts_sent_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gifts_received_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gifts_value_sent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gifts_value_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS connection_quality TEXT DEFAULT 'good' CHECK (connection_quality IN ('good', 'fair', 'poor')),
  ADD COLUMN IF NOT EXISTS user1_rating INTEGER CHECK (user1_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS user2_rating INTEGER CHECK (user2_rating BETWEEN 1 AND 5);

-- Create call_participants table for group calls
CREATE TABLE IF NOT EXISTS public.call_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.stream_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0,
  UNIQUE(session_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user1_type ON public.stream_sessions(user1_id, call_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user2_type ON public.stream_sessions(user2_id, call_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_group ON public.stream_sessions(group_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_session ON public.call_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.call_participants(user_id, joined_at DESC);

-- RLS
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their call participation" ON public.call_participants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert call participation" ON public.call_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their call participation" ON public.call_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Update stream_sessions RLS
DROP POLICY IF EXISTS "Users can view their sessions" ON public.stream_sessions;

CREATE POLICY "Users can view their sessions" ON public.stream_sessions
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can insert sessions" ON public.stream_sessions;
CREATE POLICY "Users can insert sessions" ON public.stream_sessions
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id OR auth.uid() = initiator_id);

DROP POLICY IF EXISTS "Users can update their sessions" ON public.stream_sessions;
CREATE POLICY "Users can update their sessions" ON public.stream_sessions
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can delete their sessions" ON public.stream_sessions;
CREATE POLICY "Users can delete their sessions" ON public.stream_sessions
  FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
