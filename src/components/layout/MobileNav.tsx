import {
  Video,
  MessageCircle,
  Compass,
  Settings,
  Home,
  Gamepad2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Stream", url: "/stream", icon: Video },
  { title: "Chat", url: "/chat", icon: MessageCircle },
  { title: "Explore", url: "/explore", icon: Compass },
  { title: "Gaming", url: "/gaming", icon: Gamepad2 },
  { title: "Settings", url: "/settings", icon: Settings },
];

const MobileNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/"}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground transition-all duration-200"
            activeClassName="text-primary neon-text-blue"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
