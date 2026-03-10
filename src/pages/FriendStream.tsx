import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { supabase, type Profile } from "@/lib/supabase";
import { realtimeService } from "@/lib/realtime";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import PrivateImage from "@/components/PrivateImage";

type CallStatus =
  | "idle"
  | "calling"
  | "connecting"
  | "connected"
  | "ended"
  | "missed"
  | "declined";

const RING_TIMEOUT = 60_000; // 60 seconds — like WhatsApp

const FriendStream = () => {
  const { odierUserId } = useParams<{ odierUserId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();

  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [autoStartCall, setAutoStartCall] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const roomId = useRef<string>("");
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const myChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const statusRef = useRef<CallStatus>("idle");
  const callDurationRef = useRef(0);
  const callStartedAtRef = useRef<string | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Fetch other user profile
  useEffect(() => {
    const fetchUser = async () => {
      if (!odierUserId) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", odierUserId)
        .maybeSingle();
      if (data) setOtherUser(data as Profile);
    };
    fetchUser();
  }, [odierUserId]);

  // Compute deterministic room ID
  useEffect(() => {
    if (currentUser?.id && odierUserId) {
      roomId.current = [currentUser.id, odierUserId].sort().join("-");
    }
  }, [currentUser?.id, odierUserId]);

  // Check if we arrived here because someone called us (from IncomingCallOverlay accept)
  // If we didn't initiate, we should connect as the receiver
  useEffect(() => {
    if (!currentUser?.id || !odierUserId) return;

    // Listen on my personal channel for signals from the caller
    const myChannel = supabase.channel(`incoming-call-${currentUser.id}`, {
      config: { broadcast: { self: false } },
    });
    myChannelRef.current = myChannel;

    myChannel
      .on("broadcast", { event: "incoming-call" }, (payload) => {
        const data = payload.payload as {
          action: string;
          callerId: string;
          roomId: string;
        };
        if (data.callerId === currentUser.id) return;

        switch (data.action) {
          case "accept":
            // Other user accepted from their overlay → start WebRTC
            if (statusRef.current === "calling") {
              clearRingTimeout();
              startWebRTCConnection(true);
            }
            break;
          case "decline":
            if (statusRef.current === "calling") {
              clearRingTimeout();
              setStatus("declined");
              insertCallMessage("📞 Declined video call");
              setTimeout(() => setStatus("idle"), 3000);
            }
            break;
        }
      })
      .subscribe();

    return () => {
      myChannel.unsubscribe();
      myChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, odierUserId]);

  // Subscribe to room-level call signaling (for when both are on FriendStream page)
  useEffect(() => {
    if (!currentUser?.id || !odierUserId) return;

    const channelName = `call-${[currentUser.id, odierUserId].sort().join("-")}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    callChannelRef.current = channel;

    channel
      .on("broadcast", { event: "call-signal" }, (payload) => {
        const data = payload.payload as {
          action: string;
          fromUserId: string;
        };
        if (data.fromUserId === currentUser.id) return;

        switch (data.action) {
          case "accept":
            if (statusRef.current === "calling") {
              clearRingTimeout();
              startWebRTCConnection(true);
            }
            break;
          case "decline":
            if (statusRef.current === "calling") {
              clearRingTimeout();
              setStatus("declined");
              insertCallMessage("📞 Declined video call");
              setTimeout(() => setStatus("idle"), 3000);
            }
            break;
          case "end":
            endCallSilent();
            break;
          case "cancel":
            setStatus("idle");
            break;
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      callChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, odierUserId]);

  // Auto-start call if navigated here as caller, or connect as receiver if navigated from overlay
  useEffect(() => {
    if (!currentUser?.id || !odierUserId || !otherUser) return;
    // Check URL search params for mode
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "answer") {
      // We are the receiver — join signaling room and wait for offer
      realtimeService.joinSignalingRoom(roomId.current, currentUser.id);
      startWebRTCConnection(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, odierUserId, otherUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== HELPERS =====

  const cleanupMedia = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    peerRef.current?.close();
    peerRef.current = null;
    realtimeService.leaveSignalingRoom();
    clearRingTimeout();
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const clearRingTimeout = () => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  };

  const sendCallSignal = (action: string) => {
    callChannelRef.current?.send({
      type: "broadcast",
      event: "call-signal",
      payload: { action, fromUserId: currentUser?.id },
    });
  };

  /** Ring the other user's global incoming call overlay */
  const ringOtherUser = (action: string) => {
    if (!currentUser || !odierUserId) return;
    const targetChannel = supabase.channel(`incoming-call-${odierUserId}`, {
      config: { broadcast: { self: false } },
    });
    targetChannel.subscribe((s) => {
      if (s === "SUBSCRIBED") {
        targetChannel.send({
          type: "broadcast",
          event: "incoming-call",
          payload: {
            action,
            callerId: currentUser.id,
            callerName: currentUser.name || currentUser.username || "Someone",
            callerAvatar: currentUser.avatar_url || "",
            roomId: roomId.current,
            isGroup: false,
          },
        });
        setTimeout(() => targetChannel.unsubscribe(), 500);
      }
    });
  };

  /** Insert a system message in the DM chat history (like WhatsApp call log) */
  const insertCallMessage = (content: string) => {
    if (!currentUser?.id || !odierUserId) return;
    supabase
      .from("messages")
      .insert({
        sender_id: currentUser.id,
        receiver_id: odierUserId,
        content,
        type: "system" as const,
      })
      .then(() => {});
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ===== MEDIA & WEBRTC =====

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch {
      toast({
        title: "Camera error",
        description: "Could not access camera/microphone.",
        variant: "destructive",
      });
      return null;
    }
  };

  const createPeerConnection = useCallback(
    (stream: MediaStream, initiator: boolean) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setStatus("connected");
          callStartedAtRef.current = new Date().toISOString();
          setCallDuration(0);
          durationIntervalRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && currentUser?.id) {
          realtimeService.sendSignal(odierUserId || "", currentUser.id, {
            type: "ice-candidate",
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          endCallSilent();
        }
      };

      realtimeService.onSignal(async (fromUserId, signal) => {
        const sig = signal as Record<string, unknown>;
        try {
          if (sig.type === "offer" && sig.offer) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(sig.offer as RTCSessionDescriptionInit),
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            realtimeService.sendSignal(fromUserId, currentUser?.id || "", {
              type: "answer",
              answer,
            });
          } else if (sig.type === "answer" && sig.answer) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(
                sig.answer as RTCSessionDescriptionInit,
              ),
            );
          } else if (sig.type === "ice-candidate" && sig.candidate) {
            await pc.addIceCandidate(
              new RTCIceCandidate(sig.candidate as RTCIceCandidateInit),
            );
          }
        } catch (err) {
          console.error("WebRTC signal error:", err);
        }
      });

      if (initiator) {
        (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          realtimeService.sendSignal(odierUserId || "", currentUser?.id || "", {
            type: "offer",
            offer,
          });
        })();
      }

      return pc;
    },
    [currentUser?.id, odierUserId],
  );

  const startWebRTCConnection = async (isInitiator: boolean) => {
    setStatus("connecting");
    const stream = await startLocalStream();
    if (!stream) {
      setStatus("idle");
      return;
    }
    // Small delay to ensure both sides are subscribed to the signaling room
    await new Promise((r) => setTimeout(r, 800));
    createPeerConnection(stream, isInitiator);

    // Timeout: if still connecting after 30s, give up
    setTimeout(() => {
      if (statusRef.current === "connecting") {
        toast({
          title: "Connection failed",
          description: "Could not establish a video connection. Try again.",
          variant: "destructive",
        });
        endCallSilent();
      }
    }, 30_000);
  };

  // ===== CALL ACTIONS =====

  const startCall = async () => {
    if (!currentUser || !odierUserId) return;

    setStatus("calling");

    // Join signaling room early so we're ready when they accept
    realtimeService.joinSignalingRoom(roomId.current, currentUser.id);

    // Ring the other user's global overlay (works from ANY page)
    ringOtherUser("ring");

    // Also send on room channel in case they're already on the FriendStream page
    sendCallSignal("ring");

    // 60s ring timeout — if no answer, auto-cancel and log missed call
    ringTimeoutRef.current = setTimeout(() => {
      const current = statusRef.current;
      if (current === "calling") {
        // Tell other user's overlay the call is missed
        ringOtherUser("missed");
        sendCallSignal("cancel");
        setStatus("missed");

        // Insert missed call in chat history
        insertCallMessage("📞 Missed video call");

        toast({
          title: "No answer",
          description: `${otherUser?.name || "User"} didn't pick up.`,
        });
        setTimeout(() => setStatus("idle"), 3000);
      }
    }, RING_TIMEOUT);
  };

  const cancelCall = () => {
    clearRingTimeout();
    ringOtherUser("cancel");
    sendCallSignal("cancel");
    cleanupMedia();
    insertCallMessage("📞 Cancelled video call");
    setStatus("idle");
  };

  const endCallWithSignal = () => {
    const dur = callDurationRef.current;
    sendCallSignal("end");
    cleanupMedia();
    setStatus("ended");

    // Log call with duration in chat
    if (dur > 0) {
      insertCallMessage(`📹 Video call · ${formatDuration(dur)}`);
    } else {
      insertCallMessage("📹 Video call");
    }

    setTimeout(() => setStatus("idle"), 3000);
  };

  const endCallSilent = () => {
    const dur = callDurationRef.current;
    cleanupMedia();
    setStatus("ended");

    if (dur > 0) {
      insertCallMessage(`📹 Video call · ${formatDuration(dur)}`);
    }

    setTimeout(() => setStatus("idle"), 3000);
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOn((prev) => !prev);
  };

  const goBack = () => {
    if (statusRef.current === "calling") {
      cancelCall();
    } else if (
      statusRef.current === "connected" ||
      statusRef.current === "connecting"
    ) {
      endCallWithSignal();
    } else {
      cleanupMedia();
    }
    navigate(`/chat/${odierUserId}`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto relative bg-background">
        <AnimatePresence mode="wait">
          {/* ====== IDLE STATE ====== */}
          {status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 p-6"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="absolute top-4 left-4"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden ring-4 ring-primary/20">
                <PrivateImage
                  src={otherUser?.avatar_url}
                  fallback={
                    <span className="text-4xl font-bold text-primary">
                      {getInitials(otherUser?.name || otherUser?.username)}
                    </span>
                  }
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {otherUser?.name || "Friend"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  @{otherUser?.username}
                </p>
              </div>

              <Button
                onClick={startCall}
                size="lg"
                className="gap-3 rounded-full px-10 py-6 text-lg neon-glow-blue"
              >
                <Video className="w-6 h-6" />
                Video Call
              </Button>
            </motion.div>
          )}

          {/* ====== CALLING STATE — Ringing out ====== */}
          {status === "calling" && (
            <motion.div
              key="calling"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 p-6"
            >
              <div className="relative w-32 h-32">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-primary/40"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.6,
                      ease: "easeOut",
                    }}
                  />
                ))}
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden ring-4 ring-primary/40 relative z-10">
                  <PrivateImage
                    src={otherUser?.avatar_url}
                    fallback={
                      <span className="text-5xl font-bold text-primary">
                        {getInitials(otherUser?.name || otherUser?.username)}
                      </span>
                    }
                  />
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {otherUser?.name || "Friend"}
                </h2>
                <motion.p
                  className="text-primary text-sm font-medium"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Ringing...
                </motion.p>
              </div>

              <Button
                onClick={cancelCall}
                size="lg"
                className="rounded-full w-16 h-16 bg-destructive text-destructive-foreground hover:bg-destructive/90 p-0"
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
              <span className="text-muted-foreground text-xs">Cancel</span>
            </motion.div>
          )}

          {/* ====== CONNECTING STATE ====== */}
          {status === "connecting" && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 p-6"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-12 h-12 border-[3px] border-primary/20 border-t-primary rounded-full"
                />
              </div>
              <p className="text-foreground font-medium">Connecting...</p>
              <Button
                variant="ghost"
                onClick={cancelCall}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
            </motion.div>
          )}

          {/* ====== CONNECTED STATE — Active video call ====== */}
          {status === "connected" && (
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative bg-black overflow-hidden"
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Top info bar */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                    <PrivateImage
                      src={otherUser?.avatar_url}
                      fallback={
                        <span className="text-xs font-bold text-white">
                          {getInitials(otherUser?.name || otherUser?.username)}
                        </span>
                      }
                    />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {otherUser?.name}
                    </p>
                    <p className="text-white/60 text-xs">
                      {formatDuration(callDuration)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-medium">
                    Connected
                  </span>
                </div>
              </div>

              {/* Local video PiP */}
              <motion.div
                className="absolute bottom-24 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-10"
                drag
                dragConstraints={{ top: -200, left: -200, right: 0, bottom: 0 }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {!isCameraOn && (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <VideoOff className="w-6 h-6 text-white/50" />
                  </div>
                )}
              </motion.div>

              {/* Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-xl rounded-full px-6 py-4 z-10">
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isMuted
                      ? "bg-red-500/20 text-red-400"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    !isCameraOn
                      ? "bg-red-500/20 text-red-400"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isCameraOn ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <VideoOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={endCallWithSignal}
                  className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ====== ENDED / MISSED / DECLINED STATE ====== */}
          {(status === "ended" ||
            status === "missed" ||
            status === "declined") && (
            <motion.div
              key="ended"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 p-6"
            >
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  status === "ended" ? "bg-muted/20" : "bg-destructive/10"
                }`}
              >
                <PhoneOff
                  className={`w-9 h-9 ${
                    status === "ended"
                      ? "text-muted-foreground"
                      : "text-destructive"
                  }`}
                />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {status === "ended"
                    ? "Call Ended"
                    : status === "missed"
                      ? "No Answer"
                      : "Call Declined"}
                </h2>
                {status === "ended" && callDuration > 0 && (
                  <p className="text-muted-foreground text-sm">
                    Duration: {formatDuration(callDuration)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate(`/chat/${odierUserId}`)}
                className="text-muted-foreground mt-2"
              >
                Back to chat
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default FriendStream;
