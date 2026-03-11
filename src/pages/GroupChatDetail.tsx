import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Users,
  MoreVertical,
  LogOut,
  UserPlus,
  Image,
  Video,
  X,
  Check,
  Search,
  Shield,
  UserMinus,
  Pencil,
  Camera,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGroupChatStore } from "@/stores/useGroupChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { supabase, type GroupMessage, type Profile } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import PrivateImage from "@/components/PrivateImage";

const GroupChatDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const {
    currentGroup,
    members,
    messages,
    isLoading,
    fetchGroup,
    fetchMembers,
    fetchMessages,
    sendMessage,
    sendGroupImage,
    addMessage,
    leaveGroup,
    removeMember,
    addMembers,
    updateGroup,
  } = useGroupChatStore();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [mutualFollows, setMutualFollows] = useState<Profile[]>([]);
  const [selectedInvites, setSelectedInvites] = useState<string[]>([]);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(
    null,
  );
  const [isSendingImage, setIsSendingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Group edit state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(
    null,
  );
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editAvatarRef = useRef<HTMLInputElement>(null);

  const isAdmin =
    members.find((m) => m.user_id === currentUser?.id)?.role === "admin";

  // Active group call detection — listen for ring/accept/end signals
  const [activeCallHost, setActiveCallHost] = useState<string | null>(null);
  const [activeCallHostName, setActiveCallHostName] = useState<string>("");

  useEffect(() => {
    if (!groupId || !currentUser?.id) return;

    const channelName = `group-call-${groupId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "group-call-signal" }, (payload) => {
        const data = payload.payload as {
          action: string;
          fromUserId: string;
          hostUserId?: string;
        };
        if (data.fromUserId === currentUser.id) return;

        switch (data.action) {
          case "ring":
          case "accept":
            setActiveCallHost(data.hostUserId || data.fromUserId);
            // Find host name from members
            {
              const hostMember = members.find(
                (m) => m.user_id === (data.hostUserId || data.fromUserId),
              );
              setActiveCallHostName(
                hostMember?.profile?.name ||
                  hostMember?.profile?.username ||
                  "Someone",
              );
            }
            break;
          case "end-all":
            setActiveCallHost(null);
            setActiveCallHostName("");
            break;
          case "end":
            // A member left — only clear if it was the host
            if (data.fromUserId === activeCallHost) {
              setActiveCallHost(null);
              setActiveCallHostName("");
            }
            break;
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentUser?.id, members]);

  // Fetch group data
  useEffect(() => {
    if (groupId) {
      fetchGroup(groupId);
      fetchMembers(groupId);
      fetchMessages(groupId);
    }
  }, [groupId, fetchGroup, fetchMembers, fetchMessages]);

  // Subscribe to real-time group messages
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMsg = payload.new as GroupMessage;
          const { data: sender } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newMsg.sender_id)
            .maybeSingle();
          newMsg.sender = (sender as Profile) || undefined;
          addMessage(newMsg);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [groupId, currentUser?.id, addMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }
    };
  }, [pendingImagePreview]);

  // Fetch mutual follows when invite dialog opens
  useEffect(() => {
    if (!showInvite || !currentUser) return;
    const fetchMutuals = async () => {
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUser.id)
        .eq("status", "accepted");
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", currentUser.id)
        .eq("status", "accepted");

      const followingIds = new Set(following?.map((f) => f.following_id) || []);
      const followerIds = new Set(followers?.map((f) => f.follower_id) || []);
      const mutualIds = [...followingIds].filter((id) => followerIds.has(id));
      // Exclude already-in-group members
      const existingIds = new Set(members.map((m) => m.user_id));
      const newIds = mutualIds.filter((id) => !existingIds.has(id));

      if (newIds.length === 0) {
        setMutualFollows([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", newIds);
      if (profiles) setMutualFollows(profiles as Profile[]);
    };
    fetchMutuals();
  }, [showInvite, currentUser, members]);

  const handleSend = async () => {
    if (!message.trim() || !currentUser || !groupId) return;
    const text = message.trim();
    setMessage("");
    try {
      await sendMessage(groupId, currentUser.id, text);
    } catch {
      toast({
        title: "Failed to send",
        description: "Message could not be delivered.",
        variant: "destructive",
      });
    }
  };

  const clearPendingImage = () => {
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }
    setPendingImageFile(null);
    setPendingImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !groupId) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Please select an image file",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "Image must be less than 1MB",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setPendingImageFile(file);
    setPendingImagePreview(URL.createObjectURL(file));
  };

  const handleConfirmImageSend = async () => {
    if (!pendingImageFile || !currentUser || !groupId) return;

    setIsSendingImage(true);
    try {
      await sendGroupImage(groupId, currentUser.id, pendingImageFile);
      clearPendingImage();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Failed to send image",
        variant: "destructive",
      });
    }
    setIsSendingImage(false);
  };

  const handleComposerSend = async () => {
    if (pendingImageFile) {
      await handleConfirmImageSend();
      return;
    }
    await handleSend();
  };

  const handleLeave = async () => {
    if (!groupId || !currentUser) return;
    await leaveGroup(groupId, currentUser.id);
    toast({ title: "Left group" });
    navigate("/chat");
  };

  const handleKick = async (userId: string, userName: string) => {
    if (!groupId) return;
    try {
      await removeMember(groupId, userId);
      toast({ title: `${userName} removed from group` });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  };

  const MAX_GROUP_MEMBERS = 5;
  const spotsLeft = Math.max(0, MAX_GROUP_MEMBERS - members.length);

  const handleInvite = async () => {
    if (!groupId || !currentUser || selectedInvites.length === 0) return;
    if (selectedInvites.length > spotsLeft) {
      toast({
        title: `Can only add ${spotsLeft} more member${spotsLeft !== 1 ? "s" : ""}`,
        description: "Groups are limited to 5 members.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingInvite(true);
    try {
      await addMembers(groupId, selectedInvites, currentUser.id);
      toast({
        title: `${selectedInvites.length} member${selectedInvites.length > 1 ? "s" : ""} added!`,
      });
      setSelectedInvites([]);
      setShowInvite(false);
    } catch {
      toast({ title: "Failed to add members", variant: "destructive" });
    }
    setIsSendingInvite(false);
  };

  const handleGroupStream = async () => {
    if (!groupId || !currentUser) return;
    navigate(`/stream/group/${groupId}`);
  };

  const openEditDialog = () => {
    setEditName(currentGroup?.name || "");
    setEditDescription(currentGroup?.description || "");
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setShowEditGroup(true);
  };

  const handleEditAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 1MB.",
        variant: "destructive",
      });
      return;
    }
    setEditAvatarFile(file);
    setEditAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveGroupEdit = async () => {
    if (!groupId || !editName.trim()) return;
    setIsSavingEdit(true);
    try {
      const updates: Partial<{
        name: string;
        description: string;
        avatar_url: string;
      }> = {
        name: editName.trim(),
        description: editDescription.trim(),
      };

      // Upload new avatar if changed
      if (editAvatarFile) {
        const ext = editAvatarFile.name.split(".").pop();
        const filePath = `group-avatars/${groupId}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("connectlive")
          .upload(filePath, editAvatarFile);

        if (!uploadErr) {
          updates.avatar_url = filePath;
        }
      }

      await updateGroup(groupId, updates);

      // System message
      await supabase.from("group_messages").insert({
        group_id: groupId,
        sender_id: currentUser?.id,
        content: `Group info was updated`,
        type: "system",
      });

      toast({ title: "Group updated!" });
      setShowEditGroup(false);
    } catch {
      toast({
        title: "Failed to update group",
        variant: "destructive",
      });
    }
    setIsSavingEdit(false);
  };

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Date label
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

  // Build groups
  const groupedMessages: { label: string; messages: GroupMessage[] }[] = [];
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

  const filteredInvites = mutualFollows.filter(
    (p) =>
      !inviteSearch ||
      p.name?.toLowerCase().includes(inviteSearch.toLowerCase()) ||
      p.username?.toLowerCase().includes(inviteSearch.toLowerCase()),
  );

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
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setShowMembers(true)}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/30 to-primary/30 flex items-center justify-center overflow-hidden">
                <PrivateImage
                  src={currentGroup?.avatar_url}
                  fallback={<Users className="w-5 h-5 text-muted-foreground" />}
                />
              </div>
              <div>
                <span className="font-semibold text-foreground text-sm">
                  {currentGroup?.name || "Group"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {members.length} member{members.length !== 1 ? "s" : ""} · Tap
                  to view
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
              onClick={handleGroupStream}
              title="Start group stream"
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
                <DropdownMenuItem onClick={() => setShowMembers(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Members
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={openEditDialog}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Group
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowInvite(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Members
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLeave}
                  className="text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Call Banner */}
        {activeCallHost && (
          <div
            className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border-b border-green-500/20 cursor-pointer hover:bg-green-500/15 transition-colors"
            onClick={() =>
              navigate(
                `/stream/group/${groupId}?mode=answer&caller=${activeCallHost}`,
              )
            }
          >
            <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <PhoneCall className="w-4.5 h-4.5 text-green-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-400">
                Group call in progress
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {activeCallHostName} started a call · Tap to join
              </p>
            </div>
            <button
              className="shrink-0 px-4 py-1.5 rounded-full bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate(
                  `/stream/group/${groupId}?mode=answer&caller=${activeCallHost}`,
                );
              }}
            >
              Join
            </button>
          </div>
        )}

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
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Group created
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Start chatting with the group!
              </p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.label}>
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
                      {/* Sender avatar for others — clickable to profile */}
                      {!isMe && (
                        <Link
                          to={`/profile/${msg.sender?.username || msg.sender_id}`}
                          className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-[10px] font-bold mr-2 mt-auto shrink-0 overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all"
                        >
                          <PrivateImage
                            src={msg.sender?.avatar_url}
                            fallback={getInitials(msg.sender?.name)}
                          />
                        </Link>
                      )}
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                          isMe
                            ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-br-md"
                            : "glass text-foreground rounded-bl-md"
                        }`}
                      >
                        {!isMe && (
                          <Link
                            to={`/profile/${msg.sender?.username || msg.sender_id}`}
                            className="text-[11px] font-semibold text-primary mb-0.5 hover:underline block"
                          >
                            {msg.sender?.name || msg.sender?.username || "User"}
                          </Link>
                        )}
                        {msg.media_url && msg.type === "image" && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-border/30 bg-black/10 max-w-[220px] sm:max-w-[260px]">
                            <PrivateImage
                              src={msg.media_url}
                              alt="Shared"
                              className="w-full max-h-64 object-cover"
                            />
                          </div>
                        )}
                        {msg.content && msg.type !== "image" && (
                          <p className="leading-relaxed">{msg.content}</p>
                        )}
                        <div
                          className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}
                        >
                          <span
                            className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}
                          >
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 glass border-t border-border/30">
          {pendingImagePreview && (
            <div className="mb-3 rounded-2xl border border-border/40 bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Image preview
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground"
                  onClick={clearPendingImage}
                  disabled={isSendingImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="rounded-xl overflow-hidden bg-black/20 mb-2 w-28 h-28 sm:w-32 sm:h-32">
                <img
                  src={pendingImagePreview}
                  alt="Selected preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {pendingImageFile?.name}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground shrink-0"
              onClick={() => imageInputRef.current?.click()}
              disabled={isSendingImage}
            >
              <Image className="w-5 h-5" />
            </Button>
            <Input
              placeholder={
                pendingImageFile
                  ? "Image selected — tap send"
                  : "Type a message..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleComposerSend()
              }
              className="flex-1 h-12 bg-muted/30 border-border/30 rounded-xl"
            />
            <Button
              size="icon"
              onClick={handleComposerSend}
              disabled={
                (!message.trim() && !pendingImageFile) || isSendingImage
              }
              className="bg-primary text-primary-foreground rounded-xl shrink-0 neon-glow-blue disabled:opacity-50"
            >
              {isSendingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="glass border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle>Group Members ({members.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {members.map((m) => {
              const isSelf = m.user_id === currentUser?.id;
              const memberName =
                m.profile?.name || m.profile?.username || "User";

              return (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors"
                >
                  <Link
                    to={`/profile/${m.profile?.username || m.user_id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                    onClick={() => setShowMembers(false)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                      <PrivateImage
                        src={m.profile?.avatar_url}
                        fallback={getInitials(
                          m.profile?.name || m.profile?.username,
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground text-sm">
                        {memberName}
                      </span>
                      {m.role === "admin" && (
                        <span className="ml-2 text-[10px] text-primary font-semibold inline-flex items-center gap-0.5">
                          <Shield className="w-3 h-3" /> ADMIN
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        @{m.profile?.username}
                      </p>
                    </div>
                  </Link>

                  {/* Admin can kick non-admin, non-self members */}
                  {isAdmin && !isSelf && m.role !== "admin" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleKick(m.user_id, memberName)}
                      title="Remove from group"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <Button
            variant="outline"
            className="w-full mt-2 gap-2"
            onClick={() => {
              setShowMembers(false);
              setShowInvite(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            Invite Members
          </Button>
        </DialogContent>
      </Dialog>

      {/* Invite Members Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="glass border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite Members</DialogTitle>
          </DialogHeader>
          {spotsLeft === 0 ? (
            <p className="text-sm text-amber-400 text-center py-4">
              ⚠ Group is full (max 5 members)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-1">
              {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} remaining · max 5
              members
            </p>
          )}

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={inviteSearch}
              onChange={(e) => setInviteSearch(e.target.value)}
              className="pl-10 h-10 bg-muted/30 border-border/30 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {mutualFollows.length === 0
                  ? "No mutual follows available to invite"
                  : "No matches found"}
              </p>
            ) : (
              filteredInvites.map((p) => {
                const isSelected = selectedInvites.includes(p.id);
                return (
                  <motion.button
                    key={p.id}
                    onClick={() =>
                      setSelectedInvites((prev) => {
                        if (prev.includes(p.id))
                          return prev.filter((i) => i !== p.id);
                        if (prev.length >= spotsLeft) return prev;
                        return [...prev, p.id];
                      })
                    }
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/30"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                      <PrivateImage
                        src={p.avatar_url}
                        fallback={getInitials(p.name || p.username)}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="font-medium text-foreground text-sm">
                        {p.name}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        @{p.username}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </motion.button>
                );
              })
            )}
          </div>

          <Button
            onClick={handleInvite}
            disabled={isSendingInvite || selectedInvites.length === 0}
            className="w-full mt-2 neon-glow-blue"
          >
            {isSendingInvite
              ? "Adding..."
              : `Add ${selectedInvites.length} member${selectedInvites.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditGroup} onOpenChange={setShowEditGroup}>
        <DialogContent className="glass border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit Group
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <button
                onClick={() => editAvatarRef.current?.click()}
                className="relative w-20 h-20 rounded-full bg-gradient-to-br from-secondary/30 to-primary/30 flex items-center justify-center overflow-hidden group ring-2 ring-border/30 hover:ring-primary/50 transition-all"
              >
                {editAvatarPreview ? (
                  <img
                    src={editAvatarPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PrivateImage
                    src={currentGroup?.avatar_url}
                    fallback={
                      <Users className="w-8 h-8 text-muted-foreground" />
                    }
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>
              <input
                ref={editAvatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleEditAvatarChange}
              />
            </div>

            {/* Name */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Group Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Group name"
                className="h-11 bg-muted/30 border-border/30 rounded-xl"
                maxLength={50}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Description
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What's this group about?"
                className="bg-muted/30 border-border/30 rounded-xl resize-none"
                rows={3}
                maxLength={200}
              />
            </div>

            <Button
              onClick={handleSaveGroupEdit}
              disabled={isSavingEdit || !editName.trim()}
              className="w-full neon-glow-blue"
            >
              {isSavingEdit ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default GroupChatDetail;
