import { motion } from "framer-motion";
import { User, Shield, Bell as BellIcon, Palette, ChevronRight, LogOut, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import AppLayout from "@/components/layout/AppLayout";

const sections = [
  {
    title: "Account",
    icon: User,
    items: [
      { label: "Edit Profile", type: "link" as const },
      { label: "Change Password", type: "link" as const },
      { label: "Two-Factor Authentication", type: "toggle" as const, defaultOn: false },
    ],
  },
  {
    title: "Privacy",
    icon: Shield,
    items: [
      { label: "Show Online Status", type: "toggle" as const, defaultOn: true },
      { label: "Allow Messages from Non-Followers", type: "toggle" as const, defaultOn: false },
      { label: "Show Profile to Strangers", type: "toggle" as const, defaultOn: true },
      { label: "Blocked Users", type: "link" as const },
    ],
  },
  {
    title: "Notifications",
    icon: BellIcon,
    items: [
      { label: "Push Notifications", type: "toggle" as const, defaultOn: true },
      { label: "New Follower Alerts", type: "toggle" as const, defaultOn: true },
      { label: "Message Notifications", type: "toggle" as const, defaultOn: true },
      { label: "Sound Effects", type: "toggle" as const, defaultOn: false },
    ],
  },
  {
    title: "Appearance",
    icon: Palette,
    items: [
      { label: "Dark Mode", type: "toggle" as const, defaultOn: true },
      { label: "Reduced Animations", type: "toggle" as const, defaultOn: false },
      { label: "High Contrast Mode", type: "toggle" as const, defaultOn: false },
    ],
  },
];

const Settings = () => {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

        <div className="space-y-4">
          {sections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.05 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">{section.title}</h2>
              </div>

              <div className="space-y-1">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/20 transition-colors">
                    <span className="text-sm text-foreground">{item.label}</span>
                    {item.type === "toggle" ? (
                      <Switch defaultChecked={item.defaultOn} className="data-[state=checked]:bg-primary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Danger zone */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl p-6 border border-destructive/20"
          >
            <div className="space-y-1">
              <button className="flex items-center gap-3 w-full py-3 px-2 rounded-lg hover:bg-muted/20 transition-colors text-muted-foreground">
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Log Out</span>
              </button>
              <button className="flex items-center gap-3 w-full py-3 px-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
                <Trash2 className="w-5 h-5" />
                <span className="text-sm">Delete Account</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
