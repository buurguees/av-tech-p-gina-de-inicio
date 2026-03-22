-- =============================================================================
-- Fix map RPCs: técnicos sin coords + persistencia de geocodificación
-- =============================================================================
-- Problema 1: list_technicians_for_map filtraba WHERE lat IS NOT NULL → devolvía
--   0 filas porque ningún técnico tiene coords almacenadas. Solución: devolver
--   todos los técnicos e incluir province y postal_code para geocodificación
--   más precisa desde el frontend.
-- Problema 2: sin mecanismo para persistir coords geocodificadas, cada carga del
--   mapa recalculaba todo via Nominatim (lento). Solución: 3 RPCs de persistencia
--   para project_sites, clientes y técnicos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fix list_technicians_for_map
--    DROP previo necesario porque cambia el tipo de retorno (columnas nuevas)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.list_technicians_for_map(text, text, text);

CREATE FUNCTION public.list_technicians_for_map(
    p_type      text DEFAULT NULL,
    p_status    text DEFAULT NULL,
    p_specialty text DEFAULT NULL
)
RETURNS TABLE (
    id                uuid,
    technician_number text,
    type              text,
    company_name      text,
    contact_name      text,
    contact_phone     text,
    contact_email     text,
    address           text,
    city              text,
    province          text,
    postal_code       text,
    latitude          numeric,
    longitude         numeric,
    specialties       text[],
    status            text,
    rating            integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.technician_number,
        t.type::TEXT,
        t.company_name,
        t.contact_name,
        t.contact_phone,
        t.contact_email,
        t.address,
        t.city,
        t.province,
        t.postal_code,
        t.latitude,
        t.longitude,
        t.specialties,
        t.status::TEXT,
        t.rating
    FROM internal.technicians t
    WHERE
        (p_type    IS NULL OR p_type    = '' OR t.type::TEXT   = p_type)
        AND (p_status  IS NULL OR p_status  = '' OR t.status::TEXT = p_status)
        AND (p_specialty IS NULL OR p_specialty = '' OR p_specialty = ANY(t.specialties))
    ORDER BY t.company_name;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. RPC para persistir coordenadas geocodificadas de sitios de proyecto
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_project_site_coordinates(
    p_site_id uuid,
    p_lat     double precision,
    p_lon     double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE projects.project_sites
       SET latitude  = p_lat,
           longitude = p_lon
     WHERE id = p_site_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. RPC para persistir coordenadas geocodificadas de clientes
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_client_coordinates(
    p_client_id uuid,
    p_lat       numeric,
    p_lon       numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE crm.clients
       SET latitude  = p_lat,
           longitude = p_lon
     WHERE id = p_client_id
       AND deleted_at IS NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. RPC para persistir coordenadas geocodificadas de técnicos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_technician_coordinates(
    p_technician_id uuid,
    p_lat           numeric,
    p_lon           numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE internal.technicians
       SET latitude  = p_lat,
           longitude = p_lon
     WHERE id = p_technician_id;
END;
$$;
