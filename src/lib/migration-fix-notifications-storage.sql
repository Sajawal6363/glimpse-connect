-- =============================================
-- Migration: Fix notifications constraint + Storage policies
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Update notifications type constraint to include 'stream_request'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_follower', 'new_message', 'user_online', 'system', 'warning', 'stream_request'));

-- 2. Storage bucket policies for 'connectlive'
-- This bucket must already exist. These policies allow uploads and reads.
CREATE POLICY "Authenticated users can upload to connectlive"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'connectlive' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view connectlive files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'connectlive');

CREATE POLICY "Users can update own connectlive files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'connectlive' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own connectlive files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'connectlive' AND auth.uid()::text = (storage.foldername(name))[1]);
