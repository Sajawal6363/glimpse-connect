import { Bell, Search, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50 px-4 h-14 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Wifi className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold neon-text-blue text-primary hidden sm:block">
          ConnectLive
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" asChild>
          <Link to="/explore">
            <Search className="w-5 h-5" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" asChild>
          <Link to="/notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </Link>
        </Button>
        <Link to="/profile/me">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-primary-foreground ring-2 ring-primary/30">
            U
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
