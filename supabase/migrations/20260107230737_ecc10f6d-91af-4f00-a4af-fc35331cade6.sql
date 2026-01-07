
-- =====================================================
-- RATE LIMITING TABLE
-- Para proteger contra ataques de fuerza bruta
-- =====================================================

-- Crear schema para rate limiting si no existe
CREATE SCHEMA IF NOT EXISTS security;

-- Tabla para almacenar intentos de login
CREATE TABLE IF NOT EXISTS security.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email o IP
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'ip')),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  ip_address INET
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier 
ON security.login_attempts(identifier, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_cleanup 
ON security.login_attempts(attempted_at);

-- Habilitar RLS
ALTER TABLE security.login_attempts ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede acceder (Edge Functions)
CREATE POLICY "Service role can manage login attempts"
ON security.login_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Función para verificar rate limit
CREATE OR REPLACE FUNCTION security.check_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT DEFAULT 'email',
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining_attempts INTEGER,
  retry_after_seconds INTEGER,
  total_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = security, public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_attempt_count INTEGER;
  v_oldest_attempt TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Contar intentos fallidos en la ventana de tiempo
  SELECT COUNT(*), MIN(attempted_at)
  INTO v_attempt_count, v_oldest_attempt
  FROM security.login_attempts
  WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type
    AND attempted_at >= v_window_start
    AND success = false;
  
  -- Calcular resultado
  IF v_attempt_count >= p_max_attempts THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      0::INTEGER,
      GREATEST(0, EXTRACT(EPOCH FROM (v_oldest_attempt + (p_window_minutes || ' minutes')::INTERVAL - now()))::INTEGER),
      v_attempt_count::INTEGER;
  ELSE
    RETURN QUERY SELECT 
      true::BOOLEAN,
      (p_max_attempts - v_attempt_count)::INTEGER,
      0::INTEGER,
      v_attempt_count::INTEGER;
  END IF;
END;
$$;

-- Función para registrar intento de login
CREATE OR REPLACE FUNCTION security.record_login_attempt(
  p_identifier TEXT,
  p_identifier_type TEXT DEFAULT 'email',
  p_success BOOLEAN DEFAULT false,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = security, public
AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO security.login_attempts (
    identifier,
    identifier_type,
    success,
    ip_address,
    user_agent
  ) VALUES (
    p_identifier,
    p_identifier_type,
    p_success,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_attempt_id;
  
  RETURN v_attempt_id;
END;
$$;

-- Función para limpiar intentos antiguos (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION security.cleanup_old_attempts(
  p_older_than_hours INTEGER DEFAULT 24
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = security, public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM security.login_attempts
  WHERE attempted_at < now() - (p_older_than_hours || ' hours')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Función para resetear rate limit (para admins)
CREATE OR REPLACE FUNCTION security.reset_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT DEFAULT 'email'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = security, public
AS $$
BEGIN
  DELETE FROM security.login_attempts
  WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type;
  
  RETURN true;
END;
$$;
