
-- Fix search_path for ALL functions across all app schemas
-- This sets search_path to the function's own schema + public for safety

DO $$
DECLARE
  r RECORD;
  alter_sql TEXT;
BEGIN
  FOR r IN
    SELECT 
      n.nspname AS func_schema,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS func_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname IN ('public', 'internal', 'crm', 'sales', 'projects', 'purchases', 'accounting', 'audit')
    AND (
      p.proconfig IS NULL 
      OR NOT (p.proconfig::text[] && ARRAY[
        'search_path=public',
        'search_path="public"',
        'search_path=pg_catalog, public',
        'search_path=internal',
        'search_path=crm',
        'search_path=sales',
        'search_path=projects',
        'search_path=purchases',
        'search_path=accounting',
        'search_path=audit'
      ])
    )
  LOOP
    -- Set search_path to the function's own schema + public
    IF r.func_schema = 'public' THEN
      alter_sql := format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public;',
        r.func_schema, r.func_name, r.func_args
      );
    ELSE
      alter_sql := format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = %I, public;',
        r.func_schema, r.func_name, r.func_args, r.func_schema
      );
    END IF;
    
    BEGIN
      EXECUTE alter_sql;
      RAISE NOTICE 'Fixed: %.%(%)', r.func_schema, r.func_name, r.func_args;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to fix %.%(%): %', r.func_schema, r.func_name, r.func_args, SQLERRM;
    END;
  END LOOP;
END;
$$;
