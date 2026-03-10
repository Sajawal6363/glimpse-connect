import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocialStore } from "@/stores/useSocialStore";
import { supabase, type Profile } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import PrivateImage from "@/components/PrivateImage";

const BlockedUsers = () => {
  const { user } = useAuthStore();
  const { unblockUser } = useSocialStore();
  const { toast } = useToast();
  const [blockedProfiles, setBlockedProfiles] = useState<
    (Profile & { blocked_at: string })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockTarget, setUnblockTarget] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlocked = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("blocks")
        .select("blocked_id, created_at, profiles!blocks_blocked_id_fkey(*)")
        .eq("blocker_id", user.id);

      if (data) {
        const profiles = data.map((b: Record<string, unknown>) => ({
          ...(b.profiles as Profile),
          blocked_at: b.created_at as string,
        }));
        setBlockedProfiles(profiles);
      }
      setIsLoading(false);
    };
    fetchBlocked();
  }, [user]);

  const handleUnblock = async (targetId: string) => {
    if (!user) return;
    try {
      await unblockUser(user.id, targetId);
      setBlockedProfiles((prev) => prev.filter((p) => p.id !== targetId));
      toast({ title: "User unblocked" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive",
      });
    }
    setUnblockTarget(null);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Blocked Users
        </h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass rounded-2xl p-4 animate-pulse h-20"
              />
            ))}
          </div>
        ) : blockedProfiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-3xl p-12 text-center"
          >
            <UserX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Blocked Users
            </h3>
            <p className="text-muted-foreground">You haven't blocked anyone.</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {blockedProfiles.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-lg font-bold text-foreground shrink-0">
                  <PrivateImage
                    src={profile.avatar_url}
                    className="w-full h-full rounded-full object-cover"
                    fallback={getInitials(profile.name || profile.username)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">
                    {profile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{profile.username} · Blocked{" "}
                    {new Date(profile.blocked_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnblockTarget(profile.id)}
                  className="glass border-border/50 rounded-xl text-xs shrink-0"
                >
                  Unblock
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        <AlertDialog
          open={!!unblockTarget}
          onOpenChange={() => setUnblockTarget(null)}
        >
          <AlertDialogContent className="glass border-border/50">
            <AlertDialogHeader>
              <AlertDialogTitle>Unblock User</AlertDialogTitle>
              <AlertDialogDescription>
                This user will be able to match with you and send you messages
                again. Are you sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => unblockTarget && handleUnblock(unblockTarget)}
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl"
              >
                Unblock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default BlockedUsers;
