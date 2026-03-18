export type FloatingPhoto = {
  src: string;
  name: string;
  country: string;
};

export const floatingPhotos: FloatingPhoto[] = [
  {
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    name: "Sophie",
    country: "France",
  },
  {
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    name: "James",
    country: "Australia",
  },
  {
    src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
    name: "Yuki",
    country: "Japan",
  },
  {
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
    name: "Carlos",
    country: "Brazil",
  },
  {
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
    name: "Aisha",
    country: "Nigeria",
  },
  {
    src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
    name: "Liam",
    country: "Ireland",
  },
  {
    src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
    name: "Priya",
    country: "India",
  },
  {
    src: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80",
    name: "Erik",
    country: "Sweden",
  },
  {
    src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80",
    name: "Mia",
    country: "USA",
  },
  {
    src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80",
    name: "Lin",
    country: "China",
  },
  {
    src: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=80",
    name: "Emma",
    country: "Germany",
  },
  {
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
    name: "Omar",
    country: "Egypt",
  },
];

export const floatingPhotoAvatars = floatingPhotos.map((photo) => ({
  url: photo.src,
  initials: photo.name.slice(0, 2).toUpperCase(),
}));
