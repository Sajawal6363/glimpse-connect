-- =============================================
-- V2 Feature Migration: Follow Requests, Gallery, Group Blocks, Notification Cleanup
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. FOLLOW REQUESTS: Convert follows from instant to request-based
-- =============================================

-- Add status column to follows table
ALTER TABLE public.follows 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Set all existing follows to 'accepted' so nothing breaks
UPDATE public.follows SET status = 'accepted' WHERE status IS NULL OR status = 'pending';

-- Add notification type for follow requests
-- (The existing CHECK constraint may need updating — drop and recreate)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('new_follower', 'new_message', 'user_online', 'system', 'warning', 'stream_request', 'follow_request', 'follow_accepted'));

-- Index for fast follow-request lookups
CREATE INDEX IF NOT EXISTS idx_follows_status ON public.follows(following_id, status);

-- =============================================
-- 2. USER GALLERY
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  caption TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Max 5 images per user enforced at app level
CREATE INDEX IF NOT EXISTS idx_gallery_user ON public.user_gallery(user_id, created_at DESC);

-- RLS for gallery
ALTER TABLE public.user_gallery ENABLE ROW LEVEL SECURITY;

-- Users can manage their own gallery
CREATE POLICY "Users can manage own gallery" ON public.user_gallery
  FOR ALL USING (auth.uid() = user_id);

-- Public images viewable by all authenticated users
CREATE POLICY "Public gallery images viewable by authenticated users" ON public.user_gallery
  FOR SELECT USING (
    is_public = true 
    OR auth.uid() = user_id
    OR (
      -- Private images viewable by accepted friends (mutual follows)
      is_public = false
      AND EXISTS (
        SELECT 1 FROM public.follows f1
        JOIN public.follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
        WHERE f1.follower_id = user_id 
          AND f1.following_id = auth.uid()
          AND f1.status = 'accepted'
          AND f2.status = 'accepted'
      )
    )
  );

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gallery;

-- =============================================
-- 3. GROUP BLOCKS (block entire groups) 
-- =============================================
-- We'll reuse the existing blocks table for user blocks
-- and add a group_blocks table for muting/blocking groups

CREATE TABLE IF NOT EXISTS public.group_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

ALTER TABLE public.group_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their group blocks" ON public.group_blocks
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- 4. NOTIFICATION READ + AUTO-CLEANUP
-- =============================================

-- Add read_at column for 72-hour cleanup tracking
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Function to auto-delete read notifications older than 72 hours
-- This can be called via a Supabase cron job or on fetch
CREATE OR REPLACE FUNCTION cleanup_old_read_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = true
    AND read_at IS NOT NULL
    AND read_at < NOW() - INTERVAL '72 hours';
END;
$$;

-- =============================================
-- 5. RPC HELPERS
-- =============================================

-- Accept follow request
CREATE OR REPLACE FUNCTION accept_follow_request(p_follow_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.follows 
  SET status = 'accepted'
  WHERE id = p_follow_id AND following_id = p_user_id;
  
  -- Create notification for the follower
  INSERT INTO public.notifications (user_id, from_user_id, type, content)
  SELECT follower_id, p_user_id, 'follow_accepted', 'accepted your follow request'
  FROM public.follows WHERE id = p_follow_id;
END;
$$;

-- Reject follow request
CREATE OR REPLACE FUNCTION reject_follow_request(p_follow_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.follows 
  WHERE id = p_follow_id AND following_id = p_user_id AND status = 'pending';
END;
$$;
