import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, UserPlus, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type Profile } from "@/lib/supabase";
import { getInitials } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface PostCallRatingProps {
  isOpen: boolean;
  sessionId: string | null;
  otherUser: Profile | null;
  onRate: (rating: number) => Promise<void>;
  onFollow?: () => void;
  onClose: () => void;
  isFollowing?: boolean;
  duration: number; // seconds
}

export default function PostCallRating({
  isOpen,
  sessionId,
  otherUser,
  onRate,
  onFollow,
  onClose,
  isFollowing,
  duration,
}: PostCallRatingProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setRating(0);
      setHovered(0);
      setSubmitted(false);
      setTimeLeft(15);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          onClose();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  const handleRate = async (r: number) => {
    setRating(r);
    setSubmitted(true);
    await onRate(r);
    setTimeout(onClose, 1200);
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const displayName = otherUser?.name || otherUser?.username || "Stranger";
  const initials = getInitials(displayName);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            className="relative glass-strong rounded-t-3xl w-full max-w-md p-6 pb-10"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            {/* Auto-dismiss progress bar */}
            <motion.div
              className="absolute top-0 left-0 h-1 rounded-full bg-primary/60"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 15, ease: "linear" }}
            />

            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 w-8 h-8"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="flex flex-col items-center gap-4 pt-2">
              {/* Avatar */}
              <Avatar className="w-16 h-16 ring-2 ring-primary/40">
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-lg font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">
                  How was your call?
                </h3>
                {otherUser && (
                  <p className="text-muted-foreground text-sm mt-0.5">
                    with @{otherUser.username} · {formatDuration(duration)}
                  </p>
                )}
              </div>

              {/* Stars */}
              {!submitted ? (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star, i) => (
                    <motion.button
                      key={star}
                      className="p-1"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: 0.1 + i * 0.07,
                        type: "spring",
                        stiffness: 300,
                      }}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => handleRate(star)}
                    >
                      <Star
                        className="w-9 h-9 transition-all duration-150"
                        fill={
                          star <= (hovered || rating)
                            ? "#ffd700"
                            : "transparent"
                        }
                        stroke={
                          star <= (hovered || rating) ? "#ffd700" : "#6b7280"
                        }
                        style={{
                          filter:
                            star <= (hovered || rating)
                              ? "drop-shadow(0 0 8px #ffd700) drop-shadow(0 0 16px #ffa500)"
                              : "none",
                        }}
                      />
                    </motion.button>
                  ))}
                </div>
              ) : (
                <motion.div
                  className="flex flex-col items-center gap-1"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring" }}
                >
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-8 h-8"
                        fill={s <= rating ? "#ffd700" : "transparent"}
                        stroke={s <= rating ? "#ffd700" : "#6b7280"}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Thanks for rating!
                  </p>
                </motion.div>
              )}

              {/* Action buttons */}
              {!submitted && (
                <div className="flex gap-3 w-full mt-1">
                  {onFollow && !isFollowing && otherUser && (
                    <Button
                      variant="outline"
                      className="flex-1 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => {
                        onFollow();
                        onClose();
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10"
                    onClick={() => {
                      onClose();
                      navigate("/gifts/shop");
                    }}
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Gift Shop
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Auto-closes in {timeLeft}s
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
