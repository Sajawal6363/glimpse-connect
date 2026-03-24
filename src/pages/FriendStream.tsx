import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
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
const ACTIVE_FRIEND_CALL_KEY = "active_friend_call_session";

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

const FriendStream = () => {
  const { odierUserId } = useParams<{ odierUserId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const { getMaxCallDurationSeconds, requireFeature } = useSubscriptionStore();
  const maxCallDurationSeconds = getMaxCallDurationSeconds();

  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Callback refs: when React mounts a new <video> element (due to AnimatePresence
  // destroying/recreating DOM across status changes), we must re-attach the stream.
  const localVideoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && localStreamRef.current) {
      console.log(
        "[FriendStream] localVideoCallbackRef — attaching local stream to new DOM node",
      );
      node.srcObject = localStreamRef.current;
      node.muted = true;
      node.play().catch(() => {});
    }
  }, []);

  const remoteVideoCallbackRef = useCallback(
    (node: HTMLVideoElement | null) => {
      remoteVideoRef.current = node;
      if (node && remoteStreamRef.current) {
        console.log(
          "[FriendStream] remoteVideoCallbackRef — attaching remote stream to new DOM node, tracks:",
          remoteStreamRef.current
            .getTracks()
            .map((t) => `${t.kind}:${t.readyState}`),
        );
        node.srcObject = remoteStreamRef.current;
        node.muted = false;
        node.play().catch(() => {});
      }
    },
    [],
  );
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
  const signalUnsubRef = useRef<(() => void) | null>(null);
  const webRtcStartingRef = useRef(false);
  const statusRef = useRef<CallStatus>("idle");
  const callDurationRef = useRef(0);
  const callStartedAtRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // ===== Friend Call Session Persistence =====
  const clearFriendCallSession = () => {
    localStorage.removeItem(ACTIVE_FRIEND_CALL_KEY);
  };

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

    // Block browser back button
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [status]);

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
        console.log(
          "[FriendStream] Personal channel received:",
          data.action,
          "from",
          data.callerId.slice(0, 8),
        );

        switch (data.action) {
          case "accept":
            // Other user accepted from their overlay → start WebRTC as initiator
            // We already joined signaling room in startCall(), so just create peer connection
            if (statusRef.current === "calling") {
              clearRingTimeout();
              startWebRTCAsInitiator();
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
        console.log(
          "[FriendStream] Room channel received:",
          data.action,
          "from",
          data.fromUserId.slice(0, 8),
        );

        switch (data.action) {
          case "accept":
            if (statusRef.current === "calling") {
              clearRingTimeout();
              startWebRTCAsInitiator();
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
      // We are the receiver — prepare WebRTC first, then send accept.
      const acceptAndConnect = async () => {
        console.log("[FriendStream] RECEIVER: Starting accept flow");
        setStatus("connecting");

        // Start 1-hour max call duration timer
        startMaxDurationTimer();

        // 1. Get local media first
        const stream = localStreamRef.current || (await startLocalStream());
        if (!stream) {
          console.error("[FriendStream] RECEIVER: Failed to get local stream");
          setStatus("idle");
          return;
        }

        // 2. Join signaling room and wait for subscription to be active
        await realtimeService.joinSignalingRoom(roomId.current, currentUser.id);
        console.log("[FriendStream] RECEIVER: Joined signaling room");

        // 3. Create peer connection (non-initiator — will wait for offer)
        if (signalUnsubRef.current) {
          signalUnsubRef.current();
          signalUnsubRef.current = null;
        }
        createPeerConnection(stream, false);
        console.log(
          "[FriendStream] RECEIVER: Peer connection created, waiting for offer",
        );

        // 4. Small delay to ensure signal handler is fully registered
        await new Promise((r) => setTimeout(r, 300));

        // 5. NOW tell the caller we are ready — send accept on both channels
        const callerCh = supabase.channel(`incoming-call-${odierUserId}`, {
          config: { broadcast: { self: false } },
        });
        callerCh.subscribe((s) => {
          if (s === "SUBSCRIBED") {
            console.log(
              "[FriendStream] RECEIVER: Sending accept to caller's personal channel",
            );
            callerCh.send({
              type: "broadcast",
              event: "incoming-call",
              payload: {
                action: "accept",
                callerId: currentUser.id,
                roomId: roomId.current,
              },
            });
            setTimeout(() => callerCh.unsubscribe(), 1000);
          }
        });

        // Also send on room channel
        sendCallSignal("accept");
        console.log(
          "[FriendStream] RECEIVER: Accept signals sent, waiting for offer...",
        );

        // Timeout: if still connecting after 45s, give up
        setTimeout(() => {
          if (statusRef.current === "connecting") {
            console.error(
              "[FriendStream] RECEIVER: Connection timed out after 45s",
            );
            toast({
              title: "Connection failed",
              description: "Could not establish a video connection. Try again.",
              variant: "destructive",
            });
            endCallSilent();
          }
        }, 45_000);
      };
      acceptAndConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, odierUserId, otherUser]);

  // Cleanup on unmount — always end the call since WebRTC can't survive navigation
  useEffect(() => {
    return () => {
      const active =
        statusRef.current === "calling" ||
        statusRef.current === "connecting" ||
        statusRef.current === "connected";
      if (active) {
        // Signal end to the other user so their call ends too
        callChannelRef.current?.send({
          type: "broadcast",
          event: "call-signal",
          payload: { action: "end", fromUserId: currentUser?.id },
        });
      }
      cleanupMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== HELPERS =====

  /** Start 1-hour max call duration timer */
  const startMaxDurationTimer = () => {
    if (maxDurationTimeoutRef.current) return;
    maxDurationTimeoutRef.current = setTimeout(() => {
      if (
        statusRef.current === "connected" ||
        statusRef.current === "connecting" ||
        statusRef.current === "calling"
      ) {
        toast({
          title: "Call time limit reached",
          description: `Calls are limited to ${Math.floor(maxCallDurationSeconds / 60)} minutes on your plan.`,
        });
        if (maxCallDurationSeconds <= 3 * 60) {
          requireFeature("priorityMatching", {
            title: "Extend your call duration",
            description:
              "Upgrade to Premium for up to 60 minutes per call session.",
          });
        }
        endCallWithSignal();
      }
    }, maxCallDurationSeconds * 1000);
  };

  const cleanupMedia = () => {
    console.log("[FriendStream] cleanupMedia called");
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    remoteStreamRef.current = null;
    pendingIceCandidatesRef.current = [];
    webRtcStartingRef.current = false;
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    if (signalUnsubRef.current) {
      signalUnsubRef.current();
      signalUnsubRef.current = null;
    }
    peerRef.current?.close();
    peerRef.current = null;
    realtimeService.leaveSignalingRoom();
    clearRingTimeout();
    clearFriendCallSession();
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

  const attachAndPlayVideo = (
    element: HTMLVideoElement | null,
    stream: MediaStream,
    muted: boolean,
  ) => {
    if (!element) return;
    element.srcObject = stream;
    element.muted = muted;
    element.play().catch(() => {
      element.addEventListener(
        "loadedmetadata",
        () => {
          element.play().catch(() => {});
        },
        { once: true },
      );
    });
  };

  // Re-attach streams whenever status changes — backup for callback refs.
  // The callback refs handle mount, this handles cases where the ref node
  // already exists but the stream was updated.
  useEffect(() => {
    // Use a small delay to ensure the DOM has rendered the new state
    const timer = setTimeout(() => {
      if (localStreamRef.current && localVideoRef.current) {
        if (localVideoRef.current.srcObject !== localStreamRef.current) {
          console.log(
            "[FriendStream] Re-attaching local stream on status change:",
            status,
          );
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(() => {});
        }
      }
      if (remoteStreamRef.current && remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          console.log(
            "[FriendStream] Re-attaching remote stream on status change:",
            status,
          );
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.play().catch(() => {});
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [status]);

  // ===== MEDIA & WEBRTC =====

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        attachAndPlayVideo(localVideoRef.current, stream, true);
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
      console.log(
        "[FriendStream] createPeerConnection — initiator:",
        initiator,
      );
      console.log(
        "[FriendStream] Local stream tracks:",
        stream.getTracks().map((t) => `${t.kind}:${t.enabled}`),
      );

      const iceServers = getIceServers();
      console.log(
        "[FriendStream] ICE servers:",
        iceServers.map((s) => s.urls),
      );

      const pc = new RTCPeerConnection({ iceServers });
      peerRef.current = pc;
      pendingIceCandidatesRef.current = [];

      // Add all local tracks
      stream.getTracks().forEach((track) => {
        console.log(
          "[FriendStream] Adding track to PC:",
          track.kind,
          track.id.slice(0, 8),
        );
        pc.addTrack(track, stream);
      });

      const initialRemoteStream = new MediaStream();
      remoteStreamRef.current = initialRemoteStream;
      attachAndPlayVideo(remoteVideoRef.current, initialRemoteStream, false);

      pc.ontrack = (event) => {
        console.log(
          "[FriendStream] ✅ ontrack fired! track:",
          event.track.kind,
          "streams:",
          event.streams.length,
        );
        let remoteStream: MediaStream;
        if (event.streams?.[0]) {
          remoteStream = event.streams[0];
        } else if (remoteStreamRef.current) {
          remoteStreamRef.current.addTrack(event.track);
          remoteStream = remoteStreamRef.current;
        } else {
          remoteStream = new MediaStream([event.track]);
        }
        remoteStreamRef.current = remoteStream;
        console.log(
          "[FriendStream] Remote stream tracks:",
          remoteStream
            .getTracks()
            .map((t) => `${t.kind}:${t.enabled}:${t.readyState}`),
        );
        attachAndPlayVideo(remoteVideoRef.current, remoteStream, false);

        setStatus("connected");
        if (!durationIntervalRef.current) {
          callStartedAtRef.current = new Date().toISOString();
          setCallDuration(0);
          durationIntervalRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && currentUser?.id) {
          console.log(
            "[FriendStream] ICE candidate:",
            event.candidate.type,
            event.candidate.protocol,
            event.candidate.address?.slice(0, 10),
          );
          realtimeService.sendSignal(odierUserId || "", currentUser.id, {
            type: "ice-candidate",
            candidate: event.candidate.toJSON(),
          });
        } else if (!event.candidate) {
          console.log("[FriendStream] ICE gathering complete");
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(
          "[FriendStream] ICE gathering state:",
          pc.iceGatheringState,
        );
      };

      pc.oniceconnectionstatechange = () => {
        console.log(
          "[FriendStream] ICE connection state:",
          pc.iceConnectionState,
        );
      };

      pc.onsignalingstatechange = () => {
        console.log("[FriendStream] Signaling state:", pc.signalingState);
      };

      pc.onconnectionstatechange = () => {
        console.log("[FriendStream] Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          console.log("[FriendStream] ✅ PEER CONNECTION ESTABLISHED!");
          setStatus("connected");
          if (!durationIntervalRef.current) {
            callStartedAtRef.current = new Date().toISOString();
            setCallDuration(0);
            durationIntervalRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
          }
        }
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          console.error("[FriendStream] ❌ Connection", pc.connectionState);
          endCallSilent();
        }
      };

      if (signalUnsubRef.current) {
        signalUnsubRef.current();
      }

      signalUnsubRef.current = realtimeService.onSignal(
        async (fromUserId, signal) => {
          const sig = signal as Record<string, unknown>;
          console.log(
            "[FriendStream] Signal handler received:",
            sig.type,
            "signalingState:",
            pc.signalingState,
          );
          try {
            if (sig.type === "offer" && sig.offer) {
              console.log(
                "[FriendStream] Processing OFFER, current signalingState:",
                pc.signalingState,
              );
              if (pc.signalingState !== "stable") {
                console.warn(
                  "[FriendStream] Unexpected signalingState for offer:",
                  pc.signalingState,
                  "— resetting",
                );
                // If we're in an unexpected state, we can't process this offer
                // This shouldn't happen with proper flow
              }
              await pc.setRemoteDescription(
                new RTCSessionDescription(
                  sig.offer as RTCSessionDescriptionInit,
                ),
              );
              console.log(
                "[FriendStream] Remote description set (offer). Pending ICE:",
                pendingIceCandidatesRef.current.length,
              );

              // Flush queued ICE candidates
              if (pendingIceCandidatesRef.current.length > 0) {
                const queued = [...pendingIceCandidatesRef.current];
                pendingIceCandidatesRef.current = [];
                for (const candidate of queued) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                console.log(
                  "[FriendStream] Flushed",
                  queued.length,
                  "queued ICE candidates",
                );
              }

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              console.log(
                "[FriendStream] Sending ANSWER to",
                fromUserId.slice(0, 8),
              );
              realtimeService.sendSignal(fromUserId, currentUser?.id || "", {
                type: "answer",
                answer: pc.localDescription,
              });
            } else if (sig.type === "answer" && sig.answer) {
              console.log(
                "[FriendStream] Processing ANSWER, current signalingState:",
                pc.signalingState,
              );
              if (pc.signalingState !== "have-local-offer") {
                console.warn(
                  "[FriendStream] Ignoring answer — signalingState is",
                  pc.signalingState,
                  "(expected have-local-offer)",
                );
                return;
              }
              await pc.setRemoteDescription(
                new RTCSessionDescription(
                  sig.answer as RTCSessionDescriptionInit,
                ),
              );
              console.log(
                "[FriendStream] Remote description set (answer). Pending ICE:",
                pendingIceCandidatesRef.current.length,
              );

              if (pendingIceCandidatesRef.current.length > 0) {
                const queued = [...pendingIceCandidatesRef.current];
                pendingIceCandidatesRef.current = [];
                for (const candidate of queued) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                console.log(
                  "[FriendStream] Flushed",
                  queued.length,
                  "queued ICE candidates",
                );
              }
            } else if (sig.type === "ice-candidate" && sig.candidate) {
              const candidate = sig.candidate as RTCIceCandidateInit;
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                console.log(
                  "[FriendStream] Queuing ICE candidate (no remote desc yet)",
                );
                pendingIceCandidatesRef.current.push(candidate);
              }
            }
          } catch (err) {
            console.error("[FriendStream] ❌ WebRTC signal error:", err);
          }
        },
      );

      if (initiator) {
        (async () => {
          try {
            console.log("[FriendStream] CALLER: Creating offer...");
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            console.log(
              "[FriendStream] CALLER: Sending offer to",
              odierUserId?.slice(0, 8),
            );
            realtimeService.sendSignal(
              odierUserId || "",
              currentUser?.id || "",
              {
                type: "offer",
                offer: pc.localDescription,
              },
            );
            console.log("[FriendStream] CALLER: Offer sent successfully");
          } catch (err) {
            console.error(
              "[FriendStream] CALLER: Error creating/sending offer:",
              err,
            );
          }
        })();
      }

      return pc;
    },
    [currentUser?.id, odierUserId],
  );

  /**
   * Called by the CALLER when the receiver accepts.
   * The caller already joined the signaling room in startCall(),
   * so we just create the peer connection and send the offer.
   */
  const startWebRTCAsInitiator = async () => {
    if (webRtcStartingRef.current || peerRef.current) {
      console.log(
        "[FriendStream] CALLER: startWebRTCAsInitiator skipped (already starting or peer exists)",
      );
      return;
    }
    webRtcStartingRef.current = true;
    console.log("[FriendStream] CALLER: Starting WebRTC as initiator");
    setStatus("connecting");

    const stream = localStreamRef.current;
    if (!stream) {
      console.error("[FriendStream] CALLER: No local stream available!");
      setStatus("idle");
      webRtcStartingRef.current = false;
      return;
    }

    // The signaling room was already joined in startCall().
    // Just make sure it's still connected (joinSignalingRoom is idempotent now).
    if (currentUser?.id) {
      await realtimeService.joinSignalingRoom(roomId.current, currentUser.id);
    }

    // Clean up any old signal handler before creating new one
    if (signalUnsubRef.current) {
      signalUnsubRef.current();
      signalUnsubRef.current = null;
    }

    // Give the receiver a moment to be fully subscribed to the signaling channel
    await new Promise((r) => setTimeout(r, 1000));

    console.log(
      "[FriendStream] CALLER: Creating peer connection and sending offer",
    );
    createPeerConnection(stream, true);

    // Timeout: if still connecting after 45s, give up
    setTimeout(() => {
      if (statusRef.current === "connecting") {
        console.error("[FriendStream] CALLER: Connection timed out after 45s");
        toast({
          title: "Connection failed",
          description: "Could not establish a video connection. Try again.",
          variant: "destructive",
        });
        endCallSilent();
      }
    }, 45_000);
  };

  // ===== CALL ACTIONS =====

  const startCall = async () => {
    if (!currentUser || !odierUserId) return;
    console.log("[FriendStream] CALLER: startCall initiated");

    // Request camera/mic access FIRST before ringing
    const stream = await startLocalStream();
    if (!stream) {
      // Camera denied or failed — don't proceed
      return;
    }
    console.log(
      "[FriendStream] CALLER: Local stream ready, tracks:",
      stream.getTracks().map((t) => `${t.kind}:${t.enabled}`),
    );

    setStatus("calling");

    // Start 1-hour max call duration timer
    startMaxDurationTimer();

    // Join signaling room early so we're ready when they accept
    await realtimeService.joinSignalingRoom(roomId.current, currentUser.id);
    console.log("[FriendStream] CALLER: Signaling room joined, now ringing...");

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
      // End the call properly — WebRTC can't survive navigation
      endCallWithSignal();
    } else {
      cleanupMedia();
    }
    navigate(`/chat/${odierUserId}`);
  };

  // During active call states, render full-screen (no sidebar/navbar)
  const isCallActive =
    status === "calling" || status === "connecting" || status === "connected";

  const callContent = (
    <div
      className={
        isCallActive
          ? "flex flex-col h-screen w-screen fixed inset-0 z-[9999] bg-background"
          : "flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto relative bg-background"
      }
    >
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

            {/* Local video preview while ringing */}
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
              ref={remoteVideoCallbackRef}
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
                    {" · "}
                    <span
                      className={
                        callDuration >= maxCallDurationSeconds - 60
                          ? "text-red-400 font-medium"
                          : "text-white/40"
                      }
                    >
                      {formatDuration(
                        Math.max(0, maxCallDurationSeconds - callDuration),
                      )}{" "}
                      left
                    </span>
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
                ref={localVideoCallbackRef}
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
  );

  // During active call, render full-screen without AppLayout
  if (isCallActive) {
    return callContent;
  }

  // Idle / ended / missed / declined — show with normal layout
  return <AppLayout>{callContent}</AppLayout>;
};

export default FriendStream;
