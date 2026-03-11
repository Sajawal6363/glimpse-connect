import { AnimatePresence, motion } from "framer-motion";
import { type GiftTransaction } from "@/lib/supabase";

interface GiftNotificationToastProps {
  gifts: GiftTransaction[];
  onRemove: (id: string) => void;
}

const RARITY_BORDER: Record<string, string> = {
  legendary: "border-l-yellow-400",
  epic: "border-l-purple-400",
  rare: "border-l-cyan-400",
  common: "border-l-white/40",
};

function getRarity(cost: number): string {
  if (cost >= 1000) return "legendary";
  if (cost >= 200) return "epic";
  if (cost >= 50) return "rare";
  return "common";
}

export default function GiftNotificationToast({ gifts, onRemove }: GiftNotificationToastProps) {
  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {gifts.slice(0, 5).map((gift) => {
          const rarity = getRarity(gift.coin_cost);
          const borderClass = RARITY_BORDER[rarity];
          return (
            <motion.div
              key={gift.id}
              className={`glass border-l-4 ${borderClass} rounded-xl px-4 py-2.5 flex items-center gap-3 min-w-[220px] max-w-[280px] shadow-xl`}
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 200, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <span className="text-2xl">{gift.gift_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-semibold text-foreground">
                    @{gift.sender?.username ?? "someone"}
                  </span>{" "}
                  sent
                </p>
                <p className="text-sm font-bold text-foreground truncate">{gift.gift_name}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {gift.coin_cost}💰
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
