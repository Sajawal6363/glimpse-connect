import { useState, useRef, useEffect, useCallback } from "react";
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
import { useStreamStore } from "@/stores/useStreamStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { useMediaStream } from "@/hooks/useMediaStream";
import InterstitialAd from "@/components/ads/InterstitialAd";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import { realtimeService } from "@/lib/realtime";
import type { Profile } from "@/lib/supabase";
import { Users } from "lucide-react";

type StreamState = "idle" | "searching" | "connecting" | "connected";

/**
 * Create a deterministic room id from two user ids so both peers join the same
 * signaling channel regardless of who initiated the match.
 */
function makeRoomId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

const Stream = () => {
  const [state, setState] = useState<StreamState>("idle");
  const [showFilters, setShowFilters] = useState(false);
  const [countryFilter, setCountryFilter] = useState("global");
  const [genderFilter, setGenderFilter] = useState("any");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [timer, setTimer] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const searchVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Track online users count
  useEffect(() => {
    setOnlineCount(realtimeService.getOnlineUsers().length);
    const unsub = realtimeService.onPresenceChange((ids) => {
      setOnlineCount(ids.length);
    });
    return unsub;
  }, []);

  const { user } = useAuthStore();
  const {
    isMuted,
    isCameraOn,
    skipCount,
    showInterstitial,
    chatMessages,
    matchedUser: storeMatchedUser,
    connectionQuality,
    toggleMute,
    toggleCamera,
    skipStranger,
    sendChatMessage,
    reportUser,
    blockUser,
    dismissInterstitial,
  } = useStreamStore();

  const {
    stream: localStream,
    startStream,
    stopStream,
    toggleAudio,
    toggleVideo,
  } = useMediaStream();

  // Keep a ref to localStream for the connection callback
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const { remoteStream, isConnected, connectToPeer, disconnect } = useWebRTC({
    userId: user?.id || "",
    onClose: () => {
      setState("idle");
      toast({
        title: "Disconnected",
        description: "The other user left the stream.",
      });
    },
  });

  const [localMatchedUser, setLocalMatchedUser] = useState<Profile | null>(
    null,
  );
  const matchedUser = storeMatchedUser || localMatchedUser;

  // Handler: when matchmaking finds a partner
  const handleMatch = useCallback(
    (matched: Profile) => {
      if (!user?.id || !localStreamRef.current) return;

      setLocalMatchedUser(matched);

      // Determine who initiates: the user with the "smaller" id
      const roomId = makeRoomId(user.id, matched.id);
      const initiator = user.id < matched.id;

      // Connect via WebRTC through a shared signaling room
      connectToPeer(roomId, initiator, localStreamRef.current);

      setState("connected");
    },
    [user?.id, connectToPeer],
  );

  const {
    isSearching,
    joinQueue,
    leaveQueue,
    skip: skipMatch,
  } = useMatchmaking({
    userId: user?.id || "",
    onMatch: handleMatch,
    onTimeout: () => {
      setState("idle");
      toast({
        title: "No match found",
        description: "Try again or adjust your filters.",
        variant: "destructive",
      });
    },
  });
  const { faceDetected, showWarning, warningTimer } = useFaceDetection({
    videoRef: localVideoRef,
    enabled: state === "connected",
  });

  // Attach local stream to video elements
  useEffect(() => {
    if (localStream) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      if (searchVideoRef.current) {
        searchVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream, state]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Timer for connected state
  useEffect(() => {
    if (state === "connected") {
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startSearching = useCallback(async () => {
    setState("searching");
    try {
      // Always start a fresh camera/mic stream
      await startStream();
      await joinQueue({
        country: countryFilter === "global" ? undefined : countryFilter,
        gender: genderFilter === "any" ? undefined : genderFilter,
      });
      // Connection state will be set by onMatch callback
    } catch {
      setState("idle");
      toast({
        title: "Could not start",
        description: "Please allow camera/microphone access and try again.",
        variant: "destructive",
      });
    }
  }, [countryFilter, genderFilter, joinQueue, toast, startStream]);

  const handleSkip = () => {
    if (user) skipStranger(user.id);
    disconnect();
    setLocalMatchedUser(null);
    setState("searching");
    // Re-enter queue
    joinQueue({
      country: countryFilter === "global" ? undefined : countryFilter,
      gender: genderFilter === "any" ? undefined : genderFilter,
    });
  };

  const handleEnd = () => {
    disconnect();
    leaveQueue();
    stopStream();
    setLocalMatchedUser(null);
    setState("idle");
  };

  const handleMute = () => {
    toggleMute();
    toggleAudio();
  };

  const handleCameraToggle = () => {
    toggleCamera();
    toggleVideo();
  };

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    sendChatMessage(chatMessage.trim());
    setChatMessage("");
  };

  const handleReport = () => {
    if (!reportReason || !user) return;
    reportUser(user.id, reportReason, reportDesc);
    toast({
      title: "Report submitted",
      description: "Thank you. We'll review this shortly.",
    });
    setShowReport(false);
    setReportReason("");
    setReportDesc("");
  };

  const handleBlock = () => {
    if (user) blockUser(user.id);
    toast({
      title: "User blocked",
      description: "You won't match with this person again.",
    });
    handleSkip();
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4">
        {/* Interstitial Ad */}
        {showInterstitial && (
          <InterstitialAd onClose={dismissInterstitial} countdown={5} />
        )}

        {/* Video Area */}
        <div className="flex-1 relative rounded-3xl overflow-hidden bg-muted/30 border border-border/30">
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6">
                  <Video className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Ready to Connect?
                </h2>
                <p className="text-muted-foreground mb-8 text-center max-w-sm">
                  Click below to start streaming and meet someone new from
                  around the world
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="glass border-border/50 rounded-xl"
                  >
                    <Filter className="w-4 h-4 mr-2" /> Filters
                  </Button>
                  <Button
                    onClick={startSearching}
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold px-8 rounded-xl neon-glow-blue hover:scale-105 transition-transform"
                  >
                    Start Streaming
                  </Button>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="glass rounded-2xl p-6 mt-6 w-full max-w-md"
                    >
                      <h3 className="font-semibold text-foreground mb-4">
                        Match Preferences
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Country
                          </label>
                          <Select
                            value={countryFilter}
                            onValueChange={setCountryFilter}
                          >
                            <SelectTrigger className="bg-muted/50 border-border/50 rounded-xl">
                              <SelectValue placeholder="🌍 Global (Any country)" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border max-h-48">
                              <SelectItem value="global">🌍 Global</SelectItem>
                              {countries.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.flag} {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Gender
                          </label>
                          <Select
                            value={genderFilter}
                            onValueChange={setGenderFilter}
                          >
                            <SelectTrigger className="bg-muted/50 border-border/50 rounded-xl">
                              <SelectValue placeholder="Any gender" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="any">Any</SelectItem>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

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
                  {localStream ? (
                    <video
                      ref={searchVideoRef}
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

                {/* Radar / searching animation */}
                <div className="flex-1 flex flex-col items-center justify-center bg-background/50">
                  <div className="relative w-48 h-48 mb-8">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute inset-0 rounded-full border-2 border-primary/30"
                        animate={{ scale: [0.5, 2.5], opacity: [0.8, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.6,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center neon-glow-blue">
                        <Signal className="w-7 h-7 text-primary-foreground animate-pulse" />
                      </div>
                    </div>
                    <motion.div
                      className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
                      style={{
                        background:
                          "linear-gradient(90deg, hsl(190 100% 50% / 0.6), transparent)",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2 neon-text-blue">
                    Searching for a stranger...
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Finding someone awesome for you
                  </p>
                  <Button
                    variant="ghost"
                    onClick={handleEnd}
                    className="mt-6 text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {state === "connected" && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0"
              >
                {/* Remote video */}
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-card flex items-center justify-center">
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-muted-foreground/20 flex items-center justify-center mx-auto mb-3">
                        <span className="text-3xl">
                          {matchedUser?.country_code || "🌍"}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Stranger's video feed
                      </p>
                    </div>
                  )}
                </div>

                {/* Top bar */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="glass text-foreground border-border/50">
                      <span className="w-2 h-2 bg-neon-green rounded-full mr-2 animate-pulse" />
                      Connected
                    </Badge>
                    {matchedUser?.country && (
                      <Badge className="glass text-muted-foreground border-border/50">
                        {matchedUser.country_code} {matchedUser.country}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="glass text-muted-foreground border-border/50">
                      <Clock className="w-3 h-3 mr-1" /> {formatTime(timer)}
                    </Badge>
                    <Badge
                      className={`glass border-border/50 ${connectionQuality === "good" ? "text-neon-green" : connectionQuality === "fair" ? "text-yellow-400" : "text-destructive"}`}
                    >
                      <Signal className="w-3 h-3 mr-1" />{" "}
                      {connectionQuality || "Good"}
                    </Badge>
                  </div>
                </div>

                {/* Action buttons (top-right) */}
                <div className="absolute top-16 right-4 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowReport(true)}
                    className="glass border-border/50 rounded-xl w-10 h-10 text-muted-foreground hover:text-destructive"
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleBlock}
                    className="glass border-border/50 rounded-xl w-10 h-10 text-muted-foreground hover:text-destructive"
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setChatOpen(!chatOpen)}
                    className="glass border-border/50 rounded-xl w-10 h-10 text-muted-foreground hover:text-primary"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
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
                  {localStream ? (
                    <video
                      ref={localVideoRef}
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
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`text-xs ${msg.from === "me" ? "text-right" : "text-left"}`}
                          >
                            <span
                              className={`inline-block px-3 py-1.5 rounded-xl ${msg.from === "me" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
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
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSendChat()
                          }
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
                {showWarning && (
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
                        {warningTimer}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {state === "connected" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={handleMute}
              className={`w-14 h-14 rounded-2xl glass border-border/50 ${isMuted ? "text-destructive" : "text-foreground"}`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCameraToggle}
              className={`w-14 h-14 rounded-2xl glass border-border/50 ${!isCameraOn ? "text-destructive" : "text-foreground"}`}
            >
              {isCameraOn ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6" />
              )}
            </Button>
            <Button
              onClick={handleSkip}
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold neon-glow-blue hover:scale-105 transition-transform"
            >
              <SkipForward className="w-5 h-5 mr-2" /> Skip
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleEnd}
              className="w-14 h-14 rounded-2xl"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
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
                  <SelectItem value="nudity">
                    Nudity / Sexual Content
                  </SelectItem>
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
      </div>
    </AppLayout>
  );
};

export default Stream;
