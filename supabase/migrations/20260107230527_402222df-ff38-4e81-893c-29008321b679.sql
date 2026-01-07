
-- =====================================================
-- CONSOLIDACIÓN DE POLÍTICAS RLS EN user_roles
-- Objetivo: Eliminar políticas duplicadas y conflictivas
-- =====================================================

-- 1. Eliminar TODAS las políticas existentes en user_roles
DROP POLICY IF EXISTS "Admin can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin and managers can view role assignments" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can manage role assignments" ON public.user_roles;
DROP POLICY IF EXISTS "User can view own roles" ON public.user_roles;

-- 2. Crear políticas consolidadas usando SOLO la función has_role()
-- Esta función ya existe y es SECURITY DEFINER con search_path configurado

-- Política 1: Usuarios pueden ver sus propios roles
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política 2: Admins pueden ver todos los roles
CREATE POLICY "user_roles_select_admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Política 3: Admins pueden insertar roles
CREATE POLICY "user_roles_insert_admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Política 4: Admins pueden actualizar roles
CREATE POLICY "user_roles_update_admin"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Política 5: Admins pueden eliminar roles
CREATE POLICY "user_roles_delete_admin"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Arreglar la función update_updated_at_column para incluir search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. Verificar que RLS está habilitado
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Forzar RLS para el owner de la tabla también
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
