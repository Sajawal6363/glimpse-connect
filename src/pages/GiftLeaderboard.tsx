import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Users, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useGiftStore } from "@/stores/useGiftStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { type GiftLeaderboardEntry } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type LeaderTab = "senders" | "receivers";

const PODIUM_COLORS = [
  { bg: "from-yellow-400/20 to-yellow-400/5", border: "border-yellow-400/60", text: "text-yellow-400", medal: "🥇", glow: "0 0 20px rgba(255,215,0,0.4)" },
  { bg: "from-slate-300/20 to-slate-300/5", border: "border-slate-300/60", text: "text-slate-300", medal: "🥈", glow: "0 0 20px rgba(192,192,192,0.3)" },
  { bg: "from-orange-400/20 to-orange-400/5", border: "border-orange-400/60", text: "text-orange-400", medal: "🥉", glow: "0 0 20px rgba(205,127,50,0.3)" },
];

const PODIUM_HEIGHT = ["h-32", "h-24", "h-20"];

function UserRow({ entry, rank, field }: { entry: GiftLeaderboardEntry; rank: number; field: "total_sent_value" | "total_received_value" }) {
  const name = entry.profile?.name || entry.profile?.username || "Unknown";
  const initials = getInitials(name);
  const value = entry[field];
  const isTop3 = rank <= 3;

  return (
    <motion.div
      className={`glass rounded-2xl px-4 py-3 flex items-center gap-3 border ${isTop3 ? PODIUM_COLORS[rank - 1].border : "border-border/30"}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (rank - 4) * 0.04 }}
    >
      <span className={`text-sm font-black w-6 text-center ${isTop3 ? PODIUM_COLORS[rank - 1].text : "text-muted-foreground"}`}>
        {rank}
      </span>
      <Avatar className="w-9 h-9 ring-1 ring-border/40">
        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{name}</p>
        {entry.profile?.username && (
          <p className="text-xs text-muted-foreground truncate">@{entry.profile.username}</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-bold text-sm text-yellow-400">
          {field === "total_sent_value" ? "💰" : "💎"}{value.toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}

function PodiumCard({ entry, rank, field }: { entry: GiftLeaderboardEntry; rank: number; field: "total_sent_value" | "total_received_value" }) {
  const cfg = PODIUM_COLORS[rank - 1];
  const name = entry.profile?.name || entry.profile?.username || "Unknown";
  const initials = getInitials(name);
  const value = entry[field];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl z-10">{cfg.medal}</span>
        <Avatar className={`w-14 h-14 ring-2 ${cfg.border} shadow-lg`} style={{ boxShadow: cfg.glow }}>
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary font-bold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        {entry.profile?.is_verified && (
          <span className="absolute -bottom-1 -right-1 text-sm">✅</span>
        )}
      </div>
      <div className="text-center">
        <p className="font-bold text-sm text-foreground truncate max-w-[80px]">{name}</p>
        <p className={`text-xs font-black ${cfg.text}`}>
          {field === "total_sent_value" ? "💰" : "💎"}{value.toLocaleString()}
        </p>
      </div>
      <motion.div
        className={`w-20 bg-gradient-to-t ${cfg.bg} border ${cfg.border} rounded-t-xl ${PODIUM_HEIGHT[rank - 1]} flex items-end justify-center pb-2`}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: undefined, opacity: 1 }}
        transition={{ delay: 0.2 + rank * 0.1, duration: 0.6, ease: "easeOut" }}
      >
        <span className={`text-lg font-black ${cfg.text}`}>#{rank}</span>
      </motion.div>
    </div>
  );
}

export default function GiftLeaderboard() {
  const { leaderboard, fetchLeaderboard, isLoading } = useGiftStore();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<LeaderTab>("senders");

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const field: "total_sent_value" | "total_received_value" = tab === "senders" ? "total_sent_value" : "total_received_value";
  const sorted = [...leaderboard].sort((a, b) => b[field] - a[field]);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const userRank = user ? sorted.findIndex((e) => e.user_id === user.id) + 1 : -1;

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumRanks = top3.length >= 3 ? [2, 1, 3] : [1, 2, 3];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to="/gifts/shop">
            <Button variant="ghost" size="icon" className="w-9 h-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm">Top gifters on ConnectLive</p>
          </div>
        </motion.div>

        {/* Your rank */}
        {userRank > 0 && (
          <motion.div
            className="glass border border-primary/30 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Trophy className="w-5 h-5 text-primary" />
            <p className="text-sm text-foreground">
              You are ranked{" "}
              <span className="font-black text-primary">#{userRank}</span>{" "}
              on the {tab === "senders" ? "Top Senders" : "Top Receivers"} leaderboard
            </p>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 glass rounded-2xl p-1.5">
          {[
            { key: "senders" as const, label: "Top Senders", icon: <TrendingUp className="w-4 h-4" /> },
            { key: "receivers" as const, label: "Top Receivers", icon: <Users className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === t.key ? "bg-primary text-primary-foreground neon-glow-blue" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-20">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center text-muted-foreground py-20">
            <p className="text-4xl mb-3">🏆</p>
            <p>No data yet. Start gifting!</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length >= 2 && (
              <motion.div
                className="flex items-end justify-center gap-4 mb-8 px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {podiumOrder.map((entry, i) =>
                  entry ? (
                    <PodiumCard
                      key={entry.user_id}
                      entry={entry}
                      rank={podiumRanks[i]}
                      field={field}
                    />
                  ) : null
                )}
              </motion.div>
            )}

            {/* Rest of list */}
            <div className="space-y-2">
              {rest.map((entry, i) => (
                <UserRow key={entry.user_id} entry={entry} rank={i + 4} field={field} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
