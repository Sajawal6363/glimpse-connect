import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins, ShoppingBag, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Gift, type UserWallet } from "@/lib/supabase";

interface GiftTrayProps {
  isOpen: boolean;
  onClose: () => void;
  gifts: Gift[];
  wallet: UserWallet | null;
  onSend: (gift: Gift) => void;
  isSending: boolean;
  isPremium?: boolean;
}

const RARITY_TABS = [
  {
    key: "common",
    label: "Common",
    color: "text-white",
    border: "border-white/30",
    active: "bg-white/10 border-white/50",
  },
  {
    key: "rare",
    label: "Rare",
    color: "text-cyan-400",
    border: "border-cyan-400/30",
    active: "bg-cyan-400/10 border-cyan-400/60",
  },
  {
    key: "epic",
    label: "Epic",
    color: "text-purple-400",
    border: "border-purple-400/30",
    active: "bg-purple-400/10 border-purple-400/60",
  },
  {
    key: "legendary",
    label: "Legendary",
    color: "text-yellow-400",
    border: "border-yellow-400/30",
    active: "bg-yellow-400/10 border-yellow-400/60",
  },
] as const;

const RARITY_GLOW: Record<string, string> = {
  common: "shadow-[0_0_8px_rgba(255,255,255,0.2)]",
  rare: "shadow-[0_0_12px_rgba(0,212,255,0.4)]",
  epic: "shadow-[0_0_12px_rgba(191,90,242,0.4)]",
  legendary: "shadow-[0_0_16px_rgba(255,215,0,0.5)]",
};

const RARITY_BORDER_SELECTED: Record<string, string> = {
  common: "border-white",
  rare: "border-cyan-400",
  epic: "border-purple-400",
  legendary: "border-yellow-400",
};

export default function GiftTray({
  isOpen,
  onClose,
  gifts,
  wallet,
  onSend,
  isSending,
  isPremium,
}: GiftTrayProps) {
  const [activeRarity, setActiveRarity] = useState<
    "common" | "rare" | "epic" | "legendary"
  >("common");
  const [selected, setSelected] = useState<Gift | null>(null);
  const coins = wallet?.coins ?? 0;

  const filtered = gifts.filter((g) => g.rarity === activeRarity);

  const canAfford = (g: Gift) => coins >= g.coin_cost;
  const canUnlock = (g: Gift) => !g.is_premium_only || isPremium;

  const handleSend = () => {
    if (!selected || isSending) return;
    onSend(selected);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  // Close on backdrop click
  const backdropRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Tray */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-50 glass-strong rounded-t-3xl pb-safe"
            style={{ maxHeight: "70%" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/40" />
            </div>

            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-yellow-400 text-lg">
                  {coins.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">coins</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 h-7 text-xs"
                  onClick={() => window.open("/gifts/shop", "_blank")}
                >
                  <ShoppingBag className="w-3 h-3 mr-1" />
                  Top Up
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Rarity tabs */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto">
              {RARITY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveRarity(tab.key);
                    setSelected(null);
                  }}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${tab.color} ${activeRarity === tab.key ? tab.active : `${tab.border} opacity-60`}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Gift grid */}
            <div
              className="overflow-y-auto px-4"
              style={{ maxHeight: "calc(70vh - 200px)" }}
            >
              <div className="grid grid-cols-4 gap-3 pb-4">
                {filtered.map((gift) => {
                  const affordable = canAfford(gift);
                  const unlocked = canUnlock(gift);
                  const isSelected = selected?.id === gift.id;
                  return (
                    <motion.button
                      key={gift.id}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? `${RARITY_BORDER_SELECTED[gift.rarity]} ${RARITY_GLOW[gift.rarity]} bg-white/5`
                          : "border-border/40 hover:border-border/70"
                      } ${!affordable || !unlocked ? "opacity-50" : ""}`}
                      whileHover={{ scale: affordable && unlocked ? 1.08 : 1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (affordable && unlocked) {
                          setSelected(isSelected ? null : gift);
                          if (navigator.vibrate) navigator.vibrate(20);
                        }
                      }}
                    >
                      {(!affordable || !unlocked) && (
                        <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/30 backdrop-blur-sm z-10">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      {gift.is_premium_only && (
                        <span className="absolute -top-1 -right-1 text-xs z-20">
                          👑
                        </span>
                      )}
                      <span className="text-3xl">{gift.emoji}</span>
                      <span className="text-[10px] font-medium text-foreground text-center leading-tight">
                        {gift.name}
                      </span>
                      <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-0.5">
                        💰{gift.coin_cost}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Send bar */}
            <div className="px-5 py-4 border-t border-border/40 flex items-center gap-4">
              {selected ? (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-2xl">{selected.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold">{selected.name}</p>
                      <p className="text-xs text-yellow-400">
                        💰{selected.coin_cost} coins
                      </p>
                    </div>
                  </div>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleSend}
                      disabled={isSending}
                      className="bg-gradient-to-r from-primary to-secondary font-bold px-6 neon-glow-blue"
                    >
                      {isSending ? "Sending..." : "Send 🎁"}
                    </Button>
                  </motion.div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm flex-1 text-center">
                  Select a gift to send
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
