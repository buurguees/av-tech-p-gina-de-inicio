-- ============================================
-- CATALOG V2: Hooks facturas/compras → stock_movements (idempotentes)
-- ============================================
-- Ventas (sales.invoice_lines): OUT al insertar, ADJUST al actualizar cantidad.
-- Compras (sales.purchase_invoice_lines): IN al insertar, ADJUST al actualizar.
-- BUNDLE: al facturar OUT del bundle, generar OUT por cada componente * cantidad.
-- Idempotencia: un solo movimiento IN/OUT por (reference_table, reference_id, product_id).
-- ============================================

BEGIN;

-- Quitar índices antiguos (idempotencia por referencia sola rompe con bundles)
DROP INDEX IF EXISTS catalog.idx_stock_movements_ref_unique;
DROP INDEX IF EXISTS catalog.idx_stock_movements_idempotent;

-- Idempotencia por (ref_table, ref_id, product_id): permite varios OUT por misma línea (uno por componente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_ref_product_unique
  ON catalog.stock_movements(reference_table, reference_id, product_id)
  WHERE reference_table IS NOT NULL AND reference_id IS NOT NULL
    AND movement_type IN ('IN', 'OUT');

-- Función: registrar OUT por línea de factura de venta (producto simple o BUNDLE → componentes)
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
      -- Revertir OUT de componentes: ADJUST positivo por cada uno
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

    IF v_ptype = 'BUNDLE' THEN
      -- Bundle: solo OUT por componentes (el bundle no track_stock)
      FOR v_comp IN
        SELECT pb.component_product_id, pb.quantity * v_qty AS qty
        FROM catalog.product_bundles pb
        JOIN catalog.products pr ON pr.id = pb.component_product_id
        WHERE pb.bundle_product_id = NEW.product_id AND pr.track_stock
      LOOP
        IF EXISTS (SELECT 1 FROM catalog.stock_movements WHERE reference_table = 'invoice_lines' AND reference_id = NEW.id AND product_id = v_comp.component_product_id AND movement_type = 'OUT') THEN
          NULL; -- idempotente: ya existe OUT para este producto en esta línea
        ELSE
          INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
          VALUES (v_comp.component_product_id, 'OUT', v_comp.qty, 'sales', 'invoice_lines', NEW.id, 'Bundle component', v_user_id);
        END IF;
      END LOOP;
      RETURN NEW;
    END IF;

    IF NOT v_track THEN RETURN NEW; END IF;
    -- Producto simple: un OUT por línea (idempotente por product_id)
    IF EXISTS (SELECT 1 FROM catalog.stock_movements WHERE reference_table = 'invoice_lines' AND reference_id = NEW.id AND product_id = NEW.product_id AND movement_type = 'OUT') THEN
      RETURN NEW;
    END IF;
    INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
    VALUES (NEW.product_id, 'OUT', v_qty, 'sales', 'invoice_lines', NEW.id, 'Invoice line', v_user_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    v_delta := COALESCE(OLD.quantity, 0) - COALESCE(NEW.quantity, 0);
    IF v_delta = 0 THEN RETURN NEW; END IF;

    IF v_ptype = 'BUNDLE' THEN
      -- Ajustar stock de cada componente: delta * cantidad por componente
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

-- Trigger en sales.invoice_lines (solo si la tabla existe y tiene product_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'invoice_lines' AND column_name = 'product_id'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_invoice_line_stock ON sales.invoice_lines;
    CREATE TRIGGER trigger_invoice_line_stock
      AFTER INSERT OR UPDATE OF quantity, product_id OR DELETE ON sales.invoice_lines
      FOR EACH ROW
      EXECUTE FUNCTION catalog.on_invoice_line_stock();
  END IF;
END $$;

-- Función: registrar IN por línea de factura de compra
CREATE OR REPLACE FUNCTION catalog.on_purchase_invoice_line_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = catalog, sales, internal
AS $$
DECLARE v_track BOOLEAN; v_qty NUMERIC(12,3); v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF TG_OP = 'DELETE' THEN
    SELECT track_stock, COALESCE(OLD.quantity, 0) INTO v_track, v_qty
    FROM catalog.products WHERE id = OLD.product_id;
    IF v_track AND OLD.product_id IS NOT NULL AND v_qty != 0 THEN
      INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
      VALUES (OLD.product_id, 'ADJUST', -v_qty, 'sales', 'purchase_invoice_lines', OLD.id, 'Revert purchase line delete', v_user_id);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT track_stock INTO v_track FROM catalog.products WHERE id = NEW.product_id;
  IF NOT v_track THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    v_qty := COALESCE(NEW.quantity, 0);
    IF v_qty <= 0 THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM catalog.stock_movements WHERE reference_table = 'purchase_invoice_lines' AND reference_id = NEW.id AND movement_type = 'IN') THEN
      RETURN NEW;
    END IF;
    INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
    VALUES (NEW.product_id, 'IN', v_qty, 'sales', 'purchase_invoice_lines', NEW.id, 'Purchase line', v_user_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    v_qty := COALESCE(NEW.quantity, 0) - COALESCE(OLD.quantity, 0);
    IF v_qty != 0 THEN
      INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, reference_schema, reference_table, reference_id, notes, created_by)
      VALUES (NEW.product_id, 'ADJUST', v_qty, 'sales', 'purchase_invoice_lines', NEW.id, 'Purchase line qty change', v_user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'purchase_invoice_lines' AND column_name = 'product_id'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_purchase_invoice_line_stock ON sales.purchase_invoice_lines;
    CREATE TRIGGER trigger_purchase_invoice_line_stock
      AFTER INSERT OR UPDATE OF quantity, product_id OR DELETE ON sales.purchase_invoice_lines
      FOR EACH ROW
      EXECUTE FUNCTION catalog.on_purchase_invoice_line_stock();
  END IF;
END $$;

COMMIT;
