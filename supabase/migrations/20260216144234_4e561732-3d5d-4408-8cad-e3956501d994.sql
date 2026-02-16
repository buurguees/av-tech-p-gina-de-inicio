
-- ============================================================
-- NEXO AI MODULE - Complete Schema
-- Schema: ai (dedicated, like crm, sales, accounting, projects)
-- ============================================================

-- 1. CREATE SCHEMA
CREATE SCHEMA IF NOT EXISTS ai;

-- 2. ENUMS
CREATE TYPE ai.conversation_scope AS ENUM ('user', 'department');
CREATE TYPE ai.department_scope AS ENUM ('general', 'programming', 'marketing', 'commercial', 'administration');
CREATE TYPE ai.message_sender AS ENUM ('user', 'assistant', 'system');
CREATE TYPE ai.request_status AS ENUM ('queued', 'processing', 'done', 'error');

-- 3. TABLES

-- ai.conversations
CREATE TABLE ai.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Mi chat',
  scope ai.conversation_scope NOT NULL DEFAULT 'user',
  department ai.department_scope NOT NULL DEFAULT 'general',
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_conversations_owner ON ai.conversations(owner_user_id);

-- ai.conversation_members (for department scope)
CREATE TABLE ai.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
CREATE INDEX idx_ai_conv_members_user ON ai.conversation_members(user_id);

-- ai.messages
CREATE TABLE ai.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
  sender ai.message_sender NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  mode ai.department_scope NOT NULL DEFAULT 'general',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_messages_conv_time ON ai.messages(conversation_id, created_at);

-- ai.chat_requests (async work queue)
CREATE TABLE ai.chat_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mode ai.department_scope NOT NULL DEFAULT 'general',
  latest_user_message_id UUID REFERENCES ai.messages(id),
  status ai.request_status NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_requests_status ON ai.chat_requests(status, created_at);

-- 4. ENABLE RLS
ALTER TABLE ai.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.chat_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES

-- Helper: check if user has access to a conversation
CREATE OR REPLACE FUNCTION ai.user_can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ai, internal, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ai.conversations c
    WHERE c.id = p_conversation_id
    AND (
      -- Owner of personal conversation
      (c.scope = 'user' AND c.owner_user_id = internal.get_authorized_user_id(auth.uid()))
      -- Member of department conversation
      OR EXISTS (
        SELECT 1 FROM ai.conversation_members cm
        WHERE cm.conversation_id = c.id
        AND cm.user_id = internal.get_authorized_user_id(auth.uid())
      )
      -- Admin/Manager sees all
      OR internal.is_admin()
      OR internal.is_manager()
    )
  );
$$;

-- ai.conversations policies
CREATE POLICY "ai_conv_select" ON ai.conversations FOR SELECT
  USING (
    (scope = 'user' AND owner_user_id = internal.get_authorized_user_id(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM ai.conversation_members cm
      WHERE cm.conversation_id = id
      AND cm.user_id = internal.get_authorized_user_id(auth.uid())
    )
    OR internal.is_admin()
    OR internal.is_manager()
  );

CREATE POLICY "ai_conv_insert" ON ai.conversations FOR INSERT
  WITH CHECK (owner_user_id = internal.get_authorized_user_id(auth.uid()));

CREATE POLICY "ai_conv_update" ON ai.conversations FOR UPDATE
  USING (
    owner_user_id = internal.get_authorized_user_id(auth.uid())
    OR internal.is_admin()
  );

-- ai.conversation_members policies
CREATE POLICY "ai_members_select" ON ai.conversation_members FOR SELECT
  USING (
    user_id = internal.get_authorized_user_id(auth.uid())
    OR internal.is_admin()
    OR internal.is_manager()
  );

CREATE POLICY "ai_members_admin_all" ON ai.conversation_members FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());

-- ai.messages policies
CREATE POLICY "ai_msg_select" ON ai.messages FOR SELECT
  USING (ai.user_can_access_conversation(conversation_id));

CREATE POLICY "ai_msg_insert" ON ai.messages FOR INSERT
  WITH CHECK (
    sender = 'user'
    AND ai.user_can_access_conversation(conversation_id)
  );

-- ai.chat_requests policies
CREATE POLICY "ai_req_select" ON ai.chat_requests FOR SELECT
  USING (
    user_id = internal.get_authorized_user_id(auth.uid())
    OR internal.is_admin()
    OR internal.is_manager()
  );

CREATE POLICY "ai_req_insert" ON ai.chat_requests FOR INSERT
  WITH CHECK (
    user_id = internal.get_authorized_user_id(auth.uid())
    AND ai.user_can_access_conversation(conversation_id)
  );

-- 6. GRANT USAGE on ai schema to authenticated/anon
GRANT USAGE ON SCHEMA ai TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA ai TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ai TO authenticated;

-- 7. RPCs (SECURITY DEFINER, in public schema, operating on ai.*)

-- === CONVERSATIONS ===

CREATE OR REPLACE FUNCTION public.ai_list_conversations(
  p_scope TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID, title TEXT, scope TEXT, department TEXT,
  owner_user_id UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ, message_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai, internal, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  RETURN QUERY
  SELECT
    c.id, c.title, c.scope::TEXT, c.department::TEXT,
    c.owner_user_id, c.created_at, c.updated_at,
    (SELECT MAX(m.created_at) FROM ai.messages m WHERE m.conversation_id = c.id) AS last_message_at,
    (SELECT COUNT(*) FROM ai.messages m WHERE m.conversation_id = c.id) AS message_count
  FROM ai.conversations c
  WHERE (
    (c.scope = 'user' AND c.owner_user_id = v_user_id)
    OR EXISTS (SELECT 1 FROM ai.conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = v_user_id)
    OR internal.is_admin()
    OR internal.is_manager()
  )
  AND (p_scope IS NULL OR c.scope::TEXT = p_scope)
  AND (p_department IS NULL OR c.department::TEXT = p_department)
  AND (p_cursor IS NULL OR c.updated_at < p_cursor)
  ORDER BY c.updated_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_create_conversation(
  p_title TEXT,
  p_scope TEXT DEFAULT 'user',
  p_department TEXT DEFAULT 'general'
)
RETURNS TABLE (id UUID, title TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai, internal, public
AS $$
DECLARE
  v_user_id UUID;
  v_conv_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO ai.conversations (title, scope, department, owner_user_id)
  VALUES (p_title, p_scope::ai.conversation_scope, p_department::ai.department_scope, v_user_id)
  RETURNING ai.conversations.id INTO v_conv_id;

  -- Auto-add owner as member for department conversations
  IF p_scope = 'department' THEN
    INSERT INTO ai.conversation_members (conversation_id, user_id, role)
    VALUES (v_conv_id, v_user_id, 'owner');
  END IF;

  RETURN QUERY SELECT v_conv_id, p_title;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_get_or_create_personal_conversation()
RETURNS TABLE (id UUID, title TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai, internal, public
AS $$
DECLARE
  v_user_id UUID;
  v_conv_id UUID;
  v_title TEXT;
  v_created TIMESTAMPTZ;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Try to find existing personal conversation
  SELECT c.id, c.title, c.created_at INTO v_conv_id, v_title, v_created
  FROM ai.conversations c
  WHERE c.scope = 'user' AND c.owner_user_id = v_user_id
  ORDER BY c.created_at ASC
  LIMIT 1;

  -- Create if not exists
  IF v_conv_id IS NULL THEN
    INSERT INTO ai.conversations (title, scope, department, owner_user_id)
    VALUES ('Mi chat', 'user', 'general', v_user_id)
    RETURNING ai.conversations.id, ai.conversations.title, ai.conversations.created_at
    INTO v_conv_id, v_title, v_created;
  END IF;

  RETURN QUERY SELECT v_conv_id, v_title, v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_add_member(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai, internal, public
AS $$
DECLARE
  v_caller UUID;
BEGIN
  v_caller := internal.get_authorized_user_id(auth.uid());
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Only admin, manager, or conversation owner
  IF NOT (
    internal.is_admin() OR internal.is_manager()
    OR EXISTS (SELECT 1 FROM ai.conversations c WHERE c.id = p_conversation_id AND c.owner_user_id = v_caller)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  INSERT INTO ai.conversation_members (conversation_id, user_id, role)
  VALUES (p_conversation_id, p_user_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

-- === MESSAGES ===

CREATE OR REPLACE FUNCTION public.ai_list_messages(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID, conversation_id UUID, sender TEXT, content TEXT,
  mode TEXT, metadata JSONB, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai, internal, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF NOT ai.user_can_access_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'Access denied to conversation';
  END IF;

  RETURN QUERY
  SELECT m.id, m.conversation_id, m.sender::TEXT, m.content,
         m.mode::TEXT, m.metadata, m.created_at
  FROM ai.messages m
  WHERE m.conversation_id = p_conversation_id
  AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_add_user_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_mode TEXT DEFAULT 'general'
)
RETURNS TABLE (id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai, internal, public
AS $$
DECLARE
  v_user_id UUID;
  v_msg_id UUID;
  v_created TIMESTAMPTZ;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF NOT ai.user_can_access_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'Access denied to conversation';
  END IF;

  INSERT INTO ai.messages (conversation_id, sender, content, mode)
  VALUES (p_conversation_id, 'user', p_content, p_mode::ai.department_scope)
  RETURNING ai.messages.id, ai.messages.created_at INTO v_msg_id, v_created;

  -- Update conversation timestamp
  UPDATE ai.conversations SET updated_at = now() WHERE ai.conversations.id = p_conversation_id;

  RETURN QUERY SELECT v_msg_id, v_created;
END;
$$;

-- For Edge Function / service_role only
CREATE OR REPLACE FUNCTION public.ai_add_assistant_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_mode TEXT DEFAULT 'general',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai, internal, public
AS $$
DECLARE
  v_msg_id UUID;
  v_created TIMESTAMPTZ;
BEGIN
  -- No user check: called by service_role from Edge Function
  INSERT INTO ai.messages (conversation_id, sender, content, mode, metadata)
  VALUES (p_conversation_id, 'assistant', p_content, p_mode::ai.department_scope, p_metadata)
  RETURNING ai.messages.id, ai.messages.created_at INTO v_msg_id, v_created;

  UPDATE ai.conversations SET updated_at = now() WHERE ai.conversations.id = p_conversation_id;

  RETURN QUERY SELECT v_msg_id, v_created;
END;
$$;

-- === REQUESTS ===

CREATE OR REPLACE FUNCTION public.ai_create_chat_request(
  p_conversation_id UUID,
  p_mode TEXT DEFAULT 'general',
  p_latest_user_message_id UUID DEFAULT NULL
)
RETURNS TABLE (id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai, internal, public
AS $$
DECLARE
  v_user_id UUID;
  v_req_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF NOT ai.user_can_access_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'Access denied to conversation';
  END IF;

  INSERT INTO ai.chat_requests (conversation_id, user_id, mode, latest_user_message_id)
  VALUES (p_conversation_id, v_user_id, p_mode::ai.department_scope, p_latest_user_message_id)
  RETURNING ai.chat_requests.id INTO v_req_id;

  RETURN QUERY SELECT v_req_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_mark_request_processing(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai
AS $$
BEGIN
  UPDATE ai.chat_requests SET status = 'processing', updated_at = now()
  WHERE id = p_request_id AND status = 'queued';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_mark_request_done(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai
AS $$
BEGIN
  UPDATE ai.chat_requests SET status = 'done', updated_at = now()
  WHERE id = p_request_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_mark_request_error(p_request_id UUID, p_error TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ai
AS $$
BEGIN
  UPDATE ai.chat_requests SET status = 'error', error = p_error, updated_at = now()
  WHERE id = p_request_id;
  RETURN FOUND;
END;
$$;

-- === CONTEXT RPCs (read-only, summarized data) ===

CREATE OR REPLACE FUNCTION public.ai_get_context_general(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = internal, projects, quotes, public
AS $$
DECLARE
  v_result JSONB;
  v_user RECORD;
BEGIN
  -- User info
  SELECT au.id, au.full_name, au.email, au.department, au.job_position
  INTO v_user
  FROM internal.authorized_users au WHERE au.id = p_user_id;

  -- Build context
  SELECT jsonb_build_object(
    'user', jsonb_build_object(
      'name', v_user.full_name,
      'email', v_user.email,
      'department', v_user.department,
      'position', v_user.job_position
    ),
    'active_projects', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id, 'number', p.project_number, 'name', p.project_name, 'status', p.status
      )), '[]'::jsonb)
      FROM projects.projects p
      WHERE p.status IN ('ACTIVE', 'IN_PROGRESS', 'PLANNING')
      LIMIT 10
    ),
    'active_projects_count', (
      SELECT COUNT(*) FROM projects.projects WHERE status IN ('ACTIVE', 'IN_PROGRESS', 'PLANNING')
    ),
    'open_quotes_count', (
      SELECT COUNT(*) FROM quotes.quotes WHERE status IN ('DRAFT', 'SENT', 'PENDING')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_get_context_administration(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'pending_sale_invoices', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', i.id, 'number', i.invoice_number, 'status', i.status,
        'total', i.total, 'due_date', i.due_date
      )), '[]'::jsonb)
      FROM sales.invoices i
      WHERE i.status IN ('DRAFT', 'ISSUED', 'PARTIAL')
      ORDER BY i.due_date ASC NULLS LAST
      LIMIT 10
    ),
    'pending_sale_count', (
      SELECT COUNT(*) FROM sales.invoices WHERE status IN ('DRAFT', 'ISSUED', 'PARTIAL')
    ),
    'pending_purchase_invoices', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', pi.id, 'number', pi.invoice_number, 'status', pi.status,
        'total', pi.total, 'due_date', pi.due_date
      )), '[]'::jsonb)
      FROM sales.purchase_invoices pi
      WHERE pi.status IN ('DRAFT', 'PENDING', 'PARTIAL')
      ORDER BY pi.due_date ASC NULLS LAST
      LIMIT 10
    ),
    'pending_purchase_count', (
      SELECT COUNT(*) FROM sales.purchase_invoices WHERE status IN ('DRAFT', 'PENDING', 'PARTIAL')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_get_context_commercial(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = crm, quotes, public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'recent_clients', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id, 'number', c.client_number, 'name', c.company_name,
        'stage', c.lead_stage, 'source', c.lead_source
      )), '[]'::jsonb)
      FROM crm.clients c
      ORDER BY c.created_at DESC
      LIMIT 10
    ),
    'total_clients', (SELECT COUNT(*) FROM crm.clients),
    'open_quotes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', q.id, 'number', q.quote_number, 'status', q.status,
        'total', q.total, 'client_name', q.client_name
      )), '[]'::jsonb)
      FROM quotes.quotes q
      WHERE q.status IN ('DRAFT', 'SENT', 'PENDING')
      ORDER BY q.created_at DESC
      LIMIT 10
    ),
    'open_quotes_count', (
      SELECT COUNT(*) FROM quotes.quotes WHERE status IN ('DRAFT', 'SENT', 'PENDING')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Placeholder V1
CREATE OR REPLACE FUNCTION public.ai_get_context_marketing(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'campaigns', '[]'::jsonb,
    'social_metrics', '[]'::jsonb,
    'note', 'Marketing context will be available in V2'
  );
END;
$$;

-- Placeholder V1
CREATE OR REPLACE FUNCTION public.ai_get_context_programming(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'repositories', '[]'::jsonb,
    'deployments', '[]'::jsonb,
    'note', 'Programming context will be available in V2'
  );
END;
$$;

-- 8. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE ai.messages;
