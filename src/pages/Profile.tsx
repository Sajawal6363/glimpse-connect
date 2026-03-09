import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, BadgeCheck, UserPlus, MessageCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockUsers } from "@/lib/mock-data";
import AppLayout from "@/components/layout/AppLayout";

const Profile = () => {
  const { username } = useParams();
  const user = username === "me" ? mockUsers[0] : mockUsers.find((u) => u.username === username) || mockUsers[0];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 text-center relative overflow-hidden"
        >
          {/* Background gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/10" />

          {/* Avatar */}
          <div className="relative z-10 mb-4">
            <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-primary-foreground ring-4 ring-primary/30 neon-glow-blue">
              {user.name[0]}
            </div>
            {user.isOnline && (
              <span className="absolute bottom-2 right-1/2 translate-x-[3.5rem] w-5 h-5 bg-neon-green rounded-full border-3 border-background" />
            )}
          </div>

          {/* Info */}
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
              {user.isVerified && <BadgeCheck className="w-5 h-5 text-primary" />}
            </div>
            <p className="text-muted-foreground text-sm mb-2">@{user.username}</p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-4">
              <MapPin className="w-4 h-4" />
              {user.countryFlag} {user.country}
            </div>
            <p className="text-foreground mb-6">{user.bio}</p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{user.followers.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{user.following.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Following</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <Button className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl px-6 neon-glow-blue">
                <UserPlus className="w-4 h-4 mr-2" /> Follow
              </Button>
              <Button variant="outline" className="glass border-border/50 rounded-xl px-6">
                <MessageCircle className="w-4 h-4 mr-2" /> Message
              </Button>
            </div>

            {/* Interests */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Interests</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {user.interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="outline"
                    className="border-primary/30 text-primary rounded-full px-4 py-1.5"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 mt-4"
        >
          <h3 className="font-semibold text-foreground mb-4">Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined March 2026</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-neon-green rounded-full" />
              <span className="text-muted-foreground">{user.isOnline ? "Currently online" : `Last seen ${user.lastSeen || "recently"}`}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Profile;
