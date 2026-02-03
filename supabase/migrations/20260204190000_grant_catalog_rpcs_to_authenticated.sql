-- ============================================
-- Permisos: GRANT EXECUTE de RPCs del catálogo a authenticated
-- ============================================
-- Sin esto, el frontend recibe 403 al llamar list_catalog_products, list_catalog_categories, etc.
-- ============================================

BEGIN;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, p.proname AS func_name, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname LIKE 'list_catalog%'
        OR p.proname LIKE 'get_catalog%'
        OR p.proname LIKE 'create_catalog%'
        OR p.proname LIKE 'update_catalog%'
        OR p.proname LIKE 'delete_catalog%'
        OR p.proname LIKE 'add_catalog%'
        OR p.proname LIKE 'remove_catalog%'
        OR p.proname = 'list_stock_movements'
        OR p.proname = 'adjust_stock'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', r.schema_name, r.func_name, r.args);
  END LOOP;
END;
$$;

COMMIT;
