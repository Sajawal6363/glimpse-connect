import { create } from "zustand";
import { supabase, type UserSettings } from "@/lib/supabase";

interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  fetchSettings: (userId: string) => Promise<void>;
  updateSetting: (
    userId: string,
    key: keyof Omit<UserSettings, "user_id" | "updated_at">,
    value: boolean,
  ) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,

  fetchSettings: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      set({ settings: data as UserSettings, isLoading: false });
    } else {
      // Create default settings if none exist
      const defaults: Partial<UserSettings> = {
        user_id: userId,
        show_online_status: true,
        allow_non_follower_messages: true,
        show_profile_to_strangers: true,
        push_notifications: true,
        new_follower_alerts: true,
        message_notifications: true,
        sound_effects: true,
        dark_mode: true,
        reduced_animations: false,
        high_contrast: false,
      };

      const { data: newSettings, error: insertError } = await supabase
        .from("user_settings")
        .upsert(defaults, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (!insertError && newSettings) {
        set({ settings: newSettings as UserSettings, isLoading: false });
      } else {
        // If DB insert fails, still set local defaults so the UI is functional
        set({
          settings: {
            ...defaults,
            updated_at: new Date().toISOString(),
          } as UserSettings,
          isLoading: false,
        });
      }
    }
  },

  updateSetting: async (userId, key, value) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;

    // Optimistic update — always apply locally
    set({ settings: { ...currentSettings, [key]: value } });

    try {
      const { error } = await supabase
        .from("user_settings")
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) {
        // Try upsert if update fails (row might not exist yet)
        const { error: upsertError } = await supabase
          .from("user_settings")
          .upsert(
            {
              user_id: userId,
              [key]: value,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

        if (upsertError) {
          console.warn(
            "Settings DB update failed, keeping local change:",
            upsertError.message,
          );
          // Keep the optimistic update — settings work locally
        }
      }
    } catch {
      // Network error — keep the optimistic update so UI stays responsive
      console.warn("Settings save failed (network), keeping local change");
    }
  },
}));
