-- Eliminación de la RPC legacy get_dashboard_metrics (public)
--
-- Motivo: esta función calcula el "revenue" usando SUM(paid_amount), mezclando
-- cobros con ingresos (criterio de caja, no devengo). Además estima gastos al 65%
-- cuando no hay datos de compras. Es incompatible con el principio de devengo del PGC.
--
-- Reemplazada por: dashboard_get_admin_overview (public) — usa journal entries
-- con entry_date = issue_date para respetar el devengo contable.
--
-- Verificado el 2026-03-20: ningún componente frontend consume esta función.
-- Solo aparecía en integrations/supabase/types.ts (tipos auto-generados).

DROP FUNCTION IF EXISTS public.get_dashboard_metrics(text);
