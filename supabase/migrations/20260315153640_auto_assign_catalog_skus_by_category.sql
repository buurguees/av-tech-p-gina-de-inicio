BEGIN;

ALTER TABLE catalog.categories
  ADD COLUMN IF NOT EXISTS code text;

CREATE OR REPLACE FUNCTION catalog.normalize_category_code(p_input text, p_fallback text DEFAULT 'CAT')
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT UPPER(
    LEFT(
      COALESCE(
        NULLIF(REGEXP_REPLACE(COALESCE(TRIM(p_input), ''), '[^A-Za-z0-9]+', '', 'g'), ''),
        p_fallback
      ),
      10
    )
  );
$$;

DO $$
DECLARE
  rec RECORD;
  v_base text;
  v_candidate text;
  v_idx integer;
BEGIN
  UPDATE catalog.categories c
  SET code = UPPER(pc.code)
  FROM catalog._mig_category_map m
  JOIN internal.product_categories pc ON pc.id = m.internal_id
  WHERE m.catalog_id = c.id
    AND c.parent_id IS NULL
    AND (c.code IS NULL OR BTRIM(c.code) = '');

  UPDATE catalog.categories c
  SET code = UPPER(ps.code)
  FROM catalog._mig_subcategory_map m
  JOIN internal.product_subcategories ps ON ps.id = m.internal_id
  WHERE m.catalog_id = c.id
    AND c.parent_id IS NOT NULL
    AND (c.code IS NULL OR BTRIM(c.code) = '');

  FOR rec IN
    SELECT id, slug, name
    FROM catalog.categories
    WHERE parent_id IS NULL
      AND (code IS NULL OR BTRIM(code) = '')
    ORDER BY sort_order, name
  LOOP
    v_base := catalog.normalize_category_code(
      COALESCE(NULLIF(SPLIT_PART(rec.slug, '-', -1), ''), rec.name),
      'CAT'
    );

    IF LENGTH(v_base) < 2 THEN
      v_base := RPAD(v_base, 2, '0');
    END IF;

    v_candidate := v_base;
    v_idx := 1;

    WHILE EXISTS (
      SELECT 1
      FROM catalog.categories c
      WHERE c.parent_id IS NULL
        AND c.code = v_candidate
        AND c.id <> rec.id
    ) LOOP
      v_candidate := LEFT(v_base, 8) || LPAD(v_idx::text, 2, '0');
      v_idx := v_idx + 1;
    END LOOP;

    UPDATE catalog.categories
    SET code = v_candidate
    WHERE id = rec.id;
  END LOOP;

  FOR rec IN
    SELECT id, parent_id, slug, name
    FROM catalog.categories
    WHERE parent_id IS NOT NULL
      AND (code IS NULL OR BTRIM(code) = '')
    ORDER BY parent_id, sort_order, name
  LOOP
    v_base := catalog.normalize_category_code(
      COALESCE(NULLIF(SPLIT_PART(rec.slug, '-', -1), ''), rec.name),
      '00'
    );

    IF LENGTH(v_base) = 1 THEN
      v_base := '0' || v_base;
    END IF;

    v_base := LEFT(v_base, 4);
    v_candidate := v_base;
    v_idx := 1;

    WHILE EXISTS (
      SELECT 1
      FROM catalog.categories c
      WHERE c.parent_id = rec.parent_id
        AND c.code = v_candidate
        AND c.id <> rec.id
    ) LOOP
      v_candidate := LEFT(v_base, 2) || LPAD(v_idx::text, 2, '0');
      v_idx := v_idx + 1;
    END LOOP;

    UPDATE catalog.categories
    SET code = v_candidate
    WHERE id = rec.id;
  END LOOP;
END;
$$;

ALTER TABLE catalog.categories
  ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_code_format'
      AND conrelid = 'catalog.categories'::regclass
  ) THEN
    ALTER TABLE catalog.categories
      ADD CONSTRAINT categories_code_format
      CHECK (code ~ '^[A-Z0-9]{1,10}$');
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_categories_root_code
  ON catalog.categories (code)
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_categories_parent_code
  ON catalog.categories (parent_id, code)
  WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS catalog.product_number_sequences (
  prefix text PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION catalog.resolve_product_number_context(p_category_id uuid)
RETURNS TABLE (
  root_category_id uuid,
  root_category_name text,
  root_category_code text,
  subcategory_id uuid,
  subcategory_name text,
  subcategory_code text,
  leaf_category_id uuid
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'catalog', 'public'
AS $$
DECLARE
  v_leaf catalog.categories%ROWTYPE;
  v_root catalog.categories%ROWTYPE;
BEGIN
  SELECT *
  INTO v_leaf
  FROM catalog.categories
  WHERE id = p_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  IF v_leaf.parent_id IS NULL THEN
    v_root := v_leaf;

    RETURN QUERY
    SELECT
      v_root.id,
      v_root.name,
      v_root.code,
      NULL::uuid,
      NULL::text,
      NULL::text,
      v_leaf.id;

    RETURN;
  END IF;

  SELECT *
  INTO v_root
  FROM catalog.categories
  WHERE id = v_leaf.parent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent category not found';
  END IF;

  RETURN QUERY
  SELECT
    v_root.id,
    v_root.name,
    v_root.code,
    v_leaf.id,
    v_leaf.name,
    v_leaf.code,
    v_leaf.id;
END;
$$;

CREATE OR REPLACE FUNCTION catalog.peek_next_product_number(
  p_category_id uuid,
  p_product_type catalog.product_type DEFAULT 'PRODUCT'
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'catalog', 'public'
AS $$
DECLARE
  v_ctx RECORD;
  v_prefix text;
  v_last_number integer;
BEGIN
  IF p_product_type = 'BUNDLE' THEN
    v_prefix := 'PACK';
  ELSE
    IF p_category_id IS NULL THEN
      RAISE EXCEPTION 'Category is required to generate product number';
    END IF;

    SELECT *
    INTO v_ctx
    FROM catalog.resolve_product_number_context(p_category_id);

    v_prefix := v_ctx.root_category_code || '-' || COALESCE(v_ctx.subcategory_code, '00');
  END IF;

  SELECT GREATEST(
           COALESCE((SELECT s.last_number
                     FROM catalog.product_number_sequences s
                     WHERE s.prefix = v_prefix), 0),
           COALESCE((
             SELECT MAX((REGEXP_MATCH(p.sku, '([0-9]{4})$'))[1]::integer)
             FROM catalog.products p
             WHERE p.sku ~ ('^' || v_prefix || '-[0-9]{4}$')
           ), 0)
         )
  INTO v_last_number;

  RETURN v_prefix || '-' || LPAD((v_last_number + 1)::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION catalog.next_product_number(
  p_category_id uuid,
  p_product_type catalog.product_type DEFAULT 'PRODUCT'
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'catalog', 'public'
AS $$
DECLARE
  v_ctx RECORD;
  v_prefix text;
  v_next_number integer;
BEGIN
  IF p_product_type = 'BUNDLE' THEN
    v_prefix := 'PACK';
  ELSE
    IF p_category_id IS NULL THEN
      RAISE EXCEPTION 'Category is required to generate product number';
    END IF;

    SELECT *
    INTO v_ctx
    FROM catalog.resolve_product_number_context(p_category_id);

    v_prefix := v_ctx.root_category_code || '-' || COALESCE(v_ctx.subcategory_code, '00');
  END IF;

  WITH current_max AS (
    SELECT COALESCE(MAX((REGEXP_MATCH(p.sku, '([0-9]{4})$'))[1]::integer), 0) AS max_num
    FROM catalog.products p
    WHERE p.sku ~ ('^' || v_prefix || '-[0-9]{4}$')
  ),
  upserted AS (
    INSERT INTO catalog.product_number_sequences AS seq (prefix, last_number, updated_at)
    SELECT v_prefix, current_max.max_num + 1, now()
    FROM current_max
    ON CONFLICT (prefix) DO UPDATE
      SET last_number = seq.last_number + 1,
          updated_at = now()
    RETURNING last_number
  )
  SELECT last_number
  INTO v_next_number
  FROM upserted;

  RETURN v_prefix || '-' || LPAD(v_next_number::text, 4, '0');
END;
$$;

INSERT INTO catalog.product_number_sequences (prefix, last_number, updated_at)
SELECT
  prefix_data.prefix,
  MAX(prefix_data.last_number) AS last_number,
  now()
FROM (
  SELECT
    CASE
      WHEN leaf.parent_id IS NULL THEN root.code || '-00'
      ELSE root.code || '-' || leaf.code
    END AS prefix,
    CASE
      WHEN p.sku ~ ('^' || CASE
        WHEN leaf.parent_id IS NULL THEN root.code || '-00'
        ELSE root.code || '-' || leaf.code
      END || '-[0-9]{4}$')
      THEN (REGEXP_MATCH(p.sku, '([0-9]{4})$'))[1]::integer
      ELSE 0
    END AS last_number
  FROM catalog.products p
  JOIN catalog.categories leaf ON leaf.id = p.category_id
  JOIN catalog.categories root ON root.id = COALESCE(leaf.parent_id, leaf.id)
  WHERE p.product_type <> 'BUNDLE'
) AS prefix_data
GROUP BY prefix_data.prefix
ON CONFLICT (prefix) DO UPDATE
  SET last_number = GREATEST(catalog.product_number_sequences.last_number, EXCLUDED.last_number),
      updated_at = now();

CREATE OR REPLACE FUNCTION public.preview_catalog_product_sku(
  p_category_id uuid,
  p_product_type catalog.product_type DEFAULT 'PRODUCT'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can preview product numbers';
  END IF;

  RETURN catalog.peek_next_product_number(p_category_id, p_product_type);
END;
$$;

DROP FUNCTION IF EXISTS public.create_catalog_category(text, text, catalog.category_domain, text, uuid, integer);

CREATE FUNCTION public.create_catalog_category(
  p_name text,
  p_slug text,
  p_domain catalog.category_domain,
  p_description text DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL,
  p_sort_order integer DEFAULT 0,
  p_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_domain catalog.category_domain;
BEGIN
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create categories';
  END IF;

  IF p_parent_id IS NOT NULL THEN
    SELECT c.domain
    INTO v_domain
    FROM catalog.categories c
    WHERE c.id = p_parent_id;

    IF v_domain IS NULL THEN
      RAISE EXCEPTION 'Parent category not found';
    END IF;
  ELSE
    v_domain := p_domain;
  END IF;

  INSERT INTO catalog.categories (
    name,
    slug,
    code,
    description,
    parent_id,
    sort_order,
    domain
  )
  VALUES (
    p_name,
    LOWER(REGEXP_REPLACE(TRIM(p_slug), '\s+', '-', 'g')),
    catalog.normalize_category_code(
      COALESCE(
        NULLIF(TRIM(p_code), ''),
        NULLIF(CASE WHEN p_parent_id IS NULL THEN p_slug ELSE SPLIT_PART(p_slug, '-', -1) END, ''),
        p_name
      ),
      CASE WHEN p_parent_id IS NULL THEN 'CAT' ELSE '00' END
    ),
    p_description,
    p_parent_id,
    p_sort_order,
    v_domain
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.list_catalog_categories(catalog.category_domain, uuid, text);

CREATE FUNCTION public.list_catalog_categories(
  p_domain catalog.category_domain DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  code text,
  description text,
  parent_id uuid,
  sort_order integer,
  is_active boolean,
  domain catalog.category_domain,
  product_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.code,
    c.description,
    c.parent_id,
    c.sort_order,
    c.is_active,
    c.domain,
    (
      SELECT COUNT(*)
      FROM catalog.products p
      WHERE p.category_id = c.id
    )::bigint
  FROM catalog.categories c
  WHERE (p_domain IS NULL OR c.domain = p_domain)
    AND (
      (p_parent_id IS NULL AND c.parent_id IS NULL)
      OR c.parent_id = p_parent_id
    )
    AND (
      p_search IS NULL
      OR p_search = ''
      OR c.name ILIKE '%' || p_search || '%'
      OR c.slug ILIKE '%' || p_search || '%'
      OR c.code ILIKE '%' || p_search || '%'
    )
  ORDER BY c.sort_order, c.name;
END;
$$;

DROP FUNCTION IF EXISTS public.list_catalog_products(catalog.category_domain, uuid, text, boolean);

CREATE FUNCTION public.list_catalog_products(
  p_domain catalog.category_domain DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_include_inactive boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  description text,
  product_type catalog.product_type,
  category_id uuid,
  category_name text,
  category_code text,
  subcategory_id uuid,
  subcategory_name text,
  subcategory_code text,
  supplier_id uuid,
  supplier_name text,
  unit catalog.unit_type,
  cost_price numeric,
  sale_price numeric,
  discount_percent numeric,
  sale_price_effective numeric,
  tax_rate numeric,
  margin_percentage numeric,
  track_stock boolean,
  stock_quantity numeric,
  min_stock_alert numeric,
  is_active boolean,
  has_low_stock_alert boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    p.description,
    p.product_type,
    p.category_id,
    root.name::text AS category_name,
    root.code::text AS category_code,
    CASE WHEN leaf.parent_id IS NOT NULL THEN leaf.id ELSE NULL::uuid END AS subcategory_id,
    CASE WHEN leaf.parent_id IS NOT NULL THEN leaf.name ELSE NULL::text END AS subcategory_name,
    CASE WHEN leaf.parent_id IS NOT NULL THEN leaf.code ELSE NULL::text END AS subcategory_code,
    p.supplier_id,
    s.company_name::text AS supplier_name,
    p.unit,
    p.cost_price,
    p.sale_price,
    p.discount_percent,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100))::numeric AS sale_price_effective,
    (
      SELECT tr.rate
      FROM catalog.tax_rates tr
      WHERE tr.id = p.tax_rate_id
    )::numeric AS tax_rate,
    p.margin_percentage,
    p.track_stock,
    COALESCE(p.stock_quantity, 0)::numeric(12,3),
    p.min_stock_alert::numeric(12,3),
    p.is_active,
    EXISTS (
      SELECT 1
      FROM catalog.stock_alerts sa
      WHERE sa.product_id = p.id
        AND sa.status = 'open'
    ) AS has_low_stock_alert
  FROM catalog.products p
  LEFT JOIN catalog.categories leaf ON leaf.id = p.category_id
  LEFT JOIN catalog.categories root ON root.id = COALESCE(leaf.parent_id, leaf.id)
  LEFT JOIN internal.suppliers s ON s.id = p.supplier_id
  WHERE (p_domain IS NULL OR root.domain = p_domain)
    AND (
      p_category_id IS NULL
      OR root.id = p_category_id
      OR leaf.id = p_category_id
    )
    AND (
      p_search IS NULL
      OR p_search = ''
      OR p.name ILIKE '%' || p_search || '%'
      OR p.sku ILIKE '%' || p_search || '%'
      OR p.description ILIKE '%' || p_search || '%'
    )
    AND (p_include_inactive OR p.is_active)
    AND p.product_type != 'BUNDLE'
  ORDER BY p.sku;
END;
$$;

DROP FUNCTION IF EXISTS public.get_catalog_product_detail(uuid);

CREATE FUNCTION public.get_catalog_product_detail(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  sku text,
  name text,
  description text,
  product_type catalog.product_type,
  category_id uuid,
  category_name text,
  category_code text,
  subcategory_id uuid,
  subcategory_name text,
  subcategory_code text,
  supplier_id uuid,
  supplier_name text,
  unit catalog.unit_type,
  cost_price numeric,
  sale_price numeric,
  discount_percent numeric,
  sale_price_effective numeric,
  tax_rate_id uuid,
  tax_rate numeric,
  margin_percentage numeric,
  margin_amount numeric,
  track_stock boolean,
  stock_quantity numeric,
  min_stock_alert numeric,
  is_active boolean,
  has_low_stock_alert boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    p.description,
    p.product_type,
    p.category_id,
    root.name::text AS category_name,
    root.code::text AS category_code,
    CASE WHEN leaf.parent_id IS NOT NULL THEN leaf.id ELSE NULL::uuid END AS subcategory_id,
    CASE WHEN leaf.parent_id IS NOT NULL THEN leaf.name ELSE NULL::text END AS subcategory_name,
    CASE WHEN leaf.parent_id IS NOT NULL THEN leaf.code ELSE NULL::text END AS subcategory_code,
    p.supplier_id,
    s.company_name::text AS supplier_name,
    p.unit,
    p.cost_price,
    p.sale_price,
    p.discount_percent,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100))::numeric AS sale_price_effective,
    p.tax_rate_id,
    (
      SELECT tr.rate
      FROM catalog.tax_rates tr
      WHERE tr.id = p.tax_rate_id
    )::numeric AS tax_rate,
    p.margin_percentage,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100) - COALESCE(p.cost_price, 0))::numeric AS margin_amount,
    p.track_stock,
    COALESCE(p.stock_quantity, 0)::numeric(12,3),
    p.min_stock_alert::numeric(12,3),
    p.is_active,
    EXISTS (
      SELECT 1
      FROM catalog.stock_alerts sa
      WHERE sa.product_id = p.id
        AND sa.status = 'open'
    ) AS has_low_stock_alert,
    p.created_at,
    p.updated_at
  FROM catalog.products p
  LEFT JOIN catalog.categories leaf ON leaf.id = p.category_id
  LEFT JOIN catalog.categories root ON root.id = COALESCE(leaf.parent_id, leaf.id)
  LEFT JOIN internal.suppliers s ON s.id = p.supplier_id
  WHERE p.id = p_product_id;
END;
$$;

DROP FUNCTION IF EXISTS public.update_catalog_category(uuid, text, text, text, uuid, integer, boolean);

CREATE FUNCTION public.update_catalog_category(
  p_id uuid,
  p_name text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL,
  p_sort_order integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_code text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_effective_parent_id uuid;
  v_parent_domain catalog.category_domain;
BEGIN
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update categories';
  END IF;

  SELECT COALESCE(p_parent_id, c.parent_id)
  INTO v_effective_parent_id
  FROM catalog.categories c
  WHERE c.id = p_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_effective_parent_id IS NOT NULL THEN
    SELECT c.domain
    INTO v_parent_domain
    FROM catalog.categories c
    WHERE c.id = v_effective_parent_id;

    IF v_parent_domain IS NULL THEN
      RAISE EXCEPTION 'Parent category not found';
    END IF;
  END IF;

  UPDATE catalog.categories
  SET name = COALESCE(p_name, name),
      slug = COALESCE(LOWER(REGEXP_REPLACE(TRIM(p_slug), '\s+', '-', 'g')), slug),
      code = CASE
        WHEN NULLIF(TRIM(COALESCE(p_code, '')), '') IS NOT NULL THEN
          catalog.normalize_category_code(
            NULLIF(TRIM(p_code), ''),
            CASE WHEN COALESCE(p_parent_id, parent_id) IS NULL THEN 'CAT' ELSE '00' END
          )
        ELSE code
      END,
      description = COALESCE(p_description, description),
      parent_id = COALESCE(p_parent_id, parent_id),
      sort_order = COALESCE(p_sort_order, sort_order),
      domain = COALESCE(v_parent_domain, domain),
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_catalog_product(
  p_sku text,
  p_name text,
  p_product_type catalog.product_type,
  p_category_id uuid DEFAULT NULL,
  p_unit catalog.unit_type DEFAULT 'ud',
  p_cost_price numeric DEFAULT NULL,
  p_sale_price numeric DEFAULT 0,
  p_discount_percent numeric DEFAULT 0,
  p_tax_rate_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_track_stock boolean DEFAULT false,
  p_min_stock_alert numeric DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_tax uuid;
  v_final_sku text;
BEGIN
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create products';
  END IF;

  v_tax := COALESCE(
    p_tax_rate_id,
    (SELECT id FROM catalog.tax_rates WHERE is_default = true LIMIT 1)
  );

  IF NULLIF(BTRIM(COALESCE(p_sku, '')), '') IS NULL THEN
    v_final_sku := catalog.next_product_number(p_category_id, p_product_type);
  ELSE
    v_final_sku := UPPER(BTRIM(p_sku));
  END IF;

  INSERT INTO catalog.products (
    sku,
    name,
    description,
    product_type,
    category_id,
    unit,
    cost_price,
    sale_price,
    discount_percent,
    tax_rate_id,
    track_stock,
    min_stock_alert,
    supplier_id
  )
  VALUES (
    v_final_sku,
    p_name,
    p_description,
    p_product_type,
    p_category_id,
    p_unit,
    p_cost_price,
    p_sale_price,
    p_discount_percent,
    v_tax,
    p_track_stock,
    p_min_stock_alert,
    p_supplier_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_catalog_category(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete categories';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM catalog.categories c
    WHERE c.parent_id = p_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete category with subcategories';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM catalog.products p
    WHERE p.category_id = p_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete category with products';
  END IF;

  DELETE FROM catalog.categories
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

GRANT ALL ON FUNCTION public.preview_catalog_product_sku(uuid, catalog.product_type) TO anon;
GRANT ALL ON FUNCTION public.preview_catalog_product_sku(uuid, catalog.product_type) TO authenticated;
GRANT ALL ON FUNCTION public.preview_catalog_product_sku(uuid, catalog.product_type) TO service_role;
GRANT ALL ON FUNCTION public.create_catalog_category(text, text, catalog.category_domain, text, uuid, integer, text) TO anon;
GRANT ALL ON FUNCTION public.create_catalog_category(text, text, catalog.category_domain, text, uuid, integer, text) TO authenticated;
GRANT ALL ON FUNCTION public.create_catalog_category(text, text, catalog.category_domain, text, uuid, integer, text) TO service_role;
GRANT ALL ON FUNCTION public.list_catalog_categories(catalog.category_domain, uuid, text) TO anon;
GRANT ALL ON FUNCTION public.list_catalog_categories(catalog.category_domain, uuid, text) TO authenticated;
GRANT ALL ON FUNCTION public.list_catalog_categories(catalog.category_domain, uuid, text) TO service_role;
GRANT ALL ON FUNCTION public.list_catalog_products(catalog.category_domain, uuid, text, boolean) TO anon;
GRANT ALL ON FUNCTION public.list_catalog_products(catalog.category_domain, uuid, text, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.list_catalog_products(catalog.category_domain, uuid, text, boolean) TO service_role;
GRANT ALL ON FUNCTION public.get_catalog_product_detail(uuid) TO anon;
GRANT ALL ON FUNCTION public.get_catalog_product_detail(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_catalog_product_detail(uuid) TO service_role;
GRANT ALL ON FUNCTION public.update_catalog_category(uuid, text, text, text, uuid, integer, boolean, text) TO anon;
GRANT ALL ON FUNCTION public.update_catalog_category(uuid, text, text, text, uuid, integer, boolean, text) TO authenticated;
GRANT ALL ON FUNCTION public.update_catalog_category(uuid, text, text, text, uuid, integer, boolean, text) TO service_role;

COMMIT;
