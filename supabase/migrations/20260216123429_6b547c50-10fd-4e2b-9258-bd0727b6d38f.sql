
-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup;

-- Table to store daily snapshots
CREATE TABLE backup.daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_schema text NOT NULL,
  table_name text NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  row_count integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(table_schema, table_name, snapshot_date)
);

-- Index for fast lookups
CREATE INDEX idx_snapshots_date ON backup.daily_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_table ON backup.daily_snapshots(table_schema, table_name);

-- Function to backup a single table
CREATE OR REPLACE FUNCTION backup.snapshot_table(p_schema text, p_table text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = backup, public
AS $$
DECLARE
  v_data jsonb;
  v_count integer;
BEGIN
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM %I.%I t',
    p_schema, p_table
  ) INTO v_data;

  v_count := jsonb_array_length(v_data);

  INSERT INTO backup.daily_snapshots (table_schema, table_name, snapshot_date, row_count, data)
  VALUES (p_schema, p_table, CURRENT_DATE, v_count, v_data)
  ON CONFLICT (table_schema, table_name, snapshot_date)
  DO UPDATE SET data = EXCLUDED.data, row_count = EXCLUDED.row_count, created_at = now();

  RETURN v_count;
END;
$$;

-- Main backup function: snapshots all critical tables
CREATE OR REPLACE FUNCTION backup.run_daily_backup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = backup, public
AS $$
DECLARE
  v_tables text[][] := ARRAY[
    -- CRM
    ARRAY['crm', 'clients'],
    ARRAY['crm', 'client_notes'],
    -- Projects
    ARRAY['projects', 'projects'],
    ARRAY['projects', 'project_sites'],
    -- Quotes
    ARRAY['quotes', 'quotes'],
    ARRAY['quotes', 'quote_lines'],
    -- Sales / Invoices
    ARRAY['sales', 'invoices'],
    ARRAY['sales', 'invoice_lines'],
    ARRAY['sales', 'payments'],
    -- Purchases
    ARRAY['purchases', 'purchase_invoices'],
    ARRAY['purchases', 'purchase_invoice_lines'],
    ARRAY['purchases', 'purchase_payments'],
    ARRAY['purchases', 'purchase_orders'],
    ARRAY['purchases', 'purchase_order_lines'],
    -- Internal
    ARRAY['internal', 'suppliers'],
    ARRAY['internal', 'technicians'],
    ARRAY['internal', 'authorized_users'],
    ARRAY['internal', 'company_settings'],
    ARRAY['internal', 'company_bank_accounts'],
    -- Payroll
    ARRAY['payroll', 'partners'],
    ARRAY['payroll', 'payroll_runs'],
    ARRAY['payroll', 'partner_compensation_runs'],
    -- Accounting
    ARRAY['accounting', 'journal_entries'],
    ARRAY['accounting', 'journal_entry_lines']
  ];
  v_rec text[];
  v_result jsonb := '[]'::jsonb;
  v_count integer;
BEGIN
  FOREACH v_rec SLICE 1 IN ARRAY v_tables
  LOOP
    BEGIN
      v_count := backup.snapshot_table(v_rec[1], v_rec[2]);
      v_result := v_result || jsonb_build_object(
        'schema', v_rec[1], 'table', v_rec[2], 'rows', v_count, 'status', 'ok'
      );
    EXCEPTION WHEN OTHERS THEN
      v_result := v_result || jsonb_build_object(
        'schema', v_rec[1], 'table', v_rec[2], 'status', 'error', 'message', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object('date', CURRENT_DATE, 'tables', v_result);
END;
$$;

-- Cleanup function: remove snapshots older than N days (default 30)
CREATE OR REPLACE FUNCTION backup.cleanup_old_snapshots(p_keep_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = backup
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM backup.daily_snapshots
  WHERE snapshot_date < CURRENT_DATE - p_keep_days;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Restore helper: view data from a specific backup
CREATE OR REPLACE FUNCTION backup.get_snapshot(
  p_schema text,
  p_table text,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = backup
AS $$
  SELECT data FROM backup.daily_snapshots
  WHERE table_schema = p_schema AND table_name = p_table AND snapshot_date = p_date;
$$;

-- List available snapshots
CREATE OR REPLACE FUNCTION backup.list_snapshots(p_date date DEFAULT NULL)
RETURNS TABLE(table_schema text, table_name text, snapshot_date date, row_count integer, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = backup
AS $$
  SELECT s.table_schema, s.table_name, s.snapshot_date, s.row_count, s.created_at
  FROM backup.daily_snapshots s
  WHERE (p_date IS NULL OR s.snapshot_date = p_date)
  ORDER BY s.snapshot_date DESC, s.table_schema, s.table_name;
$$;

-- Grant access
GRANT USAGE ON SCHEMA backup TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA backup TO postgres, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA backup TO postgres, service_role;
