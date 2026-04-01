-- ============================================================
-- FASE 0: Sistema de agentes multi-propósito con memoria RAG
-- Schema: ai
-- ============================================================

-- 0.1 Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 0.2 Crear schema ai
CREATE SCHEMA IF NOT EXISTS ai;

-- 0.3 Tabla ai.agents — definición y personalidad de cada agente
CREATE TABLE IF NOT EXISTS ai.agents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text        UNIQUE NOT NULL,
  display_name  text        NOT NULL,
  description   text,
  model         text        NOT NULL DEFAULT 'qwen2.5:3b',
  provider      text        NOT NULL DEFAULT 'OLLAMA'
                            CHECK (provider IN ('OLLAMA', 'OPENAI', 'ANTHROPIC', 'AZURE_OPENAI')),
  system_prompt text,
  temperature   numeric     DEFAULT 0.3 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens    integer     CHECK (max_tokens > 0),
  tools_config  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  guardrails    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai.agents IS 'Definición y configuración de agentes inteligentes multi-propósito. Cada agente tiene personalidad, modelo y herramientas propias.';
COMMENT ON COLUMN ai.agents.slug IS 'Identificador de código único (ej: installation-whatsapp, customer-support)';
COMMENT ON COLUMN ai.agents.tools_config IS 'Herramientas habilitadas para este agente (can_request_photos, can_escalate_questions, etc.)';
COMMENT ON COLUMN ai.agents.guardrails IS 'Límites de comportamiento: temas prohibidos, max_messages_per_session, escalate_after_failed_answers';

-- 0.4 Tabla ai.agent_knowledge — base de conocimiento por agente para RAG
-- Embedding: 1536 dims (compatible OpenAI text-embedding-3-small, nomic-embed-text-v1.5)
-- Para cambiar dimensión: DROP y recrear la tabla (no hay datos iniciales)
CREATE TABLE IF NOT EXISTS ai.agent_knowledge (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          uuid        NOT NULL REFERENCES ai.agents(id) ON DELETE CASCADE,
  source_type       text        NOT NULL DEFAULT 'MANUAL'
                                CHECK (source_type IN ('MANUAL', 'QA_CORPUS', 'DOCUMENT', 'FAQ', 'PROCEDURE')),
  source_ref        text,
  title             text,
  content           text        NOT NULL,
  content_embedding vector(1536),
  topic_tags        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  language          text        NOT NULL DEFAULT 'es',
  priority          integer     NOT NULL DEFAULT 0,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai.agent_knowledge IS 'Base de conocimiento RAG por agente. Cada fila es un chunk de texto con embedding vectorial para búsqueda semántica.';
COMMENT ON COLUMN ai.agent_knowledge.content_embedding IS 'Vector 1536 dims. Compatible con OpenAI text-embedding-3-small y nomic-embed-text-v1.5 via Ollama. Nullable hasta que se genere el embedding.';
COMMENT ON COLUMN ai.agent_knowledge.source_ref IS 'Referencia al origen (ej: installation_qa:uuid, URL de documento, ruta de archivo)';
COMMENT ON COLUMN ai.agent_knowledge.topic_tags IS 'Array JSON de tags para filtrado (ej: ["acceso", "cableado", "material"])';

-- 0.5 Tabla ai.agent_conversation_context — memoria de corto plazo por conversación activa
CREATE TABLE IF NOT EXISTS ai.agent_conversation_context (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         uuid        NOT NULL REFERENCES ai.agents(id) ON DELETE CASCADE,
  external_chat_id text        NOT NULL,
  user_identifier  text        NOT NULL,
  context_data     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  message_history  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  started_at       timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_agent_chat UNIQUE (agent_id, external_chat_id)
);

COMMENT ON TABLE ai.agent_conversation_context IS 'Memoria de corto plazo por conversación activa. Sliding window de mensajes + estado del flujo actual.';
COMMENT ON COLUMN ai.agent_conversation_context.external_chat_id IS 'ID externo de la conversación (WhatsApp chat ID, session token, etc.)';
COMMENT ON COLUMN ai.agent_conversation_context.context_data IS 'Estado actual del flujo: last_action, pending_phase, site_id, etc.';
COMMENT ON COLUMN ai.agent_conversation_context.message_history IS 'Array de últimos N mensajes para contexto. Sliding window gestionado por n8n.';

-- 0.6 Índices
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_id     ON ai.agent_knowledge (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_source       ON ai.agent_knowledge (agent_id, source_type);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_tags         ON ai.agent_knowledge USING gin(topic_tags);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_active       ON ai.agent_knowledge (agent_id, is_active, priority DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_context_chat           ON ai.agent_conversation_context (agent_id, external_chat_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_activity       ON ai.agent_conversation_context (agent_id, is_active, last_activity_at DESC);
-- Nota: índice HNSW para content_embedding se crea después de cargar datos
-- CREATE INDEX ON ai.agent_knowledge USING hnsw (content_embedding vector_cosine_ops);

-- 0.7 Triggers updated_at
CREATE OR REPLACE FUNCTION ai.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_agents_updated_at ON ai.agents;
CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON ai.agents
  FOR EACH ROW EXECUTE FUNCTION ai.update_updated_at();

DROP TRIGGER IF EXISTS trg_knowledge_updated_at ON ai.agent_knowledge;
CREATE TRIGGER trg_knowledge_updated_at
  BEFORE UPDATE ON ai.agent_knowledge
  FOR EACH ROW EXECUTE FUNCTION ai.update_updated_at();

-- 0.8 RLS
ALTER TABLE ai.agents                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.agent_knowledge            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.agent_conversation_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_select_auth"    ON ai.agents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "agents_insert_admin"   ON ai.agents FOR INSERT WITH CHECK (internal.is_admin());
CREATE POLICY "agents_update_admin"   ON ai.agents FOR UPDATE USING (internal.is_admin());
CREATE POLICY "agents_delete_admin"   ON ai.agents FOR DELETE USING (internal.is_admin());

CREATE POLICY "knowledge_select_auth"          ON ai.agent_knowledge FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "knowledge_insert_admin_manager" ON ai.agent_knowledge FOR INSERT WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "knowledge_update_admin_manager" ON ai.agent_knowledge FOR UPDATE USING (internal.is_admin() OR internal.is_manager());
CREATE POLICY "knowledge_delete_admin"         ON ai.agent_knowledge FOR DELETE USING (internal.is_admin());

CREATE POLICY "context_select_admin_manager" ON ai.agent_conversation_context FOR SELECT USING (internal.is_admin() OR internal.is_manager());
CREATE POLICY "context_insert_admin_manager" ON ai.agent_conversation_context FOR INSERT WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "context_update_admin_manager" ON ai.agent_conversation_context FOR UPDATE USING (internal.is_admin() OR internal.is_manager());
CREATE POLICY "context_delete_admin"         ON ai.agent_conversation_context FOR DELETE USING (internal.is_admin());

-- 0.9 Grants
GRANT USAGE ON SCHEMA ai TO authenticated, service_role;
GRANT ALL   ON ALL TABLES IN SCHEMA ai TO service_role;
GRANT SELECT ON ai.agents          TO authenticated;
GRANT SELECT ON ai.agent_knowledge TO authenticated;

-- 0.10 RPCs públicas

CREATE OR REPLACE FUNCTION public.get_agent_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_agent jsonb;
BEGIN
  SELECT to_jsonb(a) INTO v_agent
  FROM ai.agents a
  WHERE a.slug = p_slug AND a.is_active = true;
  RETURN v_agent;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_agent_knowledge(
  p_agent_id        uuid,
  p_query_embedding vector(1536),
  p_topic_tags      text[]  DEFAULT NULL,
  p_limit           integer DEFAULT 5
)
RETURNS TABLE (
  id          uuid,
  title       text,
  content     text,
  topic_tags  jsonb,
  source_type text,
  source_ref  text,
  priority    integer,
  similarity  float
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.title,
    k.content,
    k.topic_tags,
    k.source_type,
    k.source_ref,
    k.priority,
    (1 - (k.content_embedding <=> p_query_embedding))::float AS similarity
  FROM ai.agent_knowledge k
  WHERE k.agent_id   = p_agent_id
    AND k.is_active  = true
    AND k.content_embedding IS NOT NULL
    AND (p_topic_tags IS NULL OR k.topic_tags ?| p_topic_tags)
  ORDER BY k.content_embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_agent_conversation_context(
  p_agent_id         uuid,
  p_external_chat_id text,
  p_user_identifier  text,
  p_context_data     jsonb       DEFAULT NULL,
  p_message_history  jsonb       DEFAULT NULL,
  p_expires_at       timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO ai.agent_conversation_context (
    agent_id, external_chat_id, user_identifier,
    context_data, message_history, expires_at, last_activity_at
  )
  VALUES (
    p_agent_id, p_external_chat_id, p_user_identifier,
    COALESCE(p_context_data, '{}'::jsonb),
    COALESCE(p_message_history, '[]'::jsonb),
    p_expires_at,
    now()
  )
  ON CONFLICT (agent_id, external_chat_id) DO UPDATE SET
    context_data     = CASE WHEN p_context_data    IS NOT NULL THEN p_context_data    ELSE ai.agent_conversation_context.context_data    END,
    message_history  = CASE WHEN p_message_history IS NOT NULL THEN p_message_history ELSE ai.agent_conversation_context.message_history  END,
    expires_at       = COALESCE(p_expires_at, ai.agent_conversation_context.expires_at),
    last_activity_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_by_slug                 TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_agent_knowledge            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_agent_conversation_context TO authenticated, service_role;

-- 0.11 Seed: agente de instalaciones
INSERT INTO ai.agents (slug, display_name, description, model, provider, system_prompt, temperature, tools_config, guardrails)
VALUES (
  'installation-whatsapp',
  'Asistente de Instalaciones',
  'Agente WhatsApp para documentación de instalaciones AV TECH. Solicita fotos por fase, registra horarios y escala preguntas técnicas a internos.',
  'qwen2.5:3b',
  'OLLAMA',
  'Eres el asistente de instalaciones de AV TECH Esdeveniments. Tu función es guiar a los técnicos durante las instalaciones audiovisuales: solicitar fotos organizadas por fases (pre-instalación, instalación, post-instalación, entrega), registrar horarios de entrada y salida, y escalar preguntas técnicas a los técnicos internos cuando no tengas respuesta. Responde siempre en español, de forma clara y concisa. No discutas precios, contratos ni salarios.',
  0.3,
  '{"can_request_photos": true, "can_register_hours": true, "can_escalate_questions": true, "can_identify_technician": true}'::jsonb,
  '{"max_messages_per_session": 50, "escalate_after_failed_answers": 2, "prohibited_topics": ["pricing", "contracts", "salaries"], "response_language": "es"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
