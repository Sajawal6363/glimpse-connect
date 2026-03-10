import { useEffect, useCallback, useRef, useState } from "react";
import { matchmakingService } from "@/lib/matchmaking";
import type { Profile } from "@/lib/supabase";

interface UseMatchmakingOptions {
  userId: string;
  onMatch?: (user: Profile) => void;
  onTimeout?: () => void;
}

export function useMatchmaking(options: UseMatchmakingOptions) {
  const { userId, onMatch, onTimeout } = options;
  const [isSearching, setIsSearching] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Profile | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);

  const joinQueue = useCallback(
    async (preferences: {
      country?: string;
      gender?: string;
      interests?: string[];
    }) => {
      setIsSearching(true);
      setMatchedUser(null);

      await matchmakingService.joinQueue(userId, preferences);

      const unsub1 = matchmakingService.onMatch((user) => {
        setMatchedUser(user);
        setIsSearching(false);
        onMatch?.(user);
      });

      const unsub2 = matchmakingService.onTimeout(() => {
        setIsSearching(false);
        onTimeout?.();
      });

      cleanupRef.current = [unsub1, unsub2];
    },
    [userId, onMatch, onTimeout],
  );

  const leaveQueue = useCallback(async () => {
    await matchmakingService.leaveQueue();
    cleanupRef.current.forEach((fn) => fn());
    cleanupRef.current = [];
    setIsSearching(false);
  }, []);

  const skip = useCallback(async () => {
    await matchmakingService.skip();
    setMatchedUser(null);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current.forEach((fn) => fn());
      matchmakingService.leaveQueue();
    };
  }, []);

  return {
    isSearching,
    matchedUser,
    joinQueue,
    leaveQueue,
    skip,
  };
}
