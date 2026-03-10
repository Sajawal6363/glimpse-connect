import { create } from "zustand";
import {
  supabase,
  type Group,
  type GroupMember,
  type GroupMessage,
  type Profile,
} from "@/lib/supabase";

interface GroupChatState {
  groups: Group[];
  currentGroup: Group | null;
  members: GroupMember[];
  messages: GroupMessage[];
  isLoading: boolean;
  fetchGroups: (userId: string) => Promise<void>;
  fetchGroup: (groupId: string) => Promise<void>;
  fetchMembers: (groupId: string) => Promise<void>;
  fetchMessages: (groupId: string) => Promise<void>;
  createGroup: (
    name: string,
    description: string,
    createdBy: string,
    memberIds: string[],
    avatarFile?: File | null,
  ) => Promise<string | null>;
  sendMessage: (
    groupId: string,
    senderId: string,
    content: string,
    type?: GroupMessage["type"],
  ) => Promise<void>;
  sendGroupImage: (
    groupId: string,
    senderId: string,
    file: File,
  ) => Promise<void>;
  addMessage: (message: GroupMessage) => void;
  leaveGroup: (groupId: string, userId: string) => Promise<void>;
  addMembers: (
    groupId: string,
    userIds: string[],
    invitedBy: string,
  ) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  updateGroup: (
    groupId: string,
    updates: Partial<Pick<Group, "name" | "description" | "avatar_url">>,
  ) => Promise<void>;
  sendGroupStreamRequest: (
    groupId: string,
    senderId: string,
    senderName: string,
  ) => Promise<void>;
}

export const useGroupChatStore = create<GroupChatState>((set, get) => ({
  groups: [],
  currentGroup: null,
  members: [],
  messages: [],
  isLoading: false,

  fetchGroups: async (userId) => {
    set({ isLoading: true });
    try {
      const { data: memberOf } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);

      if (!memberOf || memberOf.length === 0) {
        set({ groups: [], isLoading: false });
        return;
      }

      const groupIds = memberOf.map((m) => m.group_id);

      const { data: groups } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      set({ groups: (groups as Group[]) || [], isLoading: false });
    } catch {
      set({ groups: [], isLoading: false });
    }
  },

  fetchGroup: async (groupId) => {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .maybeSingle();

    if (data) set({ currentGroup: data as Group });
  },

  fetchMembers: async (groupId) => {
    const { data } = await supabase
      .from("group_members")
      .select("*, profile:profiles(*)")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });

    if (data) {
      const members = data.map((m: Record<string, unknown>) => ({
        ...m,
        profile: m.profile as Profile,
      })) as GroupMember[];
      set({ members });
    }
  },

  fetchMessages: async (groupId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from("group_messages")
      .select("*, sender:profiles!group_messages_sender_id_fkey(*)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      const messages = data.map((m: Record<string, unknown>) => ({
        ...m,
        sender: m.sender as Profile,
      })) as GroupMessage[];
      set({ messages, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  createGroup: async (name, description, createdBy, memberIds, avatarFile) => {
    try {
      // Enforce max 5 members (including admin)
      const MAX_GROUP_MEMBERS = 5;
      if (memberIds.length + 1 > MAX_GROUP_MEMBERS) {
        throw new Error(
          `Groups are limited to ${MAX_GROUP_MEMBERS} members including admin`,
        );
      }

      // Enforce 1MB image size limit
      const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
      if (avatarFile && avatarFile.size > MAX_FILE_SIZE) {
        throw new Error("Image must be less than 1MB");
      }

      // Upload avatar if provided
      let avatar_url: string | null = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const filePath = `group-avatars/${Date.now()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("connectlive")
          .upload(filePath, avatarFile);

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("connectlive")
            .getPublicUrl(filePath);
          avatar_url = urlData.publicUrl;
        }
      }

      // Use RPC to create group atomically (bypasses RLS)
      const { data: groupId, error } = await supabase.rpc(
        "create_group_with_members",
        {
          p_name: name,
          p_description: description || null,
          p_avatar_url: avatar_url,
          p_created_by: createdBy,
          p_member_ids: memberIds,
        },
      );

      if (error || !groupId) {
        console.error("create_group_with_members error:", error);
        return null;
      }

      // Notify all added members
      const notifications = memberIds.map((uid) => ({
        user_id: uid,
        from_user_id: createdBy,
        type: "system" as const,
        content: `You were added to group "${name}"`,
      }));
      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      return groupId as string;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create group";
      throw new Error(message);
    }
  },

  sendMessage: async (groupId, senderId, content, type = "text") => {
    const { data, error } = await supabase
      .from("group_messages")
      .insert({
        group_id: groupId,
        sender_id: senderId,
        content,
        type,
      })
      .select("*, sender:profiles!group_messages_sender_id_fkey(*)")
      .single();

    if (error) throw new Error(error.message);

    if (data) {
      const msg = {
        ...data,
        sender: data.sender as Profile,
      } as GroupMessage;
      get().addMessage(msg);

      // Update last_message_at
      await supabase
        .from("groups")
        .update({ last_message_at: msg.created_at })
        .eq("id", groupId);
    }
  },

  sendGroupImage: async (groupId, senderId, file) => {
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Image must be less than 1MB");
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `group-images/${groupId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("connectlive")
      .upload(filePath, file);

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from("connectlive")
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("group_messages")
      .insert({
        group_id: groupId,
        sender_id: senderId,
        content: "📷 Image",
        type: "image",
        media_url: urlData.publicUrl,
      })
      .select("*, sender:profiles!group_messages_sender_id_fkey(*)")
      .single();

    if (error) throw new Error(error.message);
    if (data) {
      const msg = { ...data, sender: data.sender as Profile } as GroupMessage;
      get().addMessage(msg);
      await supabase
        .from("groups")
        .update({ last_message_at: msg.created_at })
        .eq("id", groupId);
    }
  },

  addMessage: (message) => {
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    });
  },

  leaveGroup: async (groupId, userId) => {
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    const { data: group } = await supabase
      .from("groups")
      .select("member_count")
      .eq("id", groupId)
      .single();

    if (group) {
      const newCount = Math.max(0, (group.member_count || 1) - 1);
      if (newCount === 0) {
        await supabase.from("groups").delete().eq("id", groupId);
      } else {
        await supabase
          .from("groups")
          .update({ member_count: newCount })
          .eq("id", groupId);
      }
    }

    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    }));
  },

  removeMember: async (groupId, userId) => {
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    // Update member_count
    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    await supabase
      .from("groups")
      .update({ member_count: count || 0 })
      .eq("id", groupId);

    // Add system message
    const { data: removedProfile } = await supabase
      .from("profiles")
      .select("name, username")
      .eq("id", userId)
      .maybeSingle();

    await supabase.from("group_messages").insert({
      group_id: groupId,
      sender_id: userId,
      content: `${removedProfile?.name || removedProfile?.username || "User"} was removed from the group`,
      type: "system",
    });

    // Notify the removed user
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "system",
      content: `You were removed from a group`,
    });

    // Refresh members
    get().fetchMembers(groupId);
  },

  addMembers: async (groupId, userIds, invitedBy) => {
    // Enforce max 5 members
    const MAX_GROUP_MEMBERS = 5;
    const currentCount = get().members.length;
    if (currentCount + userIds.length > MAX_GROUP_MEMBERS) {
      throw new Error(
        `Groups are limited to ${MAX_GROUP_MEMBERS} members. You can add ${Math.max(0, MAX_GROUP_MEMBERS - currentCount)} more.`,
      );
    }

    const members = userIds.map((id) => ({
      group_id: groupId,
      user_id: id,
      role: "member" as const,
    }));

    await supabase.from("group_members").insert(members);

    // Update member_count
    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    await supabase
      .from("groups")
      .update({ member_count: count || 0 })
      .eq("id", groupId);

    // Get group name
    const group = get().currentGroup;

    // System message
    await supabase.from("group_messages").insert({
      group_id: groupId,
      sender_id: invitedBy,
      content: `${userIds.length} new member${userIds.length > 1 ? "s" : ""} added`,
      type: "system",
    });

    // Notify added members
    const notifications = userIds.map((uid) => ({
      user_id: uid,
      from_user_id: invitedBy,
      type: "system" as const,
      content: `You were added to group "${group?.name || "a group"}"`,
    }));
    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    get().fetchMembers(groupId);
  },

  updateGroup: async (groupId, updates) => {
    const { error } = await supabase
      .from("groups")
      .update(updates)
      .eq("id", groupId);

    if (!error) {
      set((state) => ({
        currentGroup: state.currentGroup
          ? { ...state.currentGroup, ...updates }
          : null,
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, ...updates } : g,
        ),
      }));
    }
  },

  sendGroupStreamRequest: async (groupId, senderId, senderName) => {
    // Get all members except sender
    const { data: membersData } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .neq("user_id", senderId);

    if (!membersData || membersData.length === 0) return;

    // Send notification to all group members
    const notifications = membersData.map((m) => ({
      user_id: m.user_id,
      from_user_id: senderId,
      type: "stream_request" as const,
      content: `${senderName} started a group stream! Join now.`,
    }));

    await supabase.from("notifications").insert(notifications);

    // System message in group
    await supabase.from("group_messages").insert({
      group_id: groupId,
      sender_id: senderId,
      content: `📹 ${senderName} started a group stream`,
      type: "system",
    });
  },
}));
