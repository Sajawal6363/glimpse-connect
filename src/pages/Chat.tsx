import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockConversations } from "@/lib/mock-data";
import AppLayout from "@/components/layout/AppLayout";

const Chat = () => {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-foreground mb-6">Messages</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-11 h-12 bg-muted/30 border-border/30 rounded-xl" />
        </div>

        <div className="space-y-2">
          {mockConversations.map((conv, i) => (
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
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-lg font-bold text-foreground">
                    {conv.user.name[0]}
                  </div>
                  {conv.user.isOnline && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-neon-green rounded-full border-2 border-background" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{conv.user.name}</span>
                      <span className="text-sm">{conv.user.countryFlag}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>

                {/* Unread badge */}
                {conv.unread > 0 && (
                  <Badge className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center p-0 text-xs font-bold shrink-0">
                    {conv.unread}
                  </Badge>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;
