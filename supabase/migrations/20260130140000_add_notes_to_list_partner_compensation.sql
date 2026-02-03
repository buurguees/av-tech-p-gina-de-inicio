-- =====================================================
-- Añadir notes a list_partner_compensation_runs
-- Para mostrar desglose de conceptos (base, pluses, etc.) en el listado
-- PostgreSQL no permite cambiar el tipo de retorno con CREATE OR REPLACE,
-- por lo que hay que DROP primero y luego CREATE.
-- =====================================================

-- 1. Eliminar funciones existentes (public depende de accounting)
DROP FUNCTION IF EXISTS public.list_partner_compensation_runs(integer, integer, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS accounting.list_partner_compensation_runs(integer, integer, uuid, text, integer, integer);

-- 2. Recrear accounting.list_partner_compensation_runs con notes
CREATE FUNCTION accounting.list_partner_compensation_runs(
  p_period_year integer DEFAULT NULL,
  p_period_month integer DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  compensation_number text,
  period_year integer,
  period_month integer,
  partner_id uuid,
  partner_number text,
  partner_name text,
  gross_amount numeric(12,2),
  irpf_rate numeric(5,2),
  irpf_amount numeric(12,2),
  net_amount numeric(12,2),
  status text,
  journal_entry_id uuid,
  journal_entry_number text,
  created_at timestamptz,
  notes text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting', 'internal'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pcr.id,
    pcr.compensation_number,
    pcr.period_year,
    pcr.period_month,
    pcr.partner_id,
    p.partner_number,
    p.full_name,
    pcr.gross_amount,
    pcr.irpf_rate,
    pcr.irpf_amount,
    pcr.net_amount,
    pcr.status,
    pcr.journal_entry_id,
    je.entry_number,
    pcr.created_at,
    pcr.notes
  FROM accounting.partner_compensation_runs pcr
  JOIN internal.partners p ON pcr.partner_id = p.id
  LEFT JOIN accounting.journal_entries je ON pcr.journal_entry_id = je.id
  WHERE 
    (p_period_year IS NULL OR pcr.period_year = p_period_year)
    AND (p_period_month IS NULL OR pcr.period_month = p_period_month)
    AND (p_partner_id IS NULL OR pcr.partner_id = p_partner_id)
    AND (p_status IS NULL OR pcr.status = p_status)
  ORDER BY pcr.period_year DESC, pcr.period_month DESC, pcr.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 3. Recrear wrapper público
CREATE FUNCTION public.list_partner_compensation_runs(
  p_period_year integer DEFAULT NULL,
  p_period_month integer DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  compensation_number text,
  period_year integer,
  period_month integer,
  partner_id uuid,
  partner_number text,
  partner_name text,
  gross_amount numeric(12,2),
  irpf_rate numeric(5,2),
  irpf_amount numeric(12,2),
  net_amount numeric(12,2),
  status text,
  journal_entry_id uuid,
  journal_entry_number text,
  created_at timestamptz,
  notes text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.list_partner_compensation_runs(
    p_period_year, p_period_month, p_partner_id, p_status, p_limit, p_offset
  );
END;
$$;
