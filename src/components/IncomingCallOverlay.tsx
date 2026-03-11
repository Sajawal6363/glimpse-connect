import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { getInitials } from "@/lib/utils";
import { supabase, type Profile } from "@/lib/supabase";
import PrivateImage from "@/components/PrivateImage";

/**
 * Global incoming call overlay — renders on top of everything.
 * Listens to a personal broadcast channel `incoming-call-{userId}`
 * for ring/cancel/missed signals from callers.
 *
 * Supports both 1-on-1 and group calls.
 * Accept → navigate to /stream/friend/:callerId?mode=answer  (or /stream/group/:groupId?mode=answer)
 * Decline → send decline signal back
 */
const IncomingCallOverlay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerName: string;
    callerAvatar: string;
    callerProfile: Profile | null;
    roomId: string;
    isGroup: boolean;
    groupName: string;
    groupAvatar: string;
  } | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ringtoneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const playRingtoneBeep = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 500);
    } catch {
      // Ignore audio initialization failures (browser policy / permissions)
    }
  };

  useEffect(() => {
    if (!incomingCall) {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
      return;
    }

    playRingtoneBeep();
    ringtoneIntervalRef.current = setInterval(() => {
      playRingtoneBeep();
    }, 1400);

    return () => {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
    };
  }, [incomingCall]);

  useEffect(() => {
    if (!user?.id) return;

    // Listen on a personal channel for incoming calls
    const channel = supabase.channel(`incoming-call-${user.id}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "incoming-call" }, async (payload) => {
        const data = payload.payload as {
          action: string;
          callerId: string;
          callerName?: string;
          callerAvatar?: string;
          roomId: string;
          isGroup?: boolean;
          groupName?: string;
          groupAvatar?: string;
        };

        switch (data.action) {
          case "ring": {
            // If we're already on the stream page for this room, ignore overlay
            const streamPath = data.isGroup
              ? `/stream/group/${data.roomId}`
              : `/stream/friend/${data.callerId}`;
            if (location.pathname.startsWith(streamPath)) break;

            // Fetch caller profile for 1-on-1 calls
            let callerProfile: Profile | null = null;
            if (!data.isGroup) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", data.callerId)
                .maybeSingle();
              callerProfile = (profile as Profile) || null;
            }

            setIncomingCall({
              callerId: data.callerId,
              callerName: data.callerName || "",
              callerAvatar: data.callerAvatar || "",
              callerProfile,
              roomId: data.roomId,
              isGroup: data.isGroup || false,
              groupName: data.groupName || "",
              groupAvatar: data.groupAvatar || "",
            });
            break;
          }
          case "cancel":
          case "missed":
            // Caller cancelled or timed out
            setIncomingCall(null);
            break;
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user?.id, location.pathname]);

  const sendSignalToCaller = (action: string) => {
    if (!incomingCall || !user) return;
    // Reply on the caller's personal channel
    const callerChannel = supabase.channel(
      `incoming-call-${incomingCall.callerId}`,
      { config: { broadcast: { self: false } } },
    );
    callerChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        callerChannel.send({
          type: "broadcast",
          event: "incoming-call",
          payload: {
            action,
            callerId: user.id,
            roomId: incomingCall.roomId,
          },
        });
        setTimeout(() => callerChannel.unsubscribe(), 500);
      }
    });
  };

  // Also send on the room-specific channel that FriendStream/GroupStream listens to
  const sendRoomSignal = (action: string) => {
    if (!incomingCall || !user) return;
    const channelName = incomingCall.isGroup
      ? `group-call-${incomingCall.roomId}`
      : `call-${incomingCall.roomId}`;
    const eventName = incomingCall.isGroup
      ? "group-call-signal"
      : "call-signal";
    const roomChannel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    roomChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        roomChannel.send({
          type: "broadcast",
          event: eventName,
          payload: { action, fromUserId: user.id },
        });
        setTimeout(() => roomChannel.unsubscribe(), 500);
      }
    });
  };

  const handleAccept = () => {
    if (!incomingCall) return;
    // Do NOT send accept signals here — let the FriendStream/GroupStream page
    // send them AFTER it has joined the signaling room and is ready to receive the offer.
    // This prevents the race condition where the caller sends the offer before
    // the receiver's page has mounted and subscribed to the signaling channel.

    const { callerId, roomId, isGroup } = incomingCall;
    setIncomingCall(null);

    if (isGroup) {
      navigate(`/stream/group/${roomId}?mode=answer&caller=${callerId}`);
    } else {
      navigate(`/stream/friend/${callerId}?mode=answer`);
    }
  };

  const handleDecline = () => {
    if (!incomingCall) return;
    sendSignalToCaller("decline");
    sendRoomSignal("decline");

    // Insert declined call message in chat history
    if (user && !incomingCall.isGroup) {
      supabase
        .from("messages")
        .insert({
          sender_id: incomingCall.callerId,
          receiver_id: user.id,
          content: "📞 Declined video call",
          type: "system" as const,
        })
        .then(() => {});
    } else if (user && incomingCall.isGroup) {
      supabase
        .from("group_messages")
        .insert({
          group_id: incomingCall.roomId,
          sender_id: user.id,
          content: "📞 Declined group call",
          type: "system" as const,
        })
        .then(() => {});
    }

    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const caller = incomingCall.callerProfile;
  const displayName = incomingCall.isGroup
    ? incomingCall.groupName
    : caller?.name || incomingCall.callerName || "Someone";
  const displayAvatar = incomingCall.isGroup
    ? incomingCall.groupAvatar
    : caller?.avatar_url || incomingCall.callerAvatar;
  const subtitle = incomingCall.isGroup
    ? `${incomingCall.callerName || "Someone"} is calling...`
    : `@${caller?.username || ""}`;

  return (
    <AnimatePresence>
      <motion.div
        key="incoming-call-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center"
      >
        {/* Pulsing rings */}
        <div className="relative w-32 h-32 mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-green-400/40"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.8, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.6,
                ease: "easeOut",
              }}
            />
          ))}
          <motion.div
            className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden ring-4 ring-green-500/50 relative z-10"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <PrivateImage
              src={displayAvatar}
              fallback={
                incomingCall.isGroup ? (
                  <Users className="w-14 h-14 text-white/80" />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {getInitials(displayName)}
                  </span>
                )
              }
            />
          </motion.div>
        </div>

        {/* Caller info */}
        <h2 className="text-3xl font-bold text-white mb-2">{displayName}</h2>
        <motion.p
          className="text-green-400 font-medium flex items-center gap-2 mb-2"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <Video className="w-5 h-5" />
          {incomingCall.isGroup
            ? "Incoming group call..."
            : "Incoming video call..."}
        </motion.p>
        <p className="text-white/40 text-sm mb-16">{subtitle}</p>

        {/* Accept / Decline */}
        <div className="flex items-center gap-12">
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={handleDecline}
              size="lg"
              className="rounded-full w-18 h-18 bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 p-0"
              style={{ width: 72, height: 72 }}
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
            <span className="text-white/60 text-xs font-medium">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={handleAccept}
              size="lg"
              className="rounded-full w-18 h-18 bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/30 p-0"
              style={{ width: 72, height: 72 }}
            >
              <Phone className="w-8 h-8" />
            </Button>
            <span className="text-white/60 text-xs font-medium">Accept</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IncomingCallOverlay;
