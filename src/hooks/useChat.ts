import { useEffect, useCallback } from "react";
import { useChatStore } from "@/stores/useChatStore";
import { realtimeService } from "@/lib/realtime";
import type { Message } from "@/lib/supabase";

export function useChat(
  currentUserId: string | null,
  chatUserId: string | null,
) {
  const {
    messages,
    conversations,
    isLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    addMessage,
    setActiveChat,
  } = useChatStore();

  // Fetch conversations on mount
  useEffect(() => {
    if (currentUserId) {
      fetchConversations(currentUserId);
    }
  }, [currentUserId, fetchConversations]);

  // Fetch messages when chat user changes
  useEffect(() => {
    if (currentUserId && chatUserId) {
      fetchMessages(chatUserId, currentUserId);
      markAsRead(chatUserId, currentUserId);
      setActiveChat(chatUserId);
    }

    return () => {
      setActiveChat(null);
    };
  }, [currentUserId, chatUserId, fetchMessages, markAsRead, setActiveChat]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!currentUserId) return;

    realtimeService.subscribeToMessages(currentUserId, (message) => {
      addMessage(message as Message);
    });

    return () => {
      realtimeService.unsubscribeFromMessages();
    };
  }, [currentUserId, addMessage]);

  const send = useCallback(
    async (content: string, type?: Message["type"]) => {
      if (!currentUserId || !chatUserId) return;
      await sendMessage(currentUserId, chatUserId, content, type);
    },
    [currentUserId, chatUserId, sendMessage],
  );

  return {
    messages: chatUserId ? messages[chatUserId] || [] : [],
    conversations,
    isLoading,
    sendMessage: send,
  };
}
