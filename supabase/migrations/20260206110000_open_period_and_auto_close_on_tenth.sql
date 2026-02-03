--
-- 1. open_period: reabrir un periodo cerrado (is_locked = false).
--    Permite volver a subir tickets/facturas del mes y luego cerrar de nuevo.
--
-- 2. Regla de negocio: el mes anterior se cierra automáticamente el día 10 del mes actual.
--    auto_close_previous_month_if_tenth(): si hoy es día 10, cierra (año anterior, mes anterior).
--    Para que sea automático, invocar esta función diariamente (pg_cron, Edge Function programada, o cron externo).
--

-- =====================================================
-- open_period: reabrir periodo para seguir registrando
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.open_period(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO accounting, internal
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  UPDATE accounting.period_closures
  SET is_locked = false
  WHERE year = p_year AND month = p_month;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_period(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT accounting.open_period(p_year, p_month);
$$;

COMMENT ON FUNCTION accounting.open_period IS 'Reabre un periodo cerrado (is_locked=false) para poder registrar movimientos de ese mes. Después se puede volver a cerrar con close_period.';


-- =====================================================
-- auto_close_previous_month_if_tenth: cierre automático día 10
-- El mes anterior se cierra el día 10 del mes actual (margen para tickets/facturas colgadas).
-- Invocar diariamente (p. ej. pg_cron a las 00:05 o Edge Function programada).
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.auto_close_previous_month_if_tenth()
RETURNS TABLE(closed_year INTEGER, closed_month INTEGER, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO accounting
AS $$
DECLARE
  v_day INTEGER;
  v_prev_year INTEGER;
  v_prev_month INTEGER;
  v_start DATE;
  v_end DATE;
BEGIN
  v_day := EXTRACT(DAY FROM CURRENT_DATE)::INTEGER;
  IF v_day <> 10 THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::INTEGER, 'skip_not_tenth'::TEXT;
    RETURN;
  END IF;

  v_prev_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER - 1;
  v_prev_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  IF v_prev_month <= 0 THEN
    v_prev_month := v_prev_month + 12;
    v_prev_year := v_prev_year - 1;
  END IF;

  IF accounting.is_period_closed(v_prev_year, v_prev_month) THEN
    RETURN QUERY SELECT v_prev_year, v_prev_month, 'already_closed'::TEXT;
    RETURN;
  END IF;

  v_start := make_date(v_prev_year, v_prev_month, 1);
  v_end := (v_start + interval '1 month' - interval '1 day')::date;

  INSERT INTO accounting.period_closures (year, month, period_start, period_end, closed_by)
  VALUES (v_prev_year, v_prev_month, v_start, v_end, NULL)
  ON CONFLICT (year, month) DO UPDATE
  SET is_locked = true, closed_at = now();

  RETURN QUERY SELECT v_prev_year, v_prev_month, 'closed'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_close_previous_month_if_tenth()
RETURNS TABLE(closed_year INTEGER, closed_month INTEGER, action TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM accounting.auto_close_previous_month_if_tenth();
$$;

COMMENT ON FUNCTION accounting.auto_close_previous_month_if_tenth IS 'Si hoy es día 10, cierra el mes anterior. Llamar diariamente para aplicar la regla: mes anterior se cierra el día 10.';
