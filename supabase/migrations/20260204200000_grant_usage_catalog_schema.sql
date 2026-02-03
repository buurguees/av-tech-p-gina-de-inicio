-- ============================================
-- Permisos: USAGE en schema catalog (y internal) para authenticated
-- ============================================
-- Error 42501 "permission denied for schema catalog" al llamar RPCs que usan
-- SET search_path = catalog, internal, public. El rol authenticated necesita
-- USAGE en esos esquemas para que la sesión pueda resolver nombres.
-- ============================================

BEGIN;

GRANT USAGE ON SCHEMA catalog TO authenticated;
GRANT USAGE ON SCHEMA internal TO authenticated;

COMMIT;
