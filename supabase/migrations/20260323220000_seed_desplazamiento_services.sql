-- ============================================================
-- Reglas de desplazamiento — usar productos existentes
-- GR-01-0001 DESPLAZAMIENTO     → is_displacement_km = true  (0.46€/km)
-- SP-01-0004 HORA EXTRA DESPLAZAMIENTO → is_displacement_hours = true (28.50€/h)
-- Nota: se añadió 'km' al enum catalog.unit_type en migración anterior
-- ============================================================

BEGIN;

-- Marcar productos existentes con sus flags de desplazamiento
UPDATE catalog.products SET is_displacement_km    = true  WHERE sku = 'GR-01-0001';
UPDATE catalog.products SET is_displacement_hours = true  WHERE sku = 'SP-01-0004';

COMMIT;
