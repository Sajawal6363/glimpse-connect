import { create } from "zustand";
import { supabase, type Profile } from "@/lib/supabase";
import { realtimeService } from "@/lib/realtime";

interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsEmailConfirmation: boolean;
  pendingEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    name: string;
    dateOfBirth: string;
    gender: string;
    country: string;
    countryCode: string;
    bio?: string;
    interests: string[];
    avatarUrl?: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  checkAuth: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearEmailConfirmation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  needsEmailConfirmation: false,
  pendingEmail: null,

  clearEmailConfirmation: () => {
    set({ needsEmailConfirmation: false, pendingEmail: null });
  },

  checkAuth: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        let profile = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data }) => data as Profile | null);

        // If profile row is missing (e.g. after email confirmation), create it from auth metadata
        if (!profile) {
          const meta = session.user.user_metadata || {};
          const newProfile = {
            id: session.user.id,
            email: session.user.email || "",
            username:
              meta.username || session.user.email?.split("@")[0] || "user",
            name: meta.name || meta.username || "User",
            bio: meta.bio || "",
            avatar_url: meta.avatar_url || "",
            date_of_birth:
              meta.date_of_birth || meta.dateOfBirth || "2000-01-01",
            gender: meta.gender || "prefer_not_to_say",
            country: meta.country || "",
            country_code: meta.country_code || meta.countryCode || "",
            interests: meta.interests || [],
            is_online: true,
          };
          const { data: created } = await supabase
            .from("profiles")
            .upsert(newProfile, { onConflict: "id" })
            .select()
            .maybeSingle();
          if (created) {
            profile = created as Profile;
          }
        }

        if (profile) {
          set({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
          });
          realtimeService.trackPresence(profile.id);
          await supabase
            .from("profiles")
            .update({ is_online: true, last_seen: new Date().toISOString() })
            .eq("id", profile.id);
        } else {
          set({ isAuthenticated: true, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);

    if (data.user) {
      let profile = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({ data: d }) => d as Profile | null);

      // If profile row is missing (e.g. after email confirmation), create it from auth metadata
      if (!profile) {
        const meta = data.user.user_metadata || {};
        const newProfile = {
          id: data.user.id,
          email: data.user.email || email,
          username: meta.username || email.split("@")[0] || "user",
          name: meta.name || meta.username || "User",
          bio: meta.bio || "",
          avatar_url: meta.avatar_url || "",
          date_of_birth: meta.date_of_birth || meta.dateOfBirth || "2000-01-01",
          gender: meta.gender || "prefer_not_to_say",
          country: meta.country || "",
          country_code: meta.country_code || meta.countryCode || "",
          interests: meta.interests || [],
          is_online: true,
        };
        const { data: created } = await supabase
          .from("profiles")
          .upsert(newProfile, { onConflict: "id" })
          .select()
          .maybeSingle();
        if (created) {
          profile = created as Profile;
        }
      }

      if (profile) {
        set({
          user: profile,
          isAuthenticated: true,
          isLoading: false,
        });
        realtimeService.trackPresence(profile.id);
        await supabase
          .from("profiles")
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq("id", profile.id);
      } else {
        // Auth succeeded but could not create profile — mark as loaded
        set({ isAuthenticated: true, isLoading: false });
      }
    }
  },

  register: async (data) => {
    // Step 1: Create the auth user — store all registration fields in metadata
    // so they're available to create the profile row after email confirmation
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          name: data.name,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          country: data.country,
          countryCode: data.countryCode,
          bio: data.bio || "",
          interests: data.interests,
          avatar_url: data.avatarUrl || "",
        },
      },
    });
    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Signup failed — no user returned");

    // Step 2: Ensure we have a valid session before any DB operations
    let session = authData.session;

    if (!session) {
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData.session;
    }

    if (!session) {
      // Email confirmation may be off but session not auto-returned — sign in
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
      if (signInError) throw new Error(signInError.message);
      session = signInData.session;
    }

    if (!session) {
      // Email confirmation is likely enabled — show confirmation screen
      set({
        needsEmailConfirmation: true,
        pendingEmail: data.email,
        isLoading: false,
      });
      return;
    }

    const userId = authData.user.id;

    // Step 3: Insert the profile
    const profile = {
      id: userId,
      email: data.email,
      username: data.username,
      name: data.name,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      country: data.country,
      country_code: data.countryCode,
      bio: data.bio || "",
      interests: data.interests,
      avatar_url: data.avatarUrl || "",
      is_online: true,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .insert(profile);
    if (profileError) throw new Error(profileError.message);

    // Step 4: Create default settings (don't throw if it fails)
    await supabase
      .from("user_settings")
      .insert({ user_id: userId })
      .then(({ error }) => {
        if (error)
          console.warn("Could not create default settings:", error.message);
      });

    // Step 5: Set the user in state immediately from what we already have
    // (avoids the .single() 0-rows issue if RLS SELECT hasn't propagated yet)
    const fullProfile: Profile = {
      id: userId,
      email: data.email,
      username: data.username,
      name: data.name,
      bio: data.bio || "",
      avatar_url: data.avatarUrl || "",
      date_of_birth: data.dateOfBirth,
      gender: data.gender as Profile["gender"],
      country: data.country,
      country_code: data.countryCode,
      interests: data.interests,
      is_verified: false,
      is_online: true,
      last_seen: new Date().toISOString(),
      is_banned: false,
      ban_expiry: null,
      strikes: 0,
      is_premium: false,
      premium_plan: "free",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    set({ user: fullProfile, isAuthenticated: true, isLoading: false });
    realtimeService.trackPresence(userId);
  },

  loginWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/stream` },
    });
    if (error) throw new Error(error.message);
  },

  loginWithGithub: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/stream` },
    });
    if (error) throw new Error(error.message);
  },

  logout: async () => {
    const user = get().user;
    if (user) {
      await supabase
        .from("profiles")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("id", user.id);
      realtimeService.disconnect();
    }
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },

  updateProfile: async (data) => {
    const user = get().user;
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    set({ user: { ...user, ...data } as Profile });
  },

  uploadAvatar: async (file) => {
    // Try store user first, then fall back to the current auth session
    let userId = get().user?.id;
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }
    if (!userId) throw new Error("Not authenticated");

    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Image must be less than 1MB");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("connectlive")
      .upload(`avatars/${fileName}`, file, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from("connectlive")
      .getPublicUrl(`avatars/${fileName}`);
    // Append timestamp to bust browser cache when avatar is re-uploaded
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Only update profile in DB if user is already registered
    if (get().user) {
      await get().updateProfile({ avatar_url: avatarUrl });
    }
    return avatarUrl;
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(error.message);
  },

  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  deleteAccount: async () => {
    const user = get().user;
    if (!user) throw new Error("Not authenticated");

    // Delete profile (cascade will handle related data)
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
}));
