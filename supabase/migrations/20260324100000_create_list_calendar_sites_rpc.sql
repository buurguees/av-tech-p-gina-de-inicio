-- Migration: create_list_calendar_sites_rpc
-- Propósito: RPC global para el Calendario de Instalaciones de NEXO AV.
--            Devuelve sites de TODOS los proyectos con asignaciones embebidas
--            como JSONB, filtrable por rango de fechas, estados y técnico.
--            También añade list_unplanned_sites para el panel "Sin planificar".

-- ─── list_calendar_sites ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_calendar_sites(
  p_date_from      DATE    DEFAULT NULL,
  p_date_to        DATE    DEFAULT NULL,
  p_statuses       TEXT[]  DEFAULT NULL,
  p_technician_id  UUID    DEFAULT NULL
)
RETURNS TABLE (
  site_id             UUID,
  site_name           TEXT,
  site_status         TEXT,
  site_reference      TEXT,
  city                TEXT,
  province            TEXT,
  planned_start_date  DATE,
  planned_end_date    DATE,
  planned_days        INT,
  actual_start_at     TIMESTAMPTZ,
  actual_end_at       TIMESTAMPTZ,
  project_id          UUID,
  project_name        TEXT,
  client_id           UUID,
  client_name         TEXT,
  assignment_count    INT,
  assignments         JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'projects', 'internal', 'crm'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id                                                       AS site_id,
    ps.site_name,
    COALESCE(ps.site_status, 'PLANNED')::TEXT                   AS site_status,
    ps.site_reference,
    ps.city,
    ps.province,
    ps.planned_start_date,
    ps.planned_end_date,
    ps.planned_days,
    ps.actual_start_at,
    ps.actual_end_at,
    p.id                                                        AS project_id,
    COALESCE(p.project_name, '')::TEXT                          AS project_name,
    p.client_id,
    COALESCE(c.company_name, '')::TEXT                          AS client_name,
    (
      SELECT COUNT(*)::INT
      FROM projects.site_technician_assignments a
      WHERE a.site_id = ps.id
    )                                                           AS assignment_count,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'technician_id',   a.technician_id,
            'technician_name', COALESCE(t.company_name, ''),
            'role',            COALESCE(a.role, 'INSTALLER'),
            'date_from',       a.date_from,
            'date_to',         a.date_to
          )
          ORDER BY a.date_from NULLS LAST
        )
        FROM projects.site_technician_assignments a
        LEFT JOIN internal.technicians t ON t.id = a.technician_id
        WHERE a.site_id = ps.id
      ),
      '[]'::JSONB
    )                                                           AS assignments
  FROM projects.project_sites ps
  JOIN projects.projects p      ON p.id = ps.project_id
  LEFT JOIN crm.clients c       ON c.id = p.client_id
  WHERE
    ps.is_active = TRUE
    -- Filtro rango de fechas (ambos extremos opcionales)
    -- Incluye sites que solapan con el rango, o sin fechas si no hay filtro
    AND (
      p_date_from IS NULL
      OR ps.planned_end_date IS NULL
      OR ps.planned_end_date >= p_date_from
    )
    AND (
      p_date_to IS NULL
      OR ps.planned_start_date IS NULL
      OR ps.planned_start_date <= p_date_to
    )
    -- Filtro por estados
    AND (
      p_statuses IS NULL
      OR COALESCE(ps.site_status, 'PLANNED') = ANY(p_statuses)
    )
    -- Filtro por técnico asignado
    AND (
      p_technician_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM projects.site_technician_assignments sa
        WHERE sa.site_id = ps.id
          AND sa.technician_id = p_technician_id
      )
    )
  ORDER BY ps.planned_start_date NULLS LAST, ps.site_name;
END;
$$;

ALTER FUNCTION public.list_calendar_sites(DATE, DATE, TEXT[], UUID) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.list_calendar_sites(DATE, DATE, TEXT[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_calendar_sites(DATE, DATE, TEXT[], UUID) TO service_role;

-- ─── list_unplanned_sites ────────────────────────────────────────────────────
-- Sites activos sin fechas planificadas y en estado no definitivo.
-- Alimenta el panel "Sin planificar" del Calendario.

CREATE OR REPLACE FUNCTION public.list_unplanned_sites()
RETURNS TABLE (
  site_id       UUID,
  site_name     TEXT,
  site_status   TEXT,
  city          TEXT,
  project_id    UUID,
  project_name  TEXT,
  client_id     UUID,
  client_name   TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'projects', 'crm'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id                                          AS site_id,
    ps.site_name,
    COALESCE(ps.site_status, 'PLANNED')::TEXT      AS site_status,
    ps.city,
    p.id                                           AS project_id,
    COALESCE(p.project_name, '')::TEXT             AS project_name,
    p.client_id,
    COALESCE(c.company_name, '')::TEXT             AS client_name
  FROM projects.project_sites ps
  JOIN projects.projects p   ON p.id = ps.project_id
  LEFT JOIN crm.clients c    ON c.id = p.client_id
  WHERE
    ps.is_active = TRUE
    AND ps.planned_start_date IS NULL
    AND COALESCE(ps.site_status, 'PLANNED') NOT IN ('INVOICED', 'CLOSED')
  ORDER BY ps.site_name;
END;
$$;

ALTER FUNCTION public.list_unplanned_sites() OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.list_unplanned_sites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_unplanned_sites() TO service_role;
