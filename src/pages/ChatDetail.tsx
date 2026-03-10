import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Image,
  Check,
  CheckCheck,
  Video,
  MoreVertical,
  Phone,
  PhoneOff,
  PhoneMissed,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChat } from "@/hooks/useChat";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { supabase, type Profile, type Message } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import PrivateImage from "@/components/PrivateImage";

const ChatDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { messages, conversations, isLoading, sendMessage } = useChat(
    currentUser?.id || null,
    userId || null,
  );
  const { sendImage } = useChatStore();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch other user profile
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (data) setOtherUser(data as Profile);
    };
    fetchUser();
  }, [userId]);

  // Subscribe to typing indicator via presence
  useEffect(() => {
    if (!currentUser?.id || !userId) return;
    const channelName = `typing-${[currentUser.id, userId].sort().join("-")}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUser.id } },
    });
    typingChannelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const otherPresence = state[userId] as unknown[] | undefined;
        if (otherPresence?.[0]) {
          const p = otherPresence[0] as Record<string, unknown>;
          setIsTyping(!!p.typing);
        } else {
          setIsTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false });
        }
      });

    return () => {
      channel.unsubscribe();
      typingChannelRef.current = null;
    };
  }, [currentUser?.id, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Broadcast typing status
  const handleTyping = () => {
    typingChannelRef.current?.track({ typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.track({ typing: false });
    }, 2000);
  };

  const handleSend = async () => {
    if (!message.trim() || !currentUser || !userId) return;
    const text = message.trim();
    setMessage("");
    typingChannelRef.current?.track({ typing: false });
    try {
      await sendMessage(text);
    } catch {
      toast({
        title: "Failed to send",
        description: "Message could not be delivered.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !userId) return;
    try {
      await sendImage(currentUser.id, userId, file);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Upload failed",
        variant: "destructive",
      });
    }
  };

  const handleVideoCall = () => {
    if (!currentUser || !userId) return;
    navigate(`/stream/friend/${userId}`);
  };

  // Format message time
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Date label for message groups
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const diffDays = Math.round(
      (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
    return date.toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
    });
  };

  // Build date-separated message groups
  const groupedMessages: { label: string; messages: Message[] }[] = [];
  let lastLabel = "";
  for (const msg of messages) {
    const label = getDateLabel(msg.created_at);
    if (label !== lastLabel) {
      groupedMessages.push({ label, messages: [msg] });
      lastLabel = label;
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 glass border-b border-border/30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link to="/chat">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <Link
              to={`/profile/${otherUser?.username || userId}`}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-sm font-bold text-foreground overflow-hidden">
                  <PrivateImage
                    src={otherUser?.avatar_url}
                    fallback={getInitials(
                      otherUser?.name || otherUser?.username,
                    )}
                  />
                </div>
                {otherUser?.is_online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-neon-green rounded-full border-2 border-background" />
                )}
              </div>
              <div>
                <span className="font-semibold text-foreground text-sm">
                  {otherUser?.name || "User"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {isTyping
                    ? "typing..."
                    : otherUser?.is_online
                      ? "Online"
                      : "Offline"}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVideoCall}
              className="text-muted-foreground hover:text-primary"
              title="Video Call"
            >
              <Video className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass border-border/50"
              >
                <DropdownMenuItem asChild>
                  <Link to={`/profile/${otherUser?.username}`}>
                    View Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/chat">Close Chat</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                >
                  <div className="w-48 h-12 rounded-2xl glass animate-pulse" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Send className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Start a conversation
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Say hello to {otherUser?.name || "your friend"}! Messages are
                private between you two.
              </p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.label}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border/30" />
                  <span className="text-[11px] text-muted-foreground font-medium px-2">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-border/30" />
                </div>

                {group.messages.map((msg, i) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const isSystem = msg.type === "system";

                  if (isSystem) {
                    const isCallMsg =
                      msg.content.startsWith("📞") ||
                      msg.content.startsWith("📹");

                    if (isCallMsg) {
                      const isMissed = msg.content.includes("Missed");
                      const isDeclined = msg.content.includes("Declined");
                      const isCancelled = msg.content.includes("Cancelled");
                      const isEnded = msg.content.includes("Video call");
                      const wasNegative = isMissed || isDeclined || isCancelled;

                      return (
                        <div key={msg.id} className="flex justify-center my-3">
                          <div
                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl ${
                              wasNegative
                                ? "bg-destructive/5 border border-destructive/10"
                                : "bg-green-500/5 border border-green-500/10"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                wasNegative
                                  ? "bg-destructive/10"
                                  : "bg-green-500/10"
                              }`}
                            >
                              {isMissed ? (
                                <PhoneMissed className="w-4 h-4 text-destructive" />
                              ) : isDeclined || isCancelled ? (
                                <PhoneOff className="w-4 h-4 text-destructive" />
                              ) : (
                                <Phone className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <div>
                              <p
                                className={`text-xs font-medium ${
                                  wasNegative
                                    ? "text-destructive"
                                    : "text-green-600 dark:text-green-400"
                                }`}
                              >
                                {msg.content.replace(/📞\s?|📹\s?/g, "")}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatMessageTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <div className="glass px-4 py-2 rounded-full">
                          <p className="text-xs text-muted-foreground">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: i * 0.015,
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                          isMe
                            ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-br-md"
                            : "glass text-foreground rounded-bl-md"
                        }`}
                      >
                        {msg.media_url && msg.type === "image" && (
                          <PrivateImage
                            src={msg.media_url}
                            alt="Shared"
                            className="rounded-xl max-w-full mb-2"
                          />
                        )}
                        {msg.content && (
                          <p className="leading-relaxed">{msg.content}</p>
                        )}
                        <div
                          className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}
                        >
                          <span
                            className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}
                          >
                            {formatMessageTime(msg.created_at)}
                          </span>
                          {isMe &&
                            (msg.is_read ? (
                              <CheckCheck className="w-3 h-3 text-primary-foreground/60" />
                            ) : (
                              <Check className="w-3 h-3 text-primary-foreground/60" />
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="glass px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 glass border-t border-border/30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground shrink-0"
            >
              <Image className="w-5 h-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              className="flex-1 h-12 bg-muted/30 border-border/30 rounded-xl"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-primary text-primary-foreground rounded-xl shrink-0 neon-glow-blue disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChatDetail;
