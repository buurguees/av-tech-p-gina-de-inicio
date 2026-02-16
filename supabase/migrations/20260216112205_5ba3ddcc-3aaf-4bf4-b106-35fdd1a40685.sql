
-- ============================================
-- POLÍTICA DE ARCHIVADO DE LOGS
-- ============================================

-- 1. Tabla de configuración de retención
CREATE TABLE IF NOT EXISTS audit.retention_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_schema TEXT NOT NULL,
  source_table TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 90,
  archive_enabled BOOLEAN NOT NULL DEFAULT true,
  last_archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_schema, source_table)
);

ALTER TABLE audit.retention_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_retention" ON audit.retention_policy
  FOR ALL USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "manager_view_retention" ON audit.retention_policy
  FOR SELECT USING (internal.is_manager());

-- 2. Tabla de archivo genérica (JSONB para flexibilidad)
CREATE TABLE IF NOT EXISTS audit.archived_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_schema TEXT NOT NULL,
  source_table TEXT NOT NULL,
  original_id UUID NOT NULL,
  record_data JSONB NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_created_at TIMESTAMPTZ
);

-- Índices para consultas eficientes
CREATE INDEX idx_archived_records_source ON audit.archived_records(source_schema, source_table);
CREATE INDEX idx_archived_records_archived_at ON audit.archived_records(archived_at);
CREATE INDEX idx_archived_records_original_id ON audit.archived_records(original_id);

ALTER TABLE audit.archived_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_access_archive" ON audit.archived_records
  FOR ALL USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

CREATE POLICY "manager_view_archive" ON audit.archived_records
  FOR SELECT USING (internal.is_manager());

-- 3. Función de archivado
CREATE OR REPLACE FUNCTION audit.archive_old_records(
  p_source_schema TEXT,
  p_source_table TEXT,
  p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_retention_days INTEGER;
  v_cutoff TIMESTAMPTZ;
  v_archived INTEGER := 0;
  v_deleted INTEGER := 0;
  v_enabled BOOLEAN;
BEGIN
  -- Get retention policy
  SELECT retention_days, archive_enabled
  INTO v_retention_days, v_enabled
  FROM audit.retention_policy
  WHERE source_schema = p_source_schema
    AND source_table = p_source_table;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No retention policy found for %.%', p_source_schema, p_source_table;
  END IF;

  IF NOT v_enabled THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER;
    RETURN;
  END IF;

  v_cutoff := now() - (v_retention_days || ' days')::INTERVAL;

  -- Archive records older than cutoff
  EXECUTE format(
    'INSERT INTO audit.archived_records (source_schema, source_table, original_id, record_data, original_created_at)
     SELECT %L, %L, id, to_jsonb(t.*), t.created_at
     FROM %I.%I t
     WHERE t.created_at < %L
     LIMIT %s',
    p_source_schema, p_source_table,
    p_source_schema, p_source_table,
    v_cutoff, p_batch_size
  );
  GET DIAGNOSTICS v_archived = ROW_COUNT;

  -- Delete archived records from source
  IF v_archived > 0 THEN
    EXECUTE format(
      'DELETE FROM %I.%I WHERE id IN (
         SELECT original_id FROM audit.archived_records
         WHERE source_schema = %L AND source_table = %L
         AND archived_at >= now() - INTERVAL ''1 minute''
       )',
      p_source_schema, p_source_table,
      p_source_schema, p_source_table
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  -- Update last archived timestamp
  UPDATE audit.retention_policy
  SET last_archived_at = now(), updated_at = now()
  WHERE source_schema = p_source_schema
    AND source_table = p_source_table;

  RETURN QUERY SELECT v_archived, v_deleted;
END;
$$;

-- 4. Función para ejecutar TODAS las políticas de archivado
CREATE OR REPLACE FUNCTION audit.run_all_archival()
RETURNS TABLE(source_schema TEXT, source_table TEXT, archived_count INTEGER, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  r RECORD;
  result RECORD;
BEGIN
  FOR r IN
    SELECT rp.source_schema AS s, rp.source_table AS t
    FROM audit.retention_policy rp
    WHERE rp.archive_enabled = true
  LOOP
    SELECT * INTO result FROM audit.archive_old_records(r.s, r.t);
    source_schema := r.s;
    source_table := r.t;
    archived_count := result.archived_count;
    deleted_count := result.deleted_count;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 5. Función para purgar archivos antiguos (limpieza de la propia tabla de archivo)
CREATE OR REPLACE FUNCTION audit.purge_old_archives(p_older_than_days INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM audit.archived_records
  WHERE archived_at < now() - (p_older_than_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 6. Seed: políticas de retención para tablas existentes
INSERT INTO audit.retention_policy (source_schema, source_table, retention_days) VALUES
  ('audit', 'events', 90)
ON CONFLICT (source_schema, source_table) DO NOTHING;
