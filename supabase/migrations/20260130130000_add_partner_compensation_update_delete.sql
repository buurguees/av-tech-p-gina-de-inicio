-- =====================================================
-- Añadir update_partner_compensation_run y delete_partner_compensation_run
-- Estas funciones son usadas por el frontend pero no existían en migraciones
-- =====================================================

-- 1. update_partner_compensation_run: actualizar nómina en DRAFT
CREATE OR REPLACE FUNCTION public.update_partner_compensation_run(
  p_compensation_run_id UUID,
  p_gross_amount NUMERIC DEFAULT NULL,
  p_irpf_rate NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
DECLARE
  v_status TEXT;
  v_irpf_amount NUMERIC(12,2);
  v_net_amount NUMERIC(12,2);
  v_gross NUMERIC(12,2);
  v_irpf NUMERIC(5,2);
BEGIN
  -- Verificar que existe y está en DRAFT
  SELECT status, gross_amount, irpf_rate INTO v_status, v_gross, v_irpf
  FROM accounting.partner_compensation_runs
  WHERE id = p_compensation_run_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retribución no encontrada: %', p_compensation_run_id;
  END IF;
  
  IF v_status != 'DRAFT' THEN
    RAISE EXCEPTION 'Solo se pueden editar retribuciones en estado DRAFT. Estado actual: %', v_status;
  END IF;
  
  -- Usar valores proporcionados o actuales
  v_gross := COALESCE(p_gross_amount, v_gross);
  v_irpf := COALESCE(p_irpf_rate, v_irpf);
  v_irpf_amount := v_gross * (v_irpf / 100);
  v_net_amount := v_gross - v_irpf_amount;
  
  UPDATE accounting.partner_compensation_runs
  SET
    gross_amount = v_gross,
    irpf_rate = v_irpf,
    irpf_amount = v_irpf_amount,
    net_amount = v_net_amount,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_compensation_run_id;
  
  RETURN TRUE;
END;
$$;

-- 2. delete_partner_compensation_run: eliminar nómina en DRAFT
CREATE OR REPLACE FUNCTION public.delete_partner_compensation_run(
  p_compensation_run_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM accounting.partner_compensation_runs
  WHERE id = p_compensation_run_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retribución no encontrada: %', p_compensation_run_id;
  END IF;
  
  IF v_status != 'DRAFT' THEN
    RAISE EXCEPTION 'Solo se pueden eliminar retribuciones en estado DRAFT. Estado actual: %', v_status;
  END IF;
  
  -- Eliminar físicamente (DRAFT no tiene asientos contables asociados)
  DELETE FROM accounting.partner_compensation_runs WHERE id = p_compensation_run_id;
  
  RETURN TRUE;
END;
$$;

-- 3. Asegurar que post_partner_compensation_run permita admin O usuario autorizado
-- (get_authorized_user_id puede devolver NULL si el usuario no está en authorized_users)
CREATE OR REPLACE FUNCTION accounting.post_partner_compensation_run(p_compensation_run_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal
AS $$
DECLARE
  v_entry_id UUID;
  v_status TEXT;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Permitir si es admin (user_roles) O si está en authorized_users
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    ) INTO v_is_admin;
    IF NOT COALESCE(v_is_admin, false) THEN
      RAISE EXCEPTION 'Usuario no autorizado';
    END IF;
  END IF;
  
  SELECT status INTO v_status FROM accounting.partner_compensation_runs WHERE id = p_compensation_run_id;
  IF v_status != 'DRAFT' THEN
    RAISE EXCEPTION 'Solo se pueden postear retribuciones en estado DRAFT. Estado actual: %', v_status;
  END IF;
  
  v_entry_id := accounting.create_partner_compensation_entry(p_compensation_run_id);
  RETURN v_entry_id;
END;
$$;
