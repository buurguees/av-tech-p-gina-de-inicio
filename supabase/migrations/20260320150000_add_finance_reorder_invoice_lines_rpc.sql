-- Migration: add finance_reorder_invoice_lines RPC
-- Adds an atomic RPC to reorder invoice lines by position, mirroring update_quote_lines_order.
-- Called from EditInvoicePage after saving line content changes.

CREATE OR REPLACE FUNCTION public.finance_reorder_invoice_lines(
  p_invoice_id UUID,
  p_line_ids   UUID[]
) RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_line_id UUID;
  v_order   INTEGER;
BEGIN
  -- Authorization check
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;

  -- Update line_order for each line based on its position in the array
  FOR v_order IN 1..array_length(p_line_ids, 1) LOOP
    v_line_id := p_line_ids[v_order];

    UPDATE sales.invoice_lines
    SET line_order = v_order,
        updated_at = NOW()
    WHERE id         = v_line_id
      AND invoice_id = p_invoice_id;
  END LOOP;

  RETURN TRUE;
END;
$$;

ALTER FUNCTION public.finance_reorder_invoice_lines(UUID, UUID[]) OWNER TO postgres;

GRANT ALL ON FUNCTION public.finance_reorder_invoice_lines(UUID, UUID[]) TO anon;
GRANT ALL ON FUNCTION public.finance_reorder_invoice_lines(UUID, UUID[]) TO authenticated;
GRANT ALL ON FUNCTION public.finance_reorder_invoice_lines(UUID, UUID[]) TO service_role;
