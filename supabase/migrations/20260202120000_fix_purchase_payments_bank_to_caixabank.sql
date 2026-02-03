--
-- Migración: Reasignar pagos de compras de Revolut a CaixaBank
-- Contexto: Los pagos de compras deben ir a CaixaBank. Revolut solo para nóminas.
--

-- RPC: Reasignar pagos de compras que están en Revolut a CaixaBank
-- Parámetros: IDs de las cuentas bancarias (obtener desde Ajustes > Preferencias)
-- Retorna: Número de pagos actualizados
CREATE OR REPLACE FUNCTION public.fix_purchase_payments_bank_to_caixabank(
  p_revolut_bank_id TEXT,
  p_caixabank_bank_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_revolut_bank_id IS NULL OR p_caixabank_bank_id IS NULL THEN
    RAISE EXCEPTION 'Se requieren ambos parámetros: p_revolut_bank_id y p_caixabank_bank_id';
  END IF;

  IF p_revolut_bank_id = p_caixabank_bank_id THEN
    RAISE EXCEPTION 'Los IDs de Revolut y CaixaBank deben ser diferentes';
  END IF;

  UPDATE sales.purchase_invoice_payments
  SET company_bank_account_id = p_caixabank_bank_id
  WHERE company_bank_account_id = p_revolut_bank_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.fix_purchase_payments_bank_to_caixabank(TEXT, TEXT) IS 
'Reasigna pagos de compras de Revolut a CaixaBank. Revolut debe usarse solo para nóminas. Ejecutar desde SQL Editor con los IDs de Ajustes > Preferencias.';

GRANT EXECUTE ON FUNCTION public.fix_purchase_payments_bank_to_caixabank(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_purchase_payments_bank_to_caixabank(TEXT, TEXT) TO service_role;
