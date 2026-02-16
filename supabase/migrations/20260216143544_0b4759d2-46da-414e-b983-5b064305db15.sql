
-- Update backup function to include AI schema tables
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
    ARRAY['accounting', 'journal_entry_lines'],
    -- AI
    ARRAY['ai', 'conversations'],
    ARRAY['ai', 'conversation_members'],
    ARRAY['ai', 'messages'],
    ARRAY['ai', 'chat_requests']
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
