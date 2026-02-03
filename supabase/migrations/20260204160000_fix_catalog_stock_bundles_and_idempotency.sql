-- ============================================
-- P0: Corregir idempotencia (bundles = varios OUT por línea) y hooks invoice_lines
-- ============================================
-- P0.2 Índice único debe ser (reference_table, reference_id, product_id) para permitir
--      varios movimientos OUT por la misma línea (uno por componente del bundle).
-- P0.1/P0.3 Trigger: para BUNDLE no salir por track_stock; descontar componentes en INSERT;
--      en UPDATE/DELETE ajustar/revertir por componentes.
-- ============================================

BEGIN;

-- Eliminar índices de idempotencia que no incluyen product_id (rompen bundles)
DROP INDEX IF EXISTS catalog.idx_stock_movements_ref_unique;
DROP INDEX IF EXISTS catalog.idx_stock_movements_idempotent;

-- Idempotencia correcta: un IN/OUT por (reference_table, reference_id, product_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_ref_product_unique
  ON catalog.stock_movements(reference_table, reference_id, product_id)
  WHERE reference_table IS NOT NULL AND reference_id IS NOT NULL
    AND movement_type IN ('IN', 'OUT');

-- Función: OUT por línea de factura (producto simple o BUNDLE → componentes)
-- BUNDLE se trata ANTES de cualquier comprobación de track_stock.
CREATE OR REPLACE FUNCTION catalog.on_invoice_line_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = catalog, sales, internal
AS $$
DECLARE
  v_ptype catalog.product_type;
  v_track BOOLEAN;
  v_qty NUMERIC(12,3);
  v_delta NUMERIC(12,3);
  v_comp RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  IF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NULL THEN RETURN OLD; END IF;
    SELECT product_type, track_stock, COALESCE(OLD.quantity, 0) INTO v_ptype, v_track, v_qty
    FROM catalog.products WHERE id = OLD.product_id;
    IF v_ptype = 'BUNDLE' THEN
      FOR v_comp IN
        SELECT pb.component_product_id, pb.quantity * v_qty AS qty
        FROM catalog.product_bundles pb
        JOIN catalog.products pr ON pr.id = pb.component_product_id
        WHERE pb.bundle_product_id = OLD.product_id AND pr.track_stock
      LOOP
        INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
        VALUES (v_comp.component_product_id, 'ADJUST', v_comp.qty, 'sales', 'invoice_lines', OLD.id, 'Revert bundle line delete', v_user_id);
      END LOOP;
    ELSIF v_track AND v_qty != 0 THEN
      INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
      VALUES (OLD.product_id, 'ADJUST', v_qty, 'sales', 'invoice_lines', OLD.id, 'Revert line delete', v_user_id);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;

  SELECT product_type, track_stock INTO v_ptype, v_track FROM catalog.products WHERE id = NEW.product_id;

  IF TG_OP = 'INSERT' THEN
    v_qty := COALESCE(NEW.quantity, 0);
    IF v_qty <= 0 THEN RETURN NEW; END IF;

    -- P0.1: BUNDLE primero; no usar track_stock del bundle (es false)
    IF v_ptype = 'BUNDLE' THEN
      FOR v_comp IN
        SELECT pb.component_product_id, pb.quantity * v_qty AS qty
        FROM catalog.product_bundles pb
        JOIN catalog.products pr ON pr.id = pb.component_product_id
        WHERE pb.bundle_product_id = NEW.product_id AND pr.track_stock
      LOOP
        IF NOT EXISTS (SELECT 1 FROM catalog.stock_movements WHERE reference_table = 'invoice_lines' AND reference_id = NEW.id AND product_id = v_comp.component_product_id AND movement_type = 'OUT') THEN
          INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
          VALUES (v_comp.component_product_id, 'OUT', v_comp.qty, 'sales', 'invoice_lines', NEW.id, 'Bundle component', v_user_id);
        END IF;
      END LOOP;
      RETURN NEW;
    END IF;

    IF NOT v_track THEN RETURN NEW; END IF;
    IF NOT EXISTS (SELECT 1 FROM catalog.stock_movements WHERE reference_table = 'invoice_lines' AND reference_id = NEW.id AND product_id = NEW.product_id AND movement_type = 'OUT') THEN
      INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
      VALUES (NEW.product_id, 'OUT', v_qty, 'sales', 'invoice_lines', NEW.id, 'Invoice line', v_user_id);
    END IF;
    RETURN NEW;
  END IF;

  -- P0.3: UPDATE cantidad → ajustar componentes del bundle (delta * qty por componente)
  IF TG_OP = 'UPDATE' AND OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    v_delta := COALESCE(OLD.quantity, 0) - COALESCE(NEW.quantity, 0);
    IF v_delta = 0 THEN RETURN NEW; END IF;

    IF v_ptype = 'BUNDLE' THEN
      FOR v_comp IN
        SELECT pb.component_product_id, pb.quantity * v_delta AS qty
        FROM catalog.product_bundles pb
        JOIN catalog.products pr ON pr.id = pb.component_product_id
        WHERE pb.bundle_product_id = NEW.product_id AND pr.track_stock
      LOOP
        INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
        VALUES (v_comp.component_product_id, 'ADJUST', v_comp.qty, 'sales', 'invoice_lines', NEW.id, 'Bundle line qty change', v_user_id);
      END LOOP;
    ELSIF v_track THEN
      INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
      VALUES (NEW.product_id, 'ADJUST', v_delta, 'sales', 'invoice_lines', NEW.id, 'Invoice line qty change', v_user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION catalog.on_invoice_line_stock() IS 'Ventas: OUT por línea (producto simple o componentes si BUNDLE). UPDATE/DELETE ajustan/revierten. Idempotencia por (reference_table, reference_id, product_id).';

COMMIT;
