-- Crear la tabla de impuestos si no existe
CREATE TABLE IF NOT EXISTS internal.taxes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  rate numeric(6,2) NOT NULL DEFAULT 0,
  tax_type text NOT NULL DEFAULT 'sales' CHECK (tax_type IN ('sales', 'purchase')),
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_taxes_updated_at
  BEFORE UPDATE ON internal.taxes
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

-- Impuestos de VENTAS
INSERT INTO internal.taxes (name, code, rate, tax_type, description, is_default, is_active, display_order)
VALUES 
  ('IVA 21%', 'IVA21', 21.00, 'sales', NULL, true, true, 1),
  ('IVA 10%', 'IVA10', 10.00, 'sales', 'IVA reducido', false, true, 2),
  ('IVA 0%', 'IVA0', 0.00, 'sales', 'IVA Exento', false, true, 3);

-- Impuestos de COMPRAS
INSERT INTO internal.taxes (name, code, rate, tax_type, description, is_default, is_active, display_order)
VALUES 
  ('IVA 21%', 'IVA21C', 21.00, 'purchase', NULL, true, true, 1),
  ('IVA 10%', 'IVA10C', 10.00, 'purchase', 'IVA reducido', false, true, 2),
  ('IVA 0%', 'IVA0C', 0.00, 'purchase', 'IVA Exento', false, true, 3),
  ('IRPF -7%', 'IRPF7', -7.00, 'purchase', 'Retención IRPF para autónomos nuevos (primer año)', false, true, 4),
  ('IRPF -15%', 'IRPF15', -15.00, 'purchase', 'Retención IRPF estándar para autónomos', false, true, 5),
  ('IRPF -19%', 'IRPF19', -19.00, 'purchase', 'Retención IRPF actividades profesionales', false, true, 6);

-- Función para listar impuestos
CREATE OR REPLACE FUNCTION public.list_taxes(p_tax_type text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  rate numeric,
  tax_type text,
  description text,
  is_default boolean,
  is_active boolean,
  display_order int,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id, t.name, t.code, t.rate, t.tax_type, t.description,
    t.is_default, t.is_active, t.display_order, t.created_at, t.updated_at
  FROM internal.taxes t
  WHERE (p_tax_type IS NULL OR t.tax_type = p_tax_type)
  ORDER BY t.tax_type, t.display_order, t.name;
END;
$$;

-- Función para crear impuesto
CREATE OR REPLACE FUNCTION public.create_tax(
  p_name text,
  p_code text,
  p_rate numeric,
  p_tax_type text,
  p_description text DEFAULT NULL,
  p_is_default boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_tax_id uuid;
BEGIN
  -- Si es default, quitar el default actual del mismo tipo
  IF p_is_default THEN
    UPDATE internal.taxes SET is_default = false WHERE tax_type = p_tax_type AND is_default = true;
  END IF;

  INSERT INTO internal.taxes (name, code, rate, tax_type, description, is_default)
  VALUES (p_name, p_code, p_rate, p_tax_type, p_description, p_is_default)
  RETURNING id INTO v_tax_id;

  RETURN v_tax_id;
END;
$$;

-- Función para actualizar impuesto
CREATE OR REPLACE FUNCTION public.update_tax(
  p_tax_id uuid,
  p_name text DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_rate numeric DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_is_default boolean DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_display_order int DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_tax_type text;
BEGIN
  -- Obtener el tipo de impuesto actual
  SELECT tax_type INTO v_tax_type FROM internal.taxes WHERE id = p_tax_id;

  -- Si se establece como default, quitar el default actual del mismo tipo
  IF p_is_default = true THEN
    UPDATE internal.taxes SET is_default = false WHERE tax_type = v_tax_type AND is_default = true AND id != p_tax_id;
  END IF;

  UPDATE internal.taxes
  SET
    name = COALESCE(p_name, name),
    code = COALESCE(p_code, code),
    rate = COALESCE(p_rate, rate),
    description = COALESCE(p_description, description),
    is_default = COALESCE(p_is_default, is_default),
    is_active = COALESCE(p_is_active, is_active),
    display_order = COALESCE(p_display_order, display_order)
  WHERE id = p_tax_id;

  RETURN FOUND;
END;
$$;

-- Función para eliminar impuesto
CREATE OR REPLACE FUNCTION public.delete_tax(p_tax_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
BEGIN
  DELETE FROM internal.taxes WHERE id = p_tax_id;
  RETURN FOUND;
END;
$$;