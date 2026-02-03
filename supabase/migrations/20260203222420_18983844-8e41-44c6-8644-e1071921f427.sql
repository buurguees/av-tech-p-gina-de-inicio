-- =====================================================
-- FIX: scanned_documents RLS policies
-- Problem: Current policies are overly permissive (USING true)
-- Solution: Add ownership-based access control
-- =====================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view scanned documents" ON public.scanned_documents;
DROP POLICY IF EXISTS "Users can insert scanned documents" ON public.scanned_documents;
DROP POLICY IF EXISTS "Users can update scanned documents" ON public.scanned_documents;
DROP POLICY IF EXISTS "Users can delete non-assigned scanned documents" ON public.scanned_documents;

-- Create secure owner-based SELECT policy
-- Users see their own documents; admins/managers see all
CREATE POLICY "Users can view own documents or all if admin/manager"
ON public.scanned_documents FOR SELECT
TO authenticated
USING (
  created_by = internal.get_authorized_user_id(auth.uid()) OR
  internal.is_admin() OR
  internal.is_manager()
);

-- Create secure INSERT policy
-- Users can only insert documents attributed to themselves
CREATE POLICY "Users can insert own documents"
ON public.scanned_documents FOR INSERT
TO authenticated
WITH CHECK (
  created_by IS NULL OR 
  created_by = internal.get_authorized_user_id(auth.uid())
);

-- Create secure UPDATE policy
-- Users can update their own unassigned documents; admins can update any
CREATE POLICY "Users can update own unassigned documents or admins update any"
ON public.scanned_documents FOR UPDATE
TO authenticated
USING (
  (created_by = internal.get_authorized_user_id(auth.uid()) AND status = 'UNASSIGNED') OR
  internal.is_admin()
);

-- Create secure DELETE policy
-- Users can delete their own unassigned documents; admins can delete any non-assigned
CREATE POLICY "Users can delete own unassigned documents or admins delete any"
ON public.scanned_documents FOR DELETE
TO authenticated
USING (
  (created_by = internal.get_authorized_user_id(auth.uid()) AND status <> 'ASSIGNED') OR
  internal.is_admin()
);