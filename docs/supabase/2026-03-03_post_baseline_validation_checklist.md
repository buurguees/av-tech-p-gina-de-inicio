# Post-Baseline Validation Checklist

Date: 2026-03-03
Scope: validate canonical baseline after `npx supabase start` and `npx supabase db reset`

## Goal

Confirm that the new canonical baseline is operational before any cutover or linked-project adoption.

## Preconditions

- Docker Desktop running
- `npx supabase start` completed
- `npx supabase db reset` completed without SQL errors

## Gate 1: Reset integrity

- [ ] `npx supabase db reset` finishes successfully
- [ ] No SQL execution errors in schemas, functions, triggers, policies, or grants
- [ ] No missing extension errors during reset
- [ ] No references to missing platform-managed objects beyond expected Supabase-managed schemas

## Gate 2: Structural presence

Validate that critical schemas exist:

- [ ] `accounting`
- [ ] `sales`
- [ ] `quotes`
- [ ] `projects`
- [ ] `internal`
- [ ] `crm`
- [ ] `catalog`
- [ ] `audit`

Validate that critical tables exist:

- [ ] `sales.invoices`
- [ ] `sales.invoice_lines`
- [ ] `quotes.quotes`
- [ ] `quotes.quote_history`
- [ ] `projects.projects`
- [ ] `projects.project_sites`
- [ ] `internal.authorized_users`
- [ ] `internal.user_roles`
- [ ] `public.scanned_documents`
- [ ] `accounting.journal_entries`
- [ ] `accounting.journal_entry_lines`

Validate that critical RPCs/functions exist:

- [ ] `public.get_project`
- [ ] `public.list_project_sites`
- [ ] `public.update_quote`
- [ ] `sales.create_invoice_from_quote`
- [ ] `sales.generate_purchase_invoice_number`
- [ ] `accounting.validate_month_consistency`
- [ ] `accounting.get_period_profit_summary`
- [ ] `accounting.close_period`

## Gate 3: RLS and permissions

- [ ] RLS enabled on critical business tables
- [ ] Authenticated access policies exist where expected
- [ ] Service role grants exist for operational wrappers and automation
- [ ] No obvious overexposure of sensitive accounting/internal tables to `anon`

Minimum RLS focus:

- [ ] `projects.projects`
- [ ] `projects.project_sites`
- [ ] `quotes.quotes`
- [ ] `quotes.quote_history`
- [ ] `sales.invoices`
- [ ] `public.scanned_documents`
- [ ] `internal.user_notifications`

## Gate 4: ERP functional smoke tests

### Reads

- [ ] Read project detail path works
- [ ] Read project sites path works
- [ ] Read quotes listing path works
- [ ] Read invoices listing path works
- [ ] Read accounting summary/reporting path works

### Writes and business RPCs

- [ ] Create/update quote path works
- [ ] Create invoice from quote works
- [ ] Purchase numbering path works
- [ ] Accounting validation RPC works
- [ ] Period summary/profit RPC works

### Role-sensitive behavior

- [ ] Authenticated user can access allowed data
- [ ] Unauthorized access is denied by RLS where expected
- [ ] Service-role-only operations remain restricted

## Gate 5: Regression focus areas

Pay extra attention to:

- [ ] accounting
- [ ] purchase invoices
- [ ] sales quotes and invoices
- [ ] project access
- [ ] scanned documents
- [ ] SharePoint/archive wrappers if they depend on DB grants or wrappers

## Suggested SQL checks

### Schemas

```sql
select schema_name
from information_schema.schemata
where schema_name in ('accounting','sales','quotes','projects','internal','crm','catalog','audit')
order by schema_name;
```

### Critical tables

```sql
select table_schema, table_name
from information_schema.tables
where (table_schema, table_name) in (
  ('sales','invoices'),
  ('sales','invoice_lines'),
  ('quotes','quotes'),
  ('quotes','quote_history'),
  ('projects','projects'),
  ('projects','project_sites'),
  ('internal','authorized_users'),
  ('internal','user_roles'),
  ('public','scanned_documents'),
  ('accounting','journal_entries'),
  ('accounting','journal_entry_lines')
)
order by table_schema, table_name;
```

### Critical functions

```sql
select n.nspname as schema_name, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('public','get_project'),
  ('public','list_project_sites'),
  ('public','update_quote'),
  ('sales','create_invoice_from_quote'),
  ('sales','generate_purchase_invoice_number'),
  ('accounting','validate_month_consistency'),
  ('accounting','get_period_profit_summary'),
  ('accounting','close_period')
)
order by n.nspname, p.proname;
```

### RLS enabled

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where (schemaname, tablename) in (
  ('projects','projects'),
  ('projects','project_sites'),
  ('quotes','quotes'),
  ('quotes','quote_history'),
  ('sales','invoices'),
  ('public','scanned_documents'),
  ('internal','user_notifications')
)
order by schemaname, tablename;
```

### Policies

```sql
select schemaname, tablename, policyname
from pg_policies
where schemaname in ('projects','quotes','sales','internal','public')
order by schemaname, tablename, policyname;
```

## Done criteria

- [ ] Reset completed cleanly
- [ ] Critical schemas, tables, RPCs, and policies exist
- [ ] Core ERP reads and writes work
- [ ] RLS behavior is coherent
- [ ] No blocker found for trial deployment on a new Supabase project
