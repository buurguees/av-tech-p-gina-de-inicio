-- =====================================================
-- payroll_settings: configuración global nóminas
-- =====================================================
CREATE TABLE IF NOT EXISTS internal.payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'company',
  bonus_enabled BOOLEAN NOT NULL DEFAULT true,
  bonus_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (bonus_percent >= 0 AND bonus_percent <= 100),
  bonus_cap_amount NUMERIC(12,2) NOT NULL DEFAULT 600.00 CHECK (bonus_cap_amount >= 0),
  min_profit_to_pay_bonus NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (min_profit_to_pay_bonus >= 0),
  bonus_reference_mode TEXT NOT NULL DEFAULT 'NET_PROFIT_PREV_MONTH',
  bonus_requires_closed_period BOOLEAN NOT NULL DEFAULT false,
  default_irpf_rate NUMERIC(5,2) DEFAULT 19.00,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES internal.authorized_users(id)
);

COMMENT ON TABLE internal.payroll_settings IS 'Configuración global de nóminas y bonus socios';

-- =====================================================
-- payroll_settings_audit: trazabilidad
-- =====================================================
CREATE TABLE IF NOT EXISTS internal.payroll_settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID NOT NULL REFERENCES internal.payroll_settings(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES internal.authorized_users(id),
  old_values JSONB,
  new_values JSONB,
  reason TEXT
);

-- =====================================================
-- partner_payroll_profiles: ajustes por socio
-- =====================================================
CREATE TABLE IF NOT EXISTS internal.partner_payroll_profiles (
  partner_id UUID PRIMARY KEY REFERENCES internal.partners(id),
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  irpf_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00 CHECK (irpf_rate >= 0 AND irpf_rate <= 100),
  bonus_enabled_override BOOLEAN,
  bonus_cap_override NUMERIC(12,2) CHECK (bonus_cap_override IS NULL OR bonus_cap_override >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES internal.authorized_users(id)
);

COMMENT ON TABLE internal.partner_payroll_profiles IS 'Perfil nómina por socio (base, IRPF, overrides bonus)';

-- =====================================================
-- Seed: 1 fila inicial (solo si tabla vacía)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM internal.payroll_settings LIMIT 1) THEN
    INSERT INTO internal.payroll_settings (
      scope, bonus_enabled, bonus_percent, bonus_cap_amount,
      min_profit_to_pay_bonus, bonus_reference_mode, bonus_requires_closed_period,
      default_irpf_rate, version
    )
    VALUES (
      'company', true, 10.00, 600.00,
      0.00, 'NET_PROFIT_PREV_MONTH', false,
      19.00, 1
    );
  END IF;
END $$;

-- =====================================================
-- RLS: SELECT permitido, UPDATE/INSERT bloqueado
-- =====================================================
ALTER TABLE internal.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.payroll_settings_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.partner_payroll_profiles ENABLE ROW LEVEL SECURITY;

-- payroll_settings: SELECT para usuarios autenticados
DROP POLICY IF EXISTS payroll_settings_select ON internal.payroll_settings;
CREATE POLICY payroll_settings_select ON internal.payroll_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- payroll_settings: no permitir UPDATE/INSERT directo (solo vía RPC)
DROP POLICY IF EXISTS payroll_settings_update ON internal.payroll_settings;
-- No crear policy de UPDATE - bloquea updates directos

-- payroll_settings_audit: solo lectura
DROP POLICY IF EXISTS payroll_settings_audit_select ON internal.payroll_settings_audit;
CREATE POLICY payroll_settings_audit_select ON internal.payroll_settings_audit
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- partner_payroll_profiles: SELECT para autenticados
DROP POLICY IF EXISTS partner_payroll_profiles_select ON internal.partner_payroll_profiles;
CREATE POLICY partner_payroll_profiles_select ON internal.partner_payroll_profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
