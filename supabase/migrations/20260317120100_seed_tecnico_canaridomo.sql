-- Técnico Victor Ramos Quesada (CanariDomo)
-- Marca comercial: CanariDomo - Creando soluciones
-- Autónomo en Las Palmas de Gran Canaria
-- Fuente: tarjeta de contacto

BEGIN;

INSERT INTO internal.technicians (
  technician_number,
  type,
  company_name,
  legal_name,
  tax_id,
  contact_name,
  contact_phone,
  contact_phone_secondary,
  contact_email,
  billing_email,
  address,
  city,
  province,
  postal_code,
  country,
  iban,
  payment_terms,
  notes,
  status
)
SELECT
  'TEC-' || LPAD((COALESCE(
    (SELECT MAX(CAST(SUBSTRING(technician_number FROM 4) AS INTEGER))
     FROM internal.technicians WHERE technician_number ~ '^TEC-[0-9]+$'),
    0
  ) + 1)::TEXT, 6, '0'),
  'FREELANCER',
  'CanariDomo',
  'Victor Ramos Quesada',
  '42229891-M',
  'Victor Ramos Quesada',
  '+34674633443',
  NULL,
  NULL,
  NULL,
  'Joaquin Blume nº37, 1ºE',
  'Vecindario',
  'Las Palmas',
  '35110',
  'España',
  'ES8500491785992410065202',
  NULL,
  'Creando soluciones',
  'ACTIVE'
FROM (SELECT 1) AS _seed
WHERE NOT EXISTS (
  SELECT 1 FROM internal.technicians WHERE tax_id = '42229891-M'
);

COMMIT;
