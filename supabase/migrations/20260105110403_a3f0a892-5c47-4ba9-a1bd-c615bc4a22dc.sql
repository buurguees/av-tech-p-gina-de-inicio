
-- ============================================
-- NEXOAV DATABASE - FASE 5: CATALOG
-- ============================================

-- 1. TIPOS ENUM adicionales para catalog
-- ============================================
CREATE TYPE catalog.product_type AS ENUM ('PRODUCT', 'SERVICE', 'BUNDLE');
CREATE TYPE catalog.unit_type AS ENUM ('ud', 'm2', 'ml', 'hora', 'jornada', 'mes', 'kg');

-- 2. TABLA: catalog.categories
-- ============================================
CREATE TABLE catalog.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES catalog.categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_no_self_parent CHECK (parent_id IS NULL OR parent_id != id)
);

-- Índices para categories
CREATE INDEX idx_categories_parent ON catalog.categories(parent_id);
CREATE INDEX idx_categories_slug ON catalog.categories(slug);
CREATE INDEX idx_categories_active ON catalog.categories(is_active, sort_order);

-- 3. TABLA: catalog.tax_rates
-- ============================================
CREATE TABLE catalog.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  country TEXT DEFAULT 'ES',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_rate_range CHECK (rate >= 0 AND rate <= 100)
);

-- Índice para tax_rates
CREATE INDEX idx_tax_rates_active ON catalog.tax_rates(is_active, is_default);

-- 4. TABLA: catalog.products
-- ============================================
CREATE TABLE catalog.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_type catalog.product_type DEFAULT 'PRODUCT',
  category_id UUID REFERENCES catalog.categories(id),
  unit catalog.unit_type DEFAULT 'ud',
  
  -- Precios
  cost_price NUMERIC(12,2), -- Coste de compra (solo visible para admin/manager)
  sale_price NUMERIC(12,2) NOT NULL, -- Precio de venta sin IVA
  tax_rate_id UUID REFERENCES catalog.tax_rates(id),
  margin_percentage NUMERIC(5,2), -- Margen calculado
  
  -- Control de stock (opcional)
  track_stock BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_alert INTEGER,
  
  -- ERP
  erp_product_id TEXT, -- ID en Hooba/Holded
  erp_synced_at TIMESTAMPTZ,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Metadatos
  specifications JSONB DEFAULT '{}',
  images JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES internal.authorized_users(id),
  
  CONSTRAINT check_prices CHECK (cost_price IS NULL OR cost_price >= 0),
  CONSTRAINT check_sale_price CHECK (sale_price >= 0),
  CONSTRAINT check_stock CHECK (stock_quantity >= 0)
);

-- Índices para products
CREATE INDEX idx_products_sku ON catalog.products(sku);
CREATE INDEX idx_products_category ON catalog.products(category_id, is_active);
CREATE INDEX idx_products_active ON catalog.products(is_active, is_featured);
CREATE INDEX idx_products_erp ON catalog.products(erp_product_id) WHERE erp_product_id IS NOT NULL;

-- 5. TABLA: catalog.product_bundles (productos que son paquetes)
-- ============================================
CREATE TABLE catalog.product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  component_product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_bundle_component UNIQUE(bundle_product_id, component_product_id),
  CONSTRAINT check_not_same CHECK (bundle_product_id != component_product_id),
  CONSTRAINT check_bundle_quantity CHECK (quantity > 0)
);

-- Índice para product_bundles
CREATE INDEX idx_bundles_product ON catalog.product_bundles(bundle_product_id);

-- 6. TABLA: catalog.erp_sync_log
-- ============================================
CREATE TABLE catalog.erp_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'FULL', 'INCREMENTAL', 'PRODUCT'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'RUNNING', -- 'RUNNING', 'SUCCESS', 'FAILED'
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  initiated_by UUID REFERENCES internal.authorized_users(id)
);

-- Índice para erp_sync_log
CREATE INDEX idx_erp_sync_log_status ON catalog.erp_sync_log(status, started_at DESC);

-- 7. FUNCIÓN: Calcular margen automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION catalog.calculate_margin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = catalog
AS $$
BEGIN
  IF NEW.cost_price IS NOT NULL AND NEW.cost_price > 0 AND NEW.sale_price > 0 THEN
    NEW.margin_percentage := ((NEW.sale_price - NEW.cost_price) / NEW.sale_price) * 100;
  ELSE
    NEW.margin_percentage := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_margin
  BEFORE INSERT OR UPDATE ON catalog.products
  FOR EACH ROW
  EXECUTE FUNCTION catalog.calculate_margin();

-- Triggers para updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON catalog.categories
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_tax_rates_updated_at
  BEFORE UPDATE ON catalog.tax_rates
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

-- 8. HABILITAR RLS
-- ============================================
ALTER TABLE catalog.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.erp_sync_log ENABLE ROW LEVEL SECURITY;

-- 9. POLÍTICAS RLS PARA catalog.categories
-- ============================================
CREATE POLICY "Authenticated can view categories"
  ON catalog.categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage categories"
  ON catalog.categories
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- 10. POLÍTICAS RLS PARA catalog.tax_rates
-- ============================================
CREATE POLICY "Authenticated can view tax rates"
  ON catalog.tax_rates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage tax rates"
  ON catalog.tax_rates
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- 11. POLÍTICAS RLS PARA catalog.products
-- ============================================

-- Todos pueden ver productos activos (pero sin coste)
CREATE POLICY "Authenticated can view products"
  ON catalog.products
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede gestionar productos
CREATE POLICY "Admin can manage products"
  ON catalog.products
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- 12. POLÍTICAS RLS PARA catalog.product_bundles
-- ============================================
CREATE POLICY "Authenticated can view bundles"
  ON catalog.product_bundles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage bundles"
  ON catalog.product_bundles
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- 13. POLÍTICAS RLS PARA catalog.erp_sync_log
-- ============================================
CREATE POLICY "Admin can view sync logs"
  ON catalog.erp_sync_log
  FOR SELECT
  USING (internal.is_admin());

CREATE POLICY "Admin can manage sync logs"
  ON catalog.erp_sync_log
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- 14. INSERTAR DATOS INICIALES (SEED)
-- ============================================

-- Tipos de IVA España
INSERT INTO catalog.tax_rates (name, rate, is_default, is_active, country) VALUES
  ('IVA General 21%', 21.00, true, true, 'ES'),
  ('IVA Reducido 10%', 10.00, false, true, 'ES'),
  ('IVA Superreducido 4%', 4.00, false, true, 'ES'),
  ('Exento IVA', 0.00, false, true, 'ES');

-- Categorías principales
INSERT INTO catalog.categories (name, slug, description, sort_order) VALUES
  ('Pantallas LED', 'pantallas-led', 'Pantallas LED de interior y exterior', 1),
  ('Displays LCD', 'displays-lcd', 'Monitores y pantallas LCD profesionales', 2),
  ('Contenido Digital', 'contenido-digital', 'Creación y gestión de contenidos', 3),
  ('Instalación', 'instalacion', 'Servicios de instalación y montaje', 4),
  ('Mantenimiento', 'mantenimiento', 'Servicios de mantenimiento y soporte', 5),
  ('Accesorios', 'accesorios', 'Cables, soportes y accesorios', 6);

-- Añadir FK de quote_lines a products
ALTER TABLE sales.quote_lines
  ADD CONSTRAINT fk_quote_lines_product 
  FOREIGN KEY (product_id) REFERENCES catalog.products(id) ON DELETE SET NULL;
