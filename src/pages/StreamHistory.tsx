import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Clock, SkipForward, Flag, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PrivateAvatarImage from "@/components/PrivateAvatarImage";
import AppLayout from "@/components/layout/AppLayout";
import { supabase, type Profile } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getInitials } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  was_skipped: boolean;
  was_reported: boolean;
  stranger: Profile | null;
}

const StreamHistory = () => {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const fetchHistory = useCallback(
    async (pageNum: number) => {
      if (!user?.id) return;
      setLoading(true);

      // Fetch sessions where the user was involved and duration >= 30s
      const { data: sessions, error } = await supabase
        .from("stream_sessions")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .not("duration", "is", null)
        .gte("duration", 30)
        .order("started_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error("[StreamHistory] Error fetching:", error);
        setLoading(false);
        return;
      }

      if (!sessions || sessions.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // For each session, fetch the stranger's profile
      const enriched: HistoryEntry[] = await Promise.all(
        (sessions || []).map(async (s) => {
          const strangerId = s.user1_id === user.id ? s.user2_id : s.user1_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", strangerId)
            .maybeSingle();
          return {
            ...s,
            stranger: profile as Profile | null,
          };
        }),
      );

      setEntries((prev) => (pageNum === 0 ? enriched : [...prev, ...enriched]));
      setLoading(false);
    },
    [user?.id],
  );

  useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center neon-glow-blue">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Stream History
            </h1>
            <p className="text-sm text-muted-foreground">
              People you've talked to for 30+ seconds
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {entries.length}
            </span>
            <span className="text-xs text-muted-foreground">conversations</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">
              {formatDuration(
                entries.reduce((sum, e) => sum + (e.duration || 0), 0),
              )}
            </span>
            <span className="text-xs text-muted-foreground">total time</span>
          </div>
        </div>

        {/* History list */}
        {loading && entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Loading history...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Video className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No history yet
            </h3>
            <p className="text-muted-foreground text-sm text-center max-w-xs mb-4">
              Your stream history will appear here after you have a conversation
              lasting at least 30 seconds.
            </p>
            <Button asChild className="rounded-xl">
              <Link to="/stream">Start Streaming</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {entries.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                >
                  {/* Avatar */}
                  {entry.stranger ? (
                    <Link to={`/profile/${entry.stranger.username}`}>
                      <Avatar className="w-11 h-11 ring-2 ring-primary/20">
                        <PrivateAvatarImage
                          path={entry.stranger.avatar_url}
                          alt={entry.stranger.username}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground">
                          {getInitials(
                            entry.stranger.name || entry.stranger.username,
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Avatar className="w-11 h-11 ring-2 ring-border/30">
                      <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                        ?
                      </AvatarFallback>
                    </Avatar>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.stranger ? (
                        <Link
                          to={`/profile/${entry.stranger.username}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                        >
                          {entry.stranger.name || entry.stranger.username}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          Deleted User
                        </span>
                      )}
                      {entry.stranger?.country && (
                        <span className="text-xs text-muted-foreground">
                          {entry.stranger.country_code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.started_at)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDuration(entry.duration || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.was_reported && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0.5"
                      >
                        <Flag className="w-2.5 h-2.5 mr-0.5" />
                        Reported
                      </Badge>
                    )}
                    {entry.was_skipped && !entry.was_reported && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground"
                      >
                        <SkipForward className="w-2.5 h-2.5 mr-0.5" />
                        Skipped
                      </Badge>
                    )}
                    {!entry.was_skipped && !entry.was_reported && (
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-neon-green/10 text-neon-green border-neon-green/30">
                        Completed
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="glass rounded-xl border-border/50"
                >
                  {loading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StreamHistory;
