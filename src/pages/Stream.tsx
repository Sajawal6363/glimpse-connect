import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SkipForward,
  PhoneOff,
  Filter,
  Signal,
  Clock,
  AlertTriangle,
  Flag,
  Ban,
  Send,
  MessageCircle,
  X,
  Users,
  UserPlus,
  UserCheck,
  Loader2,
  Globe,
  Wifi,
  Search,
  Shield,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { countries } from "@/lib/countries";
import { useAuthStore } from "@/stores/useAuthStore";
import { matchmakingService } from "@/lib/matchmaking";
import { realtimeService } from "@/lib/realtime";
import InterstitialAd from "@/components/ads/InterstitialAd";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import { supabase, type Profile } from "@/lib/supabase";
import { useSocialStore } from "@/stores/useSocialStore";
import { useGiftStore } from "@/stores/useGiftStore";
import GiftTray from "@/components/gifts/GiftTray";
import GiftAnimationOverlay from "@/components/gifts/GiftAnimationOverlay";
import GiftNotificationToast from "@/components/gifts/GiftNotificationToast";
import PostCallRating from "@/components/PostCallRating";
import { type Gift as GiftItem } from "@/lib/supabase";

/* ─── Typewriter Search Text ─── */
const searchText = "Searching for a stranger…";
const SearchingText = () => {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const interval = setInterval(() => {
      i++;
      if (i <= searchText.length) {
        setDisplayedText(searchText.slice(0, i));
      } else if (i > searchText.length + 15) {
        i = 0;
        setDisplayedText("");
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);
  return (
    <span>
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

type StreamState = "idle" | "searching" | "connecting" | "connected";

/* ─── Constants ─── */
const MAX_CALL_DURATION = 60 * 60; // 1 hour per stranger
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

/**
 * Deterministic room id from two user ids so both peers join the same
 * signaling channel.
 */
function makeRoomId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

/* ─── Component ─── */
const Stream = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();

  /* ─── UI state ─── */
  const [state, setState] = useState<StreamState>("idle");
  const [showFilters, setShowFilters] = useState(false);
  const [countryFilter, setCountryFilter] = useState("global");
  const [genderFilter, setGenderFilter] = useState("any");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { from: string; content: string }[]
  >([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [timer, setTimer] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [skipCount, setSkipCount] = useState(0);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<
    "good" | "fair" | "poor"
  >("good");
  const [matchedUser, setMatchedUser] = useState<Profile | null>(null);
  const [remainingTime, setRemainingTime] = useState(MAX_CALL_DURATION);

  /* ─── Follow system ─── */
  const {
    sendFollowRequest,
    cancelFollowRequest,
    getFollowStatus,
    fetchFollowers,
    fetchFollowing,
    fetchSentRequests,
    fetchPendingRequests,
  } = useSocialStore();
  const [followStatus, setFollowStatus] = useState<
    "none" | "pending_sent" | "pending_received" | "following" | "mutual"
  >("none");
  const [followLoading, setFollowLoading] = useState(false);

  /* ─── Gifting system ─── */
  const {
    wallet,
    gifts,
    activeAnimation,
    incomingGiftQueue,
    isSending: isGiftSending,
    fetchWallet,
    ensureWallet,
    fetchGifts,
    sendGift,
    triggerAnimation,
    clearAnimation,
    addIncomingGift,
    removeIncomingGift,
  } = useGiftStore();
  const [showGiftTray, setShowGiftTray] = useState(false);
  const [showPostCallRating, setShowPostCallRating] = useState(false);
  const postCallSessionIdRef = useRef<string | null>(null);
  const postCallMatchedUserRef = useRef<Profile | null>(null);
  const postCallTimerRef = useRef<number>(0);

  /* ─── Stream session history ─── */
  const sessionIdRef = useRef<string | null>(null);

  /* ─── Face detection ─── */
  const [showFaceWarning, setShowFaceWarning] = useState(false);
  const [faceWarningTimer, setFaceWarningTimer] = useState(10);
  const noFaceStartRef = useRef<number | null>(null);
  const faceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  /* ─── Refs ─── */
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const searchVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const signalingUnsubRef = useRef<(() => void) | null>(null);
  const matchmakingUnsubsRef = useRef<(() => void)[]>([]);
  const isInitiatorRef = useRef(false);
  const matchedUserRef = useRef<Profile | null>(null);
  const stateRef = useRef<StreamState>("idle");
  const currentRoomIdRef = useRef<string | null>(null);
  const isSkippingRef = useRef(false);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offerRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offerSentRef = useRef(false);
  const chatOpenRef = useRef(false);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    matchedUserRef.current = matchedUser;
  }, [matchedUser]);
  useEffect(() => {
    chatOpenRef.current = chatOpen;
    // Reset unread count when chat is opened
    if (chatOpen) setUnreadChatCount(0);
  }, [chatOpen]);

  const isCallActive =
    state === "searching" || state === "connecting" || state === "connected";

  /* ─── Fetch follow status when matched user changes ─── */
  useEffect(() => {
    if (!matchedUser || !user?.id) {
      setFollowStatus("none");
      return;
    }
    // Refresh store data then read status
    const refresh = async () => {
      await Promise.all([
        fetchFollowers(user.id),
        fetchFollowing(user.id),
        fetchSentRequests(user.id),
        fetchPendingRequests(user.id),
      ]);
      const status = getFollowStatus(matchedUser.id);
      setFollowStatus(status);
    };
    refresh();
  }, [
    matchedUser,
    user?.id,
    fetchFollowers,
    fetchFollowing,
    fetchSentRequests,
    fetchPendingRequests,
    getFollowStatus,
  ]);

  /* ─── Create stream session when connected, update when ended ─── */
  useEffect(() => {
    if (
      state === "connected" &&
      user?.id &&
      matchedUser?.id &&
      !sessionIdRef.current
    ) {
      // Insert a new stream_sessions record
      const createSession = async () => {
        const { data, error } = await supabase
          .from("stream_sessions")
          .insert({
            user1_id: user.id < matchedUser.id ? user.id : matchedUser.id,
            user2_id: user.id < matchedUser.id ? matchedUser.id : user.id,
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (!error && data) {
          sessionIdRef.current = data.id;
          console.log("[Stream] Session created:", data.id);
        }
      };
      createSession();
    }
  }, [state, user?.id, matchedUser?.id]);

  /* ─── Helper to end the session record ─── */
  const endSessionRecord = useCallback(
    async (wasSkipped: boolean, wasReported = false) => {
      if (!sessionIdRef.current) return;
      const sid = sessionIdRef.current;
      sessionIdRef.current = null;
      const now = new Date().toISOString();

      // Only keep sessions that lasted ≥30 seconds (meaningful conversations)
      if (timer < 30) {
        // Delete short sessions — not worth keeping in history
        await supabase.from("stream_sessions").delete().eq("id", sid);
        console.log("[Stream] Session too short, deleted:", sid);
        return;
      }

      await supabase
        .from("stream_sessions")
        .update({
          ended_at: now,
          duration: timer,
          was_skipped: wasSkipped,
          was_reported: wasReported,
        })
        .eq("id", sid);
      console.log("[Stream] Session ended:", sid, "duration:", timer);
    },
    [timer],
  );

  /* ─── Track online users ─── */
  useEffect(() => {
    setOnlineCount(realtimeService.getOnlineUsers().length);
    const unsub = realtimeService.onPresenceChange((ids) => {
      setOnlineCount(ids.length);
    });
    return unsub;
  }, []);

  /* ─── Block browser back & refresh during active call ─── */
  useEffect(() => {
    if (!isCallActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isCallActive]);

  /* ─── Helpers ─── */
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTimeHMS = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /* ─── Callback refs for video elements (AnimatePresence safe) ─── */
  const localVideoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && localStreamRef.current) {
      node.srcObject = localStreamRef.current;
    }
  }, []);

  const searchVideoCallbackRef = useCallback(
    (node: HTMLVideoElement | null) => {
      searchVideoRef.current = node;
      if (node && localStreamRef.current) {
        node.srcObject = localStreamRef.current;
      }
    },
    [],
  );

  const remoteVideoCallbackRef = useCallback(
    (node: HTMLVideoElement | null) => {
      remoteVideoRef.current = node;
      if (node && remoteStreamRef.current) {
        node.srcObject = remoteStreamRef.current;
      }
    },
    [],
  );

  /* ─── Media helpers ─── */
  const startLocalMedia = useCallback(async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (searchVideoRef.current) searchVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      toast({
        title: "Camera required",
        description:
          "Please allow camera/microphone access to start streaming.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (searchVideoRef.current) searchVideoRef.current.srcObject = null;
  }, []);

  /* ─── Face detection ─── */
  const stopFaceDetection = useCallback(() => {
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
    }
    noFaceStartRef.current = null;
    setShowFaceWarning(false);
  }, []);

  const startFaceDetection = useCallback(() => {
    stopFaceDetection();
    setFaceWarningTimer(10);

    faceCheckIntervalRef.current = setInterval(() => {
      const video = localVideoRef.current;
      if (!video || video.readyState < 2) return;

      if (!faceCanvasRef.current) {
        faceCanvasRef.current = document.createElement("canvas");
      }
      const canvas = faceCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 160;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, 160, 120);
      const imageData = ctx.getImageData(0, 0, 160, 120);
      const data = imageData.data;
      let totalBrightness = 0;
      const pixelCount = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      const avg = totalBrightness / pixelCount;
      const detected = avg > 30;

      if (!detected) {
        if (!noFaceStartRef.current) noFaceStartRef.current = Date.now();
        const elapsed = (Date.now() - noFaceStartRef.current) / 1000;
        if (elapsed >= 10) {
          setShowFaceWarning(true);
        } else {
          setFaceWarningTimer(Math.max(0, 10 - Math.floor(elapsed)));
        }
      } else {
        noFaceStartRef.current = null;
        setShowFaceWarning(false);
        setFaceWarningTimer(10);
      }
    }, 3000);
  }, [stopFaceDetection]);

  /* ─── Connection quality monitoring ─── */
  const startQualityMonitor = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    statsIntervalRef.current = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let totalRtt = 0;
        let rttCount = 0;
        stats.forEach((report) => {
          if (
            report.type === "candidate-pair" &&
            report.state === "succeeded"
          ) {
            if (report.currentRoundTripTime) {
              totalRtt += report.currentRoundTripTime;
              rttCount++;
            }
          }
        });
        if (rttCount > 0) {
          const avgRtt = totalRtt / rttCount;
          if (avgRtt < 0.15) setConnectionQuality("good");
          else if (avgRtt < 0.4) setConnectionQuality("fair");
          else setConnectionQuality("poor");
        }
      } catch {
        // ignore
      }
    }, 5000);
  }, []);

  /* ─── Destroy peer connection ─── */
  const destroyPeer = useCallback(() => {
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch {
        /* */
      }
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        /* */
      }
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    remoteStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (offerRetryRef.current) {
      clearInterval(offerRetryRef.current);
      offerRetryRef.current = null;
    }
    stopFaceDetection();
  }, [stopFaceDetection]);

  /* ─── Skip to next stranger (internal) ─── */
  const handleSkipInternal = useCallback(() => {
    if (isSkippingRef.current) return;
    isSkippingRef.current = true;

    console.log("[Stream] Skipping to next stranger");

    // End the session record (skipped)
    endSessionRecord(true);

    // Send end signal to current peer
    try {
      realtimeService.sendSignal("", user?.id || "", { type: "end" });
    } catch {
      /* */
    }

    destroyPeer();
    if (offerRetryRef.current) {
      clearInterval(offerRetryRef.current);
      offerRetryRef.current = null;
    }

    // Leave signaling room
    if (signalingUnsubRef.current) {
      signalingUnsubRef.current();
      signalingUnsubRef.current = null;
    }
    realtimeService.leaveSignalingRoom();
    currentRoomIdRef.current = null;

    // Clean up old matchmaking callbacks
    matchmakingUnsubsRef.current.forEach((fn) => fn());
    matchmakingUnsubsRef.current = [];

    setMatchedUser(null);
    setChatMessages([]);
    setChatOpen(false);
    setUnreadChatCount(0);
    setTimer(0);
    setRemainingTime(MAX_CALL_DURATION);
    setState("searching");

    // Re-enter queue after a short delay
    setTimeout(async () => {
      isSkippingRef.current = false;
      if (!user?.id) return;

      await matchmakingService.leaveQueue();

      const prefs = {
        country: countryFilter === "global" ? undefined : countryFilter,
        gender: genderFilter === "any" ? undefined : genderFilter,
        profileGender: user.gender || undefined,
        profileCountry: user.country_code || undefined,
      };

      await matchmakingService.joinQueue(user.id, prefs);

      const unsub1 = matchmakingService.onMatch((matched) => {
        matchmakingUnsubsRef.current.forEach((fn) => fn());
        matchmakingUnsubsRef.current = [];
        connectToStrangerRef.current(matched);
      });

      const unsub2 = matchmakingService.onTimeout(() => {
        toast({
          title: "No match found",
          description: "Retrying automatically...",
        });
        // Trigger another skip-internal cycle to retry
        isSkippingRef.current = false;
        handleSkipInternal();
      });

      matchmakingUnsubsRef.current = [unsub1, unsub2];
    }, 500);
  }, [
    user?.id,
    countryFilter,
    genderFilter,
    destroyPeer,
    toast,
    endSessionRecord,
  ]);

  /* ─── Max call duration timer ─── */
  const startMaxDurationTimer = useCallback(() => {
    if (maxDurationTimeoutRef.current)
      clearTimeout(maxDurationTimeoutRef.current);
    if (countdownIntervalRef.current)
      clearInterval(countdownIntervalRef.current);

    setRemainingTime(MAX_CALL_DURATION);

    countdownIntervalRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    maxDurationTimeoutRef.current = setTimeout(() => {
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
      toast({
        title: "Time's up!",
        description:
          "Maximum 1 hour per session reached. Finding next stranger...",
      });
      handleSkipInternal();
    }, MAX_CALL_DURATION * 1000) as unknown as ReturnType<typeof setTimeout>;
  }, [toast, handleSkipInternal]);

  /* ─── Signaling handler ─── */
  /* Helper: initiator creates & sends an offer */
  const sendOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !isInitiatorRef.current) return;
    try {
      // If we already have a local description, re-send it instead of creating a new one
      if (pc.localDescription && pc.localDescription.type === "offer") {
        console.log("[Stream] Re-sending existing offer");
        realtimeService.sendSignal("", user?.id || "", {
          type: "offer",
          sdp: pc.localDescription.sdp,
        });
        return;
      }
      console.log("[Stream] Creating and sending offer");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      realtimeService.sendSignal("", user?.id || "", {
        type: "offer",
        sdp: offer.sdp,
      });
      offerSentRef.current = true;
    } catch (err) {
      console.error("[Stream] Error creating offer:", err);
    }
  }, [user?.id]);

  const handleSignal = useCallback(
    async (_fromUserId: string, signal: unknown) => {
      const sig = signal as Record<string, unknown>;
      const pc = pcRef.current;

      if (sig.type === "end") {
        console.log("[Stream] Remote user ended call");
        toast({
          title: "Disconnected",
          description: "The stranger left. Finding next...",
        });
        handleSkipInternal();
        return;
      }

      // Non-initiator tells us they're ready → initiator sends the offer
      if (sig.type === "ready") {
        console.log("[Stream] Received 'ready' from non-initiator");
        if (isInitiatorRef.current && pc) {
          sendOffer();
        }
        return;
      }

      if (!pc) {
        console.warn(
          "[Stream] Received signal but no PC exists, type:",
          sig.type,
        );
        return;
      }

      try {
        if (sig.type === "offer") {
          console.log("[Stream] Received offer");
          // Stop any retry timer — we got an offer, we're the non-initiator
          if (offerRetryRef.current) {
            clearInterval(offerRetryRef.current);
            offerRetryRef.current = null;
          }
          await pc.setRemoteDescription(
            new RTCSessionDescription(
              sig as unknown as RTCSessionDescriptionInit,
            ),
          );
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidatesRef.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          realtimeService.sendSignal("", user?.id || "", {
            type: "answer",
            sdp: answer.sdp,
          });
        } else if (sig.type === "answer") {
          console.log("[Stream] Received answer");
          // Stop offer retry — we got the answer
          if (offerRetryRef.current) {
            clearInterval(offerRetryRef.current);
            offerRetryRef.current = null;
          }
          await pc.setRemoteDescription(
            new RTCSessionDescription(
              sig as unknown as RTCSessionDescriptionInit,
            ),
          );
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidatesRef.current = [];
        } else if (sig.type === "candidate") {
          const candidateInit = sig.candidate as RTCIceCandidateInit;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
          } else {
            pendingCandidatesRef.current.push(candidateInit);
          }
        }
      } catch (err) {
        console.error("[Stream] Signal handling error:", err);
      }
    },
    [user?.id, toast, handleSkipInternal, sendOffer],
  );

  /* ─── Create WebRTC peer connection ─── */
  const createPeerConnection = useCallback(
    (initiator: boolean) => {
      console.log("[Stream] Creating peer connection, initiator:", initiator);
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;
      isInitiatorRef.current = initiator;

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Create remote stream holder
      const rs = new MediaStream();
      remoteStreamRef.current = rs;

      // Handle incoming tracks
      pc.ontrack = (ev) => {
        console.log("[Stream] ontrack:", ev.track.kind);
        ev.streams[0]?.getTracks().forEach((track) => {
          rs.addTrack(track);
        });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rs;
        }
        if (stateRef.current !== "connected") {
          setState("connected");
          setTimer(0);
          startMaxDurationTimer();
          startQualityMonitor();
          startFaceDetection();
        }
      };

      // ICE candidates
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          realtimeService.sendSignal("", user?.id || "", {
            type: "candidate",
            candidate: ev.candidate.toJSON(),
          });
        }
      };

      // Connection state
      pc.onconnectionstatechange = () => {
        console.log("[Stream] Connection state:", pc.connectionState);
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          if (
            stateRef.current === "connected" ||
            stateRef.current === "connecting"
          ) {
            toast({
              title: "Disconnected",
              description: "The stranger left. Finding next...",
            });
            handleSkipInternal();
          }
        }
      };

      // Shared handler for incoming data channel messages
      const handleIncomingChatMessage = (raw: string) => {
        try {
          const data = JSON.parse(raw);
          if (data.type === "chat") {
            setChatMessages((prev) => [
              ...prev,
              { from: "stranger", content: data.content },
            ]);
            // Auto-open chat & track unread if chat is closed
            if (!chatOpenRef.current) {
              setChatOpen(true);
              setUnreadChatCount((c) => c + 1);
            }
          } else if (data.type === "gift" && data.gift) {
            // Incoming gift from stranger — show animation + toast
            const incomingGift: import("@/lib/supabase").GiftTransaction = {
              id: data.gift.id || crypto.randomUUID(),
              sender_id: data.gift.sender_id || "",
              receiver_id: user?.id || "",
              gift_id: data.gift.gift_id || "",
              gift_name: data.gift.gift_name || "Gift",
              gift_emoji: data.gift.gift_emoji || "🎁",
              coin_cost: data.gift.coin_cost || 0,
              diamond_value: data.gift.diamond_value || 0,
              context: "stream_random",
              session_id: data.gift.session_id || null,
              group_id: null,
              created_at: new Date().toISOString(),
            };
            addIncomingGift(incomingGift);
            triggerAnimation(incomingGift);
          }
        } catch {
          /* */
        }
      };

      // Data channel for in-call chat
      if (initiator) {
        const dc = pc.createDataChannel("chat");
        dataChannelRef.current = dc;
        dc.onmessage = (ev) => handleIncomingChatMessage(ev.data);
      } else {
        pc.ondatachannel = (ev) => {
          const dc = ev.channel;
          dataChannelRef.current = dc;
          dc.onmessage = (msgEv) => handleIncomingChatMessage(msgEv.data);
        };
      }

      return pc;
    },
    [
      user?.id,
      toast,
      startMaxDurationTimer,
      startQualityMonitor,
      startFaceDetection,
      handleSkipInternal,
    ],
  );

  /* ─── Connect to matched stranger ─── */
  const connectToStranger = useCallback(
    async (matched: Profile) => {
      if (!user?.id || !localStreamRef.current) return;

      console.log("[Stream] Matched with:", matched.username);
      setMatchedUser(matched);
      setChatMessages([]);
      setState("connecting");

      const roomId = makeRoomId(user.id, matched.id);
      const initiator = user.id < matched.id;
      currentRoomIdRef.current = roomId;
      offerSentRef.current = false;

      // Clean up any previous peer & retry timer
      destroyPeer();
      if (offerRetryRef.current) {
        clearInterval(offerRetryRef.current);
        offerRetryRef.current = null;
      }

      // Unsubscribe previous signal handler
      if (signalingUnsubRef.current) {
        signalingUnsubRef.current();
        signalingUnsubRef.current = null;
      }

      // Join signaling room — MUST await so the channel is SUBSCRIBED before
      // we send any signal. This prevents the race where one side sends
      // ready/offer before the other side's channel is subscribed.
      try {
        await realtimeService.joinSignalingRoom(roomId, user.id);
      } catch (err) {
        console.error("[Stream] Failed to join signaling room:", err);
        toast({
          title: "Connection error",
          description: "Could not establish signaling. Retrying…",
          variant: "destructive",
        });
        handleSkipInternal();
        return;
      }

      // Subscribe to signals
      signalingUnsubRef.current = realtimeService.onSignal((_from, signal) => {
        handleSignal(_from, signal);
      });

      // Create peer connection
      createPeerConnection(initiator);

      // ── ROBUST HANDSHAKE ──
      // Both sides continuously signal their role every 2s until state
      // leaves "connecting". The initiator sends offers, the non-initiator
      // sends "ready" signals. This covers all race conditions.
      if (initiator) {
        console.log("[Stream] Initiator: starting offer loop");
        // First offer after a short delay (give non-initiator time to join)
        setTimeout(() => {
          if (stateRef.current === "connecting" && pcRef.current) {
            sendOffer();
          }
        }, 1200);
        // Retry every 2.5s
        offerRetryRef.current = setInterval(() => {
          if (stateRef.current !== "connecting" || !pcRef.current) {
            if (offerRetryRef.current) {
              clearInterval(offerRetryRef.current);
              offerRetryRef.current = null;
            }
            return;
          }
          console.log("[Stream] Initiator: retrying offer…");
          sendOffer();
        }, 2500);
      } else {
        console.log("[Stream] Non-initiator: starting ready loop");
        // Send ready immediately
        realtimeService.sendSignal("", user.id, { type: "ready" });
        // Keep re-sending ready every 2s until we leave connecting state
        offerRetryRef.current = setInterval(() => {
          if (stateRef.current !== "connecting" || !pcRef.current) {
            if (offerRetryRef.current) {
              clearInterval(offerRetryRef.current);
              offerRetryRef.current = null;
            }
            return;
          }
          console.log("[Stream] Non-initiator: re-sending 'ready'");
          realtimeService.sendSignal("", user.id, { type: "ready" });
        }, 2000);
      }
    },
    [user?.id, destroyPeer, createPeerConnection, handleSignal, sendOffer],
  );

  // Keep a stable ref for connectToStranger so handleSkipInternal can use it
  const connectToStrangerRef = useRef(connectToStranger);
  useEffect(() => {
    connectToStrangerRef.current = connectToStranger;
  }, [connectToStranger]);

  /* ─── Start streaming ─── */
  const startSearching = useCallback(async () => {
    const stream = await startLocalMedia();
    if (!stream || !user?.id) return;

    setState("searching");

    // Small delay for video element to render
    await new Promise((r) => setTimeout(r, 300));

    const prefs = {
      country: countryFilter === "global" ? undefined : countryFilter,
      gender: genderFilter === "any" ? undefined : genderFilter,
      // Pass actual profile data so others can filter against us
      profileGender: user.gender || undefined,
      profileCountry: user.country_code || undefined,
    };

    await matchmakingService.joinQueue(user.id, prefs);

    const unsub1 = matchmakingService.onMatch((matched) => {
      matchmakingUnsubsRef.current.forEach((fn) => fn());
      matchmakingUnsubsRef.current = [];
      connectToStrangerRef.current(matched);
    });

    const unsub2 = matchmakingService.onTimeout(() => {
      toast({
        title: "No match found",
        description: "Retrying automatically...",
      });
      // Re-join queue
      matchmakingService.joinQueue(user.id, prefs).then(() => {
        const u1 = matchmakingService.onMatch((matched) => {
          matchmakingUnsubsRef.current.forEach((fn) => fn());
          matchmakingUnsubsRef.current = [];
          connectToStrangerRef.current(matched);
        });
        matchmakingUnsubsRef.current = [u1];
      });
    });

    matchmakingUnsubsRef.current = [unsub1, unsub2];
  }, [startLocalMedia, user?.id, countryFilter, genderFilter, toast]);

  /* ─── User-facing skip ─── */
  const handleSkip = useCallback(() => {
    const newCount = skipCount + 1;
    setSkipCount(newCount);
    if (newCount % 5 === 0) {
      setShowInterstitial(true);
    }
    handleSkipInternal();
  }, [skipCount, handleSkipInternal]);

  /* ─── End streaming completely ─── */
  const handleEnd = useCallback(() => {
    console.log("[Stream] Ending stream completely");

    // Capture data for post-call rating before clearing state
    const wasConnected = stateRef.current === "connected";
    if (wasConnected && matchedUser && sessionIdRef.current && timer >= 30) {
      postCallSessionIdRef.current = sessionIdRef.current;
      postCallMatchedUserRef.current = matchedUser;
      postCallTimerRef.current = timer;
    }

    // End the session record
    endSessionRecord(false);

    try {
      realtimeService.sendSignal("", user?.id || "", { type: "end" });
    } catch {
      /* */
    }

    destroyPeer();

    if (signalingUnsubRef.current) {
      signalingUnsubRef.current();
      signalingUnsubRef.current = null;
    }
    realtimeService.leaveSignalingRoom();
    currentRoomIdRef.current = null;

    matchmakingUnsubsRef.current.forEach((fn) => fn());
    matchmakingUnsubsRef.current = [];
    matchmakingService.leaveQueue();
    stopLocalMedia();
    stopFaceDetection();

    setMatchedUser(null);
    setChatMessages([]);
    setChatOpen(false);
    setShowGiftTray(false);
    setUnreadChatCount(0);
    setTimer(0);
    setRemainingTime(MAX_CALL_DURATION);
    setState("idle");

    // Show post-call rating if call was long enough
    if (wasConnected && postCallSessionIdRef.current) {
      setTimeout(() => setShowPostCallRating(true), 300);
    }
  }, [
    user?.id,
    matchedUser,
    timer,
    destroyPeer,
    stopLocalMedia,
    stopFaceDetection,
    endSessionRecord,
  ]);

  /* ─── Toggle mute ─── */
  const handleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  /* ─── Toggle camera ─── */
  const handleCameraToggle = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !isCameraOn;
      });
    }
    setIsCameraOn(!isCameraOn);
  }, [isCameraOn]);

  /* ─── Send chat message ─── */
  const handleSendChat = useCallback(() => {
    if (!chatMessage.trim()) return;
    const msg = chatMessage.trim();
    if (
      dataChannelRef.current &&
      dataChannelRef.current.readyState === "open"
    ) {
      dataChannelRef.current.send(
        JSON.stringify({ type: "chat", content: msg }),
      );
    }
    setChatMessages((prev) => [...prev, { from: "me", content: msg }]);
    setChatMessage("");
  }, [chatMessage]);

  /* ─── Report ─── */
  const handleReport = useCallback(async () => {
    if (!reportReason || !user || !matchedUser) return;
    await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_id: matchedUser.id,
      reason: reportReason,
      description: reportDesc || null,
    });
    // End session as reported
    await endSessionRecord(false, true);
    toast({
      title: "Report submitted",
      description: "Thank you. We'll review this shortly.",
    });
    setShowReport(false);
    setReportReason("");
    setReportDesc("");
  }, [reportReason, reportDesc, user, matchedUser, toast, endSessionRecord]);

  /* ─── Block ─── */
  const handleBlock = useCallback(async () => {
    if (!user || !matchedUser) return;
    await supabase.from("blocks").insert({
      blocker_id: user.id,
      blocked_id: matchedUser.id,
    });
    toast({
      title: "User blocked",
      description: "You won't match with this person again.",
    });
    handleSkip();
  }, [user, matchedUser, toast, handleSkip]);

  /* ─── Follow / Unfollow handler ─── */
  const handleFollowToggle = useCallback(async () => {
    if (!user?.id || !matchedUser?.id || followLoading) return;
    setFollowLoading(true);
    try {
      if (followStatus === "none") {
        await sendFollowRequest(user.id, matchedUser.id);
        setFollowStatus("pending_sent");
        toast({ title: "Follow request sent!" });
      } else if (followStatus === "pending_sent") {
        await cancelFollowRequest(user.id, matchedUser.id);
        setFollowStatus("none");
        toast({ title: "Follow request cancelled" });
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not process follow request",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  }, [
    user?.id,
    matchedUser?.id,
    followStatus,
    followLoading,
    sendFollowRequest,
    cancelFollowRequest,
    toast,
  ]);

  /* ─── Send gift to stranger ─── */
  const handleSendGift = useCallback(
    async (gift: GiftItem) => {
      if (!user?.id || !matchedUser?.id) return;
      const transaction = await sendGift({
        senderId: user.id,
        receiverId: matchedUser.id,
        giftId: gift.id,
        context: "stream_random",
        sessionId: sessionIdRef.current ?? undefined,
      });
      if (transaction) {
        // Notify the stranger via data channel
        if (
          dataChannelRef.current &&
          dataChannelRef.current.readyState === "open"
        ) {
          dataChannelRef.current.send(
            JSON.stringify({
              type: "gift",
              gift: {
                id: transaction.id,
                sender_id: user.id,
                gift_id: gift.id,
                gift_name: gift.name,
                gift_emoji: gift.emoji,
                coin_cost: gift.coin_cost,
                session_id: sessionIdRef.current,
              },
            }),
          );
        }
        setShowGiftTray(false);
        toast({
          title: `${gift.emoji} ${gift.name} sent!`,
          description: `${gift.coin_cost} coins`,
        });
      }
    },
    [user?.id, matchedUser?.id, sendGift, toast],
  );

  /* ─── Timer for connected state ─── */
  useEffect(() => {
    if (state === "connected") {
      const interval = setInterval(() => setTimer((t) => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  /* ─── Initialize gift wallet & catalog ─── */
  useEffect(() => {
    if (user?.id) {
      ensureWallet(user.id);
      fetchGifts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ─── Refresh wallet when call connects ─── */
  useEffect(() => {
    if (state === "connected" && user?.id) {
      fetchWallet(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, user?.id]);

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      console.log("[Stream] Unmounting — cleaning up everything");

      // End session record on unmount
      if (sessionIdRef.current) {
        supabase
          .from("stream_sessions")
          .update({
            ended_at: new Date().toISOString(),
            duration: 0,
            was_skipped: false,
            was_reported: false,
          })
          .eq("id", sessionIdRef.current)
          .then(() => {});
        sessionIdRef.current = null;
      }

      try {
        realtimeService.sendSignal("", user?.id || "", { type: "end" });
      } catch {
        /* */
      }
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {
          /* */
        }
        pcRef.current = null;
      }
      if (dataChannelRef.current) {
        try {
          dataChannelRef.current.close();
        } catch {
          /* */
        }
        dataChannelRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (signalingUnsubRef.current) {
        signalingUnsubRef.current();
        signalingUnsubRef.current = null;
      }
      matchmakingUnsubsRef.current.forEach((fn) => fn());
      matchmakingUnsubsRef.current = [];
      realtimeService.leaveSignalingRoom();
      matchmakingService.leaveQueue();
      if (maxDurationTimeoutRef.current)
        clearTimeout(maxDurationTimeoutRef.current);
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      if (offerRetryRef.current) clearInterval(offerRetryRef.current);
      if (faceCheckIntervalRef.current)
        clearInterval(faceCheckIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Re-attach streams on state change ─── */
  useEffect(() => {
    if (localStreamRef.current) {
      if (localVideoRef.current)
        localVideoRef.current.srcObject = localStreamRef.current;
      if (searchVideoRef.current)
        searchVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [state]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [state]);

  /* ══════════════════════════════════════════════════════════
   *  RENDER
   * ══════════════════════════════════════════════════════════ */

  const content = (
    <div className="h-full w-full flex flex-col">
      {/* Interstitial Ad */}
      {showInterstitial && (
        <InterstitialAd
          onClose={() => setShowInterstitial(false)}
          countdown={5}
        />
      )}

      {/* Video Area */}
      <div className="flex-1 relative rounded-3xl overflow-hidden bg-muted/30 border border-border/30 m-4 mb-2">
        <AnimatePresence mode="wait">
          {/* ── IDLE STATE ── */}
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
                {/* Hero icon */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-5 neon-glow-blue"
                >
                  <Video className="w-9 h-9 text-primary" />
                </motion.div>

                {/* Online count pill */}
                <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-full glass border border-border/30">
                  <Users className="w-4 h-4 text-neon-green" />
                  <span className="text-sm font-bold text-foreground">
                    {onlineCount}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    people online
                  </span>
                  <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 text-center">
                  Meet New People
                </h2>
                <p className="text-muted-foreground mb-6 text-center max-w-sm text-sm sm:text-base">
                  Start a live video call with a random stranger. Use filters to
                  choose who you want to connect with.
                </p>

                {/* Active filter tags */}
                {(countryFilter !== "global" || genderFilter !== "any") && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xs text-muted-foreground">
                      Active filters:
                    </span>
                    {countryFilter !== "global" && (
                      <Badge className="glass text-xs border-primary/30 text-primary">
                        <Globe className="w-3 h-3 mr-1" />
                        {
                          countries.find((c) => c.code === countryFilter)?.flag
                        }{" "}
                        {countries.find((c) => c.code === countryFilter)
                          ?.name || countryFilter}
                      </Badge>
                    )}
                    {genderFilter !== "any" && (
                      <Badge className="glass text-xs border-primary/30 text-primary">
                        <Users className="w-3 h-3 mr-1" />
                        {genderFilter === "male" ? "Male only" : "Female only"}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`glass rounded-xl px-5 ${
                      showFilters
                        ? "border-primary text-primary"
                        : "border-border/50"
                    }`}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {showFilters ? "Hide Filters" : "Set Filters"}
                  </Button>
                  <Button
                    onClick={startSearching}
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold px-8 rounded-xl neon-glow-blue hover:scale-105 transition-transform text-base"
                  >
                    <Wifi className="w-4 h-4 mr-2" /> Start Streaming
                  </Button>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: 10, height: 0 }}
                      className="glass rounded-2xl p-5 w-full max-w-md overflow-hidden"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-foreground">
                          Match Preferences
                        </h3>
                      </div>

                      <div className="space-y-5">
                        {/* Country filter */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <label className="text-sm font-medium text-foreground">
                              Country
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Pick a country to only match with people from there
                          </p>
                          <Select
                            value={countryFilter}
                            onValueChange={setCountryFilter}
                          >
                            <SelectTrigger className="bg-muted/50 border-border/50 rounded-xl h-11">
                              <SelectValue placeholder="Global — Any country" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border max-h-48">
                              <SelectItem value="global">
                                Global — Any country
                              </SelectItem>
                              {countries.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.flag} {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Gender filter */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-primary" />
                            <label className="text-sm font-medium text-foreground">
                              Gender
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Choose who you'd like to talk to
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: "any", label: "Anyone" },
                              { value: "male", label: "Male" },
                              { value: "female", label: "Female" },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setGenderFilter(opt.value)}
                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                                  genderFilter === opt.value
                                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                                    : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Filter info note */}
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                          <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">
                            Filters match you with people based on their real
                            profile. If you select <strong>Female</strong>,
                            you'll only connect with users who registered as
                            female.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── SEARCHING STATE ── */}
          {state === "searching" && (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col md:flex-row"
            >
              {/* Own camera preview */}
              <div className="flex-1 relative bg-gradient-to-br from-muted via-muted/80 to-card">
                {localStreamRef.current ? (
                  <video
                    ref={searchVideoCallbackRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">
                      Starting camera...
                    </span>
                  </div>
                )}
                <div className="absolute bottom-4 left-4">
                  <Badge className="glass text-foreground border-border/50">
                    <span className="w-2 h-2 bg-neon-green rounded-full mr-2 animate-pulse" />
                    You
                  </Badge>
                </div>
              </div>

              {/* Royal orbital search animation */}
              <div className="flex-1 flex flex-col items-center justify-center bg-background/50 px-4">
                <div
                  className="relative w-48 h-48 sm:w-56 sm:h-56 mb-6"
                  style={{ perspective: "600px" }}
                >
                  {/* Orbital rings */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={`ring-${i}`}
                      className="absolute inset-0 rounded-full border border-primary/20"
                      style={{
                        rotateX: `${55 + i * 12}deg`,
                        transformStyle: "preserve-3d",
                      }}
                      animate={{ rotateZ: i % 2 === 0 ? 360 : -360 }}
                      transition={{
                        duration: 4 + i * 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      {/* Orbiting dots */}
                      {[0, 1].map((d) => (
                        <motion.div
                          key={d}
                          className="absolute w-2 h-2 rounded-full bg-primary"
                          style={{
                            top: d === 0 ? "-4px" : "auto",
                            bottom: d === 1 ? "-4px" : "auto",
                            left: "50%",
                            transform: "translateX(-50%)",
                            boxShadow: "0 0 8px hsl(var(--primary) / 0.6)",
                          }}
                        />
                      ))}
                    </motion.div>
                  ))}

                  {/* Wave ripples */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={`wave-${i}`}
                      className="absolute inset-0 rounded-full border border-secondary/20"
                      animate={{ scale: [0.4, 2.2], opacity: [0.6, 0] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 1,
                        ease: "easeOut",
                      }}
                    />
                  ))}

                  {/* Central energy core */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, hsl(var(--secondary) / 0.2) 60%, transparent 100%)",
                        boxShadow:
                          "0 0 30px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--secondary) / 0.15)",
                      }}
                      animate={{
                        scale: [1, 1.15, 1],
                        boxShadow: [
                          "0 0 30px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--secondary) / 0.15)",
                          "0 0 50px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--secondary) / 0.25)",
                          "0 0 30px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--secondary) / 0.15)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <motion.div
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Search className="w-6 h-6 text-primary-foreground" />
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Floating silhouettes */}
                  {[0, 1, 2, 3].map((i) => {
                    const angle = i * 90 * (Math.PI / 180);
                    const radius = 75;
                    return (
                      <motion.div
                        key={`sil-${i}`}
                        className="absolute w-8 h-8 rounded-full bg-muted/30 border border-border/30 flex items-center justify-center"
                        style={{
                          left: `calc(50% + ${Math.cos(angle) * radius}px - 16px)`,
                          top: `calc(50% + ${Math.sin(angle) * radius}px - 16px)`,
                        }}
                        animate={{
                          x: [0, Math.cos(angle + 0.5) * 15, 0],
                          y: [0, Math.sin(angle + 0.5) * 15, 0],
                          opacity: [0.3, 0.7, 0.3],
                          scale: [0.8, 1, 0.8],
                        }}
                        transition={{
                          duration: 3 + i * 0.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.4,
                        }}
                      >
                        <Users className="w-4 h-4 text-muted-foreground/50" />
                      </motion.div>
                    );
                  })}

                  {/* Rotating gradient border */}
                  <motion.div
                    className="absolute -inset-3 rounded-full opacity-30"
                    style={{
                      background:
                        "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), hsl(var(--primary)))",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))",
                      WebkitMask:
                        "radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>

                {/* Typewriter search text */}
                <motion.h2
                  className="text-lg sm:text-xl font-bold text-foreground mb-2 text-center"
                  style={{
                    textShadow:
                      "0 0 12px hsl(var(--primary) / 0.4), 0 0 24px hsl(var(--primary) / 0.2)",
                  }}
                >
                  <SearchingText />
                </motion.h2>
                <p className="text-muted-foreground text-sm mb-2 text-center">
                  Finding someone for you
                </p>

                {/* Show active filters during search */}
                {(countryFilter !== "global" || genderFilter !== "any") && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
                    {countryFilter !== "global" && (
                      <Badge className="glass text-xs border-primary/30 text-primary">
                        <Globe className="w-3 h-3 mr-1" />
                        {
                          countries.find((c) => c.code === countryFilter)?.flag
                        }{" "}
                        {countries.find((c) => c.code === countryFilter)?.name}
                      </Badge>
                    )}
                    {genderFilter !== "any" && (
                      <Badge className="glass text-xs border-primary/30 text-primary">
                        {genderFilter === "male" ? "Male" : "Female"}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs mb-4">
                  <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" />
                  {onlineCount} people online
                </div>
                <Button
                  variant="outline"
                  onClick={handleEnd}
                  className="glass border-border/50 rounded-xl text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-1.5" /> Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── CONNECTING STATE ── */}
          {state === "connecting" && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm"
            >
              <motion.div
                className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent mb-6"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <h2 className="text-xl font-bold text-foreground mb-2 neon-text-blue">
                Match Found!
              </h2>
              <p className="text-muted-foreground text-sm">
                Establishing connection...
              </p>
              {matchedUser && (
                <div className="mt-4 flex items-center gap-3 glass rounded-xl px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                    {matchedUser.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {matchedUser.username || "Stranger"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {matchedUser.country || "Unknown"}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── CONNECTED STATE ── */}
          {state === "connected" && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0"
            >
              {/* Remote video */}
              <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-card flex items-center justify-center">
                <video
                  ref={remoteVideoCallbackRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 via-black/40 to-transparent pt-3 pb-8 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="glass-strong text-neon-green border-neon-green/30">
                      <span className="w-2 h-2 bg-neon-green rounded-full mr-1.5 animate-pulse" />
                      Live
                    </Badge>
                    {matchedUser && (
                      <Badge className="glass-strong text-white/90 border-white/20">
                        {matchedUser.username || "Stranger"}
                        {matchedUser.country ? ` · ${matchedUser.country}` : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className="glass-strong text-white/80 border-white/20 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(timer)}
                    </Badge>
                    <Badge
                      className={`glass-strong border-white/20 text-xs ${
                        remainingTime <= 60
                          ? "text-red-400 animate-pulse"
                          : "text-white/60"
                      }`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimeHMS(remainingTime)}
                    </Badge>
                    <Badge
                      className={`glass-strong border-white/20 text-xs ${
                        connectionQuality === "good"
                          ? "text-neon-green"
                          : connectionQuality === "fair"
                            ? "text-yellow-400"
                            : "text-destructive"
                      }`}
                    >
                      <Signal className="w-3 h-3 mr-1" />
                      {connectionQuality}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action buttons (top-right) */}
              <div className="absolute top-14 right-3 flex flex-col gap-1.5">
                {/* Follow */}
                <button
                  onClick={handleFollowToggle}
                  disabled={
                    followLoading ||
                    followStatus === "following" ||
                    followStatus === "mutual"
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl glass-strong border transition-all text-xs font-medium ${
                    followStatus === "following" || followStatus === "mutual"
                      ? "border-neon-green/30 text-neon-green"
                      : followStatus === "pending_sent"
                        ? "border-yellow-500/30 text-yellow-400"
                        : "border-white/20 text-white/80 hover:bg-white/10 active:scale-95"
                  }`}
                >
                  {followLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : followStatus === "following" ||
                    followStatus === "mutual" ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" /> Following
                    </>
                  ) : followStatus === "pending_sent" ? (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Pending
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Follow
                    </>
                  )}
                </button>
                {/* Chat */}
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl glass-strong border transition-all text-xs font-medium ${
                    chatOpen
                      ? "border-primary/30 text-primary"
                      : unreadChatCount > 0
                        ? "border-primary/40 text-primary animate-pulse"
                        : "border-white/20 text-white/80 hover:bg-white/10 active:scale-95"
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {chatOpen ? "Hide Chat" : "Chat"}
                  {!chatOpen && unreadChatCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
                {/* Report */}
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl glass-strong border border-white/20 text-white/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all text-xs font-medium active:scale-95"
                >
                  <Flag className="w-3.5 h-3.5" /> Report
                </button>
                {/* Block */}
                <button
                  onClick={handleBlock}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl glass-strong border border-white/20 text-white/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all text-xs font-medium active:scale-95"
                >
                  <Ban className="w-3.5 h-3.5" /> Block
                </button>
              </div>

              {/* Self-view PiP */}
              <motion.div
                drag
                dragConstraints={{
                  left: -200,
                  right: 0,
                  top: -200,
                  bottom: 0,
                }}
                className="absolute bottom-24 right-4 w-36 h-48 rounded-2xl bg-card border-2 border-primary/30 overflow-hidden shadow-lg cursor-grab active:cursor-grabbing"
              >
                {localStreamRef.current ? (
                  <video
                    ref={localVideoCallbackRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-card to-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">
                      Your camera
                    </span>
                  </div>
                )}
              </motion.div>

              {/* In-call chat panel */}
              <AnimatePresence>
                {chatOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute bottom-24 left-4 w-72 max-h-80 glass rounded-2xl flex flex-col overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3 border-b border-border/30">
                      <span className="text-sm font-semibold text-foreground">
                        Chat
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={() => setChatOpen(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-48">
                      {chatMessages.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Say hi! Messages are sent via direct connection.
                        </p>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`text-xs ${msg.from === "me" ? "text-right" : "text-left"}`}
                        >
                          <span
                            className={`inline-block px-3 py-1.5 rounded-xl ${
                              msg.from === "me"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {msg.content}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 border-t border-border/30 flex gap-2">
                      <Input
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                        placeholder="Type..."
                        className="h-8 text-xs bg-muted/30 border-border/30 rounded-lg"
                      />
                      <Button
                        size="icon"
                        onClick={handleSendChat}
                        className="w-8 h-8 shrink-0 bg-primary rounded-lg"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Face detection warning */}
              {showFaceWarning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-background/80 flex items-center justify-center z-20"
                >
                  <div className="glass rounded-2xl p-8 text-center max-w-sm">
                    <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Face Not Detected
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Please show your face to continue streaming
                    </p>
                    <div className="text-4xl font-bold text-destructive neon-text-blue">
                      {faceWarningTimer}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls bar */}
      {(state === "connected" || state === "searching") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 pt-1"
        >
          {/* Mute button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleMute}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl glass border-border/50 ${
                isMuted
                  ? "text-destructive border-destructive/30 bg-destructive/10"
                  : "text-foreground"
              }`}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </Button>
            <span
              className={`text-[10px] font-medium ${
                isMuted ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {isMuted ? "Unmute" : "Mute"}
            </span>
          </div>

          {/* Camera button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCameraToggle}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl glass border-border/50 ${
                !isCameraOn
                  ? "text-destructive border-destructive/30 bg-destructive/10"
                  : "text-foreground"
              }`}
            >
              {isCameraOn ? (
                <Video className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </Button>
            <span
              className={`text-[10px] font-medium ${
                !isCameraOn ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {isCameraOn ? "Camera" : "Camera Off"}
            </span>
          </div>

          {/* Gift button — only when connected */}
          {state === "connected" && (
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowGiftTray(!showGiftTray)}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl glass border-border/50 transition-all ${
                  showGiftTray
                    ? "border-yellow-400/60 text-yellow-400 bg-yellow-400/10"
                    : "text-foreground hover:border-yellow-400/40 hover:text-yellow-400"
                }`}
              >
                <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
              <span className="text-[10px] text-muted-foreground font-medium">
                Gift
              </span>
            </div>
          )}

          {/* Next / Skip button */}
          {state === "connected" && (
            <div className="flex flex-col items-center gap-1">
              <Button
                onClick={handleSkip}
                className="h-12 sm:h-14 px-6 sm:px-8 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold neon-glow-blue hover:scale-105 transition-transform"
              >
                <SkipForward className="w-5 h-5 mr-1.5" /> Next Person
              </Button>
              <span className="text-[10px] text-muted-foreground font-medium">
                Skip & find new
              </span>
            </div>
          )}

          {/* End call button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleEnd}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <span className="text-[10px] text-destructive font-medium">
              End
            </span>
          </div>
        </motion.div>
      )}

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="glass border-border/50">
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger className="bg-muted/30 border-border/30 rounded-xl">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="nudity">Nudity / Sexual Content</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="underage">Underage User</SelectItem>
                <SelectItem value="hate_speech">Hate Speech</SelectItem>
                <SelectItem value="violence">Violence</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              placeholder="Additional details (optional)"
              className="bg-muted/30 border-border/30 rounded-xl resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowReport(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReport}
                className="bg-destructive text-destructive-foreground rounded-xl"
              >
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Gift Tray (slide-up panel) ── */}
      {state === "connected" && (
        <GiftTray
          isOpen={showGiftTray}
          onClose={() => setShowGiftTray(false)}
          gifts={gifts}
          wallet={wallet}
          onSend={handleSendGift}
          isSending={isGiftSending}
          isPremium={false}
        />
      )}

      {/* ── Gift animation overlay (my own sent gift) ── */}
      <GiftAnimationOverlay
        activeGift={activeAnimation}
        onComplete={clearAnimation}
      />

      {/* ── Incoming gift toasts (from stranger) ── */}
      <GiftNotificationToast
        gifts={incomingGiftQueue}
        onRemove={removeIncomingGift}
      />

      {/* ── Post-call rating dialog ── */}
      <PostCallRating
        isOpen={showPostCallRating}
        sessionId={postCallSessionIdRef.current || ""}
        otherUser={postCallMatchedUserRef.current}
        duration={postCallTimerRef.current}
        onRate={async () => {
          setShowPostCallRating(false);
          postCallSessionIdRef.current = null;
          postCallMatchedUserRef.current = null;
        }}
        onClose={() => {
          setShowPostCallRating(false);
          postCallSessionIdRef.current = null;
          postCallMatchedUserRef.current = null;
        }}
      />
    </div>
  );

  /* ─── Full-screen lock during active streaming, AppLayout when idle ─── */
  if (isCallActive) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
        {content}
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">{content}</div>
    </AppLayout>
  );
};

export default Stream;
