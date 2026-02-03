-- =====================================================
-- Fix PGRST203: Eliminar versión duplicada de list_partner_compensation_runs
-- Había dos versiones en public con distinto orden de parámetros, causando
-- "Could not choose the best candidate function" al llamar al RPC.
-- =====================================================

DROP FUNCTION IF EXISTS public.list_partner_compensation_runs(uuid, integer, integer, text, integer, integer);
