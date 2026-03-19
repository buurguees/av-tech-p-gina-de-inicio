-- Proveedor Anthropic Ireland, Limited
-- Proveedor de servicios de IA (Claude API). Facturación desde Irlanda.
-- VAT EU: IE4276970QH | Email: support@anthropic.com
-- Fuente: factura 9BF0758D-68888 (March 16, 2026)

BEGIN;

INSERT INTO internal.suppliers (
  supplier_number,
  company_name,
  category,
  tax_id,
  contact_email,
  contact_phone,
  address,
  city,
  province,
  postal_code,
  country,
  payment_terms,
  status
)
SELECT
  'PRV-' || LPAD((COALESCE(
    (SELECT MAX(CAST(SUBSTRING(supplier_number FROM 5) AS INTEGER))
     FROM internal.suppliers WHERE supplier_number ~ '^PRV-[0-9]+$'),
    0
  ) + 1)::TEXT, 6, '0'),
  'Anthropic Ireland, Limited',
  'SOFTWARE',
  'IE4276970QH',
  'support@anthropic.com',
  NULL,
  '6th Floor South Bank House, Barrow Street',
  'Dublin',
  'Co. Dublin',
  'D04',
  'Ireland',
  NULL,
  'ACTIVE'
FROM (SELECT 1) AS _seed
WHERE NOT EXISTS (
  SELECT 1 FROM internal.suppliers WHERE tax_id = 'IE4276970QH'
);

COMMIT;
