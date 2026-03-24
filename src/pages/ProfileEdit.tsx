import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Save, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { countries } from "@/lib/countries";
import { interests } from "@/lib/interests";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileEditSchema, type ProfileEditFormData } from "@/lib/validators";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import { useSignedUrl } from "@/lib/storage";

const ProfileEdit = () => {
  const { user, updateProfile, uploadAvatar } = useAuthStore();
  const { getMaxInterests, requireFeature } = useSubscriptionStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { url: signedAvatarUrl } = useSignedUrl(user?.avatar_url);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
  });

  const watchedUsername = watch("username");
  const debouncedUsername = useDebounce(watchedUsername, 500);

  // Load current user data
  useEffect(() => {
    if (user) {
      setValue("name", user.name || "");
      setValue("username", user.username || "");
      setValue("bio", user.bio || "");
      setValue(
        "gender",
        (user.gender as ProfileEditFormData["gender"]) || "prefer_not_to_say",
      );
      setValue("country", user.country_code || "");
      setSelectedInterests(user.interests || []);
    }
  }, [user, setValue]);

  // Check username availability (only if changed)
  useEffect(() => {
    if (
      !debouncedUsername ||
      debouncedUsername === user?.username ||
      debouncedUsername.length < 3
    ) {
      setUsernameAvailable(null);
      return;
    }
    const check = async () => {
      setCheckingUsername(true);
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", debouncedUsername)
        .maybeSingle();
      setUsernameAvailable(!data);
      setCheckingUsername(false);
    };
    check();
  }, [debouncedUsername, user?.username]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        toast({ title: "Image must be less than 1MB", variant: "destructive" });
        e.target.value = "";
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const toggleInterest = (interest: string) => {
    const maxInterests = getMaxInterests();
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : maxInterests === null || prev.length < maxInterests
          ? [...prev, interest]
          : prev,
    );

    if (
      !selectedInterests.includes(interest) &&
      maxInterests !== null &&
      selectedInterests.length >= maxInterests
    ) {
      requireFeature("interestBasedMatching", {
        title: "Interest limit reached",
        description:
          "Free plan supports up to 5 interests. Upgrade to Premium for unlimited interests.",
      });
      toast({
        title: "Interest cap reached",
        description: "Upgrade to Premium for unlimited interests.",
      });
    }
  };

  const onSubmit = async (data: ProfileEditFormData) => {
    if (usernameAvailable === false) return;
    setIsSaving(true);
    try {
      let avatarUrl = user?.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const selectedCountry = countries.find((c) => c.code === data.country);
      await updateProfile({
        name: data.name,
        username: data.username,
        bio: data.bio,
        gender: data.gender,
        country: selectedCountry?.name || data.country,
        country_code: data.country,
        interests: selectedInterests,
        avatar_url: avatarUrl,
      });

      toast({
        title: "Profile updated!",
        description: "Your changes have been saved.",
      });
      navigate("/");
    } catch {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground mb-6">
            Edit Profile
          </h1>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="glass rounded-3xl p-8 space-y-6"
          >
            {/* Avatar */}
            <div className="flex justify-center">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-primary-foreground ring-4 ring-primary/20 group-hover:ring-primary/50 transition-all overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : signedAvatarUrl ? (
                    <img
                      src={signedAvatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.name?.[0] || "?"
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-foreground" />
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Full Name
                </label>
                <Input
                  {...register("name")}
                  className="h-12 bg-muted/30 border-border/30 rounded-xl"
                />
                {errors.name && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Username
                </label>
                <div className="relative">
                  <Input
                    {...register("username")}
                    className="h-12 bg-muted/30 border-border/30 rounded-xl pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {!checkingUsername && usernameAvailable === true && (
                      <CheckCircle className="w-4 h-4 text-neon-green" />
                    )}
                    {!checkingUsername && usernameAvailable === false && (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>
                {errors.username && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.username.message}
                  </p>
                )}
                {usernameAvailable === false && (
                  <p className="text-destructive text-xs mt-1">
                    Username is taken
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Bio
              </label>
              <Textarea
                {...register("bio")}
                className="bg-muted/30 border-border/30 rounded-xl resize-none"
                rows={3}
              />
              {errors.bio && (
                <p className="text-destructive text-xs mt-1">
                  {errors.bio.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Gender
                </label>
                <Select
                  defaultValue={user?.gender || ""}
                  onValueChange={(val) =>
                    setValue("gender", val as ProfileEditFormData["gender"])
                  }
                >
                  <SelectTrigger className="h-12 bg-muted/30 border-border/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Country
                </label>
                <Select
                  defaultValue={user?.country_code || ""}
                  onValueChange={(val) => setValue("country", val)}
                >
                  <SelectTrigger className="h-12 bg-muted/30 border-border/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-60">
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-3 block">
                Interests ({selectedInterests.length}/{getMaxInterests() ?? "∞"}
                )
              </label>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant={
                      selectedInterests.includes(interest)
                        ? "default"
                        : "outline"
                    }
                    className={`cursor-pointer px-3 py-1.5 rounded-full text-xs transition-all ${
                      selectedInterests.includes(interest)
                        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent"
                        : "border-border/50 text-muted-foreground hover:border-primary/50"
                    }`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl neon-glow-blue"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default ProfileEdit;
