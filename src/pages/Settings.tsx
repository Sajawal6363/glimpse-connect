import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  Bell as BellIcon,
  Palette,
  ChevronRight,
  LogOut,
  Trash2,
  Loader2,
  Lock,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from "@/lib/validators";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, changePassword, deleteAccount } = useAuthStore();
  const { settings, isLoading, fetchSettings, updateSetting } =
    useSettingsStore();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    if (user) fetchSettings(user.id);
  }, [user, fetchSettings]);

  const handleToggle = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      await updateSetting(
        user.id,
        key as keyof Omit<
          import("@/lib/supabase").UserSettings,
          "user_id" | "updated_at"
        >,
        value,
      );

      // Apply side-effects for appearance settings
      if (key === "dark_mode") {
        document.documentElement.classList.toggle("light", !value);
        document.documentElement.classList.toggle("dark", value);
      }
      if (key === "reduced_animations") {
        document.documentElement.classList.toggle("reduce-motion", value);
      }
      if (key === "high_contrast") {
        document.documentElement.classList.toggle("high-contrast", value);
      }

      toast({
        title: "Setting updated",
        description: `${key.replace(/_/g, " ")} ${value ? "enabled" : "disabled"}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update setting. Changes saved locally.",
        variant: "destructive",
      });
    }
  };

  // Apply appearance settings on mount
  useEffect(() => {
    if (!settings) return;
    if (settings.dark_mode === false) {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
    document.documentElement.classList.toggle(
      "reduce-motion",
      !!settings.reduced_animations,
    );
    document.documentElement.classList.toggle(
      "high-contrast",
      !!settings.high_contrast,
    );
  }, [settings]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setIsDeleting(true);
    try {
      await deleteAccount();
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      navigate("/");
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete account.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    setIsChangingPassword(true);
    try {
      await changePassword(data.newPassword);
      toast({
        title: "Password changed",
        description: "Your password has been updated.",
      });
      setShowPasswordModal(false);
      passwordForm.reset();
    } catch {
      toast({
        title: "Error",
        description: "Failed to change password.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const sections = [
    {
      title: "Account",
      icon: User,
      items: [
        { label: "Edit Profile", type: "link" as const, href: "/profile/edit" },
        {
          label: "Change Password",
          type: "action" as const,
          action: () => setShowPasswordModal(true),
        },
      ],
    },
    {
      title: "Privacy",
      icon: Shield,
      items: [
        {
          label: "Show Online Status",
          type: "toggle" as const,
          key: "show_online_status",
          value: settings?.show_online_status,
        },
        {
          label: "Allow Messages from Non-Followers",
          type: "toggle" as const,
          key: "allow_non_follower_messages",
          value: settings?.allow_non_follower_messages,
        },
        {
          label: "Show Profile to Strangers",
          type: "toggle" as const,
          key: "show_profile_to_strangers",
          value: settings?.show_profile_to_strangers,
        },
        {
          label: "Blocked Users",
          type: "link" as const,
          href: "/blocked-users",
        },
      ],
    },
    {
      title: "Notifications",
      icon: BellIcon,
      items: [
        {
          label: "Push Notifications",
          type: "toggle" as const,
          key: "push_notifications",
          value: settings?.push_notifications,
        },
        {
          label: "New Follower Alerts",
          type: "toggle" as const,
          key: "new_follower_alerts",
          value: settings?.new_follower_alerts,
        },
        {
          label: "Message Notifications",
          type: "toggle" as const,
          key: "message_notifications",
          value: settings?.message_notifications,
        },
        {
          label: "Sound Effects",
          type: "toggle" as const,
          key: "sound_effects",
          value: settings?.sound_effects,
        },
      ],
    },
    {
      title: "Appearance",
      icon: Palette,
      items: [
        {
          label: "Dark Mode",
          type: "toggle" as const,
          key: "dark_mode",
          value: settings?.dark_mode,
        },
        {
          label: "Reduced Animations",
          type: "toggle" as const,
          key: "reduced_animations",
          value: settings?.reduced_animations,
        },
        {
          label: "High Contrast Mode",
          type: "toggle" as const,
          key: "high_contrast",
          value: settings?.high_contrast,
        },
      ],
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 animate-pulse h-40"
              />
            ))}
          </div>
        ) : (
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
                  <h2 className="font-semibold text-foreground">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <span className="text-sm text-foreground">
                        {item.label}
                      </span>
                      {item.type === "toggle" && "key" in item ? (
                        <Switch
                          checked={!!item.value}
                          onCheckedChange={(v) => handleToggle(item.key!, v)}
                          className="data-[state=checked]:bg-primary"
                        />
                      ) : item.type === "link" && "href" in item ? (
                        <Link to={item.href!}>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      ) : item.type === "action" && "action" in item ? (
                        <button onClick={item.action}>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ) : null}
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
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full py-3 px-2 rounded-lg hover:bg-muted/20 transition-colors text-muted-foreground"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm">Log Out</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-3 w-full py-3 px-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-sm">Delete Account</span>
                </button>
              </div>
            </motion.div>

            {/* Legal links */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="font-semibold text-foreground mb-4">Legal</h2>
              <div className="space-y-1">
                {[
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  {
                    label: "Community Guidelines",
                    href: "/community-guidelines",
                  },
                  { label: "Cookie Policy", href: "/cookie-policy" },
                ].map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-sm text-foreground">
                      {link.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Account Dialog */}
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent className="glass border-border/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                Delete Account
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action is <strong>permanent</strong> and cannot be undone.
                All your data will be deleted within 30 days. Type{" "}
                <strong>DELETE</strong> to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="h-12 bg-muted/30 border-destructive/30 rounded-xl"
            />
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "DELETE" || isDeleting}
                className="bg-destructive text-destructive-foreground rounded-xl"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Password Dialog */}
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <DialogContent className="glass border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" /> Change Password
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={passwordForm.handleSubmit(handleChangePassword)}
              className="space-y-4"
            >
              <div>
                <Input
                  {...passwordForm.register("currentPassword")}
                  type="password"
                  placeholder="Current Password"
                  className="h-12 bg-muted/30 border-border/30 rounded-xl"
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-destructive text-xs mt-1">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  {...passwordForm.register("newPassword")}
                  type="password"
                  placeholder="New Password"
                  className="h-12 bg-muted/30 border-border/30 rounded-xl"
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-destructive text-xs mt-1">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  {...passwordForm.register("confirmNewPassword")}
                  type="password"
                  placeholder="Confirm New Password"
                  className="h-12 bg-muted/30 border-border/30 rounded-xl"
                />
                {passwordForm.formState.errors.confirmNewPassword && (
                  <p className="text-destructive text-xs mt-1">
                    {passwordForm.formState.errors.confirmNewPassword.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Update Password
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Settings;
