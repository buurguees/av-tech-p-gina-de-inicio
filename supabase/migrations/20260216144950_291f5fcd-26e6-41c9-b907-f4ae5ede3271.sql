
-- RPC to load a chat request for edge function processing (SECURITY DEFINER to access ai schema)
CREATE OR REPLACE FUNCTION public.ai_get_chat_request_for_processing(p_request_id uuid)
RETURNS TABLE(
  id uuid,
  conversation_id uuid,
  user_id uuid,
  mode text,
  latest_user_message_id uuid,
  status text,
  error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.conversation_id, r.user_id, r.mode::text, r.latest_user_message_id, r.status::text, r.error
  FROM ai.chat_requests r
  WHERE r.id = p_request_id;
END;
$$;

-- RPC to get a single message content (SECURITY DEFINER to access ai schema)
CREATE OR REPLACE FUNCTION public.ai_get_message_content(p_message_id uuid)
RETURNS TABLE(content text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT m.content
  FROM ai.messages m
  WHERE m.id = p_message_id;
END;
$$;
