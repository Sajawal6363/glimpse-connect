import { useEffect } from "react";
import { Bell, Search, Wifi, PanelLeftClose, PanelLeft, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useGiftStore } from "@/stores/useGiftStore";
import { getInitials } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useSignedUrl } from "@/lib/storage";

const Navbar = () => {
  const { user } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const { wallet, fetchWallet } = useGiftStore();
  const { toggleSidebar, state: sidebarState } = useSidebar();

  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
      fetchWallet(user.id);
    }
  }, [user, fetchNotifications, fetchWallet]);

  const displayName = user?.name || user?.username || "U";
  const { url: avatarUrl } = useSignedUrl(user?.avatar_url);
  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="hidden md:flex text-muted-foreground hover:text-foreground w-8 h-8"
        >
          {sidebarState === "expanded" ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeft className="w-5 h-5" />
          )}
        </Button>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Wifi className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold neon-text-blue text-primary hidden sm:block">
            ConnectLive
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {wallet !== null && (
          <Link
            to="/gifts/shop"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 glass rounded-full border border-yellow-400/30 hover:border-yellow-400/60 transition-colors"
          >
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">{wallet.coins.toLocaleString()}</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/explore">
            <Search className="w-5 h-5" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/notifications">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </Button>
        <Link to={user ? `/profile/${user.username}` : "/profile/me"}>
          <Avatar className="w-8 h-8 ring-2 ring-primary/30">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary object-cover to-secondary text-xs font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
