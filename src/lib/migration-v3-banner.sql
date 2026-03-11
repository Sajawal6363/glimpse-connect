-- =============================================
-- Migration V3: Add banner_url to profiles
-- =============================================

-- Add banner_url column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT '';
