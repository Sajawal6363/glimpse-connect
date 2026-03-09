import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Smile, Image, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mockUsers, mockChatMessages } from "@/lib/mock-data";
import AppLayout from "@/components/layout/AppLayout";

const ChatDetail = () => {
  const { userId } = useParams();
  const user = mockUsers.find((u) => u.id === userId) || mockUsers[0];
  const [message, setMessage] = useState("");

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 glass border-b border-border/30">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/chat"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-sm font-bold text-foreground">
              {user.name[0]}
            </div>
            {user.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-neon-green rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{user.name}</span>
              <span>{user.countryFlag}</span>
            </div>
            <span className="text-xs text-muted-foreground">{user.isOnline ? "Online" : `Last seen ${user.lastSeen}`}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mockChatMessages.map((msg, i) => {
            const isMe = msg.senderId === "me";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                  isMe
                    ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-br-md"
                    : "glass text-foreground rounded-bl-md"
                }`}>
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* Typing indicator */}
          <div className="flex justify-start">
            <div className="glass px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 glass border-t border-border/30">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0">
              <Image className="w-5 h-5" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 h-12 bg-muted/30 border-border/30 rounded-xl"
            />
            <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0">
              <Smile className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0">
              <Mic className="w-5 h-5" />
            </Button>
            <Button size="icon" className="bg-primary text-primary-foreground rounded-xl shrink-0 neon-glow-blue">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChatDetail;
