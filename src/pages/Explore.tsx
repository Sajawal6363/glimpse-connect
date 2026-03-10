import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useSocialStore } from "@/stores/useSocialStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDebounce } from "@/hooks/useDebounce";
import { type Profile } from "@/lib/supabase";
import { getInitials } from "@/lib/utils";
import PrivateImage from "@/components/PrivateImage";
import AppLayout from "@/components/layout/AppLayout";

const Explore = () => {
  const { user } = useAuthStore();
  const {
    searchResults,
    suggestedUsers,
    isLoading,
    searchUsers,
    fetchSuggestedUsers,
  } = useSocialStore();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 400);
  const [displayResults, setDisplayResults] = useState<Profile[]>([]);

  useEffect(() => {
    if (user) fetchSuggestedUsers(user.id);
  }, [user, fetchSuggestedUsers]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchUsers(debouncedQuery);
    }
  }, [debouncedQuery, searchUsers]);

  useEffect(() => {
    setDisplayResults(
      debouncedQuery.length >= 2 ? searchResults : suggestedUsers,
    );
  }, [debouncedQuery, searchResults, suggestedUsers]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Discover People
        </h1>

        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, username, or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-muted/30 border-border/30 rounded-xl"
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {debouncedQuery.length >= 2
              ? `Search results for "${debouncedQuery}"`
              : "Suggested for you"}
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="glass rounded-2xl p-5 animate-pulse h-24"
                />
              ))}
            </div>
          ) : displayResults.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No users found
              </h3>
              <p className="text-muted-foreground text-sm">
                {debouncedQuery
                  ? "Try a different search term"
                  : "Start streaming to discover new people"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayResults.map((profile, i) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/profile/${profile.username}`}
                    className="glass rounded-2xl p-5 block hover:scale-[1.02] transition-transform group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-lg font-bold text-foreground group-hover:neon-glow-blue transition-shadow overflow-hidden">
                          <PrivateImage
                            src={profile.avatar_url}
                            fallback={getInitials(
                              profile.name || profile.username,
                            )}
                          />
                        </div>
                        {profile.is_online && (
                          <span className="absolute bottom-0 right-0 w-4 h-4 bg-neon-green rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-semibold text-foreground truncate">
                            {profile.name}
                          </span>
                          {profile.is_verified && (
                            <span className="text-primary text-xs">✓</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {profile.country}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {profile.interests?.slice(0, 2).map((interest) => (
                            <Badge
                              key={interest}
                              variant="outline"
                              className="text-[10px] border-primary/20 text-primary px-2 py-0.5 rounded-full"
                            >
                              {interest}
                            </Badge>
                          ))}
                          {(profile.interests?.length || 0) > 2 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border/30 text-muted-foreground px-2 py-0.5 rounded-full"
                            >
                              +{(profile.interests?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Explore;
