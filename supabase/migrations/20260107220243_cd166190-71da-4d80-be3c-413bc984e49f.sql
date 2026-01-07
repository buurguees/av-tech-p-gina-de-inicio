-- Actualizar el CHECK constraint para incluir el nuevo tipo 'profit'
ALTER TABLE internal.taxes DROP CONSTRAINT IF EXISTS taxes_tax_type_check;
ALTER TABLE internal.taxes ADD CONSTRAINT taxes_tax_type_check CHECK (tax_type IN ('sales', 'purchase', 'profit'));

-- Impuestos sobre beneficios (Impuesto de Sociedades)
INSERT INTO internal.taxes (name, code, rate, tax_type, description, is_default, is_active, display_order)
VALUES 
  ('IS 15%', 'IS15', 15.00, 'profit', 'Tarifa reducida (primer año de empresa)', true, true, 1),
  ('IS 25%', 'IS25', 25.00, 'profit', 'Tipo general (a partir del 2º año)', false, true, 2);