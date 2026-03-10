import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InterstitialAdProps {
  onClose: () => void;
  countdown: number;
}

const InterstitialAd = ({ onClose, countdown }: InterstitialAdProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center"
    >
      <div className="relative w-full max-w-lg mx-4">
        <div className="glass rounded-3xl p-8 text-center">
          <div className="flex justify-end mb-4">
            {countdown <= 0 ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">
                Skip in {countdown}s
              </span>
            )}
          </div>

          <div
            className="w-full bg-muted/30 border border-border/20 rounded-xl flex items-center justify-center"
            style={{ minHeight: 250 }}
          >
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: 250 }}
              data-ad-client={
                import.meta.env.VITE_ADSENSE_CLIENT_ID ||
                "ca-pub-XXXXXXXXXXXXXXXX"
              }
              data-ad-slot="interstitial-slot"
              data-ad-format="auto"
            />
            <p className="text-sm text-muted-foreground/50">Advertisement</p>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Upgrade to Premium for an ad-free experience
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default InterstitialAd;
