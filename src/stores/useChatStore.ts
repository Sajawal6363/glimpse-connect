import { create } from "zustand";
import {
  supabase,
  type Message,
  type Profile,
  type Conversation,
} from "@/lib/supabase";

interface ChatState {
  conversations: Conversation[];
  activeChat: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Set<string>;
  isLoading: boolean;
  fetchConversations: (userId: string) => Promise<void>;
  fetchMessages: (userId: string, currentUserId: string) => Promise<void>;
  sendMessage: (
    senderId: string,
    receiverId: string,
    content: string,
    type?: Message["type"],
  ) => Promise<void>;
  sendImage: (
    senderId: string,
    receiverId: string,
    file: File,
  ) => Promise<void>;
  sendVoiceMessage: (
    senderId: string,
    receiverId: string,
    blob: Blob,
  ) => Promise<void>;
  markAsRead: (userId: string, currentUserId: string) => Promise<void>;
  setTyping: (userId: string, isTyping: boolean) => void;
  setActiveChat: (userId: string | null) => void;
  addMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeChat: null,
  messages: {},
  typingUsers: new Set(),
  isLoading: false,

  fetchConversations: async (userId) => {
    set({ isLoading: true });
    try {
      // Get accepted friend connections in either direction
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId)
        .eq("status", "accepted");

      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId)
        .eq("status", "accepted");

      const connectedIds = Array.from(
        new Set([
          ...(following?.map((f) => f.following_id) || []),
          ...(followers?.map((f) => f.follower_id) || []),
        ]),
      ).filter((id) => id !== userId);

      if (connectedIds.length === 0) {
        set({ conversations: [], isLoading: false });
        return;
      }

      // Get latest message for each accepted connection
      const conversations: Conversation[] = [];

      for (const otherUserId of connectedIds) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherUserId)
          .single();

        if (!profile) continue;

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", otherUserId)
          .eq("receiver_id", userId)
          .eq("is_read", false);

        conversations.push({
          user: profile as Profile,
          lastMessage: lastMsg?.content || "Start a conversation!",
          lastMessageTime: lastMsg?.created_at || profile.created_at,
          unreadCount: unreadCount || 0,
        });
      }

      // Sort by latest message
      conversations.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime(),
      );

      set({ conversations, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (userId, currentUserId) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`,
      )
      .order("created_at", { ascending: true })
      .limit(50);

    if (!error && data) {
      set((state) => ({
        messages: { ...state.messages, [userId]: data as Message[] },
      }));
    }
  },

  sendMessage: async (senderId, receiverId, content, type = "text") => {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        type,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (data) {
      get().addMessage(data as Message);

      // Send notification to receiver (fire-and-forget)
      supabase
        .from("notifications")
        .insert({
          user_id: receiverId,
          from_user_id: senderId,
          type: "new_message",
          content:
            type === "image" ? "📷 Sent you an image" : content.slice(0, 100),
        })
        .then(() => {});
    }
  },

  sendImage: async (senderId, receiverId, file) => {
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Image must be less than 1MB");
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `chat-images/${senderId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("connectlive")
      .upload(filePath, file);

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from("connectlive")
      .getPublicUrl(filePath);

    // Insert message with media_url directly
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: "📷 Image",
        type: "image",
        media_url: urlData.publicUrl,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (data) {
      get().addMessage(data as Message);
      // Notify receiver about the image
      supabase
        .from("notifications")
        .insert({
          user_id: receiverId,
          from_user_id: senderId,
          type: "new_message",
          content: "📷 Sent you an image",
        })
        .then(() => {});
    }
  },

  sendVoiceMessage: async (senderId, receiverId, blob) => {
    const filePath = `voice-messages/${senderId}/${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from("connectlive")
      .upload(filePath, blob);

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from("connectlive")
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: "🎤 Voice message",
        type: "voice",
        media_url: urlData.publicUrl,
      })
      .select()
      .single();

    if (!error && data) {
      get().addMessage(data as Message);
    }
  },

  markAsRead: async (userId, currentUserId) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", userId)
      .eq("receiver_id", currentUserId)
      .eq("is_read", false);
  },

  setTyping: (_userId, _isTyping) => {
    // Typing state managed via presence channel
  },

  setActiveChat: (userId) => {
    set({ activeChat: userId });
  },

  addMessage: (message) => {
    // Determine which conversation this message belongs to
    const activeChat = get().activeChat;
    let otherUserId: string;

    if (activeChat) {
      // If we have an active chat, key by that
      otherUserId = activeChat;
    } else {
      // Otherwise determine from message sender/receiver
      // We need to figure out which side is "us" — check both IDs against existing keys
      otherUserId =
        message.sender_id === message.receiver_id
          ? message.sender_id
          : message.receiver_id;
    }

    // Deduplicate: don't add if message ID already exists
    const existing = get().messages[otherUserId] || [];
    if (existing.some((m) => m.id === message.id)) return;

    set((state) => ({
      messages: {
        ...state.messages,
        [otherUserId]: [...existing, message],
      },
    }));
  },
}));
