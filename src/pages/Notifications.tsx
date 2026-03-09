import { motion } from "framer-motion";
import { UserPlus, MessageCircle, Wifi, Info } from "lucide-react";
import { mockNotifications } from "@/lib/mock-data";
import AppLayout from "@/components/layout/AppLayout";

const iconMap: Record<string, React.ElementType> = {
  follow: UserPlus,
  message: MessageCircle,
  online: Wifi,
  system: Info,
};

const colorMap: Record<string, string> = {
  follow: "text-primary bg-primary/10",
  message: "text-secondary bg-secondary/10",
  online: "text-neon-green bg-accent/10",
  system: "text-muted-foreground bg-muted",
};

const Notifications = () => {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-foreground mb-6">Notifications</h1>

        <div className="space-y-2">
          {mockNotifications.map((notif, i) => {
            const Icon = iconMap[notif.type] || Info;
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4 p-4 glass rounded-2xl hover:bg-muted/20 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[notif.type]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {notif.user && <span className="font-semibold">{notif.user.name} </span>}
                    <span className="text-muted-foreground">{notif.message}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Notifications;
