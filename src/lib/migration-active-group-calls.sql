-- Migration: Create active_group_calls table for "Join Call" banner feature
-- This table tracks which groups have an active call so that
-- group members can see a "Join Call" banner in the group chat.

CREATE TABLE IF NOT EXISTS active_group_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id)
);

-- Enable RLS
ALTER TABLE active_group_calls ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read active calls (for the banner)
CREATE POLICY "Anyone can view active calls"
  ON active_group_calls FOR SELECT
  TO authenticated
  USING (true);

-- Allow any authenticated user to insert/delete (call host manages this)
CREATE POLICY "Authenticated users can insert active calls"
  ON active_group_calls FOR INSERT
  TO authenticated
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Authenticated users can delete active calls"
  ON active_group_calls FOR DELETE
  TO authenticated
  USING (true);

-- Auto-expire stale calls older than 10 minutes
-- (In case the host crashes without cleaning up)
-- You can set up a pg_cron job to run this periodically:
-- SELECT cron.schedule('cleanup-stale-calls', '*/5 * * * *', $$
--   DELETE FROM active_group_calls WHERE started_at < NOW() - INTERVAL '10 minutes';
-- $$);
