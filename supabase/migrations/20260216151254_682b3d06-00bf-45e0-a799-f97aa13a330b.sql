
-- ============================================================
-- NEXO AI Chat V2: Columnas + RPCs para ALB357 worker
-- ============================================================

-- 1.1 Nuevas columnas en ai.chat_requests
ALTER TABLE ai.chat_requests
  ADD COLUMN IF NOT EXISTS processor text NOT NULL DEFAULT 'alb357',
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS temperature numeric DEFAULT 0.2,
  ADD COLUMN IF NOT EXISTS max_tokens int DEFAULT 450,
  ADD COLUMN IF NOT EXISTS context_payload jsonb,
  ADD COLUMN IF NOT EXISTS latency_ms int,
  ADD COLUMN IF NOT EXISTS processed_by text,
  ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by text;

-- 1.2a ai_lock_next_chat_request — SECURITY DEFINER (service_role only)
CREATE OR REPLACE FUNCTION public.ai_lock_next_chat_request(
  p_processor text,
  p_lock_owner text
)
RETURNS TABLE(
  id uuid,
  conversation_id uuid,
  user_id uuid,
  mode text,
  latest_user_message_id uuid,
  status text,
  processor text,
  model text,
  temperature numeric,
  max_tokens int,
  attempt_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row ai.chat_requests%ROWTYPE;
BEGIN
  -- Pick one queued request for this processor, or a stale lock (>5 min)
  SELECT cr.* INTO v_row
  FROM ai.chat_requests cr
  WHERE (
    (cr.status = 'queued'::ai.request_status AND cr.processor = p_processor)
    OR
    (cr.status = 'processing'::ai.request_status AND cr.processor = p_processor AND cr.locked_at < now() - interval '5 minutes')
  )
  ORDER BY cr.created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN; -- no rows
  END IF;

  UPDATE ai.chat_requests cr
  SET status = 'processing'::ai.request_status,
      locked_at = now(),
      locked_by = p_lock_owner,
      attempt_count = cr.attempt_count + 1,
      updated_at = now()
  WHERE cr.id = v_row.id;

  RETURN QUERY
  SELECT v_row.id, v_row.conversation_id, v_row.user_id,
         v_row.mode::text, v_row.latest_user_message_id,
         'processing'::text AS status,
         v_row.processor, v_row.model, v_row.temperature, v_row.max_tokens,
         v_row.attempt_count + 1, v_row.created_at;
END;
$$;

-- 1.2b ai_complete_chat_request — validates locked_by
CREATE OR REPLACE FUNCTION public.ai_complete_chat_request(
  p_request_id uuid,
  p_lock_owner text,
  p_latency_ms int DEFAULT NULL,
  p_model text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE ai.chat_requests
  SET status = 'done'::ai.request_status,
      latency_ms = p_latency_ms,
      model = p_model,
      processed_by = p_lock_owner,
      updated_at = now()
  WHERE id = p_request_id
    AND status = 'processing'::ai.request_status
    AND locked_by = p_lock_owner;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Request not found, not processing, or locked by different owner';
  END IF;
  RETURN true;
END;
$$;

-- 1.2c ai_fail_chat_request
CREATE OR REPLACE FUNCTION public.ai_fail_chat_request(
  p_request_id uuid,
  p_error text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE ai.chat_requests
  SET status = 'error'::ai.request_status,
      error = p_error,
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
  WHERE id = p_request_id;
  RETURN true;
END;
$$;

-- 1.2d ai_retry_chat_request — ownership check
CREATE OR REPLACE FUNCTION public.ai_retry_chat_request(
  p_request_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_updated int;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE ai.chat_requests
  SET status = 'queued'::ai.request_status,
      error = NULL,
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
  WHERE id = p_request_id
    AND status = 'error'::ai.request_status
    AND (user_id = v_user_id OR internal.is_admin() OR internal.is_manager());

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Request not found, not in error state, or access denied';
  END IF;
  RETURN true;
END;
$$;

-- 1.2e ai_get_latest_request_status — for frontend polling
CREATE OR REPLACE FUNCTION public.ai_get_latest_request_status(
  p_conversation_id uuid
)
RETURNS TABLE(
  id uuid,
  status text,
  error text,
  attempt_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  RETURN QUERY
  SELECT cr.id, cr.status::text, cr.error, cr.attempt_count, cr.created_at
  FROM ai.chat_requests cr
  WHERE cr.conversation_id = p_conversation_id
    AND cr.user_id = v_user_id
  ORDER BY cr.created_at DESC
  LIMIT 1;
END;
$$;

-- 1.3 Modify ai_create_chat_request to accept V2 params
CREATE OR REPLACE FUNCTION public.ai_create_chat_request(
  p_conversation_id uuid,
  p_mode text DEFAULT 'general',
  p_latest_user_message_id uuid DEFAULT NULL,
  p_processor text DEFAULT 'alb357',
  p_model text DEFAULT NULL,
  p_temperature numeric DEFAULT NULL,
  p_max_tokens int DEFAULT NULL
)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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

  INSERT INTO ai.chat_requests (conversation_id, user_id, mode, latest_user_message_id, processor, model, temperature, max_tokens)
  VALUES (p_conversation_id, v_user_id, p_mode::ai.department_scope, p_latest_user_message_id, p_processor,
          COALESCE(p_model, NULL), COALESCE(p_temperature, 0.2), COALESCE(p_max_tokens, 450))
  RETURNING ai.chat_requests.id INTO v_req_id;

  RETURN QUERY SELECT v_req_id;
END;
$$;
