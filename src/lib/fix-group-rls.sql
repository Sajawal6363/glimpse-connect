-- FIX: Infinite recursion in group_members RLS policy (error 42P17)
-- The SELECT policy on group_members references itself causing infinite recursion.
-- Solution: Use SECURITY DEFINER functions to check membership without triggering RLS.
-- Also adds a create_group_with_members RPC that bypasses RLS for atomic group creation.
-- Run this ENTIRE script in your Supabase SQL Editor.

-- ============================================================
-- Step 1: Create helper functions (SECURITY DEFINER bypasses RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION is_group_member(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = gid AND user_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION is_group_admin(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = gid AND user_id = uid AND role = 'admin'
  );
$$;

-- ============================================================
-- Step 2: Create RPC for atomic group creation (bypasses RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION create_group_with_members(
  p_name text,
  p_description text,
  p_avatar_url text,
  p_created_by uuid,
  p_member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_member_id uuid;
BEGIN
  -- Verify the caller is the creator
  IF auth.uid() IS DISTINCT FROM p_created_by THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Insert the group
  INSERT INTO groups (name, description, avatar_url, created_by, member_count)
  VALUES (p_name, p_description, p_avatar_url, p_created_by, array_length(p_member_ids, 1) + 1)
  RETURNING id INTO v_group_id;

  -- Insert creator as admin
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, p_created_by, 'admin');

  -- Insert each member
  FOREACH v_member_id IN ARRAY p_member_ids LOOP
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_group_id, v_member_id, 'member');
  END LOOP;

  -- System message
  INSERT INTO group_messages (group_id, sender_id, content, type)
  VALUES (v_group_id, p_created_by, 'Group created', 'system');

  RETURN v_group_id;
END;
$$;

-- ============================================================
-- Step 3: Drop ALL old policies that cause recursion
-- ============================================================

DROP POLICY IF EXISTS "Members can view group members" ON group_members;
DROP POLICY IF EXISTS "Group admins can insert members" ON group_members;
DROP POLICY IF EXISTS "Admins or self can insert members" ON group_members;
DROP POLICY IF EXISTS "Members can leave (delete themselves)" ON group_members;
DROP POLICY IF EXISTS "Members can leave or admins can remove" ON group_members;

DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
DROP POLICY IF EXISTS "Group admins can delete groups" ON groups;

DROP POLICY IF EXISTS "Members can view group messages" ON group_messages;
DROP POLICY IF EXISTS "Members can send group messages" ON group_messages;

-- ============================================================
-- Step 4: Recreate all policies using helper functions (no recursion!)
-- ============================================================

-- group_members policies
CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Admins or self can insert members" ON group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Members can leave or admins can remove" ON group_members
  FOR DELETE USING (
    user_id = auth.uid() OR is_group_admin(group_id, auth.uid())
  );

-- groups policies
CREATE POLICY "Users can view groups they are members of" ON groups
  FOR SELECT USING (is_group_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" ON groups
  FOR UPDATE USING (is_group_admin(id, auth.uid()));

CREATE POLICY "Group admins can delete groups" ON groups
  FOR DELETE USING (is_group_admin(id, auth.uid()));

-- group_messages policies
CREATE POLICY "Members can view group messages" ON group_messages
  FOR SELECT USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can send group messages" ON group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND is_group_member(group_id, auth.uid())
  );
