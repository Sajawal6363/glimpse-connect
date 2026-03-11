import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, ShoppingBag, Check, Zap, Crown, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGiftStore } from "@/stores/useGiftStore";
import { useToast } from "@/hooks/use-toast";
// eslint-disable-next-line @typescript-eslint/no-unused-vars

const COIN_PACKAGES = [
  { slug: "starter", coins: 100, price: 0.99, bonus: 0, label: "Starter", icon: null, highlight: false },
  { slug: "popular", coins: 500, price: 4.99, bonus: 50, label: "Popular", icon: null, highlight: false },
  { slug: "super", coins: 1200, price: 9.99, bonus: 200, label: "Super", icon: Flame, highlight: false },
  { slug: "mega", coins: 3000, price: 24.99, bonus: 600, label: "Mega", icon: Zap, highlight: true },
  { slug: "ultra", coins: 6500, price: 49.99, bonus: 1500, label: "Ultra", icon: null, highlight: false },
  { slug: "whale", coins: 15000, price: 99.99, bonus: 5000, label: "Whale", icon: Crown, highlight: false },
];

const floatingCoins = Array.from({ length: 12 });

export default function GiftShop() {
  const { user } = useAuthStore();
  const { wallet, fetchWallet, ensureWallet, purchaseCoins, isLoading } = useGiftStore();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      ensureWallet(user.id);
    }
  }, [user, ensureWallet]);

  const handleBuy = async (pkg: typeof COIN_PACKAGES[number]) => {
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
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
            >
              💰
            </motion.span>
          ))}
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black neon-text-blue">ConnectCoins</h1>
            </div>
            <p className="text-muted-foreground text-base">
              Buy coins to send gifts to streamers and friends
            </p>
            {wallet && (
              <motion.div
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 glass-strong rounded-full border border-yellow-400/30"
                animate={{ boxShadow: ["0 0 0px #ffd700", "0 0 20px #ffd70040", "0 0 0px #ffd700"] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-2xl">💰</span>
                <span className="text-2xl font-black text-yellow-400">{wallet.coins.toLocaleString()}</span>
                <span className="text-muted-foreground">current balance</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Packages */}
        <h2 className="text-xl font-bold mb-4 text-foreground">Choose a Package</h2>
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
                    <span className="font-bold text-lg text-foreground">{pkg.label}</span>
                  </div>
                  <span className="text-2xl font-black text-primary">${pkg.price}</span>
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
          ConnectCoins are virtual currency with no real-world monetary value. All purchases are
          final. Unused coins may be refunded within 14 days.{" "}
          <a href="/terms" className="underline hover:text-foreground">
            Terms apply.
          </a>
        </motion.p>
      </div>
    </AppLayout>
  );
}
