-- Migration: update_project — persistir project_name y title al editar
-- El RPC update_project no actualizaba project_name/title al cambiar local_name,
-- client_order_number, project_city u otros campos que forman el nombre del proyecto.
-- Se añade p_project_name opcional para que el frontend pase el nombre generado.

DROP FUNCTION IF EXISTS "public"."update_project"(
  "uuid", "text", "text", "text", "text", "text", "text", "text"
);

CREATE OR REPLACE FUNCTION "public"."update_project"(
  "p_project_id"           "uuid",
  "p_client_order_number"  "text" DEFAULT NULL,
  "p_local_name"           "text" DEFAULT NULL,
  "p_notes"                "text" DEFAULT NULL,
  "p_project_address"      "text" DEFAULT NULL,
  "p_project_city"         "text" DEFAULT NULL,
  "p_status"               "text" DEFAULT NULL,
  "p_site_mode"            "text" DEFAULT NULL,
  "p_project_name"         "text" DEFAULT NULL
)
  RETURNS boolean
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
AS $$
DECLARE
  v_current_mode projects.site_mode;
  v_new_mode     projects.site_mode;
  v_site_count   INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_site_mode IS NOT NULL THEN
    SELECT site_mode INTO v_current_mode
    FROM projects.projects
    WHERE id = p_project_id;

    BEGIN
      v_new_mode := p_site_mode::projects.site_mode;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid site_mode';
    END;

    IF v_current_mode = 'MULTI_SITE' AND v_new_mode = 'SINGLE_SITE' THEN
      SELECT COUNT(*) INTO v_site_count
      FROM projects.project_sites
      WHERE project_id = p_project_id AND is_active = TRUE;

      IF v_site_count > 1 THEN
        RAISE EXCEPTION 'Cannot change to SINGLE_SITE: % active sites', v_site_count;
      END IF;
    END IF;
  END IF;

  UPDATE projects.projects SET
    client_order_number = COALESCE(p_client_order_number, client_order_number),
    local_name          = COALESCE(p_local_name, local_name),
    description         = COALESCE(p_notes, description),
    project_city        = COALESCE(p_project_city, project_city),
    status              = COALESCE(p_status::projects.project_status, status),
    site_mode           = COALESCE(v_new_mode, site_mode),
    project_name        = COALESCE(p_project_name, project_name),
    title               = COALESCE(p_project_name, title)
  WHERE id = p_project_id;

  RETURN FOUND;
END;
$$;

GRANT ALL ON FUNCTION "public"."update_project"(
  "uuid", "text", "text", "text", "text", "text", "text", "text", "text"
) TO "anon";
GRANT ALL ON FUNCTION "public"."update_project"(
  "uuid", "text", "text", "text", "text", "text", "text", "text", "text"
) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project"(
  "uuid", "text", "text", "text", "text", "text", "text", "text", "text"
) TO "service_role";
