-- Proveedor Visiotech (LONG XIANG EXPORTACION IMPORTACION SL)
-- Marca comercial: Visiotech | Razón social para facturación: LONG XIANG EXPORTACION IMPORTACION SL
-- Mayorista B2B seguridad, networking y audiovisuales. Catálogo: monitores, soportes, digital signage.
-- Web: https://www.visiotechsecurity.com/es | Audiovisuales: .../productos/audiovisuales

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
  'LONG XIANG EXPORTACION IMPORTACION SL',
  'MATERIAL',
  'B80645518',
  'comercial@visiotechsecurity.com',
  '+34 911 836 285',
  'Calle Alberto Sánchez, 31',
  'Madrid',
  'Madrid',
  '28052',
  'España',
  NULL,
  'ACTIVE'
FROM (SELECT 1) AS _seed
WHERE NOT EXISTS (
  SELECT 1 FROM internal.suppliers WHERE tax_id = 'B80645518'
);

COMMIT;
