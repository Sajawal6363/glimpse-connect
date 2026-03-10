import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  UserCheck,
  MessageCircle,
  Wifi,
  Info,
  Bell,
  CheckCheck,
  Video,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PrivateAvatarImage from "@/components/PrivateAvatarImage";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useSocialStore } from "@/stores/useSocialStore";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";

const iconMap: Record<string, React.ElementType> = {
  new_follower: UserPlus,
  new_message: MessageCircle,
  user_online: Wifi,
  system: Info,
  warning: Info,
  stream_request: Video,
  follow_request: UserPlus,
  follow_accepted: UserCheck,
};

const colorMap: Record<string, string> = {
  new_follower: "text-primary bg-primary/10",
  new_message: "text-secondary bg-secondary/10",
  user_online: "text-neon-green bg-accent/10",
  system: "text-muted-foreground bg-muted",
  warning: "text-amber-400 bg-amber-400/10",
  stream_request: "text-orange-400 bg-orange-400/10",
  follow_request: "text-amber-400 bg-amber-400/10",
  follow_accepted: "text-neon-green bg-accent/10",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    notifications,
    isLoading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const { acceptFollowRequest, rejectFollowRequest, fetchPendingRequests } =
    useSocialStore();
  const [handledRequests, setHandledRequests] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
      fetchPendingRequests(user.id);
    }
  }, [user, fetchNotifications, fetchPendingRequests]);

  const handleAcceptFollow = async (notif: (typeof notifications)[0]) => {
    if (!user || !notif.from_user_id) return;
    try {
      // Find the follow request (pending) from this user
      const { data: followRow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", notif.from_user_id)
        .eq("following_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (followRow) {
        await acceptFollowRequest(followRow.id, user.id);
        setHandledRequests((prev) => new Set([...prev, notif.id]));
        if (!notif.is_read) markAsRead(notif.id);
      }
    } catch {
      // Silently fail
    }
  };

  const handleRejectFollow = async (notif: (typeof notifications)[0]) => {
    if (!user || !notif.from_user_id) return;
    try {
      const { data: followRow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", notif.from_user_id)
        .eq("following_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (followRow) {
        await rejectFollowRequest(followRow.id, user.id);
        setHandledRequests((prev) => new Set([...prev, notif.id]));
        if (!notif.is_read) markAsRead(notif.id);
      }
    } catch {
      // Silently fail
    }
  };

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    if (!notif.is_read && user) {
      markAsRead(notif.id);
    }
    // Navigate based on type
    if (
      (notif.type === "new_follower" ||
        notif.type === "follow_accepted" ||
        notif.type === "follow_request") &&
      notif.from_user_id
    ) {
      navigate(`/profile/${notif.from_user_id}`);
    } else if (notif.type === "new_message" && notif.from_user_id) {
      navigate(`/chat/${notif.from_user_id}`);
    } else if (notif.type === "stream_request" && notif.from_user_id) {
      navigate(`/stream/friend/${notif.from_user_id}`);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => user && markAllAsRead(user.id)}
              className="text-primary hover:text-primary/80 gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="glass rounded-2xl p-4 animate-pulse h-20"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              No notifications yet
            </h2>
            <p className="text-sm text-muted-foreground">
              When someone follows you or sends a message, you'll see it here.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif, i) => {
              const Icon = iconMap[notif.type] || Info;
              return (
                <motion.button
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-4 p-4 glass rounded-2xl hover:bg-muted/20 transition-colors w-full text-left ${
                    !notif.is_read ? "border-l-2 border-primary" : ""
                  }`}
                >
                  {notif.from_user ? (
                    <Avatar className="w-10 h-10 rounded-xl shrink-0">
                      <PrivateAvatarImage
                        src={notif.from_user.avatar_url || undefined}
                      />
                      <AvatarFallback
                        className={`rounded-xl ${colorMap[notif.type]}`}
                      >
                        <Icon className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[notif.type]}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      {notif.from_user && (
                        <span className="font-semibold">
                          {notif.from_user.name ||
                            notif.from_user.username}{" "}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {notif.content}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(notif.created_at)}
                    </p>
                    {notif.type === "stream_request" && notif.from_user_id && (
                      <Button
                        size="sm"
                        className="mt-2 gap-1.5 rounded-full neon-glow-blue"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!notif.is_read && user) markAsRead(notif.id);
                          navigate(`/stream/friend/${notif.from_user_id}`);
                        }}
                      >
                        <Video className="w-3.5 h-3.5" />
                        Accept Stream
                      </Button>
                    )}
                    {notif.type === "follow_request" &&
                      notif.from_user_id &&
                      !handledRequests.has(notif.id) && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="gap-1.5 rounded-full neon-glow-blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptFollow(notif);
                            }}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 rounded-full glass border-border/50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectFollow(notif);
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                            Decline
                          </Button>
                        </div>
                      )}
                    {notif.type === "follow_request" &&
                      handledRequests.has(notif.id) && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Responded
                        </p>
                      )}
                  </div>
                  {!notif.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Notifications;
