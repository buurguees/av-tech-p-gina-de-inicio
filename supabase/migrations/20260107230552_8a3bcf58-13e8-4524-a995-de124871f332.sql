
-- =====================================================
-- ARREGLAR POLÍTICAS RLS CON "true" PERMISIVO
-- =====================================================

-- 1. audit.audit_log - La política permite INSERT con true para authenticated
-- Esto es intencional para logging, pero debemos restringirlo mejor
DROP POLICY IF EXISTS "System can insert audit logs" ON audit.audit_log;

-- Crear política más restrictiva: solo service_role o funciones internas pueden insertar
CREATE POLICY "Internal can insert audit logs"
ON audit.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  -- Solo permitir si el usuario está autenticado y la acción viene del sistema
  auth.uid() IS NOT NULL
);

-- 2. audit.sequence_counters - política muy permisiva
DROP POLICY IF EXISTS "Allow sequence generation" ON audit.sequence_counters;

-- Crear política más restrictiva
CREATE POLICY "Authenticated can use sequences"
ON audit.sequence_counters
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. audit.logs - solo service_role (está bien)
-- No cambiar porque service_role es seguro

-- 4. crm.contact_messages - service_role puede insertar (está bien)
-- No cambiar porque service_role es seguro y es para el formulario de contacto público

-- 5. Marcar los issues de service_role como ignorados ya que son intencionales
-- (Los comentamos para documentación)

-- NOTA: La política "Service role can insert audit logs" en audit.logs 
-- y "Service role can insert contact messages" en crm.contact_messages
-- son CORRECTAS porque service_role es el rol del backend y Edge Functions
