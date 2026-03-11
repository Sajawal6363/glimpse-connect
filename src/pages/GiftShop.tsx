import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, ShoppingBag, Check, Zap, Crown, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGiftStore } from "@/stores/useGiftStore";
import { useToast } from "@/hooks/use-toast";

const COIN_PACKAGES = [
  {
    slug: "starter",
    coins: 100,
    price: 0.99,
    bonus: 0,
    label: "Starter",
    icon: null,
    highlight: false,
  },
  {
    slug: "popular",
    coins: 500,
    price: 4.99,
    bonus: 50,
    label: "Popular",
    icon: null,
    highlight: false,
  },
  {
    slug: "super",
    coins: 1200,
    price: 9.99,
    bonus: 200,
    label: "Super",
    icon: Flame,
    highlight: false,
  },
  {
    slug: "mega",
    coins: 3000,
    price: 24.99,
    bonus: 600,
    label: "Mega",
    icon: Zap,
    highlight: true,
  },
  {
    slug: "ultra",
    coins: 6500,
    price: 49.99,
    bonus: 1500,
    label: "Ultra",
    icon: null,
    highlight: false,
  },
  {
    slug: "whale",
    coins: 15000,
    price: 99.99,
    bonus: 5000,
    label: "Whale",
    icon: Crown,
    highlight: false,
  },
];

const RARITY_TABS = [
  {
    key: "common",
    label: "Common",
    color: "text-white",
    activeBg: "bg-white/10 border-white/50",
    inactiveBorder: "border-white/20",
    glow: "",
  },
  {
    key: "rare",
    label: "Rare",
    color: "text-cyan-400",
    activeBg: "bg-cyan-400/10 border-cyan-400/50",
    inactiveBorder: "border-cyan-400/20",
    glow: "shadow-[0_0_12px_rgba(0,212,255,0.3)]",
  },
  {
    key: "epic",
    label: "Epic",
    color: "text-purple-400",
    activeBg: "bg-purple-400/10 border-purple-400/50",
    inactiveBorder: "border-purple-400/20",
    glow: "shadow-[0_0_12px_rgba(192,86,255,0.3)]",
  },
  {
    key: "legendary",
    label: "Legendary",
    color: "text-yellow-400",
    activeBg: "bg-yellow-400/10 border-yellow-400/50",
    inactiveBorder: "border-yellow-400/20",
    glow: "shadow-[0_0_16px_rgba(255,215,0,0.4)]",
  },
] as const;

const RARITY_CARD_GLOW: Record<string, string> = {
  common: "hover:shadow-[0_0_10px_rgba(255,255,255,0.15)] hover:border-white/40",
  rare: "hover:shadow-[0_0_14px_rgba(0,212,255,0.35)] hover:border-cyan-400/50",
  epic: "hover:shadow-[0_0_14px_rgba(192,86,255,0.4)] hover:border-purple-400/50",
  legendary:
    "hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:border-yellow-400/60",
};

const floatingCoins = Array.from({ length: 12 });

export default function GiftShop() {
  const { user } = useAuthStore();
  const {
    wallet,
    gifts,
    fetchWallet,
    ensureWallet,
    fetchGifts,
    getGiftsByRarity,
    purchaseCoins,
    isLoading,
  } = useGiftStore();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string | null>(null);
  const [activeRarity, setActiveRarity] = useState<
    "common" | "rare" | "epic" | "legendary"
  >("common");

  useEffect(() => {
    if (user) {
      ensureWallet(user.id);
      fetchWallet(user.id);
    }
    fetchGifts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleBuy = async (pkg: (typeof COIN_PACKAGES)[number]) => {
    if (!user || purchasing) return;
    setPurchasing(pkg.slug);
    try {
      const total = pkg.coins + pkg.bonus;
      await purchaseCoins(user.id, total, pkg.price);
      setPurchased(pkg.slug);
      toast({
        title: `💰 ${total.toLocaleString()} Coins Added!`,
        description: `You now have ${((wallet?.coins ?? 0) + total).toLocaleString()} ConnectCoins.`,
      });
      setTimeout(() => setPurchased(null), 3000);
    } catch {
      toast({ title: "Purchase failed", variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  const displayedGifts = getGiftsByRarity(activeRarity);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* Hero */}
        <motion.div
          className="relative glass rounded-3xl p-8 mb-8 overflow-hidden text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Floating coin emojis */}
          {floatingCoins.map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-xl pointer-events-none select-none"
              style={{
                left: `${(i / floatingCoins.length) * 100}%`,
                top: `${20 + Math.sin(i) * 30}%`,
              }}
              animate={{ y: [-8, 8, -8], rotate: [0, 15, 0] }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              💰
            </motion.span>
          ))}
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black neon-text-blue">
                Gift Shop
              </h1>
            </div>
            <p className="text-muted-foreground text-base">
              Buy ConnectCoins and send gifts during live streams
            </p>
            {wallet && (
              <motion.div
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 glass-strong rounded-full border border-yellow-400/30"
                animate={{
                  boxShadow: [
                    "0 0 0px #ffd700",
                    "0 0 20px #ffd70040",
                    "0 0 0px #ffd700",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-2xl">💰</span>
                <span className="text-2xl font-black text-yellow-400">
                  {wallet.coins.toLocaleString()}
                </span>
                <span className="text-muted-foreground">current balance</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── Gift Catalog ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎁</span>
            <h2 className="text-xl font-bold text-foreground">Gift Catalog</h2>
            {gifts.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {gifts.length} gifts available
              </span>
            )}
          </div>

          {/* Rarity tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {RARITY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveRarity(tab.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 ${tab.color} ${
                  activeRarity === tab.key
                    ? `${tab.activeBg} ${tab.glow}`
                    : `${tab.inactiveBorder} bg-transparent opacity-60 hover:opacity-90`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Gift grid */}
          <AnimatePresence mode="wait">
            {gifts.length === 0 ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass rounded-2xl h-32 animate-pulse border border-border/30"
                  />
                ))}
              </motion.div>
            ) : displayedGifts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12 text-muted-foreground"
              >
                No {activeRarity} gifts yet
              </motion.div>
            ) : (
              <motion.div
                key={activeRarity}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {displayedGifts.map((gift, i) => {
                  const canAfford = (wallet?.coins ?? 0) >= gift.coin_cost;
                  return (
                    <motion.div
                      key={gift.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className={`relative glass rounded-2xl p-4 border border-border/40 transition-all duration-200 cursor-default ${RARITY_CARD_GLOW[gift.rarity]}`}
                    >
                      {/* Rarity corner badge */}
                      <div
                        className={`absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                          gift.rarity === "legendary"
                            ? "bg-yellow-400/20 text-yellow-400"
                            : gift.rarity === "epic"
                              ? "bg-purple-400/20 text-purple-400"
                              : gift.rarity === "rare"
                                ? "bg-cyan-400/20 text-cyan-400"
                                : "bg-white/10 text-white/60"
                        }`}
                      >
                        {gift.rarity}
                      </div>

                      {/* Emoji */}
                      <div className="text-4xl mb-2 leading-none">
                        {gift.emoji}
                      </div>

                      {/* Name */}
                      <p className="text-sm font-semibold text-foreground leading-tight mb-1">
                        {gift.name}
                      </p>

                      {/* Cost */}
                      <div
                        className={`flex items-center gap-1 text-sm font-bold ${
                          canAfford ? "text-yellow-400" : "text-muted-foreground/60"
                        }`}
                      >
                        <span>💰</span>
                        <span>{gift.coin_cost.toLocaleString()}</span>
                      </div>

                      {/* Can't afford overlay */}
                      {!canAfford && (
                        <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-end justify-center pb-3 pointer-events-none">
                          <span className="text-[10px] text-muted-foreground/70 font-medium">
                            Need more coins
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-muted-foreground/60 mt-4 text-center">
            Send gifts during live streams — tap the{" "}
            <span className="text-yellow-400">🎁 Gift</span> button while in a
            call
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-sm text-muted-foreground font-medium">
            Buy ConnectCoins
          </span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {/* Packages */}
        <h2 className="text-xl font-bold mb-4 text-foreground">
          Choose a Package
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COIN_PACKAGES.map((pkg, i) => {
            const total = pkg.coins + pkg.bonus;
            const Icon = pkg.icon;
            const isBought = purchased === pkg.slug;
            const isBuying = purchasing === pkg.slug;

            return (
              <motion.div
                key={pkg.slug}
                className={`relative glass rounded-2xl p-5 border transition-all duration-300 ${
                  pkg.highlight
                    ? "border-primary neon-glow-blue"
                    : "border-border/40 hover:border-border/70"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ scale: 1.02 }}
              >
                {pkg.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      BEST VALUE
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-5 h-5 text-yellow-400" />}
                    <span className="font-bold text-lg text-foreground">
                      {pkg.label}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-primary">
                    ${pkg.price}
                  </span>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-yellow-400">
                      💰 {total.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground text-sm">coins</span>
                  </div>
                  {pkg.bonus > 0 && (
                    <span className="text-xs text-green-400 font-medium">
                      +{pkg.bonus} bonus coins included
                    </span>
                  )}
                </div>
                <Button
                  className={`w-full font-bold ${pkg.highlight ? "bg-gradient-to-r from-primary to-secondary neon-glow-blue" : ""}`}
                  variant={pkg.highlight ? "default" : "outline"}
                  onClick={() => handleBuy(pkg)}
                  disabled={isBuying || isLoading}
                >
                  {isBought ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-400" />
                      Added!
                    </>
                  ) : isBuying ? (
                    "Processing..."
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Buy Now
                    </>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <motion.p
          className="text-xs text-muted-foreground/60 text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          ConnectCoins are virtual currency with no real-world monetary value.
          All purchases are final. Unused coins may be refunded within 14 days.{" "}
          <a href="/terms" className="underline hover:text-foreground">
            Terms apply.
          </a>
        </motion.p>
      </div>
    </AppLayout>
  );
}
