-- ============================================================
-- FASE 2: Sistema de documentación de instalaciones
-- Schema: projects
-- 3 enums · 4 tablas · 6 RPCs
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 2.1 ENUMS
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE projects.installation_phase AS ENUM (
    'PRE_INSTALLATION',
    'INSTALLATION',
    'POST_INSTALLATION',
    'DELIVERY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE projects.document_source AS ENUM (
    'MANUAL_UPLOAD',
    'WHATSAPP',
    'N8N_AUTOMATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE projects.qa_answerer_type AS ENUM (
    'BOT',
    'INTERNAL_USER',
    'INTERNAL_WHATSAPP'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- 2.2 TABLA: installation_doc_sessions
-- Estado operativo de la conversación del día (cerebro del bot)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects.installation_doc_sessions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               uuid        NOT NULL REFERENCES projects.project_sites(id) ON DELETE CASCADE,
  technician_id         uuid        NOT NULL REFERENCES internal.technicians(id)   ON DELETE RESTRICT,

  session_date          date        NOT NULL DEFAULT CURRENT_DATE,

  last_requested_action text,

  phase_pre_status      text        NOT NULL DEFAULT 'PENDING'
                                    CHECK (phase_pre_status      IN ('PENDING','NOTIFIED','IN_PROGRESS','COMPLETED')),
  phase_inst_status     text        NOT NULL DEFAULT 'PENDING'
                                    CHECK (phase_inst_status     IN ('PENDING','NOTIFIED','IN_PROGRESS','COMPLETED')),
  phase_post_status     text        NOT NULL DEFAULT 'PENDING'
                                    CHECK (phase_post_status     IN ('PENDING','NOTIFIED','IN_PROGRESS','COMPLETED')),
  phase_delivery_status text        NOT NULL DEFAULT 'PENDING'
                                    CHECK (phase_delivery_status IN ('PENDING','NOTIFIED','IN_PROGRESS','COMPLETED')),

  photos_phase_pre      integer     NOT NULL DEFAULT 0 CHECK (photos_phase_pre      >= 0),
  photos_phase_inst     integer     NOT NULL DEFAULT 0 CHECK (photos_phase_inst     >= 0),
  photos_phase_post     integer     NOT NULL DEFAULT 0 CHECK (photos_phase_post     >= 0),
  photos_phase_delivery integer     NOT NULL DEFAULT 0 CHECK (photos_phase_delivery >= 0),

  check_in_time         time,
  check_out_time        time,
  check_in_from_photo   boolean     NOT NULL DEFAULT false,
  check_out_from_photo  boolean     NOT NULL DEFAULT false,

  session_status        text        NOT NULL DEFAULT 'ACTIVE'
                                    CHECK (session_status IN ('ACTIVE','COMPLETED','ABANDONED')),

  sharepoint_folder_url text,
  notified_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_session_day UNIQUE (site_id, technician_id, session_date)
);

COMMENT ON TABLE projects.installation_doc_sessions IS 'Estado operativo de la conversación WhatsApp del día. No es historial: es el cerebro del bot para saber dónde está en el flujo de documentación.';
COMMENT ON COLUMN projects.installation_doc_sessions.last_requested_action IS 'Última acción solicitada por el bot: FOTO_PRE, FOTO_INST, HORA_ENTRADA, FOTO_POST, etc.';
COMMENT ON COLUMN projects.installation_doc_sessions.sharepoint_folder_url IS 'URL base de la carpeta del expediente en SharePoint, creada al iniciar la sesión.';

-- ─────────────────────────────────────────────────────────────
-- 2.3 TABLA: site_installation_documents
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects.site_installation_documents (
  id                        uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                   uuid                       NOT NULL REFERENCES projects.project_sites(id) ON DELETE CASCADE,

  phase                     projects.installation_phase NOT NULL,
  document_type             projects.document_type      NOT NULL DEFAULT 'PHOTO',
  source                    projects.document_source    NOT NULL DEFAULT 'MANUAL_UPLOAD',

  file_name                 text                       NOT NULL,
  file_path                 text                       NOT NULL,
  file_size_bytes           bigint                     CHECK (file_size_bytes > 0),
  mime_type                 text,

  sharepoint_item_id        text,
  sharepoint_web_url        text,
  sharepoint_drive_id       text,
  sharepoint_folder_path    text,

  uploaded_by_technician_id uuid                       REFERENCES internal.technicians(id) ON DELETE SET NULL,
  uploaded_by_user_id       uuid,

  caption                   text,
  taken_at                  timestamptz,
  metadata                  jsonb                      NOT NULL DEFAULT '{}'::jsonb,

  created_at                timestamptz                NOT NULL DEFAULT now(),
  updated_at                timestamptz                NOT NULL DEFAULT now()
);

COMMENT ON TABLE projects.site_installation_documents IS 'Documentos fotográficos y archivos de instalación organizados por site y fase.';
COMMENT ON COLUMN projects.site_installation_documents.sharepoint_item_id IS 'ID del item en Microsoft Graph para descarga y referencia directa.';
COMMENT ON COLUMN projects.site_installation_documents.caption IS 'Texto que acompañaba la imagen en WhatsApp o descripción manual.';
COMMENT ON COLUMN projects.site_installation_documents.taken_at IS 'Timestamp de captura (EXIF o timestamp de recepción WhatsApp).';

-- ─────────────────────────────────────────────────────────────
-- 2.4 TABLA: installation_qa
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects.installation_qa (
  id                  uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id             uuid                      NOT NULL REFERENCES projects.project_sites(id) ON DELETE CASCADE,
  technician_id       uuid                      NOT NULL REFERENCES internal.technicians(id)   ON DELETE RESTRICT,
  session_date        date                      NOT NULL,

  question_text       text                      NOT NULL,
  question_at         timestamptz               NOT NULL DEFAULT now(),

  escalated_to        uuid                      REFERENCES internal.technicians(id) ON DELETE SET NULL,
  escalated_at        timestamptz,

  answer_text         text,
  answered_at         timestamptz,
  answered_by_type    projects.qa_answerer_type,
  answered_by_id      uuid,
  sent_to_technician  boolean                   NOT NULL DEFAULT false,

  topic_tags          jsonb                     NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz               NOT NULL DEFAULT now()
);

COMMENT ON TABLE projects.installation_qa IS 'Corpus RAG de preguntas/respuestas. Cada QA cerrado se promociona a ai.agent_knowledge.';
COMMENT ON COLUMN projects.installation_qa.topic_tags IS 'Tags temáticos para clustering RAG: ["acceso", "cableado", "material", "planos"]';

-- ─────────────────────────────────────────────────────────────
-- 2.5 TABLA: installation_work_log
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects.installation_work_log (
  id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               uuid         NOT NULL REFERENCES projects.project_sites(id)              ON DELETE CASCADE,
  technician_id         uuid         NOT NULL REFERENCES internal.technicians(id)                ON DELETE RESTRICT,
  work_date             date         NOT NULL,

  check_in_time         time,
  check_out_time        time,
  check_in_declared     boolean      NOT NULL DEFAULT false,
  check_out_declared    boolean      NOT NULL DEFAULT false,

  check_in_photo_ref    uuid         REFERENCES projects.site_installation_documents(id) ON DELETE SET NULL,
  check_out_photo_ref   uuid         REFERENCES projects.site_installation_documents(id) ON DELETE SET NULL,

  total_hours           numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0
      ELSE NULL
    END
  ) STORED,

  notes                 text,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_work_log_day    UNIQUE (site_id, technician_id, work_date),
  CONSTRAINT chk_times_order    CHECK  (check_out_time IS NULL OR check_in_time IS NULL OR check_out_time >= check_in_time)
);

COMMENT ON TABLE projects.installation_work_log IS 'Registro horario formal por jornada. Separado de session porque puede haber múltiples jornadas en el mismo site.';
COMMENT ON COLUMN projects.installation_work_log.total_hours IS 'Horas trabajadas calculadas automáticamente.';

-- ─────────────────────────────────────────────────────────────
-- 2.6 ÍNDICES
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_inst_sessions_site   ON projects.installation_doc_sessions (site_id);
CREATE INDEX IF NOT EXISTS idx_inst_sessions_tech   ON projects.installation_doc_sessions (technician_id);
CREATE INDEX IF NOT EXISTS idx_inst_sessions_date   ON projects.installation_doc_sessions (session_date);
CREATE INDEX IF NOT EXISTS idx_inst_sessions_active ON projects.installation_doc_sessions (session_status, session_date) WHERE session_status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_inst_docs_site       ON projects.site_installation_documents (site_id);
CREATE INDEX IF NOT EXISTS idx_inst_docs_site_phase ON projects.site_installation_documents (site_id, phase);
CREATE INDEX IF NOT EXISTS idx_inst_docs_tech       ON projects.site_installation_documents (uploaded_by_technician_id);
CREATE INDEX IF NOT EXISTS idx_inst_docs_source     ON projects.site_installation_documents (source);
CREATE INDEX IF NOT EXISTS idx_inst_docs_taken_at   ON projects.site_installation_documents (site_id, taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_inst_qa_site         ON projects.installation_qa (site_id);
CREATE INDEX IF NOT EXISTS idx_inst_qa_tech         ON projects.installation_qa (technician_id);
CREATE INDEX IF NOT EXISTS idx_inst_qa_date         ON projects.installation_qa (session_date);
CREATE INDEX IF NOT EXISTS idx_inst_qa_unanswered   ON projects.installation_qa (site_id, answered_at) WHERE answered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inst_qa_tags         ON projects.installation_qa USING gin(topic_tags);

CREATE INDEX IF NOT EXISTS idx_inst_wlog_site       ON projects.installation_work_log (site_id);
CREATE INDEX IF NOT EXISTS idx_inst_wlog_tech       ON projects.installation_work_log (technician_id);
CREATE INDEX IF NOT EXISTS idx_inst_wlog_date       ON projects.installation_work_log (work_date);

-- ─────────────────────────────────────────────────────────────
-- 2.7 TRIGGERS
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION projects.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_inst_sessions_updated_at ON projects.installation_doc_sessions;
CREATE TRIGGER trg_inst_sessions_updated_at
  BEFORE UPDATE ON projects.installation_doc_sessions
  FOR EACH ROW EXECUTE FUNCTION projects.update_updated_at();

DROP TRIGGER IF EXISTS trg_inst_docs_updated_at ON projects.site_installation_documents;
CREATE TRIGGER trg_inst_docs_updated_at
  BEFORE UPDATE ON projects.site_installation_documents
  FOR EACH ROW EXECUTE FUNCTION projects.update_updated_at();

DROP TRIGGER IF EXISTS trg_inst_wlog_updated_at ON projects.installation_work_log;
CREATE TRIGGER trg_inst_wlog_updated_at
  BEFORE UPDATE ON projects.installation_work_log
  FOR EACH ROW EXECUTE FUNCTION projects.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2.8 RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE projects.installation_doc_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.site_installation_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.installation_qa              ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.installation_work_log        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ids_select_auth"          ON projects.installation_doc_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ids_insert_admin_manager" ON projects.installation_doc_sessions FOR INSERT WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "ids_update_admin_manager" ON projects.installation_doc_sessions FOR UPDATE USING (internal.is_admin() OR internal.is_manager());
CREATE POLICY "ids_delete_admin"         ON projects.installation_doc_sessions FOR DELETE USING (internal.is_admin());

CREATE POLICY "sid_select_auth"          ON projects.site_installation_documents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sid_insert_admin_manager" ON projects.site_installation_documents FOR INSERT WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "sid_update_admin_manager" ON projects.site_installation_documents FOR UPDATE USING (internal.is_admin() OR internal.is_manager());
CREATE POLICY "sid_delete_admin_manager" ON projects.site_installation_documents FOR DELETE USING (internal.is_admin() OR internal.is_manager());

CREATE POLICY "iqa_select_auth"          ON projects.installation_qa FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "iqa_insert_admin_manager" ON projects.installation_qa FOR INSERT WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "iqa_update_admin_manager" ON projects.installation_qa FOR UPDATE USING (internal.is_admin() OR internal.is_manager());
CREATE POLICY "iqa_delete_admin"         ON projects.installation_qa FOR DELETE USING (internal.is_admin());

CREATE POLICY "iwl_select_auth"          ON projects.installation_work_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "iwl_insert_admin_manager" ON projects.installation_work_log FOR INSERT WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "iwl_update_admin_manager" ON projects.installation_work_log FOR UPDATE USING (internal.is_admin() OR internal.is_manager());
CREATE POLICY "iwl_delete_admin"         ON projects.installation_work_log FOR DELETE USING (internal.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 2.9 RPCs (6)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_technician_by_phone(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'technician', to_jsonb(t) - 'iban' - 'tax_id',
    'active_assignment', (
      SELECT jsonb_build_object(
        'assignment_id', sta.id,
        'site_id',       sta.site_id,
        'site_name',     ps.site_name,
        'project_id',    ps.project_id,
        'role',          sta.role,
        'date_from',     sta.date_from,
        'date_to',       sta.date_to,
        'site_status',   ps.site_status
      )
      FROM projects.site_technician_assignments sta
      JOIN projects.project_sites ps ON ps.id = sta.site_id
      WHERE sta.technician_id = t.id
        AND ps.is_active = true
        AND ps.site_status IN ('SCHEDULED', 'IN_PROGRESS')
        AND (sta.date_from IS NULL OR sta.date_from <= CURRENT_DATE)
        AND (sta.date_to   IS NULL OR sta.date_to   >= CURRENT_DATE)
      ORDER BY sta.created_at DESC
      LIMIT 1
    )
  )
  INTO v_result
  FROM internal.technicians t
  WHERE t.status = 'ACTIVE'
    AND (
      regexp_replace(t.contact_phone,           '[^0-9+]', '', 'g') = regexp_replace(p_phone, '[^0-9+]', '', 'g')
      OR
      regexp_replace(t.contact_phone_secondary, '[^0-9+]', '', 'g') = regexp_replace(p_phone, '[^0-9+]', '', 'g')
    )
  LIMIT 1;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_session(
  p_technician_id uuid,
  p_date          date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'session',   to_jsonb(s),
    'site',      jsonb_build_object(
                   'id',          ps.id,
                   'site_name',   ps.site_name,
                   'address',     ps.address,
                   'city',        ps.city,
                   'site_status', ps.site_status,
                   'project_id',  ps.project_id
                 ),
    'doc_count', (SELECT COUNT(*) FROM projects.site_installation_documents sid WHERE sid.site_id = s.site_id),
    'work_log',  (SELECT to_jsonb(wl) FROM projects.installation_work_log wl
                  WHERE wl.site_id = s.site_id AND wl.technician_id = s.technician_id AND wl.work_date = p_date LIMIT 1)
  )
  INTO v_result
  FROM projects.installation_doc_sessions s
  JOIN projects.project_sites ps ON ps.id = s.site_id
  WHERE s.technician_id  = p_technician_id
    AND s.session_date   = p_date
    AND s.session_status = 'ACTIVE'
  LIMIT 1;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_installation_doc_session(
  p_site_id               uuid,
  p_technician_id         uuid,
  p_session_date          date        DEFAULT CURRENT_DATE,
  p_last_requested_action text        DEFAULT NULL,
  p_phase_pre_status      text        DEFAULT NULL,
  p_phase_inst_status     text        DEFAULT NULL,
  p_phase_post_status     text        DEFAULT NULL,
  p_phase_delivery_status text        DEFAULT NULL,
  p_photos_phase_pre      integer     DEFAULT NULL,
  p_photos_phase_inst     integer     DEFAULT NULL,
  p_photos_phase_post     integer     DEFAULT NULL,
  p_photos_phase_delivery integer     DEFAULT NULL,
  p_check_in_time         time        DEFAULT NULL,
  p_check_out_time        time        DEFAULT NULL,
  p_check_in_from_photo   boolean     DEFAULT NULL,
  p_check_out_from_photo  boolean     DEFAULT NULL,
  p_session_status        text        DEFAULT NULL,
  p_sharepoint_folder_url text        DEFAULT NULL,
  p_notified_at           timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO projects.installation_doc_sessions (
    site_id, technician_id, session_date, last_requested_action,
    phase_pre_status, phase_inst_status, phase_post_status, phase_delivery_status,
    photos_phase_pre, photos_phase_inst, photos_phase_post, photos_phase_delivery,
    check_in_time, check_out_time, check_in_from_photo, check_out_from_photo,
    session_status, sharepoint_folder_url, notified_at
  )
  VALUES (
    p_site_id, p_technician_id, p_session_date, p_last_requested_action,
    COALESCE(p_phase_pre_status,'PENDING'), COALESCE(p_phase_inst_status,'PENDING'),
    COALESCE(p_phase_post_status,'PENDING'), COALESCE(p_phase_delivery_status,'PENDING'),
    COALESCE(p_photos_phase_pre,0), COALESCE(p_photos_phase_inst,0),
    COALESCE(p_photos_phase_post,0), COALESCE(p_photos_phase_delivery,0),
    p_check_in_time, p_check_out_time,
    COALESCE(p_check_in_from_photo,false), COALESCE(p_check_out_from_photo,false),
    COALESCE(p_session_status,'ACTIVE'), p_sharepoint_folder_url, p_notified_at
  )
  ON CONFLICT (site_id, technician_id, session_date) DO UPDATE SET
    last_requested_action   = COALESCE(p_last_requested_action,   installation_doc_sessions.last_requested_action),
    phase_pre_status        = COALESCE(p_phase_pre_status,        installation_doc_sessions.phase_pre_status),
    phase_inst_status       = COALESCE(p_phase_inst_status,       installation_doc_sessions.phase_inst_status),
    phase_post_status       = COALESCE(p_phase_post_status,       installation_doc_sessions.phase_post_status),
    phase_delivery_status   = COALESCE(p_phase_delivery_status,   installation_doc_sessions.phase_delivery_status),
    photos_phase_pre        = COALESCE(p_photos_phase_pre,        installation_doc_sessions.photos_phase_pre),
    photos_phase_inst       = COALESCE(p_photos_phase_inst,       installation_doc_sessions.photos_phase_inst),
    photos_phase_post       = COALESCE(p_photos_phase_post,       installation_doc_sessions.photos_phase_post),
    photos_phase_delivery   = COALESCE(p_photos_phase_delivery,   installation_doc_sessions.photos_phase_delivery),
    check_in_time           = COALESCE(p_check_in_time,           installation_doc_sessions.check_in_time),
    check_out_time          = COALESCE(p_check_out_time,          installation_doc_sessions.check_out_time),
    check_in_from_photo     = COALESCE(p_check_in_from_photo,     installation_doc_sessions.check_in_from_photo),
    check_out_from_photo    = COALESCE(p_check_out_from_photo,    installation_doc_sessions.check_out_from_photo),
    session_status          = COALESCE(p_session_status,          installation_doc_sessions.session_status),
    sharepoint_folder_url   = COALESCE(p_sharepoint_folder_url,   installation_doc_sessions.sharepoint_folder_url),
    notified_at             = COALESCE(p_notified_at,             installation_doc_sessions.notified_at),
    updated_at              = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_installation_document(
  p_site_id                   uuid,
  p_phase                     projects.installation_phase,
  p_document_type             projects.document_type      DEFAULT 'PHOTO',
  p_source                    projects.document_source    DEFAULT 'MANUAL_UPLOAD',
  p_file_name                 text                        DEFAULT NULL,
  p_file_path                 text                        DEFAULT NULL,
  p_file_size_bytes           bigint                      DEFAULT NULL,
  p_mime_type                 text                        DEFAULT NULL,
  p_sharepoint_item_id        text                        DEFAULT NULL,
  p_sharepoint_web_url        text                        DEFAULT NULL,
  p_sharepoint_drive_id       text                        DEFAULT NULL,
  p_sharepoint_folder_path    text                        DEFAULT NULL,
  p_uploaded_by_technician_id uuid                        DEFAULT NULL,
  p_uploaded_by_user_id       uuid                        DEFAULT NULL,
  p_caption                   text                        DEFAULT NULL,
  p_taken_at                  timestamptz                 DEFAULT NULL,
  p_metadata                  jsonb                       DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO projects.site_installation_documents (
    site_id, phase, document_type, source,
    file_name, file_path, file_size_bytes, mime_type,
    sharepoint_item_id, sharepoint_web_url, sharepoint_drive_id, sharepoint_folder_path,
    uploaded_by_technician_id, uploaded_by_user_id,
    caption, taken_at, metadata
  )
  VALUES (
    p_site_id, p_phase, p_document_type, p_source,
    COALESCE(p_file_name, 'document'), COALESCE(p_file_path, ''),
    p_file_size_bytes, p_mime_type,
    p_sharepoint_item_id, p_sharepoint_web_url, p_sharepoint_drive_id, p_sharepoint_folder_path,
    p_uploaded_by_technician_id, p_uploaded_by_user_id,
    p_caption, p_taken_at, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  -- Actualizar contador en sesión activa del día
  IF p_uploaded_by_technician_id IS NOT NULL AND p_source IN ('WHATSAPP', 'N8N_AUTOMATION') THEN
    UPDATE projects.installation_doc_sessions SET
      photos_phase_pre        = CASE WHEN p_phase = 'PRE_INSTALLATION'  THEN photos_phase_pre  + 1 ELSE photos_phase_pre  END,
      photos_phase_inst       = CASE WHEN p_phase = 'INSTALLATION'      THEN photos_phase_inst + 1 ELSE photos_phase_inst END,
      photos_phase_post       = CASE WHEN p_phase = 'POST_INSTALLATION' THEN photos_phase_post + 1 ELSE photos_phase_post END,
      photos_phase_delivery   = CASE WHEN p_phase = 'DELIVERY'          THEN photos_phase_delivery + 1 ELSE photos_phase_delivery END,
      updated_at = now()
    WHERE site_id = p_site_id
      AND technician_id = p_uploaded_by_technician_id
      AND session_date  = CURRENT_DATE
      AND session_status = 'ACTIVE';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_installation_qa(
  p_site_id          uuid,
  p_technician_id    uuid,
  p_session_date     date                      DEFAULT CURRENT_DATE,
  p_question_text    text                      DEFAULT NULL,
  p_question_at      timestamptz               DEFAULT now(),
  p_escalated_to     uuid                      DEFAULT NULL,
  p_answer_text      text                      DEFAULT NULL,
  p_answered_by_type projects.qa_answerer_type DEFAULT NULL,
  p_answered_by_id   uuid                      DEFAULT NULL,
  p_topic_tags       jsonb                     DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO projects.installation_qa (
    site_id, technician_id, session_date,
    question_text, question_at,
    escalated_to, escalated_at,
    answer_text, answered_at, answered_by_type, answered_by_id,
    sent_to_technician, topic_tags
  )
  VALUES (
    p_site_id, p_technician_id, p_session_date,
    p_question_text, p_question_at,
    p_escalated_to, CASE WHEN p_escalated_to IS NOT NULL THEN now() ELSE NULL END,
    p_answer_text,  CASE WHEN p_answer_text  IS NOT NULL THEN now() ELSE NULL END,
    p_answered_by_type, p_answered_by_id,
    false, COALESCE(p_topic_tags, '[]'::jsonb)
  )
  RETURNING id INTO v_id;

  -- Promocionar a knowledge base si viene con respuesta
  IF p_answer_text IS NOT NULL AND p_question_text IS NOT NULL THEN
    INSERT INTO ai.agent_knowledge (agent_id, source_type, source_ref, title, content, topic_tags, language)
    SELECT a.id, 'QA_CORPUS', 'installation_qa:' || v_id::text,
           'Q: ' || left(p_question_text, 100),
           'Pregunta: ' || p_question_text || E'\nRespuesta: ' || p_answer_text,
           p_topic_tags, 'es'
    FROM ai.agents a
    WHERE a.slug = 'installation-whatsapp' AND a.is_active = true
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_site_documentation_summary(p_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_documents',   COUNT(*),
    'phases', jsonb_build_object(
      'PRE_INSTALLATION',  jsonb_build_object('count', COUNT(*) FILTER (WHERE phase = 'PRE_INSTALLATION'),  'latest_at', MAX(created_at) FILTER (WHERE phase = 'PRE_INSTALLATION')),
      'INSTALLATION',      jsonb_build_object('count', COUNT(*) FILTER (WHERE phase = 'INSTALLATION'),      'latest_at', MAX(created_at) FILTER (WHERE phase = 'INSTALLATION')),
      'POST_INSTALLATION', jsonb_build_object('count', COUNT(*) FILTER (WHERE phase = 'POST_INSTALLATION'), 'latest_at', MAX(created_at) FILTER (WHERE phase = 'POST_INSTALLATION')),
      'DELIVERY',          jsonb_build_object('count', COUNT(*) FILTER (WHERE phase = 'DELIVERY'),          'latest_at', MAX(created_at) FILTER (WHERE phase = 'DELIVERY'))
    ),
    'phases_documented', COUNT(DISTINCT phase),
    'pending_qa',        (SELECT COUNT(*) FROM projects.installation_qa   WHERE site_id = p_site_id AND answered_at IS NULL),
    'work_log_entries',  (SELECT COUNT(*) FROM projects.installation_work_log WHERE site_id = p_site_id)
  )
  INTO v_result
  FROM projects.site_installation_documents
  WHERE site_id = p_site_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_technician_by_phone         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_session              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_installation_doc_session TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_installation_document  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_installation_qa        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_site_documentation_summary  TO authenticated, service_role;
