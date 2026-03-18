-- Stream Vibeprint / rating system

CREATE TABLE IF NOT EXISTS public.stream_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.stream_sessions(id) ON DELETE CASCADE NOT NULL,
  rater_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rated_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  vibe_rating SMALLINT NOT NULL CHECK (vibe_rating BETWEEN 1 AND 5),
  respect_rating SMALLINT NOT NULL CHECK (respect_rating BETWEEN 1 AND 5),
  energy_rating SMALLINT NOT NULL CHECK (energy_rating BETWEEN 1 AND 5),
  would_reconnect BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT stream_ratings_unique_session_pair UNIQUE (session_id, rater_id, rated_user_id),
  CONSTRAINT stream_ratings_no_self_rating CHECK (rater_id <> rated_user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_ratings_rated_user ON public.stream_ratings(rated_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_ratings_rater ON public.stream_ratings(rater_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_ratings_session ON public.stream_ratings(session_id);

ALTER TABLE public.stream_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view stream ratings" ON public.stream_ratings;
CREATE POLICY "Anyone can view stream ratings" ON public.stream_ratings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert stream ratings for completed calls" ON public.stream_ratings;
CREATE POLICY "Users can insert stream ratings for completed calls" ON public.stream_ratings
FOR INSERT WITH CHECK (
  auth.uid() = rater_id
  AND EXISTS (
    SELECT 1
    FROM public.stream_sessions session
    WHERE session.id = session_id
      AND session.ended_at IS NOT NULL
      AND COALESCE(session.duration, 0) >= 30
      AND (
        (session.user1_id = rater_id AND session.user2_id = rated_user_id)
        OR (session.user2_id = rater_id AND session.user1_id = rated_user_id)
      )
  )
);

DROP POLICY IF EXISTS "Users can update their own stream ratings" ON public.stream_ratings;
CREATE POLICY "Users can update their own stream ratings" ON public.stream_ratings
FOR UPDATE USING (auth.uid() = rater_id)
WITH CHECK (auth.uid() = rater_id);

CREATE OR REPLACE VIEW public.profile_rating_summary AS
SELECT
  rated_user_id AS user_id,
  COUNT(*)::INT AS rating_count,
  ROUND(AVG(overall_rating)::NUMERIC, 2) AS aura_score,
  ROUND(AVG(vibe_rating)::NUMERIC, 2) AS vibe_score,
  ROUND(AVG(respect_rating)::NUMERIC, 2) AS respect_score,
  ROUND(AVG(energy_rating)::NUMERIC, 2) AS energy_score,
  ROUND((AVG(CASE WHEN would_reconnect THEN 1 ELSE 0 END) * 100)::NUMERIC, 0)::INT AS reconnect_rate,
  MAX(created_at) AS last_rated_at
FROM public.stream_ratings
GROUP BY rated_user_id;