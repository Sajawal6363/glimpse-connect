import { motion } from "framer-motion";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockUsers } from "@/lib/mock-data";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";

const Explore = () => {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-foreground mb-6">Discover People</h1>

        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Search by name, username, or country..." className="pl-11 h-12 bg-muted/30 border-border/30 rounded-xl" />
          </div>
          <Button variant="outline" className="glass border-border/50 rounded-xl h-12">
            <Filter className="w-4 h-4 mr-2" /> Filters
          </Button>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Suggested for you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockUsers.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/profile/${user.username}`}
                  className="glass rounded-2xl p-5 block hover:scale-[1.02] transition-transform group"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-lg font-bold text-foreground group-hover:neon-glow-blue transition-shadow">
                        {user.name[0]}
                      </div>
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-neon-green rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-foreground truncate">{user.name}</span>
                        {user.isVerified && (
                          <span className="text-primary text-xs">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {user.countryFlag} {user.country}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {user.interests.slice(0, 2).map((interest) => (
                          <Badge key={interest} variant="outline" className="text-[10px] border-primary/20 text-primary px-2 py-0.5 rounded-full">
                            {interest}
                          </Badge>
                        ))}
                        {user.interests.length > 2 && (
                          <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground px-2 py-0.5 rounded-full">
                            +{user.interests.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Explore;
