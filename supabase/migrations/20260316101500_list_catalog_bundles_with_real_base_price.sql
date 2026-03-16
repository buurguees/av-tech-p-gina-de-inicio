-- Extender list_catalog_bundles para devolver el precio base real y el dto visible

DROP FUNCTION IF EXISTS public.list_catalog_bundles(text);

CREATE FUNCTION public.list_catalog_bundles(p_search text DEFAULT NULL::text)
RETURNS TABLE(
  id uuid,
  sku text,
  name text,
  description text,
  category_id uuid,
  sale_price numeric,
  discount_percent numeric,
  sale_price_effective numeric,
  base_price_real numeric,
  visible_discount_percent numeric,
  tax_rate numeric,
  is_active boolean,
  component_count bigint
)
LANGUAGE sql
STABLE
AS $function$
  WITH bundle_totals AS (
    SELECT
      pb.bundle_product_id AS product_id,
      COALESCE(
        SUM(
          pb.quantity * COALESCE(cp.sale_price * (1 - COALESCE(cp.discount_percent, 0) / 100), 0)
        ),
        0
      )::numeric(12,2) AS base_price_real,
      COUNT(*)::bigint AS component_count
    FROM catalog.product_bundles pb
    JOIN catalog.products cp ON cp.id = pb.component_product_id
    GROUP BY pb.bundle_product_id
  )
  SELECT
    p.id,
    p.sku,
    p.name,
    p.description,
    p.category_id,
    p.sale_price,
    p.discount_percent,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100))::numeric AS sale_price_effective,
    COALESCE(bt.base_price_real, 0)::numeric(12,2) AS base_price_real,
    CASE
      WHEN COALESCE(bt.base_price_real, 0) > 0
        THEN ROUND(
          (
            1
            - (
              (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100))
              / bt.base_price_real
            )
          ) * 100,
          1
        )
      ELSE 0
    END::numeric(6,1) AS visible_discount_percent,
    (
      SELECT tr.rate
      FROM catalog.tax_rates tr
      WHERE tr.id = p.tax_rate_id
    )::numeric AS tax_rate,
    p.is_active,
    COALESCE(bt.component_count, 0)::bigint AS component_count
  FROM catalog.products p
  LEFT JOIN bundle_totals bt ON bt.product_id = p.id
  WHERE
    p.product_type = 'BUNDLE'
    AND (
      p_search IS NULL
      OR p.name ILIKE '%' || p_search || '%'
      OR p.sku ILIKE '%' || p_search || '%'
    )
  ORDER BY p.name;
$function$;

GRANT ALL ON FUNCTION public.list_catalog_bundles(text) TO anon;
GRANT ALL ON FUNCTION public.list_catalog_bundles(text) TO authenticated;
GRANT ALL ON FUNCTION public.list_catalog_bundles(text) TO service_role;
