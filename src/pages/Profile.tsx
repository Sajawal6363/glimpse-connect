import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  BadgeCheck,
  UserPlus,
  UserMinus,
  UserCheck,
  Clock,
  MessageCircle,
  Calendar,
  Ban,
  Flag,
  Edit,
  Image as ImageIcon,
  Plus,
  Trash2,
  Lock,
  Globe,
  X,
  Camera,
  Loader2,
  Sparkles,
  Star,
  Shield,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocialStore } from "@/stores/useSocialStore";
import {
  supabase,
  type Profile as ProfileType,
  type GalleryImage,
  type ProfileRatingSummary as ProfileRatingSummaryType,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import PrivateImage from "@/components/PrivateImage";
import AppLayout from "@/components/layout/AppLayout";
import { getAuraCaption, getAuraLabel } from "@/lib/streamRatings";

const MAX_GALLERY_IMAGES = 5;

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const {
    user: currentUser,
    isLoading: authLoading,
    uploadBanner,
  } = useAuthStore();
  const {
    sendFollowRequest,
    cancelFollowRequest,
    acceptFollowRequest,
    rejectFollowRequest,
    unfollowUser,
    blockUser,
    fetchFollowers,
    fetchFollowing,
    fetchPendingRequests,
    fetchSentRequests,
  } = useSocialStore();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<
    "none" | "pending_sent" | "pending_received" | "following" | "mutual"
  >("none");
  const [pendingFollowId, setPendingFollowId] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratingSummary, setRatingSummary] =
    useState<ProfileRatingSummaryType | null>(null);

  // Gallery state
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryPreview, setGalleryPreview] = useState<GalleryImage | null>(
    null,
  );
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;

    const fetchProfile = async () => {
      setIsLoading(true);

      let targetProfile: ProfileType | null = null;
      const isOwn =
        username === "me" || (currentUser && username === currentUser.username);

      if (isOwn) {
        targetProfile = currentUser || null;
        setIsOwnProfile(true);
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .maybeSingle();
        targetProfile = data as ProfileType | null;
        setIsOwnProfile(false);
      }

      if (!targetProfile) {
        setIsLoading(false);
        return;
      }

      setProfile(targetProfile);

      // Fetch follow counts (only accepted)
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", targetProfile.id)
          .eq("status", "accepted"),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", targetProfile.id)
          .eq("status", "accepted"),
      ]);
      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);

      // Determine follow status for non-own profiles
      if (currentUser && !isOwn) {
        // Check if I follow them (accepted)
        const { data: iFollowThem } = await supabase
          .from("follows")
          .select("id, status")
          .eq("follower_id", currentUser.id)
          .eq("following_id", targetProfile.id)
          .maybeSingle();

        // Check if they follow me (accepted)
        const { data: theyFollowMe } = await supabase
          .from("follows")
          .select("id, status")
          .eq("follower_id", targetProfile.id)
          .eq("following_id", currentUser.id)
          .maybeSingle();

        if (
          iFollowThem?.status === "accepted" &&
          theyFollowMe?.status === "accepted"
        ) {
          setFollowStatus("mutual");
        } else if (iFollowThem?.status === "accepted") {
          setFollowStatus("following");
        } else if (iFollowThem?.status === "pending") {
          setFollowStatus("pending_sent");
        } else if (theyFollowMe?.status === "pending") {
          setFollowStatus("pending_received");
          setPendingFollowId(theyFollowMe.id);
        } else {
          setFollowStatus("none");
        }
      }

      // Fetch gallery
      const { data: ratingData } = await supabase
        .from("profile_rating_summary")
        .select("*")
        .eq("user_id", targetProfile.id)
        .maybeSingle();

      setRatingSummary((ratingData as ProfileRatingSummaryType | null) || null);

      await fetchGallery(targetProfile.id, isOwn);

      setIsLoading(false);
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, currentUser, authLoading]);

  const fetchGallery = async (userId: string, isOwn: boolean) => {
    setGalleryLoading(true);
    if (isOwn) {
      // Own profile: show all images
      const { data } = await supabase
        .from("user_gallery")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setGallery((data as GalleryImage[]) || []);
    } else {
      // Others: public images + private images if mutual friends
      let isMutual = false;
      if (currentUser) {
        const { data: iFollow } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId)
          .eq("status", "accepted")
          .maybeSingle();
        const { data: theyFollow } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", userId)
          .eq("following_id", currentUser.id)
          .eq("status", "accepted")
          .maybeSingle();
        isMutual = !!iFollow && !!theyFollow;
      }

      let query = supabase
        .from("user_gallery")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!isMutual) {
        query = query.eq("is_public", true);
      }

      const { data } = await query;
      setGallery((data as GalleryImage[]) || []);
    }
    setGalleryLoading(false);
  };

  const handleFollow = async () => {
    if (!currentUser || !profile || actionLoading) return;
    setActionLoading(true);
    try {
      switch (followStatus) {
        case "none":
          await sendFollowRequest(currentUser.id, profile.id);
          setFollowStatus("pending_sent");
          toast({ title: "Follow request sent" });
          break;
        case "pending_sent":
          await cancelFollowRequest(currentUser.id, profile.id);
          setFollowStatus("none");
          toast({ title: "Request cancelled" });
          break;
        case "following":
        case "mutual":
          await unfollowUser(currentUser.id, profile.id);
          setFollowStatus("none");
          setFollowerCount((c) => Math.max(0, c - 1));
          toast({ title: "Unfollowed" });
          break;
      }
    } catch {
      toast({
        title: "Error",
        description: "Action failed",
        variant: "destructive",
      });
    }
    setActionLoading(false);
  };

  const handleAcceptRequest = async () => {
    if (!currentUser || !pendingFollowId || actionLoading) return;
    setActionLoading(true);
    try {
      await acceptFollowRequest(pendingFollowId, currentUser.id);
      setFollowStatus("following");
      setFollowerCount((c) => c + 1);
      toast({ title: "Follow request accepted!" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to accept",
        variant: "destructive",
      });
    }
    setActionLoading(false);
  };

  const handleRejectRequest = async () => {
    if (!currentUser || !pendingFollowId || actionLoading) return;
    setActionLoading(true);
    try {
      await rejectFollowRequest(pendingFollowId, currentUser.id);
      setFollowStatus("none");
      toast({ title: "Request rejected" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to reject",
        variant: "destructive",
      });
    }
    setActionLoading(false);
  };

  const handleBlock = async () => {
    if (!currentUser || !profile) return;
    try {
      await blockUser(currentUser.id, profile.id);
      toast({ title: "User blocked" });
      navigate("/explore");
    } catch {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      });
    }
  };

  const handleGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (gallery.length >= MAX_GALLERY_IMAGES) {
      toast({
        title: "Gallery full",
        description: `Maximum ${MAX_GALLERY_IMAGES} images allowed.`,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 1MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingGallery(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `gallery/${currentUser.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("connectlive")
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data } = await supabase
        .from("user_gallery")
        .insert({
          user_id: currentUser.id,
          image_url: filePath,
          is_public: true,
        })
        .select()
        .single();

      if (data) {
        setGallery((prev) => [data as GalleryImage, ...prev]);
        toast({ title: "Image uploaded!" });
      }
    } catch {
      toast({
        title: "Upload failed",
        description: "Could not upload image.",
        variant: "destructive",
      });
    }
    setUploadingGallery(false);
    e.target.value = "";
  };

  const handleGalleryDelete = async (img: GalleryImage) => {
    if (!currentUser) return;
    try {
      // Delete from storage
      await supabase.storage.from("connectlive").remove([img.image_url]);
      // Delete from DB
      await supabase.from("user_gallery").delete().eq("id", img.id);
      setGallery((prev) => prev.filter((g) => g.id !== img.id));
      setGalleryPreview(null);
      toast({ title: "Image deleted" });
    } catch {
      toast({
        title: "Delete failed",
        variant: "destructive",
      });
    }
  };

  const handleGalleryToggleVisibility = async (img: GalleryImage) => {
    const newPublic = !img.is_public;
    await supabase
      .from("user_gallery")
      .update({ is_public: newPublic })
      .eq("id", img.id);
    setGallery((prev) =>
      prev.map((g) => (g.id === img.id ? { ...g, is_public: newPublic } : g)),
    );
    if (galleryPreview?.id === img.id) {
      setGalleryPreview({ ...img, is_public: newPublic });
    }
    toast({
      title: newPublic ? "Image set to public" : "Image set to friends only",
    });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Banner image must be less than 2MB.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setUploadingBanner(true);
    try {
      await uploadBanner(file);
      // Re-fetch profile to get the updated banner_url
      const { data: updated } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (updated) setProfile(updated as ProfileType);
      toast({ title: "Banner updated!" });
    } catch {
      toast({
        title: "Upload failed",
        description: "Could not upload banner.",
        variant: "destructive",
      });
    }
    setUploadingBanner(false);
    e.target.value = "";
  };

  const getFollowButton = () => {
    switch (followStatus) {
      case "none":
        return (
          <Button
            onClick={handleFollow}
            disabled={actionLoading}
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl px-6 neon-glow-blue"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Follow
          </Button>
        );
      case "pending_sent":
        return (
          <Button
            onClick={handleFollow}
            disabled={actionLoading}
            variant="outline"
            className="glass border-amber-500/30 text-amber-400 rounded-xl px-6"
          >
            <Clock className="w-4 h-4 mr-2" /> Requested
          </Button>
        );
      case "pending_received":
        return (
          <div className="flex gap-2">
            <Button
              onClick={handleAcceptRequest}
              disabled={actionLoading}
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl px-4 neon-glow-blue"
            >
              <UserCheck className="w-4 h-4 mr-2" /> Accept
            </Button>
            <Button
              onClick={handleRejectRequest}
              disabled={actionLoading}
              variant="outline"
              className="glass border-border/50 rounded-xl px-4 text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        );
      case "following":
        return (
          <Button
            onClick={handleFollow}
            disabled={actionLoading}
            variant="outline"
            className="glass border-border/50 rounded-xl px-6 text-foreground"
          >
            <UserMinus className="w-4 h-4 mr-2" /> Unfollow
          </Button>
        );
      case "mutual":
        return (
          <Button
            onClick={handleFollow}
            disabled={actionLoading}
            variant="outline"
            className="glass border-primary/30 rounded-xl px-6 text-primary"
          >
            <UserCheck className="w-4 h-4 mr-2" /> Friends
          </Button>
        );
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-4">
          <div className="glass rounded-3xl p-8 animate-pulse h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-4 text-center py-20">
          <h2 className="text-xl font-bold text-foreground mb-2">
            User not found
          </h2>
          <p className="text-muted-foreground">
            This profile doesn't exist or has been removed.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl text-center relative overflow-hidden"
        >
          {/* Banner — uploadable for own profile */}
          <div className="relative h-36 sm:h-44 w-full group">
            {profile.banner_url ? (
              <PrivateImage
                src={profile.banner_url}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/10" />
            )}
            {/* Dark overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            {isOwnProfile && (
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white/80 hover:text-white rounded-xl px-3 py-1.5 text-xs font-medium transition-all opacity-0 group-hover:opacity-100 z-10"
              >
                {uploadingBanner ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                {uploadingBanner ? "Uploading..." : "Edit Banner"}
              </button>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />
          </div>

          {/* Avatar — positioned to overlap the banner */}
          <div className="relative z-10 -mt-14 mb-4">
            <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-primary-foreground ring-4 ring-background neon-glow-blue overflow-hidden">
              <PrivateImage
                src={profile.avatar_url}
                fallback={getInitials(profile.name || profile.username)}
                className="w-full h-full object-cover"
              />
            </div>
            {profile.is_online && (
              <span className="absolute bottom-2 right-1/2 translate-x-[3.5rem] w-5 h-5 bg-neon-green rounded-full border-3 border-background" />
            )}
          </div>

          {/* Info */}
          <div className="relative z-10 px-4 sm:px-8 pb-8">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">
                {profile.name}
              </h1>
              {profile.is_verified && (
                <BadgeCheck className="w-5 h-5 text-primary" />
              )}
            </div>
            <p className="text-muted-foreground text-sm mb-2">
              @{profile.username}
            </p>
            {profile.country && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-4">
                <MapPin className="w-4 h-4" />
                {profile.country}
              </div>
            )}
            {profile.bio && (
              <p className="text-foreground mb-6">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">
                  {followerCount.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">
                  {followingCount.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Following</div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="relative mb-6 overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background/80 to-secondary/10 p-4 sm:p-5 text-left"
            >
              <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-secondary/10 blur-3xl" />

              <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                      Vibeprint
                    </p>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    {ratingSummary?.rating_count
                      ? getAuraLabel(ratingSummary.aura_score)
                      : "No public vibeprint yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed break-words">
                    {ratingSummary?.rating_count
                      ? getAuraCaption(ratingSummary.aura_score)
                      : isOwnProfile
                        ? "Longer live streams unlock your first public Vibeprint. Once people rate you, this card becomes your signature reputation layer."
                        : "This profile has not collected enough live-stream ratings yet."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                      Live reputation
                    </div>
                    <div className="rounded-full border border-border/40 bg-background/50 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                      Built from real stream sessions
                    </div>
                  </div>
                </div>

                <div className="w-full rounded-3xl border border-white/10 bg-background/70 px-4 py-4 backdrop-blur-sm shadow-[0_18px_50px_rgba(0,0,0,0.16)] lg:justify-self-end">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-xs uppercase tracking-[0.22em]">
                      Aura Score
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-foreground leading-none">
                    {ratingSummary?.rating_count
                      ? ratingSummary.aura_score.toFixed(1)
                      : "--"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {ratingSummary?.rating_count
                      ? `${ratingSummary.rating_count.toLocaleString()} verified stream ratings`
                      : "Waiting for first verified rating"}
                  </div>
                </div>
              </div>

              <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Vibe",
                    value: ratingSummary?.vibe_score ?? 0,
                    accent: "from-primary to-secondary",
                    Icon: Sparkles,
                    suffix: "/5",
                  },
                  {
                    label: "Respect",
                    value: ratingSummary?.respect_score ?? 0,
                    accent: "from-emerald-400 to-cyan-400",
                    Icon: Shield,
                    suffix: "/5",
                  },
                  {
                    label: "Energy",
                    value: ratingSummary?.energy_score ?? 0,
                    accent: "from-orange-400 to-rose-400",
                    Icon: Zap,
                    suffix: "/5",
                  },
                  {
                    label: "Reconnect",
                    value: ratingSummary?.reconnect_rate ?? 0,
                    accent: "from-violet-400 to-fuchsia-400",
                    Icon: RefreshCw,
                    suffix: "%",
                    max: 100,
                  },
                ].map((metric) => {
                  const max = metric.max ?? 5;
                  const width = Math.max(
                    0,
                    Math.min(100, (metric.value / max) * 100),
                  );

                  return (
                    <div
                      key={metric.label}
                      className="min-w-0 rounded-2xl border border-border/40 bg-background/50 p-4"
                    >
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex min-w-0 items-center gap-2 text-foreground">
                          <metric.Icon className="w-4 h-4 text-primary" />
                          <span className="truncate text-sm font-semibold">
                            {metric.label}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-foreground">
                          {ratingSummary?.rating_count
                            ? `${metric.value.toFixed(metric.suffix === "%" ? 0 : 1)}${metric.suffix}`
                            : "--"}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${metric.accent}`}
                          style={{
                            width: `${ratingSummary?.rating_count ? width : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3 mb-8">
              {isOwnProfile ? (
                <Button
                  className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl px-6 neon-glow-blue"
                  asChild
                >
                  <Link to="/profile/edit">
                    <Edit className="w-4 h-4 mr-2" /> Edit Profile
                  </Link>
                </Button>
              ) : (
                <>
                  {getFollowButton()}
                  {(followStatus === "following" ||
                    followStatus === "mutual") && (
                    <Button
                      variant="outline"
                      className="glass border-border/50 rounded-xl px-6"
                      asChild
                    >
                      <Link to={`/chat/${profile.id}`}>
                        <MessageCircle className="w-4 h-4 mr-2" /> Message
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleBlock}
                    className="glass border-border/50 rounded-xl text-muted-foreground hover:text-destructive"
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Interests
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {profile.interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant="outline"
                      className="border-primary/30 text-primary rounded-full px-4 py-1.5"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass rounded-2xl p-6 mt-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Gallery
              {gallery.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({gallery.length}/{MAX_GALLERY_IMAGES})
                </span>
              )}
            </h3>
            {isOwnProfile && gallery.length < MAX_GALLERY_IMAGES && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleGalleryUpload}
                  disabled={uploadingGallery}
                />
                <div className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                  <Plus className="w-4 h-4" />
                  {uploadingGallery ? "Uploading..." : "Add Photo"}
                </div>
              </label>
            )}
          </div>

          {galleryLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl glass animate-pulse"
                />
              ))}
            </div>
          ) : gallery.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {isOwnProfile
                  ? "Add up to 5 photos to your gallery"
                  : "No photos yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((img) => (
                <motion.button
                  key={img.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setGalleryPreview(img)}
                  className="aspect-square rounded-xl overflow-hidden relative group"
                >
                  <PrivateImage
                    src={img.image_url}
                    alt={img.caption || "Gallery image"}
                    className="w-full h-full object-cover"
                  />
                  {!img.is_public && (
                    <div className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1">
                      <Lock className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 mt-4"
        >
          <h3 className="font-semibold text-foreground mb-4">Activity</h3>
          <div className="space-y-3">
            {profile.created_at && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Joined{" "}
                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <div
                className={`w-2 h-2 ${profile.is_online ? "bg-neon-green" : "bg-muted-foreground"} rounded-full`}
              />
              <span className="text-muted-foreground">
                {profile.is_online ? "Currently online" : "Offline"}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gallery Preview Dialog */}
      <Dialog
        open={!!galleryPreview}
        onOpenChange={() => setGalleryPreview(null)}
      >
        <DialogContent className="glass border-border/50 max-w-lg p-2">
          <DialogHeader className="px-4 pt-3">
            <DialogTitle className="text-sm flex items-center gap-2">
              {galleryPreview?.is_public ? (
                <>
                  <Globe className="w-4 h-4 text-primary" /> Public
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-400" /> Friends Only
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {galleryPreview && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden max-h-[60vh]">
                <PrivateImage
                  src={galleryPreview.image_url}
                  alt={galleryPreview.caption || "Gallery image"}
                  className="w-full h-full object-contain"
                />
              </div>
              {isOwnProfile && (
                <div className="flex items-center justify-between px-2 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {galleryPreview.is_public ? "Public" : "Friends only"}
                    </span>
                    <Switch
                      checked={galleryPreview.is_public}
                      onCheckedChange={() =>
                        handleGalleryToggleVisibility(galleryPreview)
                      }
                      className="data-[state=checked]:bg-primary scale-75"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGalleryDelete(galleryPreview)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Profile;
