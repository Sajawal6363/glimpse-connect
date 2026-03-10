import { create } from "zustand";
import { supabase, type Notification } from "@/lib/supabase";

const CLEANUP_HOURS = 72;

/** Check if a read notification should be hidden (older than 72h since read) */
function shouldHide(n: Notification): boolean {
  if (!n.is_read || !n.read_at) return false;
  const readAt = new Date(n.read_at).getTime();
  return Date.now() - readAt > CLEANUP_HOURS * 60 * 60 * 1000;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  cleanupReadNotifications: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (userId) => {
    set({ isLoading: true });

    // Server-side cleanup of old read notifications (fire-and-forget)
    supabase.rpc("cleanup_old_read_notifications").then(() => {});

    const { data, error } = await supabase
      .from("notifications")
      .select("*, from_user:profiles!notifications_from_user_id_fkey(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const notifications = data
        .map(
          (n: Record<string, unknown>) =>
            ({
              ...n,
              from_user: n.from_user || undefined,
            }) as Notification,
        )
        .filter((n) => !shouldHide(n));

      const unreadCount = notifications.filter((n) => !n.is_read).length;
      set({ notifications, unreadCount, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    const readAt = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("id", id);

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: readAt } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async (userId) => {
    const readAt = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("user_id", userId)
      .eq("is_read", false);

    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at || readAt,
      })),
      unreadCount: 0,
    }));
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  cleanupReadNotifications: async (userId) => {
    // Delete from server
    await supabase.rpc("cleanup_old_read_notifications");

    // Also filter locally
    set((state) => {
      const filtered = state.notifications.filter((n) => !shouldHide(n));
      return {
        notifications: filtered,
        unreadCount: filtered.filter((n) => !n.is_read).length,
      };
    });
  },
}));
