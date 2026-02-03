-- =====================================================
-- RPCs para partner_payroll_profiles
-- list_partner_payroll_profiles: listar socios con su perfil nómina
-- admin_upsert_partner_payroll_profile: crear/actualizar perfil por socio (solo admin)
-- =====================================================

-- 1. list_partner_payroll_profiles
CREATE OR REPLACE FUNCTION internal.list_partner_payroll_profiles(
  p_status TEXT DEFAULT 'ACTIVE'
)
RETURNS TABLE(
  partner_id UUID,
  partner_number TEXT,
  partner_name TEXT,
  base_salary NUMERIC,
  irpf_rate NUMERIC,
  bonus_enabled_override BOOLEAN,
  bonus_cap_override NUMERIC,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'internal'
AS $$
  SELECT
    p.id AS partner_id,
    p.partner_number,
    p.full_name AS partner_name,
    COALESCE(ppp.base_salary, 0) AS base_salary,
    COALESCE(ppp.irpf_rate, 19) AS irpf_rate,
    ppp.bonus_enabled_override,
    ppp.bonus_cap_override,
    ppp.updated_at
  FROM internal.partners p
  LEFT JOIN internal.partner_payroll_profiles ppp ON ppp.partner_id = p.id
  WHERE (p_status IS NULL OR p.status = p_status)
  ORDER BY p.partner_number;
$$;

CREATE OR REPLACE FUNCTION public.list_partner_payroll_profiles(
  p_status TEXT DEFAULT 'ACTIVE'
)
RETURNS TABLE(
  partner_id UUID,
  partner_number TEXT,
  partner_name TEXT,
  base_salary NUMERIC,
  irpf_rate NUMERIC,
  bonus_enabled_override BOOLEAN,
  bonus_cap_override NUMERIC,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM internal.list_partner_payroll_profiles(p_status);
$$;

-- 2. admin_upsert_partner_payroll_profile (solo admin)
CREATE OR REPLACE FUNCTION internal.admin_upsert_partner_payroll_profile(
  p_partner_id UUID,
  p_base_salary NUMERIC DEFAULT NULL,
  p_irpf_rate NUMERIC DEFAULT NULL,
  p_bonus_enabled_override BOOLEAN DEFAULT NULL,
  p_bonus_cap_override NUMERIC DEFAULT NULL
)
RETURNS internal.partner_payroll_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'internal'
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_result RECORD;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar perfiles de nómina';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM internal.partners WHERE id = p_partner_id) THEN
    RAISE EXCEPTION 'Socio no encontrado';
  END IF;

  IF p_base_salary IS NOT NULL AND p_base_salary < 0 THEN
    RAISE EXCEPTION 'base_salary debe ser >= 0';
  END IF;
  IF p_irpf_rate IS NOT NULL AND (p_irpf_rate < 0 OR p_irpf_rate > 100) THEN
    RAISE EXCEPTION 'irpf_rate debe estar entre 0 y 100';
  END IF;
  IF p_bonus_cap_override IS NOT NULL AND p_bonus_cap_override < 0 THEN
    RAISE EXCEPTION 'bonus_cap_override debe ser >= 0';
  END IF;

  INSERT INTO internal.partner_payroll_profiles (
    partner_id, base_salary, irpf_rate, bonus_enabled_override, bonus_cap_override, updated_by
  )
  VALUES (
    p_partner_id,
    COALESCE(p_base_salary, 0),
    COALESCE(p_irpf_rate, 19),
    p_bonus_enabled_override,
    p_bonus_cap_override,
    v_user_id
  )
  ON CONFLICT (partner_id) DO UPDATE SET
    base_salary = CASE WHEN p_base_salary IS NOT NULL THEN p_base_salary ELSE partner_payroll_profiles.base_salary END,
    irpf_rate = CASE WHEN p_irpf_rate IS NOT NULL THEN p_irpf_rate ELSE partner_payroll_profiles.irpf_rate END,
    bonus_enabled_override = CASE WHEN p_bonus_enabled_override IS NOT NULL THEN p_bonus_enabled_override ELSE partner_payroll_profiles.bonus_enabled_override END,
    bonus_cap_override = CASE WHEN p_bonus_cap_override IS NOT NULL THEN p_bonus_cap_override ELSE partner_payroll_profiles.bonus_cap_override END,
    updated_at = now(),
    updated_by = v_user_id;

  SELECT * INTO v_result FROM internal.partner_payroll_profiles WHERE partner_id = p_partner_id;
  RETURN v_result;
END;
$$;

-- Permitir NULL en partner_payroll_profiles para bonus_enabled_override y bonus_cap_override
-- (la tabla ya lo permite)

-- Wrapper público
CREATE OR REPLACE FUNCTION public.admin_upsert_partner_payroll_profile(
  p_partner_id UUID,
  p_base_salary NUMERIC DEFAULT NULL,
  p_irpf_rate NUMERIC DEFAULT NULL,
  p_bonus_enabled_override BOOLEAN DEFAULT NULL,
  p_bonus_cap_override NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT to_jsonb(internal.admin_upsert_partner_payroll_profile(
    p_partner_id, p_base_salary, p_irpf_rate, p_bonus_enabled_override, p_bonus_cap_override
  ));
$$;
