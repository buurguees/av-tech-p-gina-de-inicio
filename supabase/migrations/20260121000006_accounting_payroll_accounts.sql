-- ============================================
-- CUENTAS CONTABLES PARA NÓMINAS Y RETRIBUCIONES
-- ============================================

-- Insertar cuentas contables necesarias (si no existen)
INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, description, is_active) VALUES
  -- GASTOS PERSONAL
  ('640000', 'Sueldos y salarios', 'EXPENSE', 'Gastos en sueldos y salarios de empleados y socios', true),
  ('640100', 'Sueldos empleados', 'EXPENSE', 'Sueldos de empleados (opcional, subcuenta de 640000)', true),
  ('640200', 'Retribuciones socios', 'EXPENSE', 'Retribuciones de socios y administradores (opcional, subcuenta de 640000)', true),
  ('642000', 'Seguridad Social a cargo empresa', 'EXPENSE', 'Cuotas de Seguridad Social a cargo de la empresa (preparado para futuro)', true),
  
  -- PASIVO
  ('465000', 'Remuneraciones pendientes de pago', 'LIABILITY', 'Nóminas y retribuciones pendientes de pago', true),
  ('476000', 'Organismos SS acreedores', 'LIABILITY', 'Seguridad Social pendiente de pago (preparado para futuro)', true)
ON CONFLICT (account_code) DO UPDATE
  SET account_name = EXCLUDED.account_name,
      description = EXCLUDED.description,
      is_active = true;

-- Bloquear cuentas críticas (no borrables)
UPDATE accounting.chart_of_accounts
SET is_active = true
WHERE account_code IN ('640000', '640100', '640200', '465000', '475100', '476000', '572000');
