import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  ArrowLeft,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { supabase, type Profile } from "@/lib/supabase";
import { useGroupChatStore } from "@/stores/useGroupChatStore";
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
  | "missed";

interface PeerEntry {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  userId: string;
  profile?: Profile;
}

const RING_TIMEOUT = 60_000; // 1 minute
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const GroupStream = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAnswerMode = searchParams.get("mode") === "answer";
  const { user: currentUser } = useAuthStore();
  const { currentGroup, members, fetchGroup, fetchMembers } =
    useGroupChatStore();
  const { toast } = useToast();

  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectedPeers, setConnectedPeers] = useState<
    { userId: string; profile?: Profile; stream: MediaStream }[]
  >([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const statusRef = useRef<CallStatus>("idle");
  const callDurationRef = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Load group data
  useEffect(() => {
    if (groupId) {
      fetchGroup(groupId);
      fetchMembers(groupId);
    }
  }, [groupId, fetchGroup, fetchMembers]);

  // Auto-answer when coming from IncomingCallOverlay
  useEffect(() => {
    if (isAnswerMode && currentUser?.id && groupId && members.length > 0) {
      autoAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnswerMode, currentUser?.id, groupId, members.length]);

  // Subscribe to group call signaling
  useEffect(() => {
    if (!currentUser?.id || !groupId) return;

    const channelName = `group-call-${groupId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    callChannelRef.current = channel;

    channel
      .on("broadcast", { event: "group-call-signal" }, (payload) => {
        const data = payload.payload as {
          action: string;
          fromUserId: string;
          toUserId?: string;
          sdp?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        };
        if (data.fromUserId === currentUser.id) return;

        switch (data.action) {
          case "accept":
            // A member accepted – create peer connection to them
            if (
              statusRef.current === "calling" ||
              statusRef.current === "connected" ||
              statusRef.current === "connecting"
            ) {
              clearRingTimeout();
              setStatus("connected");
              setupPeerForUser(data.fromUserId, true);
            }
            break;
          case "decline":
            // Just a toast, don't end the whole call
            {
              const profile = members.find(
                (m) => m.user_id === data.fromUserId,
              )?.profile;
              toast({
                title: `${profile?.name || "A member"} declined`,
              });
            }
            break;
          case "end":
            // A member left the call
            removePeer(data.fromUserId);
            break;
          case "offer":
            if (data.toUserId === currentUser.id && data.sdp) {
              handleRemoteOffer(data.fromUserId, data.sdp);
            }
            break;
          case "answer":
            if (data.toUserId === currentUser.id && data.sdp) {
              handleRemoteAnswer(data.fromUserId, data.sdp);
            }
            break;
          case "ice-candidate":
            if (data.toUserId === currentUser.id && data.candidate) {
              handleRemoteIceCandidate(data.fromUserId, data.candidate);
            }
            break;
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      callChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, groupId, members]);

  useEffect(() => {
    return () => {
      cleanupAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== HELPERS =====

  const sendSignal = (action: string, extra?: Record<string, unknown>) => {
    callChannelRef.current?.send({
      type: "broadcast",
      event: "group-call-signal",
      payload: { action, fromUserId: currentUser?.id, ...extra },
    });
  };

  /** Ring each group member via their personal incoming-call channel */
  const ringGroupMembers = (action: "ring" | "cancel" | "missed") => {
    if (!currentUser || !groupId) return;
    const otherMembers = members.filter((m) => m.user_id !== currentUser.id);
    otherMembers.forEach((m) => {
      const ch = supabase.channel(`incoming-call-${m.user_id}`, {
        config: { broadcast: { self: false } },
      });
      ch.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          ch.send({
            type: "broadcast",
            event: "incoming-call",
            payload: {
              action,
              callerId: currentUser.id,
              callerName: currentUser.name || currentUser.username || "Someone",
              callerAvatar: currentUser.avatar_url || "",
              roomId: groupId,
              isGroup: true,
              groupName: currentGroup?.name || "Group",
              groupAvatar: currentGroup?.avatar_url || "",
            },
          });
          setTimeout(() => ch.unsubscribe(), 500);
        }
      });
    });
  };

  const insertGroupCallMessage = async (content: string) => {
    if (!currentUser || !groupId) return;
    await supabase.from("group_messages").insert({
      group_id: groupId,
      sender_id: currentUser.id,
      content,
      type: "system",
    });
  };

  const clearRingTimeout = () => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  };

  const cleanupAll = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    peersRef.current.forEach((entry) => entry.pc.close());
    peersRef.current.clear();
    setConnectedPeers([]);
    clearRingTimeout();
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const removePeer = (userId: string) => {
    const entry = peersRef.current.get(userId);
    if (entry) {
      entry.pc.close();
      peersRef.current.delete(userId);
      setConnectedPeers((prev) => prev.filter((p) => p.userId !== userId));
    }
  };

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

  const createPeerConnection = (
    remoteUserId: string,
    stream: MediaStream,
  ): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        const profile = members.find(
          (m) => m.user_id === remoteUserId,
        )?.profile;
        peersRef.current.set(remoteUserId, {
          ...(peersRef.current.get(remoteUserId) || {
            pc,
            userId: remoteUserId,
            profile,
          }),
          stream: event.streams[0],
          pc,
        } as PeerEntry);

        setConnectedPeers((prev) => {
          const filtered = prev.filter((p) => p.userId !== remoteUserId);
          return [
            ...filtered,
            { userId: remoteUserId, profile, stream: event.streams[0] },
          ];
        });

        // Start duration timer on first peer connection
        if (!durationIntervalRef.current) {
          setCallDuration(0);
          durationIntervalRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", {
          toUserId: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        removePeer(remoteUserId);
      }
    };

    const profile = members.find((m) => m.user_id === remoteUserId)?.profile;
    peersRef.current.set(remoteUserId, {
      pc,
      stream: null,
      userId: remoteUserId,
      profile,
    });

    return pc;
  };

  const setupPeerForUser = async (
    remoteUserId: string,
    createOffer: boolean,
  ) => {
    let stream = localStreamRef.current;
    if (!stream) {
      stream = await startLocalStream();
      if (!stream) return;
    }

    // Remove existing peer if any
    const existing = peersRef.current.get(remoteUserId);
    if (existing) {
      existing.pc.close();
      peersRef.current.delete(remoteUserId);
    }

    const pc = createPeerConnection(remoteUserId, stream);

    if (createOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal("offer", { toUserId: remoteUserId, sdp: offer });
    }
  };

  const handleRemoteOffer = async (
    fromUserId: string,
    sdp: RTCSessionDescriptionInit,
  ) => {
    let stream = localStreamRef.current;
    if (!stream) {
      stream = await startLocalStream();
      if (!stream) return;
    }

    // Remove existing peer
    const existing = peersRef.current.get(fromUserId);
    if (existing) {
      existing.pc.close();
      peersRef.current.delete(fromUserId);
    }

    const pc = createPeerConnection(fromUserId, stream);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal("answer", { toUserId: fromUserId, sdp: answer });

    setStatus("connected");
  };

  const handleRemoteAnswer = async (
    fromUserId: string,
    sdp: RTCSessionDescriptionInit,
  ) => {
    const entry = peersRef.current.get(fromUserId);
    if (entry) {
      await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  };

  const handleRemoteIceCandidate = async (
    fromUserId: string,
    candidate: RTCIceCandidateInit,
  ) => {
    const entry = peersRef.current.get(fromUserId);
    if (entry) {
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("ICE candidate error:", e);
      }
    }
  };

  // ===== CALL ACTIONS =====

  const startCall = async () => {
    if (!currentUser || !groupId) return;

    const stream = await startLocalStream();
    if (!stream) return;

    setStatus("calling");
    sendSignal("ring");

    // Ring each member via their personal broadcast channel (no notifications!)
    ringGroupMembers("ring");

    // Ring timeout — 1 minute
    ringTimeoutRef.current = setTimeout(async () => {
      const current = statusRef.current;
      if (current === "calling") {
        ringGroupMembers("missed");
        setStatus("missed");

        await insertGroupCallMessage("📞 Missed group call");

        toast({
          title: "No answer",
          description: "Nobody joined the group call.",
        });
        setTimeout(() => {
          cleanupAll();
          setStatus("idle");
        }, 3000);
      }
    }, RING_TIMEOUT);
  };

  /** Auto-accept when navigating from IncomingCallOverlay with ?mode=answer */
  const autoAccept = async () => {
    setStatus("connecting");

    const stream = await startLocalStream();
    if (!stream) {
      setStatus("idle");
      return;
    }

    sendSignal("accept");
    setStatus("connected");

    // Timeout: if no peers connect within 30s, go back to idle
    setTimeout(() => {
      if (
        statusRef.current === "connecting" ||
        (statusRef.current === "connected" && peersRef.current.size === 0)
      ) {
        toast({
          title: "Connection failed",
          description: "Could not connect to the group call. Try again.",
          variant: "destructive",
        });
        cleanupAll();
        setStatus("idle");
      }
    }, 30_000);
  };

  const cancelCall = async () => {
    clearRingTimeout();
    ringGroupMembers("cancel");
    sendSignal("end");
    await insertGroupCallMessage("📞 Cancelled group call");
    cleanupAll();
    setStatus("ended");
  };

  const endCallWithSignal = async () => {
    const dur = callDurationRef.current;
    sendSignal("end");
    cleanupAll();

    if (dur > 0) {
      const senderName =
        currentUser?.name || currentUser?.username || "Someone";
      await insertGroupCallMessage(
        `📹 Group call · ${formatDuration(dur)} · ${senderName}`,
      );
    }

    setStatus("ended");
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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const goBack = () => {
    if (status === "calling") {
      cancelCall();
      return;
    }
    if (status === "connected" || status === "connecting") {
      endCallWithSignal();
      return;
    }
    cleanupAll();
    navigate(`/groups/${groupId}`);
  };

  // ===== VIDEO GRID LAYOUT =====
  const getGridClass = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count <= 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2 grid-rows-2";
    return "grid-cols-3 grid-rows-2";
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-5xl mx-auto relative bg-background">
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

              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center overflow-hidden ring-4 ring-secondary/20">
                <PrivateImage
                  src={currentGroup?.avatar_url}
                  fallback={<Users className="w-12 h-12 text-secondary" />}
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {currentGroup?.name || "Group"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </p>
              </div>

              <Button
                onClick={startCall}
                size="lg"
                className="gap-3 rounded-full px-10 py-6 text-lg neon-glow-blue"
              >
                <Video className="w-6 h-6" />
                Start Group Call
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
              <div className="relative w-28 h-28">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-secondary/40"
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
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center overflow-hidden ring-4 ring-secondary/40 relative z-10">
                  <PrivateImage
                    src={currentGroup?.avatar_url}
                    fallback={<Users className="w-12 h-12 text-secondary" />}
                  />
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {currentGroup?.name || "Group"}
                </h2>
                <motion.p
                  className="text-secondary text-sm font-medium"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Ringing...
                </motion.p>
                <p className="text-muted-foreground text-xs mt-2">
                  Waiting for members to join
                </p>
              </div>

              {/* Show local video preview during calling */}
              <div className="w-40 h-52 rounded-2xl overflow-hidden border-2 border-border/30 shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </div>

              <Button
                onClick={cancelCall}
                size="lg"
                className="rounded-full px-8 py-6 bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-3"
              >
                <PhoneOff className="w-6 h-6" />
                Cancel
              </Button>
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
              <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-12 h-12 border-[3px] border-secondary/20 border-t-secondary rounded-full"
                />
              </div>
              <p className="text-foreground font-medium">
                Connecting to group call...
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  sendSignal("end");
                  cleanupAll();
                  setStatus("idle");
                }}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
            </motion.div>
          )}

          {/* ====== CONNECTED STATE — Active group video call ====== */}
          {status === "connected" && (
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative bg-black overflow-hidden flex flex-col"
            >
              {/* Top info bar */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                    <PrivateImage
                      src={currentGroup?.avatar_url}
                      fallback={<Users className="w-4 h-4 text-white/70" />}
                    />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {currentGroup?.name}
                    </p>
                    <p className="text-white/60 text-xs">
                      {formatDuration(callDuration)} ·{" "}
                      {connectedPeers.length + 1} participant
                      {connectedPeers.length !== 0 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-medium">
                    Live
                  </span>
                </div>
              </div>

              {/* Video Grid */}
              <div
                className={`flex-1 grid ${getGridClass(connectedPeers.length + 1)} gap-1 p-1 pt-16 pb-24`}
              >
                {/* Local video */}
                <div className="relative rounded-xl overflow-hidden bg-gray-900">
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
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {getInitials(currentUser?.name || currentUser?.email)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <span className="text-white text-[10px] font-medium">
                      You
                    </span>
                  </div>
                  {isMuted && (
                    <div className="absolute top-2 right-2 bg-red-500/80 rounded-full p-1">
                      <MicOff className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Remote videos */}
                {connectedPeers.map((peer) => (
                  <div
                    key={peer.userId}
                    className="relative rounded-xl overflow-hidden bg-gray-900"
                  >
                    <RemoteVideo stream={peer.stream} />
                    <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <span className="text-white text-[10px] font-medium">
                        {peer.profile?.name || peer.profile?.username || "User"}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Empty slots placeholder */}
                {connectedPeers.length === 0 && (
                  <div className="rounded-xl bg-gray-900/50 flex flex-col items-center justify-center gap-3">
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Users className="w-10 h-10 text-white/20" />
                    </motion.div>
                    <p className="text-white/30 text-xs">
                      Waiting for others to join...
                    </p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-xl rounded-full px-6 py-4 z-20">
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

          {/* ====== ENDED / MISSED STATE ====== */}
          {(status === "ended" || status === "missed") && (
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
                  {status === "ended" ? "Call Ended" : "No Answer"}
                </h2>
                {status === "ended" && callDuration > 0 && (
                  <p className="text-muted-foreground text-sm">
                    Duration: {formatDuration(callDuration)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`/groups/${groupId}`)}
                className="rounded-full px-6"
              >
                Back to group
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

// Helper component for remote video
const RemoteVideo = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
    />
  );
};

export default GroupStream;
