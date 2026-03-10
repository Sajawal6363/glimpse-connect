import { useEffect } from "react";
import { realtimeService } from "@/lib/realtime";
import { useSocialStore } from "@/stores/useSocialStore";

export function useOnlineStatus(userId: string | null) {
  const setOnlineUsers = useSocialStore((s) => s.setOnlineUsers);

  useEffect(() => {
    if (!userId) return;

    realtimeService.trackPresence(userId);

    const unsub = realtimeService.onPresenceChange((onlineIds) => {
      setOnlineUsers(onlineIds);
    });

    return () => {
      unsub();
    };
  }, [userId, setOnlineUsers]);

  const onlineUsers = useSocialStore((s) => s.onlineUsers);
  const isOnline = (id: string) => onlineUsers.has(id);

  return { onlineUsers, isOnline };
}
