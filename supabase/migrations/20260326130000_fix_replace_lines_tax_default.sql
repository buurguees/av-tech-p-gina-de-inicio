-- Fix: alinear COALESCE de tax_rate en replace_purchase_invoice_lines con el DEFAULT real.
-- Antes: COALESCE(..., 0) → si faltaba tax_rate en el JSON, la línea quedaba exenta (0%).
-- Ahora: COALESCE(..., 21) → alineado con DEFAULT 21 de la columna y del parámetro de add_purchase_invoice_line.
-- Impacto real: ninguno en flujo actual (ExpenseDetailPage siempre envía tax_rate),
-- pero previene corrupción silenciosa si algún path futuro omite el campo.

CREATE OR REPLACE FUNCTION "public"."replace_purchase_invoice_lines"("p_invoice_id" "uuid", "p_lines" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_line JSONB;
  v_existing RECORD;
BEGIN
  FOR v_existing IN
    SELECT id
    FROM public.get_purchase_invoice_lines(p_invoice_id)
  LOOP
    PERFORM public.delete_purchase_invoice_line(v_existing.id);
  END LOOP;

  FOR v_line IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb))
  LOOP
    PERFORM public.add_purchase_invoice_line(
      p_invoice_id := p_invoice_id,
      p_concept := COALESCE(v_line->>'concept', ''),
      p_description := NULLIF(v_line->>'description', ''),
      p_quantity := COALESCE((v_line->>'quantity')::NUMERIC, 0),
      p_unit_price := COALESCE((v_line->>'unit_price')::NUMERIC, 0),
      p_tax_rate := COALESCE((v_line->>'tax_rate')::NUMERIC, 21),
      p_discount_percent := COALESCE((v_line->>'discount_percent')::NUMERIC, 0),
      p_withholding_tax_rate := COALESCE((v_line->>'withholding_tax_rate')::NUMERIC, 0)
    );
  END LOOP;
END;
$$;
