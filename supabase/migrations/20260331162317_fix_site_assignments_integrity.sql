-- ============================================================
-- FASE 1: Saneamiento de integridad referencial y RLS
-- Tablas: projects.site_technician_assignments, projects.site_visits
-- ============================================================

-- 1.1 FK faltante: site_technician_assignments.technician_id → internal.technicians(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'projects'
      AND tc.table_name = 'site_technician_assignments'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'technician_id'
  ) THEN
    ALTER TABLE projects.site_technician_assignments
      ADD CONSTRAINT sta_technician_id_fkey
      FOREIGN KEY (technician_id) REFERENCES internal.technicians(id) ON DELETE RESTRICT;
    RAISE NOTICE 'FK sta_technician_id_fkey creada correctamente';
  ELSE
    RAISE NOTICE 'FK technician_id en site_technician_assignments ya existe, omitiendo';
  END IF;
END;
$$;

-- 1.2 FK faltante: site_visits.technician_id → internal.technicians(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'projects'
      AND tc.table_name = 'site_visits'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'technician_id'
  ) THEN
    ALTER TABLE projects.site_visits
      ADD CONSTRAINT sv_technician_id_fkey
      FOREIGN KEY (technician_id) REFERENCES internal.technicians(id) ON DELETE RESTRICT;
    RAISE NOTICE 'FK sv_technician_id_fkey creada correctamente';
  ELSE
    RAISE NOTICE 'FK technician_id en site_visits ya existe, omitiendo';
  END IF;
END;
$$;

-- 1.3 RLS: site_technician_assignments — reemplazar política abierta
DROP POLICY IF EXISTS "site_assignments_access" ON projects.site_technician_assignments;

CREATE POLICY "sta_select_auth"
  ON projects.site_technician_assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sta_insert_admin_manager"
  ON projects.site_technician_assignments FOR INSERT
  WITH CHECK (internal.is_admin() OR internal.is_manager());

CREATE POLICY "sta_update_admin_manager"
  ON projects.site_technician_assignments FOR UPDATE
  USING (internal.is_admin() OR internal.is_manager());

CREATE POLICY "sta_delete_admin_manager"
  ON projects.site_technician_assignments FOR DELETE
  USING (internal.is_admin() OR internal.is_manager());

-- 1.4 RLS: site_visits — reemplazar política abierta
DROP POLICY IF EXISTS "site_visits_access" ON projects.site_visits;

CREATE POLICY "sv_select_auth"
  ON projects.site_visits FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sv_insert_admin_manager"
  ON projects.site_visits FOR INSERT
  WITH CHECK (internal.is_admin() OR internal.is_manager());

CREATE POLICY "sv_update_admin_manager"
  ON projects.site_visits FOR UPDATE
  USING (internal.is_admin() OR internal.is_manager());

CREATE POLICY "sv_delete_admin"
  ON projects.site_visits FOR DELETE
  USING (internal.is_admin());
