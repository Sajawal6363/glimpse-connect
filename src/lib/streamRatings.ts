export type StreamRatingDimensionKey =
  | "vibe_rating"
  | "respect_rating"
  | "energy_rating";

export type StreamRatingForm = {
  overall_rating: number;
  vibe_rating: number;
  respect_rating: number;
  energy_rating: number;
  would_reconnect: boolean;
};

export type ProfileRatingSummary = {
  user_id: string;
  rating_count: number;
  aura_score: number;
  vibe_score: number;
  respect_score: number;
  energy_score: number;
  reconnect_rate: number;
  last_rated_at: string | null;
};

export const STREAM_RATING_MIN_DURATION = 30;

export const STREAM_RATING_DIMENSIONS: {
  key: StreamRatingDimensionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "vibe_rating",
    label: "Vibe",
    description: "Kitni naturally conversation flow hui",
  },
  {
    key: "respect_rating",
    label: "Respect",
    description: "Call kitni safe aur respectful lagi",
  },
  {
    key: "energy_rating",
    label: "Energy",
    description: "Conversation kitni engaging aur lively thi",
  },
];

export const createDefaultStreamRatingForm = (): StreamRatingForm => ({
  overall_rating: 5,
  vibe_rating: 5,
  respect_rating: 5,
  energy_rating: 5,
  would_reconnect: true,
});

export const getAuraLabel = (score: number) => {
  if (score >= 4.8) return "Magnetic";
  if (score >= 4.4) return "Standout";
  if (score >= 4) return "Strong";
  if (score >= 3.4) return "Promising";
  if (score >= 2.8) return "Warm";
  return "New Energy";
};

export const getAuraCaption = (score: number) => {
  if (score >= 4.5)
    return "People usually leave this call wanting one more minute.";
  if (score >= 4)
    return "Consistently good conversations and memorable presence.";
  if (score >= 3)
    return "Solid stream chemistry with room to become unforgettable.";
  return "Fresh profile — aura builds as more people rate the experience.";
};
