export interface MockUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  country: string;
  countryFlag: string;
  bio: string;
  interests: string[];
  isOnline: boolean;
  isVerified: boolean;
  followers: number;
  following: number;
  lastSeen?: string;
}

export const mockUsers: MockUser[] = [
  {
    id: "1", name: "Sofia Rivera", username: "sofiaR", avatar: "",
    country: "Spain", countryFlag: "🇪🇸", bio: "Travel addict & music lover ✈️🎵",
    interests: ["Travel", "Music", "Photography"], isOnline: true, isVerified: true,
    followers: 1243, following: 567,
  },
  {
    id: "2", name: "Alex Chen", username: "alexc", avatar: "",
    country: "Canada", countryFlag: "🇨🇦", bio: "Gamer & tech enthusiast 🎮",
    interests: ["Gaming", "Technology", "Anime"], isOnline: true, isVerified: false,
    followers: 892, following: 234,
  },
  {
    id: "3", name: "Yuki Tanaka", username: "yukiT", avatar: "",
    country: "Japan", countryFlag: "🇯🇵", bio: "Artist exploring the digital world 🎨",
    interests: ["Art", "Design", "Anime"], isOnline: false, isVerified: true,
    followers: 3421, following: 189, lastSeen: "2 hours ago",
  },
  {
    id: "4", name: "Marcus Johnson", username: "marcusJ", avatar: "",
    country: "United States", countryFlag: "🇺🇸", bio: "Fitness coach & motivator 💪",
    interests: ["Fitness", "Sports", "Cooking"], isOnline: true, isVerified: false,
    followers: 567, following: 432,
  },
  {
    id: "5", name: "Priya Sharma", username: "priyaS", avatar: "",
    country: "India", countryFlag: "🇮🇳", bio: "Dancer & yoga instructor 🧘‍♀️",
    interests: ["Dancing", "Yoga", "Meditation"], isOnline: false, isVerified: true,
    followers: 2100, following: 310, lastSeen: "30 min ago",
  },
  {
    id: "6", name: "Liam O'Brien", username: "liamOB", avatar: "",
    country: "Ireland", countryFlag: "🇮🇪", bio: "Comedy & podcasts are my thing 😂",
    interests: ["Comedy", "Podcasts", "Music"], isOnline: true, isVerified: false,
    followers: 445, following: 678,
  },
];

export interface MockMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export const mockConversations = [
  {
    user: mockUsers[0],
    lastMessage: "Hey! That was such a fun stream 😄",
    timestamp: "2 min ago",
    unread: 3,
  },
  {
    user: mockUsers[2],
    lastMessage: "Check out this artwork I made!",
    timestamp: "15 min ago",
    unread: 1,
  },
  {
    user: mockUsers[3],
    lastMessage: "Let's connect again tomorrow",
    timestamp: "1 hour ago",
    unread: 0,
  },
  {
    user: mockUsers[4],
    lastMessage: "Thanks for the follow! 🙏",
    timestamp: "3 hours ago",
    unread: 0,
  },
];

export const mockChatMessages: MockMessage[] = [
  { id: "m1", senderId: "1", content: "Hey! Great to connect with you 👋", timestamp: "10:30 AM", isRead: true },
  { id: "m2", senderId: "me", content: "Hey Sofia! Yeah it was awesome talking!", timestamp: "10:31 AM", isRead: true },
  { id: "m3", senderId: "1", content: "Have you traveled anywhere recently?", timestamp: "10:32 AM", isRead: true },
  { id: "m4", senderId: "me", content: "Actually I just got back from Tokyo! 🇯🇵", timestamp: "10:33 AM", isRead: true },
  { id: "m5", senderId: "1", content: "No way! That's on my bucket list! Tell me everything 😍", timestamp: "10:34 AM", isRead: true },
  { id: "m6", senderId: "1", content: "Hey! That was such a fun stream 😄", timestamp: "10:45 AM", isRead: false },
];

export const mockNotifications = [
  { id: "n1", type: "follow", user: mockUsers[1], message: "started following you", time: "5 min ago" },
  { id: "n2", type: "online", user: mockUsers[0], message: "is now online", time: "10 min ago" },
  { id: "n3", type: "message", user: mockUsers[2], message: "sent you a message", time: "30 min ago" },
  { id: "n4", type: "follow", user: mockUsers[5], message: "started following you", time: "1 hour ago" },
  { id: "n5", type: "system", user: null, message: "Welcome to ConnectLive! Complete your profile to get started.", time: "2 hours ago" },
];
