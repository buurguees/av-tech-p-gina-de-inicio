-- ============================================
-- MÓDULO DE NÓMINAS Y RETRIBUCIONES
-- ============================================

-- 1. TABLA: Empleados (si no existe, crear estructura mínima)
CREATE TABLE IF NOT EXISTS internal.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT UNIQUE NOT NULL,  -- EMP-00001
  full_name TEXT NOT NULL,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA: Socios/Administradores (si no existe)
CREATE TABLE IF NOT EXISTS internal.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_number TEXT UNIQUE NOT NULL,  -- SOC-00001
  full_name TEXT NOT NULL,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA: Nóminas de empleados
CREATE TABLE accounting.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_number TEXT UNIQUE NOT NULL,  -- NOM-YYYYMM-XXXX
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  employee_id UUID NOT NULL REFERENCES internal.employees(id),
  gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount >= 0),
  irpf_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00 CHECK (irpf_rate >= 0 AND irpf_rate <= 100),
  irpf_amount NUMERIC(12,2) NOT NULL CHECK (irpf_amount >= 0),
  net_amount NUMERIC(12,2) NOT NULL CHECK (net_amount >= 0),
  ss_employee NUMERIC(12,2) DEFAULT 0 CHECK (ss_employee >= 0),  -- Preparado para futuro
  ss_company NUMERIC(12,2) DEFAULT 0 CHECK (ss_company >= 0),  -- Preparado para futuro
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'PAID', 'CANCELLED')),
  journal_entry_id UUID REFERENCES accounting.journal_entries(id),
  notes TEXT,
  created_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_payroll_amounts CHECK (net_amount = gross_amount - irpf_amount - COALESCE(ss_employee, 0))
);

-- 4. TABLA: Retribuciones de socios/administradores
CREATE TABLE accounting.partner_compensation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compensation_number TEXT UNIQUE NOT NULL,  -- RET-YYYYMM-XXXX
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  partner_id UUID NOT NULL REFERENCES internal.partners(id),
  gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount >= 0),
  irpf_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00 CHECK (irpf_rate >= 0 AND irpf_rate <= 100),
  irpf_amount NUMERIC(12,2) NOT NULL CHECK (irpf_amount >= 0),
  net_amount NUMERIC(12,2) NOT NULL CHECK (net_amount >= 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'PAID', 'CANCELLED')),
  journal_entry_id UUID REFERENCES accounting.journal_entries(id),
  notes TEXT,
  created_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_compensation_amounts CHECK (net_amount = gross_amount - irpf_amount)
);

-- 5. TABLA: Pagos de nóminas y retribuciones
CREATE TABLE accounting.payroll_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,  -- PAG-NOM-YYYYMMDD-XXXX
  payroll_run_id UUID REFERENCES accounting.payroll_runs(id),
  partner_compensation_run_id UUID REFERENCES accounting.partner_compensation_runs(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'TRANSFER' CHECK (payment_method IN ('TRANSFER', 'CASH', 'CHECK')),
  bank_reference TEXT,
  journal_entry_id UUID REFERENCES accounting.journal_entries(id),
  notes TEXT,
  created_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_payment_source CHECK (
    (payroll_run_id IS NOT NULL AND partner_compensation_run_id IS NULL) OR
    (payroll_run_id IS NULL AND partner_compensation_run_id IS NOT NULL)
  )
);

-- Índices
CREATE INDEX idx_payroll_runs_period ON accounting.payroll_runs(period_year, period_month);
CREATE INDEX idx_payroll_runs_employee ON accounting.payroll_runs(employee_id);
CREATE INDEX idx_payroll_runs_status ON accounting.payroll_runs(status);
CREATE INDEX idx_payroll_runs_entry ON accounting.payroll_runs(journal_entry_id);

CREATE INDEX idx_partner_compensation_period ON accounting.partner_compensation_runs(period_year, period_month);
CREATE INDEX idx_partner_compensation_partner ON accounting.partner_compensation_runs(partner_id);
CREATE INDEX idx_partner_compensation_status ON accounting.partner_compensation_runs(status);
CREATE INDEX idx_partner_compensation_entry ON accounting.partner_compensation_runs(journal_entry_id);

CREATE INDEX idx_payroll_payments_payroll ON accounting.payroll_payments(payroll_run_id);
CREATE INDEX idx_payroll_payments_partner ON accounting.payroll_payments(partner_compensation_run_id);
CREATE INDEX idx_payroll_payments_date ON accounting.payroll_payments(payment_date);
CREATE INDEX idx_payroll_payments_entry ON accounting.payroll_payments(journal_entry_id);

-- Índices únicos parciales para evitar duplicados
CREATE UNIQUE INDEX idx_payroll_runs_unique_period 
  ON accounting.payroll_runs(period_year, period_month, employee_id) 
  WHERE status != 'CANCELLED';

CREATE UNIQUE INDEX idx_partner_compensation_runs_unique_period 
  ON accounting.partner_compensation_runs(period_year, period_month, partner_id) 
  WHERE status != 'CANCELLED';

-- 6. FUNCIÓN: Generar número de nómina
CREATE OR REPLACE FUNCTION accounting.get_next_payroll_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_number INTEGER;
  v_payroll_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(payroll_number FROM 13 FOR 4) AS INTEGER)), 0) + 1
  INTO v_number
  FROM accounting.payroll_runs
  WHERE payroll_number LIKE 'NOM-' || v_year || LPAD(v_month::TEXT, 2, '0') || '-%';
  
  v_payroll_number := 'NOM-' || v_year || LPAD(v_month::TEXT, 2, '0') || '-' || LPAD(v_number::TEXT, 4, '0');
  
  RETURN v_payroll_number;
END;
$$;

-- 7. FUNCIÓN: Generar número de retribución
CREATE OR REPLACE FUNCTION accounting.get_next_compensation_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_number INTEGER;
  v_compensation_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(compensation_number FROM 13 FOR 4) AS INTEGER)), 0) + 1
  INTO v_number
  FROM accounting.partner_compensation_runs
  WHERE compensation_number LIKE 'RET-' || v_year || LPAD(v_month::TEXT, 2, '0') || '-%';
  
  v_compensation_number := 'RET-' || v_year || LPAD(v_month::TEXT, 2, '0') || '-' || LPAD(v_number::TEXT, 4, '0');
  
  RETURN v_compensation_number;
END;
$$;

-- 8. TRIGGER: Actualizar updated_at
CREATE TRIGGER update_payroll_runs_updated_at
  BEFORE UPDATE ON accounting.payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION accounting.update_updated_at_column();

CREATE TRIGGER update_partner_compensation_runs_updated_at
  BEFORE UPDATE ON accounting.partner_compensation_runs
  FOR EACH ROW
  EXECUTE FUNCTION accounting.update_updated_at_column();

CREATE TRIGGER update_payroll_payments_updated_at
  BEFORE UPDATE ON accounting.payroll_payments
  FOR EACH ROW
  EXECUTE FUNCTION accounting.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON internal.employees
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON internal.partners
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

-- 9. HABILITAR RLS
ALTER TABLE accounting.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting.partner_compensation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting.payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.partners ENABLE ROW LEVEL SECURITY;

-- 10. POLÍTICAS RLS: Solo admins
CREATE POLICY "Admin can view payroll runs"
  ON accounting.payroll_runs
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage payroll runs"
  ON accounting.payroll_runs
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can view partner compensations"
  ON accounting.partner_compensation_runs
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage partner compensations"
  ON accounting.partner_compensation_runs
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can view payroll payments"
  ON accounting.payroll_payments
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage payroll payments"
  ON accounting.payroll_payments
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can view employees"
  ON internal.employees
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage employees"
  ON internal.employees
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can view partners"
  ON internal.partners
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage partners"
  ON internal.partners
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- Comentarios
COMMENT ON TABLE accounting.payroll_runs IS 'Nóminas de empleados con generación automática de asientos contables';
COMMENT ON TABLE accounting.partner_compensation_runs IS 'Retribuciones de socios/administradores con generación automática de asientos contables';
COMMENT ON TABLE accounting.payroll_payments IS 'Pagos de nóminas y retribuciones con generación automática de asientos contables';
