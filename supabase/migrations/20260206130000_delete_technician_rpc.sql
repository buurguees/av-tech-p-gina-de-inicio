-- Migration: Create delete_technician RPC function
-- This allows admins to delete technicians that have no associated invoices

DROP FUNCTION IF EXISTS public.delete_technician(UUID);

CREATE OR REPLACE FUNCTION public.delete_technician(
    p_technician_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, sales, public
AS $$
DECLARE
    v_invoice_count INTEGER;
BEGIN
    -- Check if technician exists
    IF NOT EXISTS (SELECT 1 FROM internal.technicians WHERE id = p_technician_id) THEN
        RAISE EXCEPTION 'El técnico no existe';
    END IF;

    -- Check for associated purchase invoices
    SELECT COUNT(*) INTO v_invoice_count
    FROM sales.purchase_invoices
    WHERE technician_id = p_technician_id;

    IF v_invoice_count > 0 THEN
        RAISE EXCEPTION 'No se puede eliminar el técnico porque tiene % factura(s) de compra asociada(s)', v_invoice_count;
    END IF;

    -- Delete the technician
    DELETE FROM internal.technicians WHERE id = p_technician_id;

    RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_technician(UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_technician(UUID) IS 'Elimina un técnico si no tiene facturas de compra asociadas';
