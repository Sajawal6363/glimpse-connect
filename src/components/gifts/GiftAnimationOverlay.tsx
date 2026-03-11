import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type GiftTransaction } from "@/lib/supabase";
import { GiftParticleEngine } from "./GiftParticleEngine";

interface GiftAnimationOverlayProps {
  activeGift: GiftTransaction | null;
  onComplete: () => void;
}

const RARITY_COLORS = {
  common: ["#ffffff", "#e0e0e0", "#c0c0c0"],
  rare: ["#00d4ff", "#0099cc", "#66e5ff", "#00ffcc"],
  epic: ["#bf5af2", "#9b59b6", "#e056ff", "#ff56d8"],
  legendary: ["#ffd700", "#ffaa00", "#ff8c00", "#ffe066", "#fff0a0"],
};

function getAnimationType(gift: GiftTransaction): string {
  const slug = gift.gift_name.toLowerCase().replace(/\s+/g, "-");
  const epicSlugs = ["crown", "sports-car", "yacht", "fireworks", "dragon", "castle"];
  const legendSlugs = ["galaxy", "planet", "universe", "connectlive-crown"];
  const rareSlugs = ["neon-heart", "fire", "lightning", "diamond-ring", "rocket", "unicorn"];
  if (legendSlugs.some((s) => slug.includes(s.split("-")[0]))) return "premium";
  if (epicSlugs.some((s) => slug.includes(s.split("-")[0]))) return "fullscreen";
  if (rareSlugs.some((s) => slug.includes(s.split("-")[0]))) return "burst";
  return "float";
}

function getRarityFromCost(cost: number): keyof typeof RARITY_COLORS {
  if (cost >= 1000) return "legendary";
  if (cost >= 200) return "epic";
  if (cost >= 50) return "rare";
  return "common";
}

// --- Float Animation (Common) ---
function FloatAnimation({ gift, onComplete }: { gift: GiftTransaction; onComplete: () => void }) {
  const rarity = getRarityFromCost(gift.coin_cost);
  const colors = RARITY_COLORS[rarity];

  useEffect(() => {
    const t = setTimeout(onComplete, 2200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-32">
      <motion.div
        className="flex flex-col items-center gap-2"
        initial={{ y: 0, opacity: 0, scale: 0.3 }}
        animate={{
          y: [-0, -120, -280, -420],
          x: [0, 20, -15, 10],
          opacity: [0, 1, 1, 0],
          scale: [0.5, 1.3, 1.1, 0.8],
        }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <span className="text-8xl drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
          {gift.gift_emoji}
        </span>
        <motion.span
          className="text-sm font-bold px-3 py-1 rounded-full glass"
          style={{ color: colors[0], textShadow: `0 0 10px ${colors[0]}` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2, delay: 0.1 }}
        >
          From @{gift.sender?.username ?? "someone"}
        </motion.span>
        {/* Sparkle particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: [0, (Math.cos((i / 8) * Math.PI * 2) * 60)],
              y: [0, (Math.sin((i / 8) * Math.PI * 2) * 60) - 80],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{ duration: 1.5, delay: 0.3 + i * 0.05 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// --- Burst Animation (Rare) ---
function BurstAnimation({ gift, onComplete }: { gift: GiftTransaction; onComplete: () => void }) {
  const rarity = getRarityFromCost(gift.coin_cost);
  const colors = RARITY_COLORS[rarity];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(onComplete, 3200);

    if (canvasRef.current) {
      const engine = new GiftParticleEngine(canvasRef.current);
      engine.start();
      setTimeout(() => {
        engine.emitBurst(window.innerWidth / 2, window.innerHeight / 2, {
          count: 40,
          colors,
          shapes: ["circle", "star", "diamond"],
          speed: 12,
          spread: Math.PI * 2,
          gravity: 0.25,
          decay: 0.012,
          size: 7,
        });
      }, 400);
      return () => {
        clearTimeout(t);
        engine.stop();
      };
    }
    return () => clearTimeout(t);
  }, [colors, onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Shockwave ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="absolute rounded-full border-4"
          style={{ borderColor: colors[0] }}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{ width: 600, height: 600, opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        />
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1.1, 1, 0.9], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 2.8, ease: "easeOut" }}
        >
          <span className="text-9xl drop-shadow-[0_0_30px_rgba(255,255,255,0.9)]">
            {gift.gift_emoji}
          </span>
          <motion.span
            className="text-base font-bold px-4 py-1.5 rounded-full glass"
            style={{ color: colors[0], textShadow: `0 0 15px ${colors[0]}, 0 0 30px ${colors[0]}` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -5] }}
            transition={{ duration: 2.8, delay: 0.5 }}
          >
            {gift.gift_emoji} {gift.gift_name} from @{gift.sender?.username ?? "someone"}
          </motion.span>
        </motion.div>
      </div>
      {/* Dim overlay */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.08, 0.08, 0] }}
        transition={{ duration: 3 }}
      />
    </div>
  );
}

// --- Fullscreen Animation (Epic) ---
function FullscreenAnimation({ gift, onComplete }: { gift: GiftTransaction; onComplete: () => void }) {
  const colors = RARITY_COLORS.epic;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(onComplete, 5200);

    if (canvasRef.current) {
      const engine = new GiftParticleEngine(canvasRef.current);
      engine.start();
      setTimeout(() => {
        engine.emitFireworks(window.innerWidth * 0.3, window.innerHeight * 0.4, colors);
        engine.emitFireworks(window.innerWidth * 0.7, window.innerHeight * 0.3, ["#ff6b6b", "#ffd93d", "#6bcb77"]);
      }, 500);
      setTimeout(() => {
        engine.emitFireworks(window.innerWidth * 0.5, window.innerHeight * 0.5, colors);
      }, 1500);
      return () => {
        clearTimeout(t);
        engine.stop();
      };
    }
    return () => clearTimeout(t);
  }, [colors, onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.18, 0.18, 0] }}
        transition={{ duration: 5 }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <motion.span
          className="text-[10rem] leading-none"
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: [0, 1.5, 1.2], rotate: [-20, 10, 0], opacity: [0, 1, 1] }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 200 }}
        >
          {gift.gift_emoji}
        </motion.span>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -10] }}
          transition={{ duration: 4.5, delay: 0.8 }}
        >
          <p
            className="text-2xl font-bold"
            style={{ color: colors[0], textShadow: `0 0 20px ${colors[0]}, 0 0 40px ${colors[0]}` }}
          >
            {gift.gift_name}
          </p>
          <p className="text-muted-foreground mt-1">
            From @{gift.sender?.username ?? "someone"}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// --- Premium Animation (Legendary) ---
function PremiumAnimation({ gift, onComplete }: { gift: GiftTransaction; onComplete: () => void }) {
  const colors = RARITY_COLORS.legendary;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(onComplete, 8500);

    if (canvasRef.current) {
      const engine = new GiftParticleEngine(canvasRef.current);
      engine.start();
      setTimeout(() => {
        engine.emitBurst(window.innerWidth / 2, window.innerHeight / 2, {
          count: 100,
          colors,
          shapes: ["star", "diamond", "circle"],
          speed: 18,
          spread: Math.PI * 2,
          gravity: 0.12,
          decay: 0.008,
          size: 8,
        });
      }, 600);
      setTimeout(() => {
        engine.emitConfetti(80);
      }, 1500);
      setTimeout(() => {
        engine.emitFireworks(window.innerWidth * 0.25, window.innerHeight * 0.3, colors);
        engine.emitFireworks(window.innerWidth * 0.75, window.innerHeight * 0.3, colors);
      }, 2500);
      return () => {
        clearTimeout(t);
        engine.stop();
      };
    }
    return () => clearTimeout(t);
  }, [colors, onComplete]);

  const letterVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.5 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: 1.5 + i * 0.08, type: "spring" as const, stiffness: 200 },
    }),
  };

  const legendaryText = "LEGENDARY!";

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0.35, 0] }}
        transition={{ duration: 8 }}
      />
      {/* Backdrop blur */}
      <motion.div
        className="absolute inset-0 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 8 }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        {/* LEGENDARY flash */}
        <div className="flex">
          {legendaryText.split("").map((char, i) => (
            <motion.span
              key={i}
              custom={i}
              variants={letterVariants}
              initial="hidden"
              animate="visible"
              className="text-4xl font-black tracking-wider"
              style={{ color: colors[0], textShadow: `0 0 20px ${colors[0]}, 0 0 40px ${colors[1]}` }}
            >
              {char}
            </motion.span>
          ))}
        </div>
        {/* Gift emoji */}
        <motion.span
          className="text-[9rem] leading-none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 2, 1.3, 1.5], opacity: [0, 1, 1, 1] }}
          transition={{ duration: 1.2, delay: 0.3, type: "spring", stiffness: 120 }}
          style={{ filter: `drop-shadow(0 0 30px ${colors[0]}) drop-shadow(0 0 60px ${colors[1]})` }}
        >
          {gift.gift_emoji}
        </motion.span>
        {/* Gift name */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.1, 1, 0.9] }}
          transition={{ duration: 7, delay: 0.8 }}
        >
          <p
            className="text-3xl font-bold"
            style={{ color: colors[0], textShadow: `0 0 25px ${colors[0]}, 0 0 50px ${colors[1]}` }}
          >
            {gift.gift_name}
          </p>
          <p className="text-muted-foreground text-lg mt-2">
            From @{gift.sender?.username ?? "someone"}
          </p>
          {gift.receiver && (
            <p
              className="text-xl font-semibold mt-1"
              style={{ color: colors[2], textShadow: `0 0 15px ${colors[2]}` }}
            >
              For @{gift.receiver.username}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// --- Main Overlay ---
export default function GiftAnimationOverlay({ activeGift, onComplete }: GiftAnimationOverlayProps) {
  return (
    <AnimatePresence>
      {activeGift && (
        <motion.div
          key={activeGift.id}
          className="fixed inset-0 z-[100] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {(() => {
            const type = getAnimationType(activeGift);
            switch (type) {
              case "premium":
                return <PremiumAnimation gift={activeGift} onComplete={onComplete} />;
              case "fullscreen":
                return <FullscreenAnimation gift={activeGift} onComplete={onComplete} />;
              case "burst":
                return <BurstAnimation gift={activeGift} onComplete={onComplete} />;
              default:
                return <FloatAnimation gift={activeGift} onComplete={onComplete} />;
            }
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
