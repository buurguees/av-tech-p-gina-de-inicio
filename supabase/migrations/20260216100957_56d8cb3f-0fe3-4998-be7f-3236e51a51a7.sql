
-- ============================================================
-- TASKS & IN-APP NOTIFICATIONS — TABLES FIRST
-- ============================================================

-- 1. TASKS TABLE
CREATE TABLE internal.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'TODO',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  due_date DATE,
  start_date DATE,
  completed_at TIMESTAMPTZ,
  project_id UUID,
  site_id UUID,
  quote_id UUID,
  invoice_id UUID,
  visit_id UUID,
  tags TEXT[],
  source TEXT DEFAULT 'manual',
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- 2. TASK ASSIGNEES
CREATE TABLE internal.task_assignees (
  task_id UUID NOT NULL REFERENCES internal.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_in_task TEXT NOT NULL DEFAULT 'ASSIGNEE',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

-- 3. TASK ACTIVITY
CREATE TABLE internal.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES internal.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'COMMENT',
  message TEXT,
  meta JSONB
);

-- 4. USER NOTIFICATIONS
CREATE TABLE internal.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  dedupe_key TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tasks_status_due ON internal.tasks (status, due_date);
CREATE INDEX idx_tasks_project ON internal.tasks (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_tasks_site ON internal.tasks (site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_tasks_created_by ON internal.tasks (created_by);
CREATE INDEX idx_tasks_updated ON internal.tasks (updated_at DESC);
CREATE INDEX idx_task_activity_task ON internal.task_activity (task_id, created_at DESC);
CREATE INDEX idx_notifications_user_created ON internal.user_notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON internal.user_notifications (user_id, is_read) WHERE is_read = false;
CREATE UNIQUE INDEX idx_notifications_dedupe ON internal.user_notifications (dedupe_key) WHERE dedupe_key IS NOT NULL;

-- ============================================================
-- VALIDATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION internal.validate_task_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid task status: %', NEW.status;
  END IF;
  IF NEW.priority NOT IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT') THEN
    RAISE EXCEPTION 'Invalid task priority: %', NEW.priority;
  END IF;
  IF NEW.status = 'DONE' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  IF NEW.status <> 'DONE' THEN
    NEW.completed_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_task
  BEFORE INSERT OR UPDATE ON internal.tasks
  FOR EACH ROW EXECUTE FUNCTION internal.validate_task_status();

-- ============================================================
-- RLS (after all tables exist)
-- ============================================================
ALTER TABLE internal.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.user_notifications ENABLE ROW LEVEL SECURITY;

-- Tasks RLS
CREATE POLICY "tasks_admin_manager_all" ON internal.tasks FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());

CREATE POLICY "tasks_user_select_assigned" ON internal.tasks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM internal.task_assignees ta WHERE ta.task_id = id AND ta.user_id = internal.get_authorized_user_id(auth.uid()))
    OR created_by = internal.get_authorized_user_id(auth.uid())
  );

CREATE POLICY "tasks_user_insert_own" ON internal.tasks FOR INSERT
  WITH CHECK (created_by = internal.get_authorized_user_id(auth.uid()));

CREATE POLICY "tasks_user_update_assigned" ON internal.tasks FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM internal.task_assignees ta WHERE ta.task_id = id AND ta.user_id = internal.get_authorized_user_id(auth.uid()) AND ta.role_in_task IN ('OWNER', 'ASSIGNEE'))
    OR created_by = internal.get_authorized_user_id(auth.uid())
  );

-- Task assignees RLS
CREATE POLICY "task_assignees_admin_manager" ON internal.task_assignees FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());

CREATE POLICY "task_assignees_user_select" ON internal.task_assignees FOR SELECT
  USING (user_id = internal.get_authorized_user_id(auth.uid()));

CREATE POLICY "task_assignees_user_insert" ON internal.task_assignees FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM internal.tasks t WHERE t.id = task_id AND t.created_by = internal.get_authorized_user_id(auth.uid())));

-- Task activity RLS
CREATE POLICY "task_activity_admin_manager" ON internal.task_activity FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());

CREATE POLICY "task_activity_user_select" ON internal.task_activity FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM internal.task_assignees ta WHERE ta.task_id = task_id AND ta.user_id = internal.get_authorized_user_id(auth.uid()))
    OR EXISTS (SELECT 1 FROM internal.tasks t WHERE t.id = task_id AND t.created_by = internal.get_authorized_user_id(auth.uid()))
  );

CREATE POLICY "task_activity_user_insert" ON internal.task_activity FOR INSERT
  WITH CHECK (created_by = internal.get_authorized_user_id(auth.uid()));

-- Notifications RLS
CREATE POLICY "notifications_user_own" ON internal.user_notifications FOR ALL
  USING (user_id = internal.get_authorized_user_id(auth.uid()))
  WITH CHECK (user_id = internal.get_authorized_user_id(auth.uid()));

CREATE POLICY "notifications_admin_select" ON internal.user_notifications FOR SELECT
  USING (internal.is_admin());

-- ============================================================
-- RPCs — TASKS
-- ============================================================

CREATE OR REPLACE FUNCTION public.tasks_create(
  p_title TEXT, p_description TEXT DEFAULT NULL, p_priority TEXT DEFAULT 'MEDIUM',
  p_due_date DATE DEFAULT NULL, p_start_date DATE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL, p_site_id UUID DEFAULT NULL,
  p_quote_id UUID DEFAULT NULL, p_invoice_id UUID DEFAULT NULL, p_visit_id UUID DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL, p_assignee_ids UUID[] DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_user_id UUID; v_task_id UUID; v_assignee UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO internal.tasks (created_by, title, description, priority, due_date, start_date,
    project_id, site_id, quote_id, invoice_id, visit_id, tags, source)
  VALUES (v_user_id, p_title, p_description, p_priority, p_due_date, p_start_date,
    p_project_id, p_site_id, p_quote_id, p_invoice_id, p_visit_id, p_tags, 'manual')
  RETURNING id INTO v_task_id;

  INSERT INTO internal.task_assignees (task_id, user_id, role_in_task) VALUES (v_task_id, v_user_id, 'OWNER');

  IF p_assignee_ids IS NOT NULL THEN
    FOREACH v_assignee IN ARRAY p_assignee_ids LOOP
      IF v_assignee <> v_user_id THEN
        INSERT INTO internal.task_assignees (task_id, user_id, role_in_task) VALUES (v_task_id, v_assignee, 'ASSIGNEE') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO internal.task_activity (task_id, created_by, type, message) VALUES (v_task_id, v_user_id, 'STATUS_CHANGE', 'Tarea creada');
  RETURN v_task_id;
END; $$;

CREATE OR REPLACE FUNCTION public.tasks_update(
  p_task_id UUID, p_title TEXT DEFAULT NULL, p_description TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL, p_due_date DATE DEFAULT NULL,
  p_start_date DATE DEFAULT NULL, p_tags TEXT[] DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE internal.tasks SET title = COALESCE(p_title, title), description = COALESCE(p_description, description),
    priority = COALESCE(p_priority, priority), due_date = COALESCE(p_due_date, due_date),
    start_date = COALESCE(p_start_date, start_date), tags = COALESCE(p_tags, tags)
  WHERE id = p_task_id;
  INSERT INTO internal.task_activity (task_id, created_by, type, message) VALUES (p_task_id, v_user_id, 'FIELD_CHANGE', 'Tarea actualizada');
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.tasks_set_status(p_task_id UUID, p_status TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_user_id UUID; v_old TEXT;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT status INTO v_old FROM internal.tasks WHERE id = p_task_id;
  UPDATE internal.tasks SET status = p_status WHERE id = p_task_id;
  INSERT INTO internal.task_activity (task_id, created_by, type, message, meta)
  VALUES (p_task_id, v_user_id, 'STATUS_CHANGE', 'Estado: ' || v_old || ' → ' || p_status,
    jsonb_build_object('old_status', v_old, 'new_status', p_status));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.tasks_list_for_user(
  p_user_id UUID DEFAULT NULL, p_status TEXT DEFAULT NULL, p_priority TEXT DEFAULT NULL,
  p_due_today BOOLEAN DEFAULT false, p_project_id UUID DEFAULT NULL, p_site_id UUID DEFAULT NULL,
  p_include_archived BOOLEAN DEFAULT false, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0
) RETURNS TABLE(
  id UUID, title TEXT, description TEXT, status TEXT, priority TEXT,
  due_date DATE, start_date DATE, completed_at TIMESTAMPTZ,
  project_id UUID, project_name TEXT, site_id UUID, site_name TEXT,
  quote_id UUID, invoice_id UUID, visit_id UUID,
  tags TEXT[], source TEXT, is_archived BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  created_by UUID, created_by_name TEXT, assignee_count INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, internal.get_authorized_user_id(auth.uid()));
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT DISTINCT t.id, t.title, t.description, t.status::TEXT, t.priority::TEXT,
    t.due_date, t.start_date, t.completed_at,
    t.project_id, COALESCE(pp.project_name, '')::TEXT, t.site_id, COALESCE(ps.site_name, '')::TEXT,
    t.quote_id, t.invoice_id, t.visit_id, t.tags, t.source, t.is_archived,
    t.created_at, t.updated_at, t.created_by, COALESCE(au.full_name, '')::TEXT,
    (SELECT count(*)::INT FROM internal.task_assignees ta2 WHERE ta2.task_id = t.id)
  FROM internal.tasks t
  LEFT JOIN internal.task_assignees ta ON ta.task_id = t.id
  LEFT JOIN projects.projects pp ON pp.id = t.project_id
  LEFT JOIN projects.project_sites ps ON ps.id = t.site_id
  LEFT JOIN internal.authorized_users au ON au.id = t.created_by
  WHERE (ta.user_id = v_user_id OR t.created_by = v_user_id OR internal.is_admin() OR internal.is_manager())
    AND (p_status IS NULL OR t.status = p_status)
    AND (p_priority IS NULL OR t.priority = p_priority)
    AND (NOT p_due_today OR t.due_date = CURRENT_DATE)
    AND (p_project_id IS NULL OR t.project_id = p_project_id)
    AND (p_site_id IS NULL OR t.site_id = p_site_id)
    AND (p_include_archived OR NOT t.is_archived)
    AND t.status <> 'CANCELLED'
  ORDER BY t.updated_at DESC, t.id
  LIMIT p_limit OFFSET p_offset;
END; $$;

CREATE OR REPLACE FUNCTION public.tasks_get(p_task_id UUID) RETURNS TABLE(
  id UUID, title TEXT, description TEXT, status TEXT, priority TEXT,
  due_date DATE, start_date DATE, completed_at TIMESTAMPTZ,
  project_id UUID, project_name TEXT, site_id UUID, site_name TEXT,
  quote_id UUID, invoice_id UUID, visit_id UUID,
  tags TEXT[], source TEXT, is_archived BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, created_by UUID, created_by_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.description, t.status::TEXT, t.priority::TEXT,
    t.due_date, t.start_date, t.completed_at,
    t.project_id, COALESCE(pp.project_name, '')::TEXT, t.site_id, COALESCE(ps.site_name, '')::TEXT,
    t.quote_id, t.invoice_id, t.visit_id, t.tags, t.source, t.is_archived,
    t.created_at, t.updated_at, t.created_by, COALESCE(au.full_name, '')::TEXT
  FROM internal.tasks t
  LEFT JOIN projects.projects pp ON pp.id = t.project_id
  LEFT JOIN projects.project_sites ps ON ps.id = t.site_id
  LEFT JOIN internal.authorized_users au ON au.id = t.created_by
  WHERE t.id = p_task_id;
END; $$;

CREATE OR REPLACE FUNCTION public.tasks_get_assignees(p_task_id UUID) RETURNS TABLE(
  user_id UUID, user_name TEXT, role_in_task TEXT, assigned_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
BEGIN
  RETURN QUERY
  SELECT ta.user_id, COALESCE(au.full_name, '')::TEXT, ta.role_in_task, ta.assigned_at
  FROM internal.task_assignees ta
  LEFT JOIN internal.authorized_users au ON au.id = ta.user_id
  WHERE ta.task_id = p_task_id ORDER BY ta.role_in_task, ta.assigned_at;
END; $$;

CREATE OR REPLACE FUNCTION public.tasks_get_activity(p_task_id UUID) RETURNS TABLE(
  id UUID, created_at TIMESTAMPTZ, created_by UUID, created_by_name TEXT, type TEXT, message TEXT, meta JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.created_at, a.created_by, COALESCE(au.full_name, '')::TEXT, a.type, a.message, a.meta
  FROM internal.task_activity a
  LEFT JOIN internal.authorized_users au ON au.id = a.created_by
  WHERE a.task_id = p_task_id ORDER BY a.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.tasks_add_comment(p_task_id UUID, p_message TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_user_id UUID; v_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO internal.task_activity (task_id, created_by, type, message) VALUES (p_task_id, v_user_id, 'COMMENT', p_message) RETURNING id INTO v_id;
  UPDATE internal.tasks SET updated_at = now() WHERE id = p_task_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.tasks_assign(p_task_id UUID, p_user_id UUID, p_role TEXT DEFAULT 'ASSIGNEE') RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_caller UUID; v_name TEXT;
BEGIN
  v_caller := internal.get_authorized_user_id(auth.uid());
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO internal.task_assignees (task_id, user_id, role_in_task) VALUES (p_task_id, p_user_id, p_role)
    ON CONFLICT (task_id, user_id) DO UPDATE SET role_in_task = p_role;
  SELECT full_name INTO v_name FROM internal.authorized_users WHERE id = p_user_id;
  INSERT INTO internal.task_activity (task_id, created_by, type, message, meta)
  VALUES (p_task_id, v_caller, 'ASSIGNMENT', 'Asignado: ' || COALESCE(v_name, ''), jsonb_build_object('user_id', p_user_id, 'role', p_role));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.tasks_unassign(p_task_id UUID, p_user_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_caller UUID; v_name TEXT;
BEGIN
  v_caller := internal.get_authorized_user_id(auth.uid());
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM internal.task_assignees WHERE task_id = p_task_id AND user_id = p_user_id;
  SELECT full_name INTO v_name FROM internal.authorized_users WHERE id = p_user_id;
  INSERT INTO internal.task_activity (task_id, created_by, type, message) VALUES (p_task_id, v_caller, 'ASSIGNMENT', 'Desasignado: ' || COALESCE(v_name, ''));
  RETURN true;
END; $$;

-- ============================================================
-- RPCs — NOTIFICATIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.notifications_list(
  p_user_id UUID DEFAULT NULL, p_limit INT DEFAULT 20, p_only_unread BOOLEAN DEFAULT false
) RETURNS TABLE(
  id UUID, created_at TIMESTAMPTZ, type TEXT, severity TEXT, title TEXT, message TEXT,
  action_url TEXT, entity_type TEXT, entity_id UUID, is_read BOOLEAN, read_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, internal.get_authorized_user_id(auth.uid()));
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT n.id, n.created_at, n.type, n.severity, n.title, n.message, n.action_url,
    n.entity_type, n.entity_id, n.is_read, n.read_at
  FROM internal.user_notifications n
  WHERE n.user_id = v_user_id AND (NOT p_only_unread OR NOT n.is_read)
  ORDER BY n.created_at DESC LIMIT p_limit;
END; $$;

CREATE OR REPLACE FUNCTION public.notifications_count_unread(p_user_id UUID DEFAULT NULL) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_user_id UUID; v_count INT;
BEGIN
  v_user_id := COALESCE(p_user_id, internal.get_authorized_user_id(auth.uid()));
  IF v_user_id IS NULL THEN RETURN 0; END IF;
  SELECT count(*)::INT INTO v_count FROM internal.user_notifications WHERE user_id = v_user_id AND NOT is_read;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.notifications_mark_read(p_notification_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
BEGIN
  UPDATE internal.user_notifications SET is_read = true, read_at = now()
  WHERE id = p_notification_id AND user_id = internal.get_authorized_user_id(auth.uid());
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.notifications_mark_all_read(p_user_id UUID DEFAULT NULL) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE v_user_id UUID; v_count INT;
BEGIN
  v_user_id := COALESCE(p_user_id, internal.get_authorized_user_id(auth.uid()));
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE internal.user_notifications SET is_read = true, read_at = now() WHERE user_id = v_user_id AND NOT is_read;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.notifications_refresh_for_user(p_user_id UUID DEFAULT NULL) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal AS $$
DECLARE
  v_user_id UUID; v_count INT := 0; v_today DATE := CURRENT_DATE;
  v_dedupe TEXT; v_roles TEXT[]; v_is_admin BOOLEAN; v_is_manager BOOLEAN; rec RECORD;
BEGIN
  v_user_id := COALESCE(p_user_id, internal.get_authorized_user_id(auth.uid()));
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  SELECT array_agg(ur.role::TEXT) INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = (SELECT auth_user_id FROM internal.authorized_users WHERE id = v_user_id);

  v_is_admin := 'admin' = ANY(COALESCE(v_roles, ARRAY[]::TEXT[]));
  v_is_manager := 'manager' = ANY(COALESCE(v_roles, ARRAY[]::TEXT[]));

  -- Sites starting today (manager/admin)
  IF v_is_admin OR v_is_manager THEN
    FOR rec IN
      SELECT ps.id AS site_id, ps.site_name, pp.project_name, pp.id AS proj_id
      FROM projects.project_sites ps
      JOIN projects.projects pp ON pp.id = ps.project_id
      WHERE ps.planned_start_date = v_today AND ps.status NOT IN ('COMPLETED', 'ARCHIVED', 'CANCELLED')
    LOOP
      v_dedupe := v_user_id || ':SITE_STARTS_TODAY:' || rec.site_id || ':' || v_today;
      INSERT INTO internal.user_notifications (user_id, type, severity, title, message, action_url, entity_type, entity_id, dedupe_key)
      VALUES (v_user_id, 'SITE_STARTS_TODAY', 'INFO', 'Site empieza hoy: ' || rec.site_name,
        'El site "' || rec.site_name || '" del proyecto "' || rec.project_name || '" comienza hoy.',
        '/projects/' || rec.proj_id || '/sites/' || rec.site_id, 'site', rec.site_id, v_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  -- Sites ready to invoice (admin/manager)
  IF v_is_admin OR v_is_manager THEN
    FOR rec IN
      SELECT ps.id AS site_id, ps.site_name, pp.project_name, pp.id AS proj_id
      FROM projects.project_sites ps
      JOIN projects.projects pp ON pp.id = ps.project_id
      WHERE ps.status = 'READY_TO_INVOICE'
    LOOP
      v_dedupe := v_user_id || ':SITE_READY_INVOICE:' || rec.site_id || ':' || v_today;
      INSERT INTO internal.user_notifications (user_id, type, severity, title, message, action_url, entity_type, entity_id, dedupe_key)
      VALUES (v_user_id, 'SITE_READY_INVOICE', 'WARNING', 'Site listo para facturar: ' || rec.site_name,
        'El site "' || rec.site_name || '" está listo para facturar.',
        '/projects/' || rec.proj_id || '/sites/' || rec.site_id, 'site', rec.site_id, v_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  -- Overdue invoices (admin)
  IF v_is_admin THEN
    FOR rec IN
      SELECT i.id AS inv_id, i.invoice_number, i.due_date, i.pending_amount
      FROM sales.invoices i
      WHERE i.status IN ('ISSUED', 'PARTIAL') AND i.due_date < v_today AND i.pending_amount > 0
    LOOP
      v_dedupe := v_user_id || ':INVOICE_OVERDUE:' || rec.inv_id || ':' || v_today;
      INSERT INTO internal.user_notifications (user_id, type, severity, title, message, action_url, entity_type, entity_id, dedupe_key)
      VALUES (v_user_id, 'INVOICE_OVERDUE', 'CRITICAL', 'Factura vencida: ' || rec.invoice_number,
        'Factura ' || rec.invoice_number || ' venció el ' || rec.due_date || '. Pendiente: ' || rec.pending_amount || '€',
        '/invoices/' || rec.inv_id, 'invoice', rec.inv_id, v_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  -- Invoices due in 7 days (admin)
  IF v_is_admin THEN
    FOR rec IN
      SELECT i.id AS inv_id, i.invoice_number, i.due_date, i.pending_amount
      FROM sales.invoices i
      WHERE i.status IN ('ISSUED', 'PARTIAL') AND i.due_date BETWEEN v_today AND v_today + 7 AND i.pending_amount > 0
    LOOP
      v_dedupe := v_user_id || ':INVOICE_DUE_SOON:' || rec.inv_id || ':' || v_today;
      INSERT INTO internal.user_notifications (user_id, type, severity, title, message, action_url, entity_type, entity_id, dedupe_key)
      VALUES (v_user_id, 'INVOICE_DUE_SOON', 'WARNING', 'Factura vence pronto: ' || rec.invoice_number,
        'Factura ' || rec.invoice_number || ' vence el ' || rec.due_date || '. Pendiente: ' || rec.pending_amount || '€',
        '/invoices/' || rec.inv_id, 'invoice', rec.inv_id, v_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN v_count;
END; $$;
