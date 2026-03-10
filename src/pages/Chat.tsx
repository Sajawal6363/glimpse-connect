import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MessageCircle, Users, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/useChatStore";
import { useGroupChatStore } from "@/stores/useGroupChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDebounce } from "@/hooks/useDebounce";
import AppLayout from "@/components/layout/AppLayout";
import { getInitials } from "@/lib/utils";
import PrivateImage from "@/components/PrivateImage";

/** Professional relative-time formatter for conversation list */
const formatConversationTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffDays === 0)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const Chat = () => {
  const { user } = useAuthStore();
  const { conversations, isLoading, fetchConversations } = useChatStore();
  const { groups, fetchGroups } = useGroupChatStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"direct" | "groups">("direct");
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (user) {
      fetchConversations(user.id);
      fetchGroups(user.id);
    }
  }, [user, fetchConversations, fetchGroups]);

  const filteredConversations = conversations.filter(
    (conv) =>
      !debouncedQuery ||
      conv.user.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      conv.user.username.toLowerCase().includes(debouncedQuery.toLowerCase()),
  );

  const filteredGroups = groups.filter(
    (g) =>
      !debouncedQuery ||
      g.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          {activeTab === "groups" && (
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/groups/create">
                <Plus className="w-4 h-4" />
                New Group
              </Link>
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "direct" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("direct")}
            className="gap-2 rounded-full"
          >
            <MessageCircle className="w-4 h-4" />
            Direct
            {conversations.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
              <Badge className="bg-destructive text-destructive-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center text-[10px] p-0 ml-1">
                {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "groups" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("groups")}
            className="gap-2 rounded-full"
          >
            <Users className="w-4 h-4" />
            Groups
            {groups.length > 0 && (
              <Badge
                variant="secondary"
                className="rounded-full h-5 min-w-[20px] flex items-center justify-center text-[10px] p-0 ml-1"
              >
                {groups.length}
              </Badge>
            )}
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === "direct"
                ? "Search conversations..."
                : "Search groups..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-muted/30 border-border/30 rounded-xl"
          />
        </div>

        {/* Direct Messages Tab */}
        {activeTab === "direct" && (
          <>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="glass rounded-2xl p-4 animate-pulse h-20"
                  />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No conversations
                </h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? "No results found"
                    : "Follow people and they follow you back to start chatting"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conv, i) => (
                  <motion.div
                    key={conv.user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/chat/${conv.user.id}`}
                      className="flex items-center gap-4 p-4 glass rounded-2xl hover:bg-muted/30 transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-lg font-bold text-foreground overflow-hidden">
                          <PrivateImage
                            src={conv.user.avatar_url}
                            fallback={getInitials(
                              conv.user.name || conv.user.username,
                            )}
                          />
                        </div>
                        {conv.user.is_online && (
                          <span className="absolute bottom-0 right-0 w-4 h-4 bg-neon-green rounded-full border-2 border-background" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {conv.user.name || conv.user.username}
                            </span>
                            {conv.user.country_code && (
                              <span className="text-sm">
                                {conv.user.country_code}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatConversationTime(conv.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center p-0 text-xs font-bold shrink-0">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <>
            {filteredGroups.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No groups yet
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery
                    ? "No groups found"
                    : "Create a group to chat with multiple friends"}
                </p>
                <Button asChild size="sm">
                  <Link to="/groups/create">Create Group</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map((group, i) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/groups/${group.id}`}
                      className="flex items-center gap-4 p-4 glass rounded-2xl hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary/30 to-primary/30 flex items-center justify-center text-lg font-bold text-foreground shrink-0 overflow-hidden">
                        <PrivateImage
                          src={group.avatar_url}
                          fallback={
                            <Users className="w-6 h-6 text-muted-foreground" />
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-foreground">
                            {group.name}
                          </span>
                          {group.last_message_at && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {formatConversationTime(group.last_message_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {group.member_count} member
                          {group.member_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Chat;
