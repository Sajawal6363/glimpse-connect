import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Maximize2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";

const ACTIVE_GROUP_CALL_KEY = "active_group_call_session";

type ActiveGroupCallSession = {
  groupId: string;
  groupName?: string;
  userId: string;
  hostUserId: string;
  minimized?: boolean;
  updatedAt?: number;
};

const GroupCallFloatingWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [session, setSession] = useState<ActiveGroupCallSession | null>(null);

  const currentGroupRouteId = useMemo(() => {
    const match = location.pathname.match(/^\/stream\/group\/([^/]+)$/);
    return match?.[1] || null;
  }, [location.pathname]);

  useEffect(() => {
    const syncSession = () => {
      const raw = localStorage.getItem(ACTIVE_GROUP_CALL_KEY);
      if (!raw || !user?.id) {
        setSession(null);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as ActiveGroupCallSession;
        if (parsed.userId !== user.id) {
          setSession(null);
          return;
        }

        if (
          parsed.updatedAt &&
          Date.now() - parsed.updatedAt > 10 * 60 * 1000
        ) {
          localStorage.removeItem(ACTIVE_GROUP_CALL_KEY);
          setSession(null);
          return;
        }

        setSession(parsed);
      } catch {
        localStorage.removeItem(ACTIVE_GROUP_CALL_KEY);
        setSession(null);
      }
    };

    syncSession();

    const onStorage = () => syncSession();
    window.addEventListener("storage", onStorage);

    const interval = setInterval(syncSession, 1500);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [user?.id, location.pathname]);

  if (!session) return null;

  if (currentGroupRouteId === session.groupId) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-24 z-[9998] w-[230px] rounded-2xl border border-white/15 bg-black/85 backdrop-blur-xl shadow-2xl p-3">
      <div className="flex items-start gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <PhoneCall className="w-4 h-4 text-green-400" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">
            Group call in progress
          </p>
          <p className="text-white/70 text-[11px] truncate">
            {session.groupName || "Tap to return"}
          </p>
        </div>
      </div>

      <Button
        className="w-full h-8 text-xs rounded-xl bg-primary text-primary-foreground"
        onClick={() => navigate(`/stream/group/${session.groupId}`)}
      >
        <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
        Open Call
      </Button>
    </div>
  );
};

export default GroupCallFloatingWidget;
