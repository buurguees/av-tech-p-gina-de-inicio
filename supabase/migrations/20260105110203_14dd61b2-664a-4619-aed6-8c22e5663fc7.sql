
-- ============================================
-- NEXOAV DATABASE - FASE 3: SALES (PRESUPUESTOS)
-- ============================================

-- 1. TABLA: sales.quotes (cabecera)
-- ============================================
CREATE TABLE sales.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES crm.clients(id),
  location_id UUID REFERENCES crm.locations(id),
  current_version INTEGER DEFAULT 1,
  total_versions INTEGER DEFAULT 1,
  status_summary sales.quote_status NOT NULL DEFAULT 'DRAFT',
  created_by UUID NOT NULL REFERENCES internal.authorized_users(id),
  assigned_to UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT check_versions CHECK (total_versions >= 1 AND current_version <= total_versions)
);

-- Índices para quotes
CREATE INDEX idx_quotes_number ON sales.quotes(quote_number);
CREATE INDEX idx_quotes_client ON sales.quotes(client_id, created_at DESC);
CREATE INDEX idx_quotes_assigned ON sales.quotes(assigned_to, status_summary);
CREATE INDEX idx_quotes_status ON sales.quotes(status_summary, updated_at DESC);

-- 2. TABLA: sales.quote_versions
-- ============================================
CREATE TABLE sales.quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES sales.quotes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status sales.quote_status NOT NULL DEFAULT 'DRAFT',
  valid_until DATE,
  currency TEXT DEFAULT 'EUR',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  delivery_terms TEXT,
  internal_notes TEXT,
  customer_notes TEXT,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  superseded_by_version INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  locked_at TIMESTAMPTZ,
  
  CONSTRAINT unique_quote_version UNIQUE(quote_id, version_number),
  CONSTRAINT check_version_number CHECK (version_number >= 1),
  CONSTRAINT check_amounts CHECK (subtotal >= 0 AND tax_amount >= 0 AND total >= 0),
  CONSTRAINT check_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

-- Índices para quote_versions
CREATE INDEX idx_quote_versions_quote ON sales.quote_versions(quote_id, version_number DESC);
CREATE INDEX idx_quote_versions_status ON sales.quote_versions(status, valid_until);
CREATE INDEX idx_quote_versions_accepted ON sales.quote_versions(accepted_at DESC) WHERE accepted_at IS NOT NULL;

-- 3. TABLA: sales.quote_lines
-- ============================================
CREATE TABLE sales.quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_version_id UUID NOT NULL REFERENCES sales.quote_versions(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  product_id UUID, -- Referencia a catalog.products (se creará después)
  product_snapshot JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ud',
  unit_price NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 21,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_quote_line UNIQUE(quote_version_id, line_number),
  CONSTRAINT check_line_number CHECK (line_number >= 1),
  CONSTRAINT check_quantity CHECK (quantity > 0),
  CONSTRAINT check_line_amounts CHECK (unit_price >= 0 AND tax_rate >= 0 AND tax_amount >= 0 AND line_total >= 0),
  CONSTRAINT check_line_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

-- Índices para quote_lines
CREATE INDEX idx_quote_lines_version ON sales.quote_lines(quote_version_id, line_number);
CREATE INDEX idx_quote_lines_product ON sales.quote_lines(product_id) WHERE product_id IS NOT NULL;

-- 4. TABLA: sales.quote_documents
-- ============================================
CREATE TABLE sales.quote_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_version_id UUID NOT NULL REFERENCES sales.quote_versions(id) ON DELETE CASCADE,
  document_type sales.document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  generated_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes > 0)
);

-- Índices para quote_documents
CREATE INDEX idx_quote_docs_version ON sales.quote_documents(quote_version_id, document_type);

-- 5. FUNCIÓN: Generar número de presupuesto
-- ============================================
CREATE OR REPLACE FUNCTION sales.generate_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, audit
AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := audit.get_next_number('Q');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_quote_number
  BEFORE INSERT ON sales.quotes
  FOR EACH ROW
  EXECUTE FUNCTION sales.generate_quote_number();

-- 6. FUNCIÓN: Bloquear versión cuando cambia de DRAFT
-- ============================================
CREATE OR REPLACE FUNCTION sales.lock_quote_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales
AS $$
BEGIN
  -- Si cambia de DRAFT a otro estado, bloquear
  IF OLD.status = 'DRAFT' AND NEW.status != 'DRAFT' THEN
    NEW.locked_at := now();
  END IF;
  
  -- Si se envía, registrar timestamp
  IF NEW.status = 'SENT' AND OLD.status = 'DRAFT' THEN
    NEW.sent_at := COALESCE(NEW.sent_at, now());
  END IF;
  
  -- Si se acepta, registrar timestamp
  IF NEW.status = 'ACCEPTED' AND OLD.status != 'ACCEPTED' THEN
    NEW.accepted_at := COALESCE(NEW.accepted_at, now());
  END IF;
  
  -- Si se rechaza, registrar timestamp
  IF NEW.status IN ('REJECTED', 'EXPIRED') AND OLD.status NOT IN ('REJECTED', 'EXPIRED') THEN
    NEW.rejected_at := COALESCE(NEW.rejected_at, now());
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_lock_quote_version
  BEFORE UPDATE ON sales.quote_versions
  FOR EACH ROW
  EXECUTE FUNCTION sales.lock_quote_version();

-- 7. FUNCIÓN: Actualizar totales de presupuesto
-- ============================================
CREATE OR REPLACE FUNCTION sales.recalculate_quote_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales
AS $$
DECLARE
  v_subtotal NUMERIC(12,2);
  v_tax_amount NUMERIC(12,2);
BEGIN
  -- Calcular subtotal y tax_amount sumando líneas (excluyendo opcionales)
  SELECT 
    COALESCE(SUM(quantity * unit_price * (1 - discount_percentage/100)), 0),
    COALESCE(SUM(tax_amount), 0)
  INTO v_subtotal, v_tax_amount
  FROM sales.quote_lines
  WHERE quote_version_id = COALESCE(NEW.quote_version_id, OLD.quote_version_id)
    AND is_optional = false;
  
  -- Actualizar la versión del presupuesto
  UPDATE sales.quote_versions
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    discount_amount = v_subtotal * (discount_percentage / 100),
    total = v_subtotal - (v_subtotal * (discount_percentage / 100)) + v_tax_amount,
    updated_at = now()
  WHERE id = COALESCE(NEW.quote_version_id, OLD.quote_version_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_recalculate_quote_totals
  AFTER INSERT OR UPDATE OR DELETE ON sales.quote_lines
  FOR EACH ROW
  EXECUTE FUNCTION sales.recalculate_quote_totals();

-- 8. FUNCIÓN: Sincronizar status_summary en quotes
-- ============================================
CREATE OR REPLACE FUNCTION sales.sync_quote_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales
AS $$
BEGIN
  -- Actualizar status_summary en la cabecera con el status de la versión actual
  UPDATE sales.quotes
  SET 
    status_summary = NEW.status,
    current_version = NEW.version_number,
    updated_at = now()
  WHERE id = NEW.quote_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_quote_status
  AFTER INSERT OR UPDATE ON sales.quote_versions
  FOR EACH ROW
  EXECUTE FUNCTION sales.sync_quote_status();

-- Triggers para updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON sales.quotes
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

-- 9. HABILITAR RLS
-- ============================================
ALTER TABLE sales.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.quote_documents ENABLE ROW LEVEL SECURITY;

-- 10. FUNCIÓN AUXILIAR: Verificar acceso a presupuesto
-- ============================================
CREATE OR REPLACE FUNCTION sales.can_access_quote(p_quote_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sales, internal
AS $$
  SELECT 
    internal.is_admin() OR 
    internal.is_manager() OR 
    internal.is_readonly() OR
    (internal.is_sales() AND EXISTS (
      SELECT 1 FROM sales.quotes 
      WHERE id = p_quote_id 
      AND assigned_to = internal.get_authorized_user_id(auth.uid())
    ))
$$;

-- 11. POLÍTICAS RLS PARA sales.quotes
-- ============================================
CREATE POLICY "Admin manager readonly can view all quotes"
  ON sales.quotes
  FOR SELECT
  USING (
    internal.is_admin() OR 
    internal.is_manager() OR 
    internal.is_readonly()
  );

CREATE POLICY "Sales can view assigned quotes"
  ON sales.quotes
  FOR SELECT
  USING (
    internal.is_sales() AND 
    assigned_to = internal.get_authorized_user_id(auth.uid())
  );

CREATE POLICY "Tech can view accepted quotes for their projects"
  ON sales.quotes
  FOR SELECT
  USING (
    internal.is_tech() AND 
    status_summary = 'ACCEPTED'
  );

CREATE POLICY "Admin manager sales can create quotes"
  ON sales.quotes
  FOR INSERT
  WITH CHECK (
    internal.is_admin() OR 
    internal.is_manager() OR 
    internal.is_sales()
  );

CREATE POLICY "Admin manager can update all quotes"
  ON sales.quotes
  FOR UPDATE
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());

CREATE POLICY "Sales can update assigned quotes"
  ON sales.quotes
  FOR UPDATE
  USING (
    internal.is_sales() AND 
    assigned_to = internal.get_authorized_user_id(auth.uid())
  )
  WITH CHECK (
    internal.is_sales() AND 
    assigned_to = internal.get_authorized_user_id(auth.uid())
  );

CREATE POLICY "Admin can delete quotes"
  ON sales.quotes
  FOR DELETE
  USING (internal.is_admin());

-- 12. POLÍTICAS RLS PARA sales.quote_versions (heredan de quotes)
-- ============================================
CREATE POLICY "Users can view quote versions"
  ON sales.quote_versions
  FOR SELECT
  USING (sales.can_access_quote(quote_id));

CREATE POLICY "Users can manage draft quote versions"
  ON sales.quote_versions
  FOR ALL
  USING (sales.can_access_quote(quote_id) AND (status = 'DRAFT' OR internal.is_admin()))
  WITH CHECK (sales.can_access_quote(quote_id));

-- 13. POLÍTICAS RLS PARA sales.quote_lines (heredan de versions)
-- ============================================
CREATE OR REPLACE FUNCTION sales.can_access_quote_version(p_version_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sales
AS $$
  SELECT sales.can_access_quote(
    (SELECT quote_id FROM sales.quote_versions WHERE id = p_version_id)
  )
$$;

CREATE POLICY "Users can view quote lines"
  ON sales.quote_lines
  FOR SELECT
  USING (sales.can_access_quote_version(quote_version_id));

CREATE POLICY "Users can manage quote lines"
  ON sales.quote_lines
  FOR ALL
  USING (sales.can_access_quote_version(quote_version_id))
  WITH CHECK (sales.can_access_quote_version(quote_version_id));

-- 14. POLÍTICAS RLS PARA sales.quote_documents
-- ============================================
CREATE POLICY "Users can view quote documents"
  ON sales.quote_documents
  FOR SELECT
  USING (sales.can_access_quote_version(quote_version_id));

CREATE POLICY "Users can manage quote documents"
  ON sales.quote_documents
  FOR ALL
  USING (sales.can_access_quote_version(quote_version_id))
  WITH CHECK (sales.can_access_quote_version(quote_version_id));
