import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Check, Search, Camera, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGroupChatStore } from "@/stores/useGroupChatStore";
import { supabase, type Profile } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import PrivateImage from "@/components/PrivateImage";

const CreateGroup = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { createGroup } = useGroupChatStore();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mutualFollows, setMutualFollows] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch mutual follows
  useEffect(() => {
    const fetchMutuals = async () => {
      if (!currentUser) return;

      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUser.id);

      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", currentUser.id);

      const followingIds = new Set(following?.map((f) => f.following_id) || []);
      const followerIds = new Set(followers?.map((f) => f.follower_id) || []);
      const mutualIds = [...followingIds].filter((id) => followerIds.has(id));

      if (mutualIds.length === 0) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", mutualIds);

      if (profiles) setMutualFollows(profiles as Profile[]);
    };
    fetchMutuals();
  }, [currentUser]);

  const MAX_MEMBERS = 4; // Max 4 + admin = 5 total

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= MAX_MEMBERS) return prev; // Already at limit
      return [...prev, id];
    });
  };

  const filteredMutuals = mutualFollows.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Group name is required", variant: "destructive" });
      return;
    }
    if (selectedIds.length === 0) {
      toast({
        title: "Add at least one member",
        variant: "destructive",
      });
      return;
    }
    if (!currentUser) return;

    setIsCreating(true);
    try {
      const groupId = await createGroup(
        name.trim(),
        description.trim(),
        currentUser.id,
        selectedIds,
        avatarFile,
      );
      setIsCreating(false);

      if (groupId) {
        toast({ title: "Group created!" });
        navigate(`/groups/${groupId}`);
      } else {
        toast({
          title: "Failed to create group",
          variant: "destructive",
        });
      }
    } catch (err) {
      setIsCreating(false);
      toast({
        title: err instanceof Error ? err.message : "Failed to create group",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/chat">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Create Group</h1>
        </div>

        <div className="space-y-6">
          {/* Group Info */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 1 * 1024 * 1024) {
                        toast({
                          title: "Image must be less than 1MB",
                          variant: "destructive",
                        });
                        e.target.value = "";
                        return;
                      }
                      setAvatarFile(file);
                      setAvatarPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary/30 to-primary/30 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-border/30 hover:ring-primary/50 transition-all"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Group avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Group name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-muted/30 border-border/30 rounded-xl"
                  maxLength={50}
                />
              </div>
            </div>
            <Textarea
              placeholder="Group description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-muted/30 border-border/30 rounded-xl resize-none"
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Add Members */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold text-foreground mb-1">Add Members</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select from your mutual follows ({selectedIds.length}/
              {MAX_MEMBERS} selected · max 5 including you)
            </p>
            {selectedIds.length >= MAX_MEMBERS && (
              <p className="text-xs text-amber-400 mb-3">
                ⚠ Maximum group size reached (5 members including you)
              </p>
            )}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-muted/30 border-border/30 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredMutuals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {mutualFollows.length === 0
                    ? "You need mutual follows to add to a group"
                    : "No matches found"}
                </p>
              ) : (
                filteredMutuals.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <motion.button
                      key={p.id}
                      onClick={() => toggleUser(p.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/30"
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                        <PrivateImage
                          src={p.avatar_url}
                          fallback={getInitials(p.name || p.username)}
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <span className="font-medium text-foreground text-sm">
                          {p.name}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          @{p.username}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || selectedIds.length === 0}
            className="w-full h-12 rounded-xl neon-glow-blue"
          >
            {isCreating
              ? "Creating..."
              : `Create Group (${selectedIds.length + 1} members)`}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreateGroup;
