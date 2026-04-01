-- ============================================================
-- RPCs de lectura para el sistema de documentación de instalaciones
-- Necesarias para la UI de NEXO AV (Fase 3)
-- ============================================================

-- RPC: list_site_installation_documents
-- Devuelve documentos de un site, opcionalmente filtrados por fase
CREATE OR REPLACE FUNCTION public.list_site_installation_documents(
  p_site_id uuid,
  p_phase   text DEFAULT NULL
)
RETURNS TABLE (
  id                    uuid,
  site_id               uuid,
  phase                 text,
  document_type         text,
  file_name             text,
  file_path             text,
  file_size_bytes       bigint,
  mime_type             text,
  sharepoint_web_url    text,
  sharepoint_item_id    text,
  source                text,
  uploaded_by_technician_id uuid,
  technician_name       text,
  uploaded_by_user_id   uuid,
  caption               text,
  taken_at              timestamptz,
  created_at            timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.site_id,
    d.phase::text,
    d.document_type::text,
    d.file_name,
    d.file_path,
    d.file_size_bytes,
    d.mime_type,
    d.sharepoint_web_url,
    d.sharepoint_item_id,
    d.source::text,
    d.uploaded_by_technician_id,
    t.display_name AS technician_name,
    d.uploaded_by_user_id,
    d.caption,
    d.taken_at,
    d.created_at
  FROM projects.site_installation_documents d
  LEFT JOIN internal.technicians t ON t.id = d.uploaded_by_technician_id
  WHERE d.site_id = p_site_id
    AND (p_phase IS NULL OR d.phase::text = p_phase)
  ORDER BY d.created_at DESC;
END;
$$;

-- RPC: list_site_work_log
-- Devuelve registros de horas de trabajo de un site
CREATE OR REPLACE FUNCTION public.list_site_work_log(
  p_site_id uuid
)
RETURNS TABLE (
  id                    uuid,
  site_id               uuid,
  technician_id         uuid,
  technician_name       text,
  work_date             date,
  check_in_time         time,
  check_out_time        time,
  check_in_declared     boolean,
  check_out_declared    boolean,
  total_hours           numeric,
  notes                 text,
  created_at            timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wl.id,
    wl.site_id,
    wl.technician_id,
    t.display_name AS technician_name,
    wl.work_date,
    wl.check_in_time,
    wl.check_out_time,
    wl.check_in_declared,
    wl.check_out_declared,
    wl.total_hours,
    wl.notes,
    wl.created_at
  FROM projects.installation_work_log wl
  LEFT JOIN internal.technicians t ON t.id = wl.technician_id
  WHERE wl.site_id = p_site_id
  ORDER BY wl.work_date DESC, wl.created_at DESC;
END;
$$;

-- RPC: list_site_qa
-- Devuelve entradas de QA de un site
CREATE OR REPLACE FUNCTION public.list_site_qa(
  p_site_id     uuid,
  p_pending_only boolean DEFAULT false
)
RETURNS TABLE (
  id                  uuid,
  site_id             uuid,
  technician_id       uuid,
  technician_name     text,
  session_date        date,
  question_text       text,
  question_at         timestamptz,
  escalated_to        uuid,
  escalated_to_name   text,
  escalated_at        timestamptz,
  answer_text         text,
  answered_at         timestamptz,
  answered_by_type    text,
  sent_to_technician  boolean,
  topic_tags          jsonb,
  created_at          timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.site_id,
    q.technician_id,
    t.display_name AS technician_name,
    q.session_date,
    q.question_text,
    q.question_at,
    q.escalated_to,
    te.display_name AS escalated_to_name,
    q.escalated_at,
    q.answer_text,
    q.answered_at,
    q.answered_by_type::text,
    q.sent_to_technician,
    q.topic_tags,
    q.created_at
  FROM projects.installation_qa q
  LEFT JOIN internal.technicians t  ON t.id  = q.technician_id
  LEFT JOIN internal.technicians te ON te.id = q.escalated_to
  WHERE q.site_id = p_site_id
    AND (NOT p_pending_only OR q.answer_text IS NULL)
  ORDER BY q.question_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_site_installation_documents TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_site_work_log               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_site_qa                     TO authenticated, service_role;
