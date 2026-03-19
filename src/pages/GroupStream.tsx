import { useState, useEffect, useRef, useCallback } from "react";
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
  Smile,
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

interface CallParticipant {
  userId: string;
  profile?: Profile;
  stream?: MediaStream | null;
  isLocal: boolean;
}

const RING_TIMEOUT = 60_000; // 1 minute
const MAX_CALL_DURATION = 60 * 60; // 1 hour in seconds
const ACTIVE_CALL_DB_KEY = "active_group_calls";

const STUN_URL =
  import.meta.env.VITE_STUN_URL || "stun:stun.l.google.com:19302";
const TURN_URL = import.meta.env.VITE_TURN_URL || "";
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || "";
const TURN_PASSWORD = import.meta.env.VITE_TURN_PASSWORD || "";

const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: STUN_URL },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Free relay TURN servers — essential for calls across different networks
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  if (TURN_URL) {
    servers.push({
      urls: TURN_URL,
      username: TURN_USERNAME,
      credential: TURN_PASSWORD,
    });
  }

  return servers;
};
const ACTIVE_GROUP_CALL_KEY = "active_group_call_session";

const GroupStream = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAnswerMode = searchParams.get("mode") === "answer";
  const callerFromQuery = searchParams.get("caller");
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
  const [activeParticipantIds, setActiveParticipantIds] = useState<string[]>(
    [],
  );
  const [isParticipantsPanelOpen, setIsParticipantsPanelOpen] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Callback ref: auto-attach local stream when a new <video> element mounts
  // (AnimatePresence destroys/recreates DOM across status changes)
  const localVideoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && localStreamRef.current) {
      console.log(
        "[GroupStream] localVideoCallbackRef — attaching local stream to new DOM node",
      );
      node.srcObject = localStreamRef.current;
      node.muted = true;
      node.play().catch(() => {});
    }
  }, []);
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
  const hostUserIdRef = useRef<string | null>(null);
  const lastOfferAttemptRef = useRef<Map<string, number>>(new Map());
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const activeCallRowIdRef = useRef<string | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  const clearCallSession = () => {
    localStorage.removeItem(ACTIVE_GROUP_CALL_KEY);
  };

  useEffect(() => {
    // Always clear session on terminal states
    if (status === "ended" || status === "missed") {
      clearCallSession();
    }
  }, [status]);

  useEffect(() => {
    if (!currentUser?.id) return;
    setActiveParticipantIds((prev) =>
      prev.includes(currentUser.id) ? prev : [currentUser.id, ...prev],
    );
  }, [currentUser?.id]);

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
          hostUserId?: string;
          toUserId?: string;
          sdp?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        };
        if (data.fromUserId === currentUser.id) return;

        switch (data.action) {
          case "accept":
            markParticipantActive(data.fromUserId);
            if (data.hostUserId) {
              hostUserIdRef.current = data.hostUserId;
            }
            // A member accepted — every existing participant creates an offer to this member.
            // This ensures full mesh visibility (3-5+ participants all see each other).
            if (
              statusRef.current === "calling" ||
              statusRef.current === "connected" ||
              statusRef.current === "connecting"
            ) {
              clearRingTimeout();
              setStatus("connected");
              if (
                shouldInitiateOffer(data.fromUserId) &&
                canAttemptOfferNow(data.fromUserId)
              ) {
                setupPeerForUser(data.fromUserId, true);
              }

              setTimeout(() => {
                const existing = peersRef.current.get(data.fromUserId);
                if (
                  (!existing || !existing.stream) &&
                  shouldInitiateOffer(data.fromUserId) &&
                  canAttemptOfferNow(data.fromUserId)
                ) {
                  setupPeerForUser(data.fromUserId, true);
                }
              }, 1200);
            }
            break;
          case "ring":
            hostUserIdRef.current = data.hostUserId || data.fromUserId;
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
          case "end-all":
            cleanupAll();
            clearCallSession();
            removeActiveCallFromDB();
            setStatus("ended");
            toast({
              title: "Call ended",
              description: "The group call host ended the call for everyone.",
            });
            break;
          case "offer":
            if (data.toUserId === currentUser.id && data.sdp) {
              markParticipantActive(data.fromUserId);
              handleRemoteOffer(data.fromUserId, data.sdp);
            }
            break;
          case "answer":
            if (data.toUserId === currentUser.id && data.sdp) {
              markParticipantActive(data.fromUserId);
              handleRemoteAnswer(data.fromUserId, data.sdp);
            }
            break;
          case "ice-candidate":
            if (data.toUserId === currentUser.id && data.candidate) {
              handleRemoteIceCandidate(data.fromUserId, data.candidate);
            }
            break;
          case "presence-sync":
            markParticipantActive(data.fromUserId);
            if (
              (statusRef.current === "connecting" ||
                statusRef.current === "connected") &&
              shouldInitiateOffer(data.fromUserId)
            ) {
              const existing = peersRef.current.get(data.fromUserId);
              if (
                (!existing || !existing.stream) &&
                canAttemptOfferNow(data.fromUserId)
              ) {
                setupPeerForUser(data.fromUserId, true);
              }
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
      // On unmount, always clean up fully — WebRTC can't survive navigation
      const active =
        statusRef.current === "calling" ||
        statusRef.current === "connecting" ||
        statusRef.current === "connected";
      if (active) {
        // Signal end to others BEFORE cleaning up channels
        if (
          hostUserIdRef.current &&
          hostUserIdRef.current === currentUser?.id
        ) {
          sendSignal("end-all");
          removeActiveCallFromDB();
        } else {
          sendSignal("end");
        }
      }
      cleanupAll();
      clearCallSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-attach local video when status changes (backup for callback refs)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localStreamRef.current && localVideoRef.current) {
        if (localVideoRef.current.srcObject !== localStreamRef.current) {
          console.log(
            "[GroupStream] Re-attaching local stream on status change:",
            status,
          );
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(() => {});
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [status]);

  // Block refresh + back button during active call
  useEffect(() => {
    const active =
      status === "calling" || status === "connecting" || status === "connected";
    if (!active) return;

    // Block page refresh
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    // Block browser back button by pushing a dummy history entry
    // and intercepting the popstate event
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      // Re-push to prevent going back
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [status]);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (!(status === "connecting" || status === "connected")) return;

    const interval = setInterval(() => {
      sendSignal("presence-sync", {
        hostUserId: hostUserIdRef.current || currentUser.id,
      });
    }, 1500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentUser?.id]);

  // ===== HELPERS =====

  const sendSignal = (action: string, extra?: Record<string, unknown>) => {
    callChannelRef.current?.send({
      type: "broadcast",
      event: "group-call-signal",
      payload: { action, fromUserId: currentUser?.id, ...extra },
    });
  };

  const shouldInitiateOffer = (remoteUserId: string) => {
    if (!currentUser?.id) return false;
    return currentUser.id < remoteUserId;
  };

  const canAttemptOfferNow = (remoteUserId: string) => {
    const now = Date.now();
    const last = lastOfferAttemptRef.current.get(remoteUserId) || 0;
    if (now - last < 1800) return false;
    lastOfferAttemptRef.current.set(remoteUserId, now);
    return true;
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

  /** Store active call in Supabase so group members can see "Join Call" banner */
  const insertActiveCallToDB = async () => {
    if (!currentUser?.id || !groupId) return;
    try {
      // Remove any existing active call for this group first
      await supabase.from(ACTIVE_CALL_DB_KEY).delete().eq("group_id", groupId);

      const { data } = await supabase
        .from(ACTIVE_CALL_DB_KEY)
        .insert({
          group_id: groupId,
          host_user_id: currentUser.id,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (data) {
        activeCallRowIdRef.current = data.id;
      }
    } catch (e) {
      // Table might not exist yet — that's fine, the banner won't show
      console.warn("[GroupStream] Could not insert active call:", e);
    }
  };

  /** Remove active call from DB when call ends */
  const removeActiveCallFromDB = async () => {
    if (!groupId) return;
    try {
      await supabase.from(ACTIVE_CALL_DB_KEY).delete().eq("group_id", groupId);
    } catch {
      // ignore
    }
    activeCallRowIdRef.current = null;
  };

  const cleanupAll = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    peersRef.current.forEach((entry) => entry.pc.close());
    peersRef.current.clear();
    setConnectedPeers([]);
    setActiveParticipantIds(currentUser?.id ? [currentUser.id] : []);
    clearRingTimeout();
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
  };

  const removePeer = (userId: string) => {
    const entry = peersRef.current.get(userId);
    if (entry) {
      entry.pc.close();
      peersRef.current.delete(userId);
      setConnectedPeers((prev) => prev.filter((p) => p.userId !== userId));
      setActiveParticipantIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const markParticipantActive = (userId: string) => {
    setActiveParticipantIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId],
    );
  };

  const hasLiveLocalStream = () => {
    const stream = localStreamRef.current;
    return (
      !!stream &&
      stream.getTracks().some((track) => track.readyState === "live")
    );
  };

  const startLocalStream = async () => {
    if (hasLiveLocalStream()) {
      const existing = localStreamRef.current;
      if (existing && localVideoRef.current) {
        localVideoRef.current.srcObject = existing;
      }
      return existing;
    }

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
    const iceServers = getIceServers();
    console.log(
      "[GroupStream] createPeerConnection for",
      remoteUserId.slice(0, 8),
      "iceServers:",
      iceServers.length,
    );
    const pc = new RTCPeerConnection({ iceServers });

    stream.getTracks().forEach((track) => {
      console.log(
        "[GroupStream] Adding track:",
        track.kind,
        "for peer",
        remoteUserId.slice(0, 8),
      );
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      console.log(
        "[GroupStream] ✅ ontrack from",
        remoteUserId.slice(0, 8),
        "track:",
        event.track.kind,
        "streams:",
        event.streams.length,
      );
      const remoteStream = event.streams?.[0] || new MediaStream([event.track]);
      markParticipantActive(remoteUserId);
      const profile = members.find((m) => m.user_id === remoteUserId)?.profile;
      peersRef.current.set(remoteUserId, {
        ...(peersRef.current.get(remoteUserId) || {
          pc,
          userId: remoteUserId,
          profile,
        }),
        stream: remoteStream,
        pc,
      } as PeerEntry);

      setConnectedPeers((prev) => {
        const filtered = prev.filter((p) => p.userId !== remoteUserId);
        return [
          ...filtered,
          { userId: remoteUserId, profile, stream: remoteStream },
        ];
      });

      // Start duration timer on first peer connection
      if (!durationIntervalRef.current) {
        setCallDuration(0);
        durationIntervalRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", {
          toUserId: remoteUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(
        "[GroupStream] ICE connection state for",
        remoteUserId.slice(0, 8),
        ":",
        pc.iceConnectionState,
      );
    };

    pc.onconnectionstatechange = () => {
      console.log(
        "[GroupStream] Connection state for",
        remoteUserId.slice(0, 8),
        ":",
        pc.connectionState,
      );
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        removePeer(remoteUserId);
      }
      if (pc.connectionState === "connected") {
        console.log(
          "[GroupStream] ✅ Peer connected:",
          remoteUserId.slice(0, 8),
        );
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

  /** Start 5-minute max call duration timer */
  const startMaxDurationTimer = () => {
    if (maxDurationTimeoutRef.current) return;
    maxDurationTimeoutRef.current = setTimeout(async () => {
      if (
        statusRef.current === "connected" ||
        statusRef.current === "connecting" ||
        statusRef.current === "calling"
      ) {
        toast({
          title: "Call time limit reached",
          description: "Group calls are limited to 1 hour.",
        });
        // If host, end for everyone
        if (currentUser?.id && hostUserIdRef.current === currentUser.id) {
          sendSignal("end-all");
        } else {
          sendSignal("end");
        }
        cleanupAll();
        clearCallSession();
        removeActiveCallFromDB();
        const dur = callDurationRef.current;
        if (dur > 0) {
          const senderName =
            currentUser?.name || currentUser?.username || "Someone";
          await insertGroupCallMessage(
            `📹 Group call · ${formatDuration(dur)} · ${senderName} (time limit)`,
          );
        }
        setStatus("ended");
      }
    }, MAX_CALL_DURATION * 1000);
  };

  const startCall = async () => {
    if (!currentUser || !groupId) return;

    // Request camera/mic access FIRST before ringing
    const stream = await startLocalStream();
    if (!stream) return;

    hostUserIdRef.current = currentUser.id;
    setActiveParticipantIds([currentUser.id]);
    setStatus("calling");
    sendSignal("ring", { hostUserId: currentUser.id });

    // Insert active call to DB for "Join Call" banner
    insertActiveCallToDB();

    // Start 5-minute max duration timer
    startMaxDurationTimer();

    // Ring each member via their personal broadcast channel (no notifications!)
    ringGroupMembers("ring");

    // Ring timeout — 1 minute
    ringTimeoutRef.current = setTimeout(async () => {
      const current = statusRef.current;
      if (current === "calling") {
        ringGroupMembers("missed");
        setStatus("missed");

        await insertGroupCallMessage("📞 Missed group call");
        removeActiveCallFromDB();

        toast({
          title: "No answer",
          description: "Nobody joined the group call.",
        });
        setTimeout(() => {
          cleanupAll();
          clearCallSession();
          setStatus("idle");
        }, 3000);
      }
    }, RING_TIMEOUT);
  };

  /** Auto-accept when navigating from IncomingCallOverlay with ?mode=answer */
  const autoAccept = async () => {
    setStatus("connecting");

    if (currentUser?.id) {
      setActiveParticipantIds([currentUser.id]);
    }

    if (callerFromQuery) {
      hostUserIdRef.current = callerFromQuery;
    }

    const stream = await startLocalStream();
    if (!stream) {
      setStatus("idle");
      return;
    }

    sendSignal("accept", { hostUserId: hostUserIdRef.current || undefined });
    // Start 5-minute max duration timer
    startMaxDurationTimer();
    // Status stays "connecting" until ontrack fires from peer connections

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
    clearCallSession();
    removeActiveCallFromDB();
    setStatus("ended");
  };

  const endCallWithSignal = async () => {
    const dur = callDurationRef.current;
    if (currentUser?.id && hostUserIdRef.current === currentUser.id) {
      sendSignal("end-all");
      removeActiveCallFromDB();
    } else {
      sendSignal("end");
    }
    cleanupAll();
    clearCallSession();

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
      // End the call when navigating away — we can't preserve group call media across pages
      endCallWithSignal();
      navigate(`/groups/${groupId}`);
      return;
    }
    cleanupAll();
    clearCallSession();
    navigate(`/groups/${groupId}`);
  };

  // Clear any stale session on mount
  useEffect(() => {
    clearCallSession();
  }, []);

  const participants: CallParticipant[] = [
    ...(currentUser
      ? [
          {
            userId: currentUser.id,
            profile: currentUser,
            stream: localStreamRef.current,
            isLocal: true,
          },
        ]
      : []),
    ...activeParticipantIds
      .filter((id) => id !== currentUser?.id)
      .map((participantId) => {
        const connectedPeer = connectedPeers.find(
          (p) => p.userId === participantId,
        );
        const memberProfile = members.find(
          (member) => member.user_id === participantId,
        )?.profile;
        return {
          userId: participantId,
          profile: connectedPeer?.profile || memberProfile,
          stream: connectedPeer?.stream || null,
          isLocal: false,
        };
      }),
  ];

  const participantCount = participants.length;

  const memberProfiles = members.filter(
    (member) => member.user_id !== currentUser?.id,
  );

  const connectedPeerById = new Map(
    connectedPeers.map((peer) => [peer.userId, peer] as const),
  );

  const connectedTileCount = connectedPeers.length + 1;

  const getConnectedTileClass = (count: number, isLocal: boolean) => {
    if (count <= 1) {
      return "md:col-span-2";
    }
    if (count === 2) {
      return "";
    }
    if (count === 3 && isLocal) {
      return "md:col-span-2";
    }
    return "";
  };

  const sidebarMembers = [
    ...(currentUser
      ? [
          {
            userId: currentUser.id,
            displayName: "Me",
            avatar: currentUser.avatar_url,
            status: isCameraOn ? "IN CALL" : "CAMERA OFF",
            statusClass: isCameraOn ? "text-cyan-300" : "text-slate-400",
          },
        ]
      : []),
    ...memberProfiles.map((member) => {
      const displayName =
        member.profile?.name || member.profile?.username || "Member";
      const hasStream = !!connectedPeerById.get(member.user_id)?.stream;
      const isActive = activeParticipantIds.includes(member.user_id);
      return {
        userId: member.user_id,
        displayName,
        avatar: member.profile?.avatar_url || "",
        status: hasStream ? "IN CALL" : isActive ? "CONNECTING" : "RINGING",
        statusClass: hasStream
          ? "text-cyan-300"
          : isActive
            ? "text-blue-300"
            : "text-slate-400",
      };
    }),
  ];

  const getGridClass = (count: number) => {
    if (count <= 1) return "grid-cols-1 max-w-4xl";
    if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-6xl";
    if (count === 3)
      return "grid-cols-1 md:grid-cols-6 md:grid-rows-2 max-w-6xl";
    if (count === 4)
      return "grid-cols-1 md:grid-cols-2 md:grid-rows-2 max-w-6xl";
    return "grid-cols-1 md:grid-cols-6 md:grid-rows-2 max-w-7xl";
  };

  const getTileClass = (count: number, index: number) => {
    if (count === 3) {
      if (index === 0) return "md:col-span-6";
      return "md:col-span-3";
    }
    if (count >= 5) {
      if (index < 3) return "md:col-span-2";
      return "md:col-span-3";
    }
    return "";
  };

  // During active call states, render full-screen (no sidebar/navbar)
  const isCallActive =
    status === "calling" || status === "connecting" || status === "connected";
  const callContent = (
    <div
      className={
        isCallActive
          ? "flex flex-col h-screen w-screen fixed inset-0 z-[9999] bg-background"
          : "flex flex-col h-[calc(100vh-3.5rem)] max-w-5xl mx-auto relative bg-background"
      }
    >
      <AnimatePresence mode="wait">
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

            <div className="w-40 h-52 rounded-2xl overflow-hidden border-2 border-border/30 shadow-xl">
              <video
                ref={localVideoCallbackRef}
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
                if (
                  currentUser?.id &&
                  hostUserIdRef.current === currentUser.id
                ) {
                  sendSignal("end-all");
                } else {
                  sendSignal("end");
                }
                cleanupAll();
                setStatus("idle");
              }}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </motion.div>
        )}

        {status === "connected" && (
          <motion.div
            key="connected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 relative overflow-hidden flex min-h-0 bg-[#030712]"
          >
            <div className="flex-1 min-h-0 flex">
              <div className="flex-1 min-h-0 flex flex-col bg-gradient-to-b from-[#061327] via-[#040a16] to-[#020611]">
                <div className="px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between">
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
                        {formatDuration(callDuration)} · {participantCount}{" "}
                        participant
                        {participantCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-cyan-300 text-[11px] tracking-[0.18em] font-semibold">
                        LIVE
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setIsParticipantsPanelOpen((prev) => !prev)
                      }
                      className="w-9 h-9 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center justify-center"
                      aria-label="Toggle participants panel"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 px-3 sm:px-6 pb-3 pt-2">
                  <div
                    className={`h-full grid ${
                      connectedTileCount <= 1
                        ? "grid-cols-1 md:grid-cols-2"
                        : connectedTileCount === 2
                          ? "grid-cols-1 md:grid-cols-2"
                          : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                    } gap-3 auto-rows-fr`}
                  >
                    {memberProfiles.map((member) => {
                      const peer = connectedPeerById.get(member.user_id);
                      const displayName =
                        member.profile?.name ||
                        member.profile?.username ||
                        "Member";

                      return (
                        <div
                          key={member.user_id}
                          className="relative rounded-[26px] border border-cyan-500/15 bg-gradient-to-b from-[#071221] via-[#050d1a] to-[#03070f] overflow-hidden min-h-[220px]"
                        >
                          {peer?.stream ? (
                            <RemoteVideo stream={peer.stream} />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                              <div className="w-20 h-20 rounded-full ring-2 ring-cyan-400/70 bg-[#0f1f34] overflow-hidden flex items-center justify-center">
                                <PrivateImage
                                  src={member.profile?.avatar_url}
                                  fallback={
                                    <span className="text-xl font-semibold text-white">
                                      {getInitials(displayName)}
                                    </span>
                                  }
                                />
                              </div>
                              <p className="text-white/85 text-base font-medium">
                                {displayName}
                              </p>
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                            <div className="flex items-center justify-between">
                              <span className="text-white/85 text-xs truncate max-w-[70%]">
                                {displayName}
                              </span>
                              <span className="text-[10px] tracking-[0.12em] text-cyan-300 font-semibold">
                                {peer?.stream ? "LIVE" : "RINGING"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div
                      className={`relative rounded-[26px] border border-cyan-500/20 bg-gradient-to-b from-[#0a1528] via-[#070f1e] to-[#040911] overflow-hidden min-h-[220px] ${getConnectedTileClass(connectedTileCount, true)}`}
                    >
                      {isCameraOn ? (
                        <video
                          ref={localVideoCallbackRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          style={{ transform: "scaleX(-1)" }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                            <VideoOff className="w-7 h-7 text-slate-300" />
                          </div>
                          <p className="text-white font-semibold">
                            Me (Camera Off)
                          </p>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
                        <span className="text-white text-xs">Me</span>
                        {isMuted && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-300">
                            <MicOff className="w-3 h-3" /> Muted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-5 pt-2 z-20">
                  <div className="mx-auto w-fit flex items-center gap-3 bg-black/45 backdrop-blur-xl rounded-full border border-white/10 px-4 py-3">
                    <button
                      onClick={toggleCamera}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                        !isCameraOn
                          ? "bg-slate-700 text-slate-200"
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
                      onClick={toggleMute}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                        isMuted
                          ? "bg-slate-700 text-slate-200"
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
                      onClick={() =>
                        toast({
                          title: "Reactions",
                          description: "Emoji reactions panel is coming soon.",
                        })
                      }
                      className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setIsParticipantsPanelOpen((prev) => !prev)
                      }
                      className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                      <Users className="w-5 h-5" />
                    </button>
                    <button
                      onClick={endCallWithSignal}
                      className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {isParticipantsPanelOpen && (
                <aside className="w-[260px] sm:w-[280px] border-l border-cyan-500/20 bg-gradient-to-b from-[#060d1d] via-[#050b18] to-[#040912] px-4 py-5 flex flex-col">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 font-semibold mb-4">
                    Active Participants
                  </p>
                  <div className="space-y-3 overflow-y-auto pr-1">
                    {sidebarMembers.map((member) => (
                      <div
                        key={member.userId}
                        className={`rounded-2xl px-3 py-2 border ${
                          member.displayName === "Me"
                            ? "border-cyan-500/30 bg-cyan-500/10"
                            : "border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#0d1d33] ring-1 ring-cyan-500/40 flex items-center justify-center">
                            <PrivateImage
                              src={member.avatar}
                              fallback={
                                <span className="text-white text-sm font-semibold">
                                  {getInitials(member.displayName)}
                                </span>
                              }
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {member.displayName}
                            </p>
                            <p
                              className={`text-[10px] tracking-[0.12em] font-semibold ${member.statusClass}`}
                            >
                              {member.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              )}
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
  );

  // During active call, render full-screen without AppLayout
  if (isCallActive) {
    return callContent;
  }

  // Idle / ended / missed — show with normal layout
  return <AppLayout>{callContent}</AppLayout>;
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
