-- =============================================================================
-- fix_delete_product_pack.sql
-- Área 3 / Tarea 3.3 — Bug: delete_product_pack apuntaba a internal.product_packs
-- Fecha: 2026-03-26
-- =============================================================================
--
-- PROBLEMA:
-- delete_product_pack hacía DELETE FROM internal.product_packs (tabla con 0 filas).
-- Los packs actuales viven en catalog.products con product_type = 'BUNDLE'.
-- update_product_pack ya había sido actualizada a catalog, pero delete no.
-- Efecto: borrar un pack desde PacksTab.tsx no hacía nada (devolvía false silenciosamente).
--
-- SOLUCIÓN:
-- Reescribir delete_product_pack para borrar de catalog.products (BUNDLE)
-- + sus componentes en catalog.product_bundles (ON DELETE CASCADE no garantizado).
--
-- PRE-FIX VERIFICADO:
--   - internal.product_packs: 0 filas
--   - catalog.products (BUNDLE): 14 filas
--   - FKs externas a internal.product_packs: 0
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_product_pack(p_pack_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'catalog'
AS $function$
BEGIN
  -- Borrar componentes del bundle primero (por si ON DELETE CASCADE no aplica)
  DELETE FROM catalog.product_bundles WHERE bundle_product_id = p_pack_id;

  -- Borrar el producto tipo BUNDLE
  DELETE FROM catalog.products WHERE id = p_pack_id AND product_type = 'BUNDLE';

  RETURN FOUND;
END;
$function$;

-- Documentar el fix
COMMENT ON FUNCTION public.delete_product_pack(uuid) IS
  'Borra un pack/bundle del catálogo. '
  'Actualizado 2026-03-26: ahora apunta a catalog.products (product_type=BUNDLE) '
  'en lugar de internal.product_packs (tabla legacy con 0 filas). '
  'Llamado desde PacksTab.tsx:239.';
