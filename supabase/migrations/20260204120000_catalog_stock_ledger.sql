-- ============================================
-- CATALOG V2: Stock movements ledger + stock alerts
-- ============================================
-- catalog.stock_movements: IN, OUT, ADJUST, RETURN_IN, RETURN_OUT
-- catalog.stock_alerts: LOW_STOCK (open/ack/resolved)
-- Triggers: actualizar stock_quantity en products; abrir/resolver alertas.
-- ============================================

BEGIN;

-- 1. ENUM movement_type
DO $$ BEGIN
  CREATE TYPE catalog.stock_movement_type AS ENUM ('IN', 'OUT', 'ADJUST', 'RETURN_IN', 'RETURN_OUT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla stock_movements
CREATE TABLE IF NOT EXISTS catalog.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  movement_type catalog.stock_movement_type NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  reference_schema TEXT,
  reference_table TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  CONSTRAINT check_quantity_nonzero CHECK (quantity != 0)
);
COMMENT ON COLUMN catalog.stock_movements.created_by IS 'Usuario que registró el movimiento. Sin FK para no depender de internal.authorized_users; la app puede rellenar con internal.get_authorized_user_id(auth.uid()).';

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON catalog.stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON catalog.stock_movements(reference_table, reference_id) WHERE reference_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_idempotent ON catalog.stock_movements(reference_table, reference_id, movement_type)
  WHERE reference_table IS NOT NULL AND reference_id IS NOT NULL;

COMMENT ON TABLE catalog.stock_movements IS 'Ledger de movimientos de stock. reference_* para idempotencia con facturas/compras.';

-- 3. Trigger: actualizar stock_quantity al insertar movimiento
CREATE OR REPLACE FUNCTION catalog.apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = catalog
AS $$
DECLARE
  v_delta NUMERIC(12,3);
  v_track BOOLEAN;
BEGIN
  SELECT track_stock INTO v_track FROM catalog.products WHERE id = NEW.product_id;
  IF NOT v_track THEN
    RETURN NEW;
  END IF;
  v_delta := CASE
    WHEN NEW.movement_type IN ('IN', 'RETURN_IN') THEN NEW.quantity
    WHEN NEW.movement_type IN ('OUT', 'RETURN_OUT') THEN -NEW.quantity
    WHEN NEW.movement_type = 'ADJUST' THEN NEW.quantity
    ELSE 0
  END;
  UPDATE catalog.products
  SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + v_delta),
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_apply_stock_movement ON catalog.stock_movements;
CREATE TRIGGER trigger_apply_stock_movement
  AFTER INSERT ON catalog.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION catalog.apply_stock_movement();

-- 4. Tabla stock_alerts (LOW_STOCK)
DO $$ BEGIN
  CREATE TYPE catalog.stock_alert_status AS ENUM ('open', 'ack', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS catalog.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  status catalog.stock_alert_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Una sola alerta open por producto (índice parcial único)
DROP INDEX IF EXISTS catalog_idx_stock_alerts_open;
CREATE UNIQUE INDEX catalog_idx_stock_alerts_open ON catalog.stock_alerts(product_id)
  WHERE status = 'open';

COMMENT ON TABLE catalog.stock_alerts IS 'Alertas de stock bajo. Un solo registro open por producto.';

-- 5. Función: abrir o resolver alerta LOW_STOCK según stock_quantity vs min_stock_alert
CREATE OR REPLACE FUNCTION catalog.sync_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = catalog
AS $$
BEGIN
  IF NOT NEW.track_stock OR NEW.min_stock_alert IS NULL THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.stock_quantity, 0) <= NEW.min_stock_alert THEN
    IF NOT EXISTS (SELECT 1 FROM catalog.stock_alerts WHERE product_id = NEW.id AND status = 'open') THEN
      INSERT INTO catalog.stock_alerts (product_id, status) VALUES (NEW.id, 'open');
    END IF;
  ELSE
    UPDATE catalog.stock_alerts
    SET status = 'resolved', resolved_at = now()
    WHERE product_id = NEW.id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_stock_alert ON catalog.products;
CREATE TRIGGER trigger_sync_stock_alert
  AFTER INSERT OR UPDATE OF stock_quantity, min_stock_alert, track_stock ON catalog.products
  FOR EACH ROW
  EXECUTE FUNCTION catalog.sync_stock_alert();

-- 6. RLS
ALTER TABLE catalog.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stock_movements"
  ON catalog.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/manager can insert stock_movements"
  ON catalog.stock_movements FOR INSERT TO authenticated
  WITH CHECK (internal.is_admin() OR internal.is_manager());

CREATE POLICY "Authenticated can view stock_alerts"
  ON catalog.stock_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage stock_alerts"
  ON catalog.stock_alerts FOR ALL TO authenticated
  USING (internal.is_admin()) WITH CHECK (internal.is_admin());

COMMIT;
