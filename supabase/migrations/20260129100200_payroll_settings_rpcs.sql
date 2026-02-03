-- =====================================================
-- get_payroll_settings
-- =====================================================
CREATE OR REPLACE FUNCTION internal.get_payroll_settings()
RETURNS TABLE(
  id UUID,
  scope TEXT,
  bonus_enabled BOOLEAN,
  bonus_percent NUMERIC,
  bonus_cap_amount NUMERIC,
  min_profit_to_pay_bonus NUMERIC,
  bonus_reference_mode TEXT,
  bonus_requires_closed_period BOOLEAN,
  default_irpf_rate NUMERIC,
  version INTEGER,
  updated_at TIMESTAMPTZ,
  updated_by UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'internal'
AS $$
  SELECT id, scope, bonus_enabled, bonus_percent, bonus_cap_amount,
    min_profit_to_pay_bonus, bonus_reference_mode, bonus_requires_closed_period,
    default_irpf_rate, version, updated_at, updated_by
  FROM internal.payroll_settings
  ORDER BY updated_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_payroll_settings()
RETURNS TABLE(
  id UUID,
  scope TEXT,
  bonus_enabled BOOLEAN,
  bonus_percent NUMERIC,
  bonus_cap_amount NUMERIC,
  min_profit_to_pay_bonus NUMERIC,
  bonus_reference_mode TEXT,
  bonus_requires_closed_period BOOLEAN,
  default_irpf_rate NUMERIC,
  version INTEGER,
  updated_at TIMESTAMPTZ,
  updated_by UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM internal.get_payroll_settings();
$$;

-- =====================================================
-- admin_update_payroll_settings (solo admin)
-- =====================================================
CREATE OR REPLACE FUNCTION internal.admin_update_payroll_settings(
  p_patch JSONB,
  p_reason TEXT
)
RETURNS internal.payroll_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'internal'
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_settings RECORD;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  -- Verificar que sea admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    WHERE u.id = auth.uid() AND ur.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar la configuración de nóminas';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'El motivo (reason) es obligatorio';
  END IF;

  -- Validar rangos en patch
  IF (p_patch->>'bonus_percent') IS NOT NULL THEN
    IF (p_patch->>'bonus_percent')::NUMERIC < 0 OR (p_patch->>'bonus_percent')::NUMERIC > 100 THEN
      RAISE EXCEPTION 'bonus_percent debe estar entre 0 y 100';
    END IF;
  END IF;
  IF (p_patch->>'bonus_cap_amount') IS NOT NULL THEN
    IF (p_patch->>'bonus_cap_amount')::NUMERIC < 0 THEN
      RAISE EXCEPTION 'bonus_cap_amount debe ser >= 0';
    END IF;
  END IF;
  IF (p_patch->>'min_profit_to_pay_bonus') IS NOT NULL THEN
    IF (p_patch->>'min_profit_to_pay_bonus')::NUMERIC < 0 THEN
      RAISE EXCEPTION 'min_profit_to_pay_bonus debe ser >= 0';
    END IF;
  END IF;

  SELECT * INTO v_settings FROM internal.payroll_settings ORDER BY updated_at DESC LIMIT 1;
  IF v_settings.id IS NULL THEN
    RAISE EXCEPTION 'No existe configuración de nóminas';
  END IF;

  v_old_values := to_jsonb(v_settings);

  UPDATE internal.payroll_settings
  SET
    bonus_enabled = COALESCE((p_patch->>'bonus_enabled')::BOOLEAN, bonus_enabled),
    bonus_percent = COALESCE((p_patch->>'bonus_percent')::NUMERIC, bonus_percent),
    bonus_cap_amount = COALESCE((p_patch->>'bonus_cap_amount')::NUMERIC, bonus_cap_amount),
    min_profit_to_pay_bonus = COALESCE((p_patch->>'min_profit_to_pay_bonus')::NUMERIC, min_profit_to_pay_bonus),
    bonus_reference_mode = COALESCE(p_patch->>'bonus_reference_mode', bonus_reference_mode),
    bonus_requires_closed_period = COALESCE((p_patch->>'bonus_requires_closed_period')::BOOLEAN, bonus_requires_closed_period),
    default_irpf_rate = COALESCE((p_patch->>'default_irpf_rate')::NUMERIC, default_irpf_rate),
    version = version + 1,
    updated_at = now(),
    updated_by = v_user_id
  WHERE id = v_settings.id;

  SELECT * INTO v_settings FROM internal.payroll_settings WHERE id = v_settings.id;
  v_new_values := to_jsonb(v_settings);

  INSERT INTO internal.payroll_settings_audit (settings_id, changed_by, old_values, new_values, reason)
  VALUES (v_settings.id, v_user_id, v_old_values, v_new_values, p_reason);

  RETURN v_settings;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_payroll_settings(
  p_patch JSONB,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT to_jsonb(internal.admin_update_payroll_settings(p_patch, p_reason));
$$;
