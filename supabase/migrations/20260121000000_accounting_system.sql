-- ============================================
-- SISTEMA CONTABLE INTERNO
-- Gestión de terceros, impuestos e informes
-- ============================================

-- 1. CREAR SCHEMA ACCOUNTING
CREATE SCHEMA IF NOT EXISTS accounting;

-- 2. ENUM PARA TIPOS DE TERCEROS
CREATE TYPE accounting.third_party_type AS ENUM ('CLIENT', 'SUPPLIER', 'TECHNICIAN');

-- 3. ENUM PARA TIPOS DE ASIENTO
CREATE TYPE accounting.journal_entry_type AS ENUM (
  'INVOICE_SALE',      -- Factura emitida a cliente
  'INVOICE_PURCHASE',  -- Factura recibida de proveedor/técnico
  'PAYMENT_RECEIVED',  -- Pago recibido de cliente
  'PAYMENT_MADE',      -- Pago realizado a proveedor/técnico
  'TAX_SETTLEMENT',    -- Liquidación de impuestos
  'TAX_PROVISION',     -- Provisión de impuestos (IS)
  'MANUAL',            -- Asiento manual
  'ADJUSTMENT'         -- Ajuste contable
);

-- 4. TABLA: PLAN DE CUENTAS
CREATE TABLE accounting.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT UNIQUE NOT NULL,  -- 430000, 400000, 410000, etc.
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'TAX')),
  parent_account_code TEXT,  -- Para jerarquías (opcional)
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  FOREIGN KEY (parent_account_code) REFERENCES accounting.chart_of_accounts(account_code)
);

-- Índices
CREATE INDEX idx_chart_of_accounts_code ON accounting.chart_of_accounts(account_code);
CREATE INDEX idx_chart_of_accounts_type ON accounting.chart_of_accounts(account_type);
CREATE INDEX idx_chart_of_accounts_active ON accounting.chart_of_accounts(is_active) WHERE is_active = true;

-- 5. TABLA: ASIENTOS CONTABLES
CREATE TABLE accounting.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT UNIQUE NOT NULL,  -- AS-YYYYMMDD-XXXX
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type accounting.journal_entry_type NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,  -- ID de factura, pago, etc. que originó el asiento
  reference_type TEXT,  -- 'invoice', 'payment', 'tax_settlement', etc.
  project_id UUID REFERENCES projects.projects(id),
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  created_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_balanced_entry CHECK (
    (SELECT COALESCE(SUM(CASE WHEN debit_credit = 'DEBIT' THEN amount ELSE -amount END), 0) 
     FROM accounting.journal_entry_lines 
     WHERE journal_entry_id = id) = 0
  )
);

-- Índices
CREATE INDEX idx_journal_entries_date ON accounting.journal_entries(entry_date DESC);
CREATE INDEX idx_journal_entries_type ON accounting.journal_entries(entry_type);
CREATE INDEX idx_journal_entries_reference ON accounting.journal_entries(reference_type, reference_id);
CREATE INDEX idx_journal_entries_project ON accounting.journal_entries(project_id);
CREATE INDEX idx_journal_entries_number ON accounting.journal_entries(entry_number);

-- 6. TABLA: LÍNEAS DE ASIENTO (DEBE/HABER)
CREATE TABLE accounting.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES accounting.journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL REFERENCES accounting.chart_of_accounts(account_code),
  debit_credit TEXT NOT NULL CHECK (debit_credit IN ('DEBIT', 'CREDIT')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  third_party_id UUID,  -- ID del tercero (cliente, proveedor, técnico)
  third_party_type accounting.third_party_type,  -- Tipo de tercero
  description TEXT,
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_third_party_consistency CHECK (
    (third_party_id IS NULL AND third_party_type IS NULL) OR
    (third_party_id IS NOT NULL AND third_party_type IS NOT NULL)
  )
);

-- Índices
CREATE INDEX idx_journal_entry_lines_entry ON accounting.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON accounting.journal_entry_lines(account_code);
CREATE INDEX idx_journal_entry_lines_third_party ON accounting.journal_entry_lines(third_party_id, third_party_type);
CREATE INDEX idx_journal_entry_lines_date ON accounting.journal_entry_lines(created_at DESC);

-- 7. TABLA: CONFIGURACIÓN DE IMPUESTOS
CREATE TABLE accounting.tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_code TEXT UNIQUE NOT NULL,  -- 'IVA_21', 'IVA_10', 'IVA_4', 'IRPF_15', 'IS'
  tax_name TEXT NOT NULL,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('IVA', 'IRPF', 'IS')),
  account_code_debit TEXT REFERENCES accounting.chart_of_accounts(account_code),  -- Cuenta deudora
  account_code_credit TEXT REFERENCES accounting.chart_of_accounts(account_code),  -- Cuenta acreedora
  default_rate NUMERIC(5,2) NOT NULL,  -- Porcentaje por defecto (21, 10, 4, 15, 25)
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_tax_config_code ON accounting.tax_config(tax_code);
CREATE INDEX idx_tax_config_type ON accounting.tax_config(tax_type);
CREATE INDEX idx_tax_config_active ON accounting.tax_config(is_active) WHERE is_active = true;

-- 8. TABLA: SALDOS CONTABLES POR CUENTA Y TERCERO
CREATE TABLE accounting.account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL REFERENCES accounting.chart_of_accounts(account_code),
  third_party_id UUID,
  third_party_type accounting.third_party_type,
  balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  debit_balance NUMERIC(12,2) DEFAULT 0,
  credit_balance NUMERIC(12,2) DEFAULT 0,
  net_balance NUMERIC(12,2) GENERATED ALWAYS AS (debit_balance - credit_balance) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(account_code, third_party_id, third_party_type, balance_date)
);

-- Índices
CREATE INDEX idx_account_balances_account ON accounting.account_balances(account_code, balance_date DESC);
CREATE INDEX idx_account_balances_third_party ON accounting.account_balances(third_party_id, third_party_type, balance_date DESC);
CREATE INDEX idx_account_balances_date ON accounting.account_balances(balance_date DESC);

-- 9. INSERTAR CUENTAS CONTABLES BÁSICAS
INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, description) VALUES
  -- ACTIVO
  ('430000', 'Clientes', 'ASSET', 'Cuenta de clientes - Facturas emitidas pendientes de cobro'),
  ('572000', 'Banco', 'ASSET', 'Cuenta bancaria principal'),
  
  -- PASIVO
  ('400000', 'Proveedores', 'LIABILITY', 'Cuenta de proveedores - Facturas recibidas pendientes de pago'),
  ('410000', 'Acreedores por servicios', 'LIABILITY', 'Cuenta de técnicos/autónomos - Facturas recibidas pendientes de pago'),
  ('475100', 'HP retenciones IRPF profesionales', 'LIABILITY', 'Retenciones IRPF aplicadas a profesionales'),
  ('475200', 'HP acreedora por IS', 'LIABILITY', 'Impuesto de Sociedades a pagar'),
  
  -- INGRESOS
  ('700000', 'Ventas', 'REVENUE', 'Ingresos por ventas de servicios'),
  
  -- GASTOS
  ('623000', 'Servicios profesionales', 'EXPENSE', 'Gastos en servicios de profesionales/técnicos'),
  
  -- IMPUESTOS
  ('472000', 'IVA soportado', 'TAX', 'IVA soportado en compras'),
  ('477000', 'IVA repercutido', 'TAX', 'IVA repercutido en ventas'),
  ('630000', 'Impuesto sobre beneficios', 'EXPENSE', 'Gasto por Impuesto de Sociedades')
ON CONFLICT (account_code) DO NOTHING;

-- 10. INSERTAR CONFIGURACIÓN DE IMPUESTOS
INSERT INTO accounting.tax_config (tax_code, tax_name, tax_type, account_code_debit, account_code_credit, default_rate, description) VALUES
  ('IVA_21', 'IVA 21%', 'IVA', '472000', '477000', 21.00, 'IVA general al 21%'),
  ('IVA_10', 'IVA 10%', 'IVA', '472000', '477000', 10.00, 'IVA reducido al 10%'),
  ('IVA_4', 'IVA 4%', 'IVA', '472000', '477000', 4.00, 'IVA superreducido al 4%'),
  ('IRPF_15', 'IRPF 15%', 'IRPF', '475100', '475100', 15.00, 'Retención IRPF al 15% para profesionales'),
  ('IS_25', 'Impuesto de Sociedades 25%', 'IS', '630000', '475200', 25.00, 'Impuesto de Sociedades tipo general 25%')
ON CONFLICT (tax_code) DO NOTHING;

-- 11. FUNCIÓN: Generar número de asiento
CREATE OR REPLACE FUNCTION accounting.get_next_entry_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INTEGER;
  v_number INTEGER;
  v_entry_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Obtener último número del año
  SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 8 FOR 4) AS INTEGER)), 0) + 1
  INTO v_number
  FROM accounting.journal_entries
  WHERE entry_number LIKE 'AS-' || v_year || '%';
  
  v_entry_number := 'AS-' || v_year || '-' || LPAD(v_number::TEXT, 4, '0');
  
  RETURN v_entry_number;
END;
$$;

-- 12. FUNCIÓN: Obtener cuenta contable por tipo de tercero
CREATE OR REPLACE FUNCTION accounting.get_account_by_third_party_type(
  p_third_party_type accounting.third_party_type
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  CASE p_third_party_type
    WHEN 'CLIENT' THEN
      RETURN '430000';
    WHEN 'SUPPLIER' THEN
      RETURN '400000';
    WHEN 'TECHNICIAN' THEN
      RETURN '410000';
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;

-- 13. TRIGGER: Actualizar updated_at
CREATE OR REPLACE FUNCTION accounting.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chart_of_accounts_updated_at
  BEFORE UPDATE ON accounting.chart_of_accounts
  FOR EACH ROW
  EXECUTE FUNCTION accounting.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON accounting.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION accounting.update_updated_at_column();

CREATE TRIGGER update_tax_config_updated_at
  BEFORE UPDATE ON accounting.tax_config
  FOR EACH ROW
  EXECUTE FUNCTION accounting.update_updated_at_column();

CREATE TRIGGER update_account_balances_updated_at
  BEFORE UPDATE ON accounting.account_balances
  FOR EACH ROW
  EXECUTE FUNCTION accounting.update_updated_at_column();

-- 14. HABILITAR RLS
ALTER TABLE accounting.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting.tax_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting.account_balances ENABLE ROW LEVEL SECURITY;

-- 15. POLÍTICAS RLS: Solo admins pueden ver y gestionar contabilidad
CREATE POLICY "Admin can view chart of accounts"
  ON accounting.chart_of_accounts
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage chart of accounts"
  ON accounting.chart_of_accounts
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can view journal entries"
  ON accounting.journal_entries
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage journal entries"
  ON accounting.journal_entries
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can view journal entry lines"
  ON accounting.journal_entry_lines
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage journal entry lines"
  ON accounting.journal_entry_lines
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can view tax config"
  ON accounting.tax_config
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage tax config"
  ON accounting.tax_config
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "Admin can view account balances"
  ON accounting.account_balances
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage account balances"
  ON accounting.account_balances
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- Comentarios
COMMENT ON SCHEMA accounting IS 'Sistema contable interno con gestión de terceros, impuestos e informes';
COMMENT ON TABLE accounting.chart_of_accounts IS 'Plan de cuentas contables';
COMMENT ON TABLE accounting.journal_entries IS 'Asientos contables (cabecera)';
COMMENT ON TABLE accounting.journal_entry_lines IS 'Líneas de asiento contable (DEBE/HABER)';
COMMENT ON TABLE accounting.tax_config IS 'Configuración de impuestos (IVA, IRPF, IS)';
COMMENT ON TABLE accounting.account_balances IS 'Saldos contables por cuenta y tercero';
