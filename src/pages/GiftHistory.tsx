import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Inbox, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGiftStore } from "@/stores/useGiftStore";
import { type GiftTransaction, type CoinTransaction } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

type Tab = "sent" | "received" | "coins";

const RARITY_BG: Record<string, string> = {
  legendary: "from-yellow-400/10 to-orange-400/5 border-yellow-400/30",
  epic: "from-purple-400/10 to-pink-400/5 border-purple-400/30",
  rare: "from-cyan-400/10 to-blue-400/5 border-cyan-400/30",
  common: "from-white/5 to-transparent border-border/40",
};

function getRarity(cost: number): string {
  if (cost >= 1000) return "legendary";
  if (cost >= 200) return "epic";
  if (cost >= 50) return "rare";
  return "common";
}

function GiftRow({ gift, type }: { gift: GiftTransaction; type: "sent" | "received" }) {
  const isSent = type === "sent";
  const person = isSent ? gift.receiver : gift.sender;
  const rarity = getRarity(gift.coin_cost);
  const bgClass = RARITY_BG[rarity];
  const name = person?.name || person?.username || "Unknown";
  const initials = getInitials(name);

  return (
    <motion.div
      className={`glass bg-gradient-to-r ${bgClass} border rounded-2xl p-4 flex items-center gap-3`}
      initial={{ opacity: 0, x: isSent ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{gift.gift_emoji}</span>
          <span className="font-semibold text-foreground text-sm truncate">{gift.gift_name}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isSent ? "To" : "From"}{" "}
          <span className="text-foreground font-medium">@{person?.username ?? "?"}</span>
          {" · "}
          {formatDistanceToNow(new Date(gift.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="text-right shrink-0">
        {isSent ? (
          <span className="text-sm font-bold text-red-400">-{gift.coin_cost}💰</span>
        ) : (
          <span className="text-sm font-bold text-green-400">+{gift.diamond_value}💎</span>
        )}
        <p className="text-xs text-muted-foreground capitalize mt-0.5">{gift.context.replace("_", " ")}</p>
      </div>
    </motion.div>
  );
}

function CoinRow({ tx }: { tx: CoinTransaction }) {
  const isCredit = tx.amount > 0;
  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 border border-border/30">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? "bg-green-400/10" : "bg-red-400/10"}`}>
        {isCredit ? <Inbox className="w-4 h-4 text-green-400" /> : <Send className="w-4 h-4 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tx.description || tx.type}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-bold text-sm ${isCredit ? "text-green-400" : "text-red-400"}`}>
          {isCredit ? "+" : ""}{tx.amount}💰
        </p>
        <p className="text-xs text-muted-foreground">bal: {tx.balance_after}</p>
      </div>
    </div>
  );
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "sent", label: "Sent", icon: <Send className="w-4 h-4" /> },
  { key: "received", label: "Received", icon: <Inbox className="w-4 h-4" /> },
  { key: "coins", label: "Coins", icon: <Coins className="w-4 h-4" /> },
];

export default function GiftHistory() {
  const { user } = useAuthStore();
  const { sentHistory, receivedHistory, coinTransactions, wallet, fetchSentGifts, fetchReceivedGifts, fetchCoinTransactions, fetchWallet, isLoading } = useGiftStore();
  const [activeTab, setActiveTab] = useState<Tab>("received");

  useEffect(() => {
    if (user) {
      fetchSentGifts(user.id);
      fetchReceivedGifts(user.id);
      fetchCoinTransactions(user.id);
      fetchWallet(user.id);
    }
  }, [user, fetchSentGifts, fetchReceivedGifts, fetchCoinTransactions, fetchWallet]);

  const totalSent = sentHistory.reduce((s, g) => s + g.coin_cost, 0);
  const totalReceived = receivedHistory.reduce((s, g) => s + g.diamond_value, 0);

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
            <h1 className="text-2xl font-black text-foreground">Gift History</h1>
            <p className="text-muted-foreground text-sm">Your gift transactions</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Balance", value: `💰${wallet?.coins ?? 0}`, sub: "coins" },
            { label: "Sent", value: `💰${totalSent}`, sub: `${sentHistory.length} gifts` },
            { label: "Earned", value: `💎${totalReceived}`, sub: `${receivedHistory.length} gifts` },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass rounded-2xl p-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <p className="text-lg font-black text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              <p className="text-[10px] text-muted-foreground/60">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 glass rounded-2xl p-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground neon-glow-blue"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {isLoading && (
            <div className="text-center text-muted-foreground py-10">Loading...</div>
          )}
          {!isLoading && activeTab === "sent" && (
            sentHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                <p className="text-4xl mb-3">🎁</p>
                <p>No gifts sent yet.</p>
                <Link to="/gifts/shop">
                  <Button variant="outline" className="mt-3" size="sm">Buy Coins</Button>
                </Link>
              </div>
            ) : sentHistory.map((g) => <GiftRow key={g.id} gift={g} type="sent" />)
          )}
          {!isLoading && activeTab === "received" && (
            receivedHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                <p className="text-4xl mb-3">💎</p>
                <p>No gifts received yet. Start streaming!</p>
              </div>
            ) : receivedHistory.map((g) => <GiftRow key={g.id} gift={g} type="received" />)
          )}
          {!isLoading && activeTab === "coins" && (
            coinTransactions.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                <p className="text-4xl mb-3">💰</p>
                <p>No transactions yet.</p>
              </div>
            ) : coinTransactions.map((tx) => <CoinRow key={tx.id} tx={tx} />)
          )}
        </div>
      </div>
    </AppLayout>
  );
}
