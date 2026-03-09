export const interests = [
  "Music", "Gaming", "Travel", "Photography", "Cooking",
  "Fitness", "Movies", "Reading", "Art", "Technology",
  "Fashion", "Sports", "Nature", "Dancing", "Comedy",
  "Science", "Anime", "Pets", "Cars", "Meditation",
  "Yoga", "Hiking", "Swimming", "Coding", "Design",
  "Writing", "Podcasts", "Investing", "Volunteering", "Languages",
] as const;

export type Interest = typeof interests[number];
