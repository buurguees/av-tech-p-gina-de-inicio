# NEXO AV — Base de Datos Completa
Fecha: 2026-03-26
Total esquemas: 10 | Total tablas: 106 | Total columnas: 1420

## Índice de esquemas

- [accounting](#accounting) — 14 tablas
- [audit](#audit) — 6 tablas
- [catalog](#catalog) — 15 tablas
- [crm](#crm) — 8 tablas
- [internal](#internal) — 28 tablas
- [projects](#projects) — 10 tablas
- [public](#public) — 4 tablas
- [quotes](#quotes) — 4 tablas
- [sales](#sales) — 15 tablas
- [security](#security) — 2 tablas

---

## accounting

### accounting.account_balances

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | account_code | text | NO |  |  |
| 3 | third_party_id | uuid | YES |  |  |
| 4 | third_party_type | USER-DEFINED | YES |  |  |
| 5 | balance_date | date | NO | CURRENT_DATE |  |
| 6 | debit_balance | numeric | YES | 0 |  |
| 7 | credit_balance | numeric | YES | 0 |  |
| 8 | net_balance | numeric | YES |  |  |
| 9 | created_at | timestamp with time zone | YES | now() |  |
| 10 | updated_at | timestamp with time zone | YES | now() |  |

### accounting.chart_of_accounts

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | account_code | text | NO |  |  |
| 3 | account_name | text | NO |  |  |
| 4 | account_type | text | NO |  |  |
| 5 | parent_account_code | text | YES |  |  |
| 6 | is_active | boolean | YES | true |  |
| 7 | description | text | YES |  |  |
| 8 | created_at | timestamp with time zone | YES | now() |  |
| 9 | updated_at | timestamp with time zone | YES | now() |  |

### accounting.credit_installments

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | operation_id | uuid | NO |  |  |
| 3 | installment_number | integer | NO |  |  |
| 4 | due_date | date | NO |  |  |
| 5 | amount | numeric | NO |  |  |
| 6 | status | USER-DEFINED | NO | 'PENDING'::accounting.credit_installment_status |  |
| 7 | created_at | timestamp with time zone | NO | now() |  |
| 8 | settlement_id | uuid | YES |  |  |
| 9 | paid_date | date | YES |  |  |
| 10 | principal_amount | numeric | YES |  |  |
| 11 | interest_amount | numeric | YES | 0 |  |
| 12 | outstanding_principal | numeric | YES |  |  |
| 13 | bank_account_id | uuid | YES |  |  |

### accounting.credit_operations

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | direction | text | NO | 'PAY'::text |  |
| 3 | provider_id | uuid | NO |  |  |
| 4 | purchase_invoice_id | uuid | NO |  |  |
| 5 | gross_amount | numeric | NO |  |  |
| 6 | fee_amount | numeric | NO | 0 |  |
| 7 | net_amount | numeric | NO |  |  |
| 8 | num_installments | integer | NO | 1 |  |
| 9 | status | USER-DEFINED | NO | 'CONFIRMED'::accounting.credit_operation_status |  |
| 10 | journal_entry_id | uuid | YES |  |  |
| 11 | settlement_bank_account_id | uuid | YES |  |  |
| 12 | created_by | uuid | YES |  |  |
| 13 | created_at | timestamp with time zone | NO | now() |  |
| 14 | updated_at | timestamp with time zone | NO | now() |  |
| 15 | contract_reference | text | YES |  |  |
| 16 | accounting_code | text | YES |  |  |

### accounting.credit_settlements

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | operation_id | uuid | NO |  |  |
| 3 | settlement_date | date | NO | CURRENT_DATE |  |
| 4 | gross_amount | numeric | NO |  |  |
| 5 | fee_amount | numeric | NO | 0 |  |
| 6 | net_amount | numeric | NO |  |  |
| 7 | bank_account_id | uuid | NO |  |  |
| 8 | journal_entry_id | uuid | YES |  |  |
| 9 | created_by | uuid | YES |  |  |
| 10 | created_at | timestamp with time zone | NO | now() |  |

### accounting.external_credit_providers

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | name | text | NO |  |  |
| 3 | code | text | NO |  |  |
| 4 | provider_type | USER-DEFINED | NO | 'BNPL'::accounting.credit_provider_type |  |
| 5 | creditor_account_code | text | NO | '520000'::text |  |
| 6 | expense_account_code | text | NO | '669000'::text |  |
| 7 | is_active | boolean | NO | true |  |
| 8 | created_at | timestamp with time zone | NO | now() |  |
| 9 | updated_at | timestamp with time zone | NO | now() |  |

### accounting.journal_entries

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | entry_number | text | NO |  |  |
| 3 | entry_date | date | NO | CURRENT_DATE |  |
| 4 | entry_type | USER-DEFINED | NO |  |  |
| 5 | description | text | NO |  |  |
| 6 | reference_id | uuid | YES |  |  |
| 7 | reference_type | text | YES |  |  |
| 8 | project_id | uuid | YES |  |  |
| 9 | is_locked | boolean | YES | false |  |
| 10 | locked_at | timestamp with time zone | YES |  |  |
| 11 | created_by | uuid | YES |  |  |
| 12 | created_at | timestamp with time zone | YES | now() |  |
| 13 | updated_at | timestamp with time zone | YES | now() |  |
| 14 | is_automatic | boolean | YES | false |  |
| 15 | period_start | date | YES |  |  |
| 16 | period_end | date | YES |  |  |

### accounting.journal_entry_lines

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | journal_entry_id | uuid | NO |  |  |
| 3 | account_code | text | NO |  |  |
| 4 | debit_credit | text | NO |  |  |
| 5 | amount | numeric | NO |  |  |
| 6 | third_party_id | uuid | YES |  |  |
| 7 | third_party_type | USER-DEFINED | YES |  |  |
| 8 | description | text | YES |  |  |
| 9 | line_order | integer | YES | 0 |  |
| 10 | created_at | timestamp with time zone | YES | now() |  |

### accounting.monthly_reports

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | year | integer | NO |  |  |
| 3 | month | integer | NO |  |  |
| 4 | period_closure_id | uuid | YES |  |  |
| 5 | status | text | NO |  |  |
| 6 | storage_path | text | YES |  |  |
| 7 | pdf_hash | text | YES |  |  |
| 8 | generated_at | timestamp with time zone | YES |  |  |
| 9 | generated_by | uuid | YES |  |  |
| 10 | template_version | text | NO | 'v1'::text |  |
| 11 | dataset_version | text | NO | 'v1'::text |  |
| 12 | locked_at | timestamp with time zone | YES |  |  |
| 13 | sent_at | timestamp with time zone | YES |  |  |
| 14 | sent_to | ARRAY | YES |  |  |
| 15 | sent_cc | ARRAY | YES |  |  |
| 16 | error_message | text | YES |  |  |
| 17 | retry_count | integer | YES | 0 |  |
| 18 | run_after | timestamp with time zone | YES | now() |  |
| 19 | created_at | timestamp with time zone | YES | now() |  |
| 20 | updated_at | timestamp with time zone | YES | now() |  |

### accounting.partner_compensation_runs

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | compensation_number | text | NO |  |  |
| 3 | period_year | integer | NO |  |  |
| 4 | period_month | integer | NO |  |  |
| 5 | partner_id | uuid | NO |  |  |
| 6 | gross_amount | numeric | NO |  |  |
| 7 | irpf_rate | numeric | NO | 19.00 |  |
| 8 | irpf_amount | numeric | NO |  |  |
| 9 | net_amount | numeric | NO |  |  |
| 10 | status | text | NO | 'DRAFT'::text |  |
| 11 | journal_entry_id | uuid | YES |  |  |
| 12 | notes | text | YES |  |  |
| 13 | created_by | uuid | YES |  |  |
| 14 | created_at | timestamp with time zone | YES | now() |  |
| 15 | updated_at | timestamp with time zone | YES | now() |  |
| 16 | is_locked | boolean | NO | false |  |
| 17 | paid_amount | numeric | NO | 0 |  |
| 18 | base_amount | numeric | YES |  |  |
| 19 | productivity_bonus | numeric | YES | 0 |  |
| 20 | bonus_reference_year | integer | YES |  |  |
| 21 | bonus_reference_month | integer | YES |  |  |
| 22 | bonus_reference_net_profit | numeric | YES |  |  |
| 23 | bonus_percent_applied | numeric | YES |  |  |
| 24 | bonus_cap_applied | numeric | YES |  |  |
| 25 | bonus_policy_version | integer | YES |  |  |
| 27 | pnl_reference_year | integer | YES |  |  |
| 28 | pnl_reference_month | integer | YES |  |  |
| 29 | pnl_reference_net_profit | numeric | YES |  |  |
| 30 | period_was_locked | boolean | YES | false |  |

### accounting.payroll_payments

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | payment_number | text | NO |  |  |
| 3 | payroll_run_id | uuid | YES |  |  |
| 4 | partner_compensation_run_id | uuid | YES |  |  |
| 5 | payment_date | date | NO | CURRENT_DATE |  |
| 6 | amount | numeric | NO |  |  |
| 7 | payment_method | text | NO | 'TRANSFER'::text |  |
| 8 | bank_reference | text | YES |  |  |
| 9 | journal_entry_id | uuid | YES |  |  |
| 10 | notes | text | YES |  |  |
| 11 | created_by | uuid | YES |  |  |
| 12 | created_at | timestamp with time zone | YES | now() |  |
| 13 | updated_at | timestamp with time zone | YES | now() |  |
| 14 | company_bank_account_id | uuid | YES |  |  |

### accounting.payroll_runs

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | payroll_number | text | NO |  |  |
| 3 | period_year | integer | NO |  |  |
| 4 | period_month | integer | NO |  |  |
| 5 | employee_id | uuid | NO |  |  |
| 6 | gross_amount | numeric | NO |  |  |
| 7 | irpf_rate | numeric | NO | 19.00 |  |
| 8 | irpf_amount | numeric | NO |  |  |
| 9 | net_amount | numeric | NO |  |  |
| 10 | ss_employee | numeric | YES | 0 |  |
| 11 | ss_company | numeric | YES | 0 |  |
| 12 | status | text | NO | 'DRAFT'::text |  |
| 13 | journal_entry_id | uuid | YES |  |  |
| 14 | notes | text | YES |  |  |
| 15 | created_by | uuid | YES |  |  |
| 16 | created_at | timestamp with time zone | YES | now() |  |
| 17 | updated_at | timestamp with time zone | YES | now() |  |
| 19 | ss_base | numeric | YES |  |  |

### accounting.period_closures

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | year | integer | NO |  |  |
| 3 | month | integer | NO |  |  |
| 4 | period_start | date | NO |  |  |
| 5 | period_end | date | NO |  |  |
| 6 | timezone | text | NO | 'Europe/Madrid'::text |  |
| 7 | closed_at | timestamp with time zone | NO | now() |  |
| 8 | closed_by | uuid | YES |  |  |
| 9 | is_locked | boolean | NO | true |  |

### accounting.tax_config

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | tax_code | text | NO |  |  |
| 3 | tax_name | text | NO |  |  |
| 4 | tax_type | text | NO |  |  |
| 5 | account_code_debit | text | YES |  |  |
| 6 | account_code_credit | text | YES |  |  |
| 7 | default_rate | numeric | NO |  |  |
| 8 | is_active | boolean | YES | true |  |
| 9 | description | text | YES |  |  |
| 10 | created_at | timestamp with time zone | YES | now() |  |
| 11 | updated_at | timestamp with time zone | YES | now() |  |

## audit

### audit.archived_records

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | source_schema | text | NO |  |  |
| 3 | source_table | text | NO |  |  |
| 4 | original_id | uuid | NO |  |  |
| 5 | record_data | jsonb | NO |  |  |
| 6 | archived_at | timestamp with time zone | NO | now() |  |
| 7 | original_created_at | timestamp with time zone | YES |  |  |

### audit.audit_log

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | timestamp | timestamp with time zone | NO | now() |  |
| 3 | user_id | uuid | NO |  |  |
| 4 | action | USER-DEFINED | NO |  |  |
| 5 | table_name | text | NO |  |  |
| 6 | record_id | uuid | YES |  |  |
| 7 | changed_fields | jsonb | YES |  |  |
| 8 | ip_address | inet | YES |  |  |
| 9 | user_agent | text | YES |  |  |

### audit.events

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | event_type | text | NO |  |  |
| 3 | event_category | text | NO |  |  |
| 4 | severity | text | NO | 'info'::text |  |
| 5 | user_id | uuid | YES |  |  |
| 6 | user_email | text | YES |  |  |
| 7 | user_name | text | YES |  |  |
| 8 | resource_type | text | YES |  |  |
| 9 | resource_id | text | YES |  |  |
| 10 | action | text | NO |  |  |
| 11 | details | jsonb | YES | '{}'::jsonb |  |
| 12 | ip_address | inet | YES |  |  |
| 13 | user_agent | text | YES |  |  |
| 14 | session_id | text | YES |  |  |
| 15 | created_at | timestamp with time zone | NO | now() |  |

### audit.logs

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | action | text | NO |  |  |
| 3 | table_name | text | NO |  |  |
| 4 | record_id | uuid | YES |  |  |
| 5 | user_id | uuid | YES |  |  |
| 6 | user_email | text | YES |  |  |
| 7 | created_at | timestamp with time zone | NO | now() |  |
| 8 | ip_address | inet | YES |  |  |
| 9 | user_agent | text | YES |  |  |
| 10 | old_data | jsonb | YES |  |  |
| 11 | new_data | jsonb | YES |  |  |
| 12 | metadata | jsonb | YES |  |  |

### audit.retention_policy

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | source_schema | text | NO |  |  |
| 3 | source_table | text | NO |  |  |
| 4 | retention_days | integer | NO | 90 |  |
| 5 | archive_enabled | boolean | NO | true |  |
| 6 | last_archived_at | timestamp with time zone | YES |  |  |
| 7 | created_at | timestamp with time zone | NO | now() |  |
| 8 | updated_at | timestamp with time zone | NO | now() |  |

### audit.sequence_counters

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | prefix | text | NO |  | PK |
| 2 | year | integer | NO |  | PK |
| 3 | current_number | integer | NO | 0 |  |
| 4 | last_generated_at | timestamp with time zone | YES |  |  |

## catalog

### catalog._mig_category_map

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | internal_id | uuid | NO |  | PK |
| 2 | catalog_id | uuid | NO |  |  |

### catalog._mig_pack_map

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | internal_pack_id | uuid | NO |  | PK |
| 2 | catalog_product_id | uuid | NO |  |  |

### catalog._mig_product_map

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | internal_id | uuid | NO |  | PK |
| 2 | catalog_id | uuid | NO |  |  |

### catalog._mig_subcategory_map

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | internal_id | uuid | NO |  | PK |
| 2 | catalog_id | uuid | NO |  |  |

### catalog.categories

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | name | text | NO |  |  |
| 3 | slug | text | NO |  |  |
| 4 | description | text | YES |  |  |
| 5 | parent_id | uuid | YES |  |  |
| 6 | sort_order | integer | YES | 0 |  |
| 7 | is_active | boolean | YES | true |  |
| 8 | created_at | timestamp with time zone | YES | now() |  |
| 9 | updated_at | timestamp with time zone | YES | now() |  |
| 10 | domain | USER-DEFINED | NO |  |  |
| 11 | code | text | NO |  |  |

### catalog.erp_sync_log

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | sync_type | text | NO |  |  |
| 3 | started_at | timestamp with time zone | YES | now() |  |
| 4 | completed_at | timestamp with time zone | YES |  |  |
| 5 | status | text | NO | 'RUNNING'::text |  |
| 6 | records_processed | integer | YES | 0 |  |
| 7 | records_created | integer | YES | 0 |  |
| 8 | records_updated | integer | YES | 0 |  |
| 9 | records_failed | integer | YES | 0 |  |
| 10 | error_details | jsonb | YES |  |  |
| 11 | initiated_by | uuid | YES |  |  |

### catalog.external_catalog_sources

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | provider | text | NO | 'sharepoint'::text |  |
| 3 | source_type | text | NO | 'excel'::text |  |
| 4 | sharepoint_site_id | text | YES |  |  |
| 5 | drive_id | text | YES |  |  |
| 6 | item_id | text | YES |  |  |
| 7 | sheet_name | text | YES |  |  |
| 8 | range_name | text | YES |  |  |
| 9 | column_mapping | jsonb | YES | '{}'::jsonb |  |
| 10 | last_sync_at | timestamp with time zone | YES |  |  |
| 11 | last_hash | text | YES |  |  |
| 12 | sync_status | text | YES |  |  |
| 13 | last_error | text | YES |  |  |
| 14 | created_at | timestamp with time zone | YES | now() |  |
| 15 | updated_at | timestamp with time zone | YES | now() |  |

### catalog.external_catalog_sync_runs

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | run_id | uuid | NO | gen_random_uuid() | PK |
| 2 | source_id | uuid | YES |  |  |
| 3 | started_at | timestamp with time zone | YES | now() |  |
| 4 | ended_at | timestamp with time zone | YES |  |  |
| 5 | status | text | YES |  |  |
| 6 | stats | jsonb | YES | '{}'::jsonb |  |
| 7 | errors | jsonb | YES | '[]'::jsonb |  |

### catalog.product_bundles

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | bundle_product_id | uuid | NO |  |  |
| 3 | component_product_id | uuid | NO |  |  |
| 4 | quantity | numeric | NO | 1 |  |
| 5 | created_at | timestamp with time zone | YES | now() |  |

### catalog.product_documents

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | product_id | uuid | NO |  |  |
| 3 | provider | USER-DEFINED | NO | 'sharepoint'::catalog.document_provider |  |
| 4 | title | text | NO |  |  |
| 5 | doc_type | USER-DEFINED | NO | 'other'::catalog.document_type |  |
| 6 | sharepoint_item_id | text | YES |  |  |
| 7 | sharepoint_drive_id | text | YES |  |  |
| 8 | sharepoint_site_id | text | YES |  |  |
| 9 | file_url | text | YES |  |  |
| 10 | file_name | text | YES |  |  |
| 11 | mime_type | text | YES |  |  |
| 12 | size_bytes | bigint | YES |  |  |
| 13 | metadata | jsonb | YES | '{}'::jsonb |  |
| 14 | is_primary | boolean | NO | false |  |
| 15 | created_at | timestamp with time zone | YES | now() |  |

### catalog.product_number_sequences

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | prefix | text | NO |  | PK |
| 2 | last_number | integer | NO | 0 |  |
| 3 | updated_at | timestamp with time zone | NO | now() |  |

### catalog.products

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | sku | text | NO |  |  |
| 3 | name | text | NO |  |  |
| 4 | description | text | YES |  |  |
| 5 | product_type | USER-DEFINED | YES | 'PRODUCT'::catalog.product_type |  |
| 6 | category_id | uuid | YES |  |  |
| 7 | unit | USER-DEFINED | YES | 'ud'::catalog.unit_type |  |
| 8 | cost_price | numeric | YES |  |  |
| 9 | sale_price | numeric | NO |  |  |
| 10 | tax_rate_id | uuid | YES |  |  |
| 11 | margin_percentage | numeric | YES |  |  |
| 12 | track_stock | boolean | YES | false |  |
| 13 | stock_quantity | numeric | YES | 0 |  |
| 14 | min_stock_alert | numeric | YES |  |  |
| 15 | erp_product_id | text | YES |  |  |
| 16 | erp_synced_at | timestamp with time zone | YES |  |  |
| 17 | is_active | boolean | YES | true |  |
| 18 | is_featured | boolean | YES | false |  |
| 19 | specifications | jsonb | YES | '{}'::jsonb |  |
| 20 | images | jsonb | YES | '[]'::jsonb |  |
| 21 | created_at | timestamp with time zone | YES | now() |  |
| 22 | updated_at | timestamp with time zone | YES | now() |  |
| 23 | created_by | uuid | YES |  |  |
| 24 | discount_percent | numeric | NO | 0 |  |
| 25 | supplier_id | uuid | YES |  |  |
| 26 | is_displacement_km | boolean | NO | false |  |
| 27 | is_displacement_hours | boolean | NO | false |  |
| 28 | is_companion_trigger | boolean | NO | false |  |
| 29 | is_companion_product | boolean | NO | false |  |

### catalog.stock_alerts

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | product_id | uuid | NO |  |  |
| 3 | status | USER-DEFINED | NO | 'open'::catalog.stock_alert_status |  |
| 4 | created_at | timestamp with time zone | YES | now() |  |
| 5 | last_notified_at | timestamp with time zone | YES |  |  |
| 6 | resolved_at | timestamp with time zone | YES |  |  |

### catalog.stock_movements

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | product_id | uuid | NO |  |  |
| 3 | movement_type | USER-DEFINED | NO |  |  |
| 4 | quantity | numeric | NO |  |  |
| 5 | reference_schema | text | YES |  |  |
| 6 | reference_table | text | YES |  |  |
| 7 | reference_id | uuid | YES |  |  |
| 8 | notes | text | YES |  |  |
| 9 | created_at | timestamp with time zone | YES | now() |  |
| 10 | created_by | uuid | YES |  |  |

### catalog.tax_rates

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | name | text | NO |  |  |
| 3 | rate | numeric | NO |  |  |
| 4 | is_default | boolean | YES | false |  |
| 5 | is_active | boolean | YES | true |  |
| 6 | country | text | YES | 'ES'::text |  |
| 7 | created_at | timestamp with time zone | YES | now() |  |
| 8 | updated_at | timestamp with time zone | YES | now() |  |

## crm

### crm.client_notes

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | client_id | uuid | NO |  |  |
| 3 | note_type | text | NO |  |  |
| 4 | content | text | NO |  |  |
| 5 | previous_status | text | YES |  |  |
| 6 | new_status | text | YES |  |  |
| 7 | previous_assignee_id | uuid | YES |  |  |
| 8 | previous_assignee_name | text | YES |  |  |
| 9 | new_assignee_id | uuid | YES |  |  |
| 10 | new_assignee_name | text | YES |  |  |
| 11 | user_id | uuid | NO |  |  |
| 12 | user_name | text | NO |  |  |
| 13 | created_at | timestamp with time zone | NO | now() |  |

### crm.clients

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | company_name | text | NO |  |  |
| 3 | contact_phone | text | NO |  |  |
| 4 | contact_email | text | NO |  |  |
| 5 | tax_id | text | YES |  |  |
| 6 | legal_name | text | YES |  |  |
| 7 | billing_address | text | YES |  |  |
| 8 | billing_city | text | YES |  |  |
| 9 | billing_province | text | YES |  |  |
| 10 | billing_postal_code | text | YES |  |  |
| 11 | billing_country | text | YES | 'ES'::text |  |
| 12 | website | text | YES |  |  |
| 13 | instagram_handle | text | YES |  |  |
| 14 | tiktok_handle | text | YES |  |  |
| 15 | linkedin_url | text | YES |  |  |
| 16 | number_of_locations | integer | YES | 1 |  |
| 17 | industry_sector | USER-DEFINED | YES |  |  |
| 18 | approximate_budget | numeric | YES |  |  |
| 19 | urgency | USER-DEFINED | YES |  |  |
| 20 | target_objectives | ARRAY | YES |  |  |
| 21 | lead_stage | USER-DEFINED | NO | 'NEW'::crm.lead_stage |  |
| 22 | lead_source | USER-DEFINED | YES |  |  |
| 23 | profile_completeness_score | integer | YES | 30 |  |
| 24 | assigned_to | uuid | YES |  |  |
| 25 | next_follow_up_date | date | YES |  |  |
| 26 | estimated_close_date | date | YES |  |  |
| 27 | lost_reason | text | YES |  |  |
| 28 | notes | text | YES |  |  |
| 29 | created_at | timestamp with time zone | YES | now() |  |
| 30 | updated_at | timestamp with time zone | YES | now() |  |
| 31 | created_by | uuid | YES |  |  |
| 32 | deleted_at | timestamp with time zone | YES |  |  |
| 33 | client_number | text | YES |  |  |
| 34 | latitude | numeric | YES |  |  |
| 35 | longitude | numeric | YES |  |  |
| 36 | full_address | text | YES |  |  |

### crm.contact_messages

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | nombre | text | NO |  |  |
| 3 | empresa | text | YES |  |  |
| 4 | email | text | NO |  |  |
| 5 | telefono | text | YES |  |  |
| 6 | tipo_solicitud | text | NO |  |  |
| 7 | tipo_espacio | text | YES |  |  |
| 8 | mensaje | text | YES |  |  |
| 9 | created_at | timestamp with time zone | NO | now() |  |
| 10 | ip_address | inet | YES |  |  |
| 11 | user_agent | text | YES |  |  |
| 12 | status | text | NO | 'nuevo'::text |  |
| 13 | assigned_to | uuid | YES |  |  |
| 14 | notas_internas | text | YES |  |  |

### crm.contacts

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | client_id | uuid | NO |  |  |
| 3 | full_name | text | NO |  |  |
| 4 | job_title | text | YES |  |  |
| 5 | email | text | YES |  |  |
| 6 | phone | text | YES |  |  |
| 7 | is_primary | boolean | YES | false |  |
| 8 | contact_type | USER-DEFINED | YES |  |  |
| 9 | notes | text | YES |  |  |
| 10 | created_at | timestamp with time zone | YES | now() |  |
| 11 | updated_at | timestamp with time zone | YES | now() |  |

### crm.interactions

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | client_id | uuid | NO |  |  |
| 3 | interaction_type | USER-DEFINED | NO |  |  |
| 4 | interaction_date | timestamp with time zone | NO |  |  |
| 5 | duration_minutes | integer | YES |  |  |
| 6 | subject | text | YES |  |  |
| 7 | notes | text | YES |  |  |
| 8 | outcome | USER-DEFINED | YES |  |  |
| 9 | next_action | text | YES |  |  |
| 10 | created_by | uuid | NO |  |  |
| 11 | created_at | timestamp with time zone | YES | now() |  |
| 12 | updated_at | timestamp with time zone | YES | now() |  |

### crm.lead_sources

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | code | text | NO |  |  |
| 3 | display_name | text | NO |  |  |
| 4 | description | text | YES |  |  |
| 5 | is_active | boolean | YES | true |  |
| 6 | cost_per_lead | numeric | YES |  |  |
| 7 | conversion_rate | numeric | YES |  |  |
| 8 | created_at | timestamp with time zone | YES | now() |  |
| 9 | updated_at | timestamp with time zone | YES | now() |  |

### crm.location

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | created_by | uuid | NO |  |  |
| 3 | status | USER-DEFINED | NO |  |  |
| 4 | address | text | YES |  |  |
| 5 | city | text | YES |  |  |
| 6 | province | text | YES |  |  |
| 7 | postal_code | text | YES |  |  |
| 8 | country | text | YES | 'ES'::text |  |
| 9 | latitude | numeric | NO |  |  |
| 10 | longitude | numeric | NO |  |  |
| 11 | location_references | text | YES |  |  |
| 12 | company_name | text | NO |  |  |
| 13 | business_type | USER-DEFINED | YES |  |  |
| 14 | business_size_sqm | numeric | YES |  |  |
| 15 | business_floors | integer | YES |  |  |
| 16 | business_hours | text | YES |  |  |
| 17 | years_in_operation | integer | YES |  |  |
| 18 | contact_first_name | text | YES |  |  |
| 19 | contact_last_name | text | YES |  |  |
| 20 | contact_position | text | YES |  |  |
| 21 | contact_phone_primary | text | YES |  |  |
| 22 | contact_phone_secondary | text | YES |  |  |
| 23 | contact_email_primary | text | YES |  |  |
| 24 | preferred_contact_method | USER-DEFINED | YES |  |  |
| 25 | best_contact_time | USER-DEFINED | YES |  |  |
| 26 | is_decision_maker | boolean | YES | false |  |
| 27 | secondary_contact_name | text | YES |  |  |
| 28 | secondary_contact_phone | text | YES |  |  |
| 29 | priority | USER-DEFINED | YES | 'MEDIUM'::crm.canvassing_priority |  |
| 30 | lead_score | integer | YES |  |  |
| 31 | lead_source | text | YES |  |  |
| 32 | campaign_id | uuid | YES |  |  |
| 33 | assigned_to | uuid | YES |  |  |
| 34 | team_id | uuid | YES |  |  |
| 35 | av_solutions_required | ARRAY | YES |  |  |
| 36 | solution_details | text | YES |  |  |
| 37 | number_of_screens | integer | YES |  |  |
| 38 | equipment_locations | text | YES |  |  |
| 39 | estimated_budget_range | text | YES |  |  |
| 40 | project_urgency | text | YES |  |  |
| 41 | has_current_av_installation | boolean | YES | false |  |
| 42 | current_provider | text | YES |  |  |
| 43 | installation_age_years | integer | YES |  |  |
| 44 | current_installation_problems | text | YES |  |  |
| 45 | has_maintenance_contract | boolean | YES | false |  |
| 46 | maintenance_contract_provider | text | YES |  |  |
| 47 | maintenance_contract_end_date | date | YES |  |  |
| 48 | has_requested_competitor_quotes | boolean | YES | false |  |
| 49 | competitors_contacted | text | YES |  |  |
| 50 | interest_level | integer | YES |  |  |
| 51 | purchase_phase | USER-DEFINED | YES |  |  |
| 52 | main_objections | ARRAY | YES |  |  |
| 53 | objections_other | text | YES |  |  |
| 54 | economic_decision_maker_identified | boolean | YES | false |  |
| 55 | approval_process | text | YES |  |  |
| 56 | appointment_date | date | YES |  |  |
| 57 | appointment_time | time without time zone | YES |  |  |
| 58 | appointment_type | USER-DEFINED | YES |  |  |
| 59 | appointment_location | text | YES |  |  |
| 60 | callback_date | date | YES |  |  |
| 61 | callback_time | time without time zone | YES |  |  |
| 62 | reminder_enabled | boolean | YES | false |  |
| 63 | reminder_time_before | text | YES |  |  |
| 64 | photos | ARRAY | YES |  |  |
| 65 | videos | ARRAY | YES |  |  |
| 66 | documents | ARRAY | YES |  |  |
| 67 | audio_recordings | ARRAY | YES |  |  |
| 68 | screenshots | ARRAY | YES |  |  |
| 69 | technical_service_type | USER-DEFINED | YES |  |  |
| 70 | maintenance_frequency | USER-DEFINED | YES |  |  |
| 71 | proposed_maintenance_contract | boolean | YES | false |  |
| 72 | maintenance_contract_value | numeric | YES |  |  |
| 73 | existing_equipment | text | YES |  |  |
| 74 | has_active_warranties | boolean | YES | false |  |
| 75 | warranty_end_date | date | YES |  |  |
| 76 | local_access_info | text | YES |  |  |
| 77 | tags | ARRAY | YES |  |  |
| 78 | created_at | timestamp with time zone | YES | now() |  |
| 79 | updated_at | timestamp with time zone | YES | now() |  |
| 80 | modified_by | uuid | YES |  |  |
| 81 | visit_count | integer | YES | 0 |  |
| 82 | total_time_invested_minutes | integer | YES | 0 |  |
| 83 | days_since_first_contact | integer | YES |  |  |
| 84 | days_in_current_status | integer | YES |  |  |
| 85 | response_rate | numeric | YES |  |  |
| 86 | status_history | jsonb | YES |  |  |

### crm.location_notes

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | location_id | uuid | NO |  |  |
| 3 | note_type | USER-DEFINED | NO | 'INTERNAL'::crm.location_note_type |  |
| 4 | content | text | NO |  |  |
| 5 | attachments | ARRAY | YES |  |  |
| 6 | created_by | uuid | NO |  |  |
| 7 | created_at | timestamp with time zone | YES | now() |  |
| 8 | updated_at | timestamp with time zone | YES | now() |  |
| 9 | edited_at | timestamp with time zone | YES |  |  |
| 10 | edited_by | uuid | YES |  |  |

## internal

### internal.authorized_users

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | auth_user_id | uuid | YES |  |  |
| 3 | email | text | NO |  |  |
| 4 | full_name | text | NO |  |  |
| 5 | department | USER-DEFINED | NO | 'COMMERCIAL'::internal.department_type |  |
| 6 | is_active | boolean | YES | true |  |
| 7 | last_login_at | timestamp with time zone | YES |  |  |
| 8 | created_at | timestamp with time zone | YES | now() |  |
| 9 | created_by | uuid | YES |  |  |
| 10 | updated_at | timestamp with time zone | YES | now() |  |
| 11 | deactivated_at | timestamp with time zone | YES |  |  |
| 12 | notes | text | YES |  |  |
| 13 | phone | text | YES |  |  |
| 14 | job_position | text | YES |  |  |
| 15 | setup_completed | boolean | NO | false |  |
| 16 | theme_preference | text | YES | 'light'::text |  |
| 17 | worker_type | text | YES |  |  |
| 18 | linked_partner_id | uuid | YES |  |  |
| 19 | linked_employee_id | uuid | YES |  |  |
| 20 | tax_id | text | YES |  |  |
| 21 | iban | text | YES |  |  |
| 22 | address | text | YES |  |  |
| 23 | city | text | YES |  |  |
| 24 | postal_code | text | YES |  |  |
| 25 | province | text | YES |  |  |
| 26 | irpf_rate | numeric | YES | 15.00 |  |
| 27 | ss_regime | text | YES | 'RETA'::text |  |
| 28 | last_otp_verified_at | timestamp with time zone | YES |  |  |

### internal.company_bank_accounts

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | bank_name | text | NO |  |  |
| 3 | holder_name | text | YES |  |  |
| 4 | iban | text | YES |  |  |
| 5 | accounting_code | text | NO |  |  |
| 6 | notes | text | YES |  |  |
| 7 | is_active | boolean | YES | true |  |
| 8 | created_at | timestamp with time zone | YES | now() |  |
| 9 | updated_at | timestamp with time zone | YES | now() |  |

### internal.company_contacts

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | contact_email | text | YES |  |  |
| 3 | contact_phone | text | YES |  |  |
| 4 | contact_phone_secondary | text | YES |  |  |
| 5 | whatsapp_number | text | YES |  |  |
| 6 | social_networks | jsonb | NO | '[]'::jsonb |  |
| 7 | business_hours | text | YES |  |  |
| 8 | google_maps_url | text | YES |  |  |
| 9 | created_at | timestamp with time zone | NO | now() |  |
| 10 | updated_at | timestamp with time zone | NO | now() |  |

### internal.company_preferences

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | quote_validity_days | integer | NO | 15 |  |
| 3 | invoice_payment_days | integer | NO | 30 |  |
| 4 | bank_accounts | jsonb | NO | '[]'::jsonb |  |
| 5 | default_currency | text | NO | 'EUR'::text |  |
| 6 | created_at | timestamp with time zone | NO | now() |  |
| 7 | updated_at | timestamp with time zone | NO | now() |  |

### internal.company_settings

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | legal_name | text | NO |  |  |
| 3 | tax_id | text | NO |  |  |
| 4 | vat_number | text | YES |  |  |
| 5 | commercial_name | text | YES |  |  |
| 6 | company_type | text | YES | 'company'::text |  |
| 7 | country | text | YES | 'España'::text |  |
| 8 | fiscal_address | text | NO |  |  |
| 9 | fiscal_postal_code | text | NO |  |  |
| 10 | fiscal_city | text | NO |  |  |
| 11 | fiscal_province | text | NO |  |  |
| 12 | billing_email | text | YES |  |  |
| 13 | billing_phone | text | YES |  |  |
| 14 | website | text | YES |  |  |
| 15 | logo_url | text | YES |  |  |
| 16 | created_at | timestamp with time zone | NO | now() |  |
| 17 | updated_at | timestamp with time zone | NO | now() |  |

### internal.employees

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | employee_number | text | NO |  |  |
| 3 | full_name | text | NO |  |  |
| 4 | tax_id | text | YES |  |  |
| 5 | email | text | YES |  |  |
| 6 | phone | text | YES |  |  |
| 7 | status | text | YES | 'ACTIVE'::text |  |
| 8 | created_at | timestamp with time zone | YES | now() |  |
| 9 | updated_at | timestamp with time zone | YES | now() |  |
| 10 | contract_type | text | YES | 'indefinido'::text |  |
| 11 | irpf_rate | numeric | YES | 15.0 |  |
| 12 | custom_ss_employee_rate | numeric | YES |  |  |
| 13 | custom_ss_employer_rate | numeric | YES |  |  |
| 14 | gross_salary | numeric | YES |  |  |

### internal.invitation_tokens

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | user_id | uuid | NO |  |  |
| 3 | token | text | NO |  |  |
| 4 | expires_at | timestamp with time zone | NO |  |  |
| 5 | used_at | timestamp with time zone | YES |  |  |
| 6 | created_at | timestamp with time zone | NO | now() |  |

### internal.partner_compensation_runs

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | partner_id | uuid | NO |  |  |
| 3 | compensation_number | text | NO |  |  |
| 4 | period_month | integer | NO |  |  |
| 5 | period_year | integer | NO |  |  |
| 6 | gross_amount | numeric | NO | 0 |  |
| 7 | irpf_rate | numeric | NO | 0 |  |
| 8 | irpf_amount | numeric | NO | 0 |  |
| 9 | net_amount | numeric | NO | 0 |  |
| 10 | ss_regime | text | NO | 'RETA'::text |  |
| 11 | notes | text | YES |  |  |
| 12 | status | text | NO | 'DRAFT'::text |  |
| 13 | journal_entry_id | uuid | YES |  |  |
| 14 | created_by | uuid | YES |  |  |
| 15 | created_at | timestamp with time zone | NO | now() |  |
| 16 | updated_at | timestamp with time zone | NO | now() |  |
| 17 | paid_amount | numeric | YES | 0 |  |
| 18 | base_amount | numeric | YES |  |  |
| 19 | productivity_bonus | numeric | YES | 0 |  |
| 20 | bonus_reference_year | integer | YES |  |  |
| 21 | bonus_reference_month | integer | YES |  |  |
| 22 | bonus_reference_net_profit | numeric | YES |  |  |
| 23 | bonus_percent_applied | numeric | YES |  |  |
| 24 | bonus_cap_applied | numeric | YES |  |  |
| 25 | bonus_policy_version | integer | YES |  |  |

### internal.partner_payroll_profiles

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | partner_id | uuid | NO |  | PK |
| 2 | base_salary | numeric | NO | 0 |  |
| 3 | irpf_rate | numeric | YES |  |  |
| 4 | bonus_enabled_override | boolean | YES |  |  |
| 5 | bonus_cap_override | numeric | YES |  |  |
| 6 | updated_at | timestamp with time zone | NO | now() |  |
| 7 | updated_by | uuid | YES |  |  |

### internal.partners

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | partner_number | text | NO |  |  |
| 3 | full_name | text | NO |  |  |
| 4 | tax_id | text | YES |  |  |
| 5 | email | text | YES |  |  |
| 6 | phone | text | YES |  |  |
| 7 | status | text | YES | 'ACTIVE'::text |  |
| 8 | created_at | timestamp with time zone | YES | now() |  |
| 9 | updated_at | timestamp with time zone | YES | now() |  |
| 10 | account_code | text | YES |  |  |

### internal.payroll_settings

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | scope | text | NO | 'company'::text |  |
| 3 | bonus_enabled | boolean | NO | true |  |
| 4 | bonus_percent | numeric | NO | 10.00 |  |
| 5 | bonus_cap_amount | numeric | NO | 600.00 |  |
| 6 | min_profit_to_pay_bonus | numeric | NO | 0 |  |
| 7 | bonus_reference_mode | text | NO | 'NET_PROFIT_PREV_MONTH'::text |  |
| 8 | bonus_requires_closed_period | boolean | NO | false |  |
| 9 | default_irpf_rate | numeric | YES |  |  |
| 10 | version | integer | NO | 1 |  |
| 11 | updated_at | timestamp with time zone | NO | now() |  |
| 12 | updated_by | uuid | YES |  |  |

### internal.payroll_settings_audit

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | settings_id | uuid | YES |  |  |
| 3 | changed_at | timestamp with time zone | NO | now() |  |
| 4 | changed_by | uuid | YES |  |  |
| 5 | old_values | jsonb | YES |  |  |
| 6 | new_values | jsonb | YES |  |  |
| 7 | reason | text | NO |  |  |

### internal.product_categories

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | name | text | NO |  |  |
| 3 | code | text | NO |  |  |
| 4 | description | text | YES |  |  |
| 5 | display_order | integer | NO | 0 |  |
| 6 | is_active | boolean | NO | true |  |
| 7 | created_at | timestamp with time zone | NO | now() |  |
| 8 | updated_at | timestamp with time zone | NO | now() |  |
| 9 | type | text | YES | 'product'::text |  |

### internal.product_pack_items

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | pack_id | uuid | NO |  |  |
| 3 | product_id | uuid | NO |  |  |
| 4 | quantity | integer | NO | 1 |  |
| 5 | created_at | timestamp with time zone | NO | now() |  |

### internal.product_packs

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | pack_number | text | NO |  |  |
| 3 | name | text | NO |  |  |
| 4 | description | text | YES |  |  |
| 5 | base_price | numeric | NO | 0 |  |
| 6 | discount_percent | numeric | NO | 0 |  |
| 7 | final_price | numeric | NO | 0 |  |
| 8 | tax_rate | numeric | NO | 21 |  |
| 9 | is_active | boolean | NO | true |  |
| 10 | created_at | timestamp with time zone | NO | now() |  |
| 11 | updated_at | timestamp with time zone | NO | now() |  |

### internal.product_sequences

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | category_code | text | NO |  | PK |
| 2 | last_number | integer | NO | 0 |  |

### internal.product_subcategories

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | category_id | uuid | NO |  |  |
| 3 | name | text | NO |  |  |
| 4 | code | text | NO |  |  |
| 5 | description | text | YES |  |  |
| 6 | display_order | integer | NO | 0 |  |
| 7 | is_active | boolean | NO | true |  |
| 8 | created_at | timestamp with time zone | NO | now() |  |
| 9 | updated_at | timestamp with time zone | NO | now() |  |

### internal.products

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | product_number | text | NO |  |  |
| 3 | category_id | uuid | NO |  |  |
| 4 | subcategory_id | uuid | YES |  |  |
| 5 | name | text | NO |  |  |
| 6 | description | text | YES |  |  |
| 7 | cost_price | numeric | NO | 0 |  |
| 8 | base_price | numeric | NO | 0 |  |
| 9 | tax_rate | numeric | NO | 21.00 |  |
| 10 | is_active | boolean | NO | true |  |
| 11 | created_at | timestamp with time zone | NO | now() |  |
| 12 | updated_at | timestamp with time zone | NO | now() |  |
| 13 | type | USER-DEFINED | NO | 'product'::product_type |  |
| 14 | stock | integer | YES |  |  |
| 15 | default_tax_id | uuid | YES |  |  |

### internal.report_settings

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | scope | text | NO | 'company'::text |  |
| 3 | monthly_report_auto_send_enabled | boolean | YES | false |  |
| 4 | auto_send_on_close | boolean | YES | true |  |
| 5 | recipients_to | ARRAY | YES | '{}'::text[] |  |
| 6 | recipients_cc | ARRAY | YES | '{}'::text[] |  |
| 7 | from_email | text | YES |  |  |
| 8 | email_subject_template | text | YES | 'Informe cierre contable – {Mes} {Año}'::text |  |
| 9 | include_pdf_attachment | boolean | YES | false |  |
| 10 | use_signed_link_instead_of_attachment | boolean | YES | true |  |
| 11 | signed_link_expiry_days | integer | YES | 30 |  |
| 12 | template_version | text | YES | 'v1'::text |  |
| 13 | language | text | YES | 'ES'::text |  |
| 14 | updated_at | timestamp with time zone | YES | now() |  |
| 15 | updated_by | uuid | YES |  |  |

### internal.roles

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | name | text | NO |  |  |
| 3 | display_name | text | NO |  |  |
| 4 | description | text | YES |  |  |
| 5 | level | integer | NO |  |  |
| 6 | is_system | boolean | YES | false |  |
| 7 | created_at | timestamp with time zone | YES | now() |  |

### internal.suppliers

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | supplier_number | text | NO |  |  |
| 3 | company_name | text | NO |  |  |
| 4 | tax_id | text | YES |  |  |
| 5 | contact_email | text | YES |  |  |
| 6 | contact_phone | text | YES |  |  |
| 7 | city | text | YES |  |  |
| 8 | province | text | YES |  |  |
| 9 | payment_terms | text | YES |  |  |
| 10 | status | text | YES | 'ACTIVE'::text |  |
| 11 | created_at | timestamp with time zone | YES | now() |  |
| 12 | category | text | YES |  |  |
| 13 | country | text | YES | 'España'::text |  |
| 14 | address | text | YES |  |  |
| 15 | postal_code | text | YES |  |  |
| 16 | updated_at | timestamp with time zone | YES | now() |  |

### internal.task_activity

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | task_id | uuid | NO |  |  |
| 3 | created_at | timestamp with time zone | NO | now() |  |
| 4 | created_by | uuid | NO |  |  |
| 5 | type | text | NO | 'COMMENT'::text |  |
| 6 | message | text | YES |  |  |
| 7 | meta | jsonb | YES |  |  |

### internal.task_assignees

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | task_id | uuid | NO |  | PK |
| 2 | user_id | uuid | NO |  | PK |
| 3 | role_in_task | text | NO | 'ASSIGNEE'::text |  |
| 4 | assigned_at | timestamp with time zone | NO | now() |  |

### internal.tasks

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | created_at | timestamp with time zone | NO | now() |  |
| 3 | updated_at | timestamp with time zone | NO | now() |  |
| 4 | created_by | uuid | NO |  |  |
| 5 | title | text | NO |  |  |
| 6 | description | text | YES |  |  |
| 7 | status | text | NO | 'TODO'::text |  |
| 8 | priority | text | NO | 'MEDIUM'::text |  |
| 9 | due_date | date | YES |  |  |
| 10 | start_date | date | YES |  |  |
| 11 | completed_at | timestamp with time zone | YES |  |  |
| 12 | project_id | uuid | YES |  |  |
| 13 | site_id | uuid | YES |  |  |
| 14 | quote_id | uuid | YES |  |  |
| 15 | invoice_id | uuid | YES |  |  |
| 16 | visit_id | uuid | YES |  |  |
| 17 | tags | ARRAY | YES |  |  |
| 18 | source | text | YES | 'manual'::text |  |
| 19 | is_archived | boolean | NO | false |  |

### internal.taxes

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | name | text | NO |  |  |
| 3 | code | text | NO |  |  |
| 4 | rate | numeric | NO | 0 |  |
| 5 | tax_type | text | NO | 'sales'::text |  |
| 6 | description | text | YES |  |  |
| 7 | is_default | boolean | NO | false |  |
| 8 | is_active | boolean | NO | true |  |
| 9 | display_order | integer | NO | 0 |  |
| 10 | created_at | timestamp with time zone | NO | now() |  |
| 11 | updated_at | timestamp with time zone | NO | now() |  |

### internal.technicians

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | technician_number | text | NO |  |  |
| 3 | type | USER-DEFINED | NO | 'FREELANCER'::internal.technician_type |  |
| 4 | company_name | text | NO |  |  |
| 5 | legal_name | text | YES |  |  |
| 6 | tax_id | text | YES |  |  |
| 7 | contact_name | text | YES |  |  |
| 8 | contact_phone | text | YES |  |  |
| 9 | contact_phone_secondary | text | YES |  |  |
| 10 | contact_email | text | YES |  |  |
| 11 | billing_email | text | YES |  |  |
| 12 | address | text | YES |  |  |
| 13 | city | text | YES |  |  |
| 14 | province | text | YES |  |  |
| 15 | postal_code | text | YES |  |  |
| 16 | country | text | YES | 'España'::text |  |
| 17 | latitude | numeric | YES |  |  |
| 18 | longitude | numeric | YES |  |  |
| 19 | specialties | ARRAY | YES | '{}'::text[] |  |
| 20 | hourly_rate | numeric | YES |  |  |
| 21 | daily_rate | numeric | YES |  |  |
| 22 | iban | text | YES |  |  |
| 23 | payment_terms | text | YES |  |  |
| 24 | status | USER-DEFINED | NO | 'ACTIVE'::internal.technician_status |  |
| 25 | rating | integer | YES |  |  |
| 26 | notes | text | YES |  |  |
| 27 | created_at | timestamp with time zone | NO | now() |  |
| 28 | updated_at | timestamp with time zone | NO | now() |  |
| 29 | created_by | uuid | YES |  |  |
| 30 | withholding_tax_rate | numeric | YES | NULL::numeric |  |
| 31 | monthly_salary | numeric | YES | NULL::numeric |  |
| 32 | vat_rate | numeric | YES | NULL::numeric |  |

### internal.user_notifications

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | user_id | uuid | NO |  |  |
| 3 | created_at | timestamp with time zone | NO | now() |  |
| 4 | type | text | NO |  |  |
| 5 | severity | text | NO | 'INFO'::text |  |
| 6 | title | text | NO |  |  |
| 7 | message | text | NO |  |  |
| 8 | action_url | text | YES |  |  |
| 9 | entity_type | text | YES |  |  |
| 10 | entity_id | uuid | YES |  |  |
| 11 | is_read | boolean | NO | false |  |
| 12 | read_at | timestamp with time zone | YES |  |  |
| 13 | dedupe_key | text | YES |  |  |

### internal.user_roles

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | user_id | uuid | NO |  |  |
| 3 | role_id | uuid | NO |  |  |
| 4 | granted_at | timestamp with time zone | YES | now() |  |
| 5 | granted_by | uuid | YES |  |  |
| 6 | expires_at | timestamp with time zone | YES |  |  |

## projects

### projects.av_projects

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | project_id | uuid | NO |  |  |
| 3 | internal_project_code | text | YES |  |  |
| 4 | customer_project_reference | text | YES |  |  |
| 5 | project_category | USER-DEFINED | YES |  |  |
| 6 | design_phase_status | USER-DEFINED | YES | 'PENDING'::projects.phase_status |  |
| 7 | design_approved_at | timestamp with time zone | YES |  |  |
| 8 | production_phase_status | USER-DEFINED | YES | 'PENDING'::projects.phase_status |  |
| 9 | production_completed_at | timestamp with time zone | YES |  |  |
| 10 | installation_phase_status | USER-DEFINED | YES | 'PENDING'::projects.phase_status |  |
| 11 | installation_completed_at | timestamp with time zone | YES |  |  |
| 12 | commissioning_phase_status | USER-DEFINED | YES | 'PENDING'::projects.phase_status |  |
| 13 | commissioning_completed_at | timestamp with time zone | YES |  |  |
| 14 | technical_specifications | jsonb | YES | '{}'::jsonb |  |
| 15 | equipment_list | jsonb | YES | '[]'::jsonb |  |
| 16 | warranty_until | date | YES |  |  |
| 17 | maintenance_contract | boolean | YES | false |  |
| 18 | created_at | timestamp with time zone | YES | now() |  |
| 19 | updated_at | timestamp with time zone | YES | now() |  |

### projects.customer_orders

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | project_id | uuid | NO |  |  |
| 3 | customer_order_number | text | NO |  |  |
| 4 | installation_date | date | NO |  |  |
| 5 | installation_time_start | time without time zone | YES |  |  |
| 6 | installation_time_end | time without time zone | YES |  |  |
| 7 | installation_checklist | jsonb | YES | '[]'::jsonb |  |
| 8 | access_requirements | text | YES |  |  |
| 9 | special_conditions | text | YES |  |  |
| 10 | delivery_address | text | YES |  |  |
| 11 | contact_person_onsite | text | YES |  |  |
| 12 | contact_phone_onsite | text | YES |  |  |
| 13 | post_installation_notes | text | YES |  |  |
| 14 | created_at | timestamp with time zone | YES | now() |  |
| 15 | updated_at | timestamp with time zone | YES | now() |  |

### projects.expenses

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | project_id | uuid | NO |  |  |
| 3 | description | text | NO |  |  |
| 4 | amount | numeric | NO | 0 |  |
| 5 | category | text | NO |  |  |
| 6 | date | date | NO | CURRENT_DATE |  |
| 7 | notes | text | YES |  |  |
| 8 | created_by | uuid | YES |  |  |
| 9 | created_at | timestamp with time zone | YES | now() |  |
| 10 | updated_at | timestamp with time zone | YES | now() |  |

### projects.project_activity

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | project_id | uuid | NO |  |  |
| 3 | activity_type | text | NO | 'NOTE'::text |  |
| 4 | content | text | NO |  |  |
| 5 | metadata | jsonb | YES | '{}'::jsonb |  |
| 6 | created_by | uuid | YES |  |  |
| 7 | created_by_name | text | YES |  |  |
| 8 | created_at | timestamp with time zone | NO | now() |  |

### projects.project_documents

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | project_id | uuid | NO |  |  |
| 3 | document_type | USER-DEFINED | NO |  |  |
| 4 | file_name | text | NO |  |  |
| 5 | file_path | text | NO |  |  |
| 6 | file_size_bytes | bigint | YES |  |  |
| 7 | mime_type | text | YES |  |  |
| 8 | uploaded_by | uuid | YES |  |  |
| 9 | created_at | timestamp with time zone | YES | now() |  |

### projects.project_sites

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | project_id | uuid | NO |  |  |
| 3 | site_name | text | NO |  |  |
| 4 | address | text | YES |  |  |
| 5 | city | text | YES |  |  |
| 6 | postal_code | text | YES |  |  |
| 7 | province | text | YES |  |  |
| 8 | country | text | YES | 'ES'::text |  |
| 9 | latitude | double precision | YES |  |  |
| 10 | longitude | double precision | YES |  |  |
| 11 | contact_name | text | YES |  |  |
| 12 | contact_phone | text | YES |  |  |
| 13 | contact_email | text | YES |  |  |
| 14 | site_reference | text | YES |  |  |
| 15 | floor_area | text | YES |  |  |
| 16 | notes | text | YES |  |  |
| 17 | is_active | boolean | NO | true |  |
| 18 | created_at | timestamp with time zone | NO | now() |  |
| 19 | updated_at | timestamp with time zone | NO | now() |  |
| 20 | planned_start_date | date | YES |  |  |
| 21 | planned_end_date | date | YES |  |  |
| 22 | planned_days | integer | YES |  |  |
| 23 | actual_start_at | timestamp with time zone | YES |  |  |
| 24 | actual_end_at | timestamp with time zone | YES |  |  |
| 25 | site_status | text | NO | 'PLANNED'::text |  |
| 26 | client_order_number | text | YES |  |  |

### projects.project_tasks

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | project_id | uuid | NO |  |  |
| 3 | parent_task_id | uuid | YES |  |  |
| 4 | title | text | NO |  |  |
| 5 | description | text | YES |  |  |
| 6 | assigned_to | uuid | YES |  |  |
| 7 | status | USER-DEFINED | NO | 'TODO'::projects.task_status |  |
| 8 | priority | USER-DEFINED | YES | 'MEDIUM'::projects.priority_level |  |
| 9 | due_date | date | YES |  |  |
| 10 | estimated_hours | numeric | YES |  |  |
| 11 | actual_hours | numeric | YES | 0 |  |
| 12 | completion_percentage | integer | YES | 0 |  |
| 13 | blocked_reason | text | YES |  |  |
| 14 | completed_at | timestamp with time zone | YES |  |  |
| 15 | created_by | uuid | NO |  |  |
| 16 | created_at | timestamp with time zone | YES | now() |  |
| 17 | updated_at | timestamp with time zone | YES | now() |  |

### projects.projects

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | project_number | text | NO |  |  |
| 3 | project_type | USER-DEFINED | NO |  |  |
| 4 | title | text | NO |  |  |
| 5 | client_id | uuid | YES |  |  |
| 6 | location_id | uuid | YES |  |  |
| 7 | quote_id | uuid | YES |  |  |
| 8 | status | USER-DEFINED | NO | 'PLANNED'::projects.project_status |  |
| 9 | priority | USER-DEFINED | YES | 'MEDIUM'::projects.priority_level |  |
| 10 | start_date | date | YES |  |  |
| 11 | end_date | date | YES |  |  |
| 12 | actual_start_date | date | YES |  |  |
| 13 | actual_end_date | date | YES |  |  |
| 14 | assigned_to | uuid | YES |  |  |
| 15 | assigned_team | ARRAY | YES |  |  |
| 16 | estimated_hours | numeric | YES |  |  |
| 17 | actual_hours | numeric | YES | 0 |  |
| 18 | budget | numeric | YES |  |  |
| 19 | description | text | YES |  |  |
| 20 | internal_notes | text | YES |  |  |
| 21 | created_by | uuid | NO |  |  |
| 22 | created_at | timestamp with time zone | YES | now() |  |
| 23 | updated_at | timestamp with time zone | YES | now() |  |
| 24 | deleted_at | timestamp with time zone | YES |  |  |
| 25 | project_city | text | YES |  |  |
| 26 | client_order_number | text | YES |  |  |
| 27 | local_name | text | YES |  |  |
| 28 | project_name | text | YES |  |  |
| 29 | site_mode | USER-DEFINED | NO | 'SINGLE_SITE'::projects.site_mode |  |
| 30 | default_site_id | uuid | YES |  |  |

### projects.site_technician_assignments

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | site_id | uuid | NO |  |  |
| 3 | technician_id | uuid | NO |  |  |
| 4 | role | text | YES | 'INSTALLER'::text |  |
| 5 | date_from | date | YES |  |  |
| 6 | date_to | date | YES |  |  |
| 7 | notes | text | YES |  |  |
| 8 | created_by | uuid | YES |  |  |
| 9 | created_at | timestamp with time zone | NO | now() |  |
| 10 | updated_at | timestamp with time zone | NO | now() |  |

### projects.site_visits

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | site_id | uuid | NO |  |  |
| 3 | technician_id | uuid | NO |  |  |
| 4 | visit_date | date | NO | CURRENT_DATE |  |
| 5 | check_in_at | timestamp with time zone | YES |  |  |
| 6 | check_out_at | timestamp with time zone | YES |  |  |
| 7 | notes | text | YES |  |  |
| 8 | created_by | uuid | YES |  |  |
| 9 | created_at | timestamp with time zone | NO | now() |  |
| 10 | updated_at | timestamp with time zone | NO | now() |  |

## public

### public.km_displacement_rules

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | km_min | integer | NO |  |  |
| 3 | km_max | integer | YES |  |  |
| 4 | travel_hours | numeric | NO |  |  |
| 5 | is_active | boolean | NO | true |  |
| 6 | sort_order | integer | NO | 0 |  |
| 7 | created_at | timestamp with time zone | NO | now() |  |

### public.product_companion_rules

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | trigger_product_id | uuid | NO |  |  |
| 3 | companion_product_id | uuid | NO |  |  |
| 4 | quantity_ratio | numeric | NO | 1.0 |  |
| 5 | is_active | boolean | NO | true |  |
| 6 | created_at | timestamp with time zone | NO | now() |  |

### public.scanned_documents

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | file_path | text | NO |  |  |
| 3 | file_name | text | NO |  |  |
| 4 | file_size | integer | NO | 0 |  |
| 5 | file_type | text | NO | 'application/pdf'::text |  |
| 6 | status | text | NO | 'UNASSIGNED'::text |  |
| 7 | assigned_to_type | text | YES |  |  |
| 8 | assigned_to_id | uuid | YES |  |  |
| 9 | notes | text | YES |  |  |
| 10 | created_at | timestamp with time zone | NO | now() |  |
| 11 | created_by | uuid | YES |  |  |
| 12 | updated_at | timestamp with time zone | NO | now() |  |

### public.user_roles

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | user_id | uuid | NO |  |  |
| 3 | role | USER-DEFINED | NO |  |  |
| 4 | created_at | timestamp with time zone | NO | now() |  |

## quotes

### quotes.quote_activity

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | quote_id | uuid | NO |  |  |
| 3 | activity_type | text | NO | 'NOTE'::text |  |
| 4 | content | text | NO |  |  |
| 5 | metadata | jsonb | YES | '{}'::jsonb |  |
| 6 | created_by | uuid | YES |  |  |
| 7 | created_by_name | text | YES |  |  |
| 8 | created_at | timestamp with time zone | NO | now() |  |

### quotes.quote_history

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | quote_id | uuid | NO |  |  |
| 3 | field_name | text | NO |  |  |
| 4 | old_value | text | YES |  |  |
| 5 | new_value | text | YES |  |  |
| 6 | changed_by | uuid | YES |  |  |
| 7 | changed_at | timestamp with time zone | YES | now() |  |

### quotes.quote_lines

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | quote_id | uuid | NO |  |  |
| 3 | line_order | integer | NO | 1 |  |
| 4 | concept | text | NO |  |  |
| 5 | description | text | YES |  |  |
| 6 | quantity | numeric | NO | 1 |  |
| 7 | unit_price | numeric | NO | 0 |  |
| 8 | tax_rate | numeric | NO | 21.00 |  |
| 9 | discount_percent | numeric | YES | 0 |  |
| 10 | subtotal | numeric | YES |  |  |
| 11 | tax_amount | numeric | YES |  |  |
| 12 | total | numeric | YES |  |  |
| 13 | created_at | timestamp with time zone | NO | now() |  |
| 14 | updated_at | timestamp with time zone | NO | now() |  |
| 15 | group_name | text | YES |  |  |

### quotes.quotes

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | quote_number | text | NO |  |  |
| 3 | client_id | uuid | NO |  |  |
| 4 | project_name | text | YES |  |  |
| 5 | order_number | text | YES |  |  |
| 6 | status | USER-DEFINED | NO | 'DRAFT'::quotes.quote_status |  |
| 7 | subtotal | numeric | NO | 0 |  |
| 8 | tax_rate | numeric | NO | 21.00 |  |
| 9 | tax_amount | numeric | NO | 0 |  |
| 10 | total | numeric | NO | 0 |  |
| 11 | valid_until | date | YES |  |  |
| 12 | notes | text | YES |  |  |
| 13 | created_by | uuid | YES |  |  |
| 14 | created_at | timestamp with time zone | NO | now() |  |
| 15 | updated_at | timestamp with time zone | NO | now() |  |
| 16 | project_id | uuid | YES |  |  |
| 17 | provisional_number | text | YES |  |  |
| 18 | assigned_to | uuid | YES |  |  |
| 19 | issue_date | date | YES |  |  |
| 20 | preliminary_number | text | YES |  |  |
| 21 | site_id | uuid | YES |  |  |
| 23 | archived_pdf_provider | text | YES |  |  |
| 24 | sharepoint_site_id | text | YES |  |  |
| 25 | sharepoint_drive_id | text | YES |  |  |
| 26 | sharepoint_item_id | text | YES |  |  |
| 27 | sharepoint_web_url | text | YES |  |  |
| 28 | sharepoint_etag | text | YES |  |  |
| 29 | archived_pdf_path | text | YES |  |  |
| 30 | archived_pdf_file_name | text | YES |  |  |
| 31 | archived_pdf_hash | text | YES |  |  |
| 32 | archived_record_hash | text | YES |  |  |
| 33 | archived_pdf_generated_at | timestamp with time zone | YES |  |  |
| 34 | archived_pdf_generated_by | uuid | YES |  |  |
| 35 | archived_pdf_last_synced_at | timestamp with time zone | YES |  |  |

## sales

### sales.client_payment_summary

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | client_id | uuid | YES |  |  |
| 2 | client_name | text | YES |  |  |
| 3 | invoice_count | bigint | YES |  |  |
| 4 | payment_count | bigint | YES |  |  |
| 5 | total_paid | numeric | YES |  |  |
| 6 | total_invoiced | numeric | YES |  |  |
| 7 | total_pending | numeric | YES |  |  |

### sales.financial_movements

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | movement_type | text | YES |  |  |
| 2 | id | uuid | YES |  |  |
| 3 | invoice_number | text | YES |  |  |
| 4 | issue_date | date | YES |  |  |
| 5 | amount | numeric | YES |  |  |
| 6 | counterparty | text | YES |  |  |
| 7 | counterparty_type | text | YES |  |  |
| 8 | project_id | uuid | YES |  |  |

### sales.financial_summary

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | transaction_type | text | YES |  |  |
| 2 | total_amount | numeric | YES |  |  |
| 3 | total_paid | numeric | YES |  |  |
| 4 | total_pending | numeric | YES |  |  |
| 5 | transaction_count | bigint | YES |  |  |

### sales.invoice_lines

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | invoice_id | uuid | NO |  |  |
| 3 | concept | text | NO |  |  |
| 4 | description | text | YES |  |  |
| 5 | quantity | numeric | NO | 1 |  |
| 6 | unit_price | numeric | NO | 0 |  |
| 7 | tax_rate | numeric | NO | 21 |  |
| 8 | discount_percent | numeric | NO | 0 |  |
| 9 | line_order | integer | NO | 0 |  |
| 10 | created_at | timestamp with time zone | NO | now() |  |
| 11 | updated_at | timestamp with time zone | NO | now() |  |
| 12 | product_id | uuid | YES |  |  |

### sales.invoice_payments

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | invoice_id | uuid | NO |  |  |
| 3 | amount | numeric | NO |  |  |
| 4 | payment_date | date | NO |  |  |
| 5 | payment_method | text | NO |  |  |
| 6 | bank_reference | text | YES |  |  |
| 7 | notes | text | YES |  |  |
| 8 | is_confirmed | boolean | YES | true |  |
| 9 | registered_by | uuid | NO |  |  |
| 10 | created_at | timestamp with time zone | YES | now() |  |
| 11 | updated_at | timestamp with time zone | YES | now() |  |
| 12 | company_bank_account_id | text | YES |  |  |

### sales.invoice_payments_with_details

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | YES |  |  |
| 2 | invoice_id | uuid | YES |  |  |
| 3 | invoice_number | text | YES |  |  |
| 4 | amount | numeric | YES |  |  |
| 5 | payment_date | date | YES |  |  |
| 6 | payment_method | text | YES |  |  |
| 7 | bank_reference | text | YES |  |  |
| 8 | notes | text | YES |  |  |
| 9 | is_confirmed | boolean | YES |  |  |
| 10 | registered_by | uuid | YES |  |  |
| 11 | registered_by_name | text | YES |  |  |
| 12 | created_at | timestamp with time zone | YES |  |  |
| 13 | client_id | uuid | YES |  |  |
| 14 | client_name | text | YES |  |  |
| 15 | project_id | uuid | YES |  |  |
| 16 | project_number | text | YES |  |  |
| 17 | project_name | text | YES |  |  |

### sales.invoice_sequences

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | year | integer | NO |  |  |
| 3 | last_number | integer | NO | 0 |  |
| 4 | created_at | timestamp with time zone | NO | now() |  |
| 5 | updated_at | timestamp with time zone | NO | now() |  |

### sales.invoices

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | invoice_number | text | YES |  |  |
| 3 | source_quote_id | uuid | YES |  |  |
| 4 | client_id | uuid | NO |  |  |
| 5 | project_id | uuid | YES |  |  |
| 6 | project_name | text | YES |  |  |
| 7 | status | text | NO | 'DRAFT'::text |  |
| 8 | issue_date | date | NO | CURRENT_DATE |  |
| 9 | due_date | date | YES |  |  |
| 10 | notes | text | YES |  |  |
| 11 | created_by | uuid | YES |  |  |
| 12 | created_at | timestamp with time zone | NO | now() |  |
| 13 | updated_at | timestamp with time zone | NO | now() |  |
| 14 | invoice_hash | text | YES |  |  |
| 15 | subtotal | numeric | YES | 0 |  |
| 16 | tax_amount | numeric | YES | 0 |  |
| 17 | total | numeric | YES | 0 |  |
| 18 | valid_until | date | YES |  |  |
| 19 | order_number | text | YES |  |  |
| 20 | preliminary_number | text | YES |  |  |
| 21 | paid_amount | numeric | YES | 0 |  |
| 22 | discount_amount | numeric | YES | 0 |  |
| 23 | internal_notes | text | YES |  |  |
| 24 | payment_terms | text | YES |  |  |
| 25 | is_locked | boolean | YES | false |  |
| 26 | locked_at | timestamp with time zone | YES |  |  |
| 27 | pending_amount | numeric | YES |  |  |
| 28 | site_id | uuid | YES |  |  |
| 30 | is_number_definitive | boolean | YES | false |  |
| 31 | number_assigned_at | timestamp with time zone | YES |  |  |
| 32 | invoice_type | text | NO | 'STANDARD'::text |  |
| 33 | original_invoice_id | uuid | YES |  |  |
| 34 | rectification_reason | text | YES |  |  |
| 35 | rectification_type | text | YES |  |  |
| 36 | rectified_by_invoice_id | uuid | YES |  |  |
| 37 | archived_pdf_provider | text | YES |  |  |
| 38 | sharepoint_site_id | text | YES |  |  |
| 39 | sharepoint_drive_id | text | YES |  |  |
| 40 | sharepoint_item_id | text | YES |  |  |
| 41 | sharepoint_web_url | text | YES |  |  |
| 42 | sharepoint_etag | text | YES |  |  |
| 43 | archived_pdf_path | text | YES |  |  |
| 44 | archived_pdf_file_name | text | YES |  |  |
| 45 | archived_pdf_hash | text | YES |  |  |
| 46 | archived_record_hash | text | YES |  |  |
| 47 | archived_pdf_generated_at | timestamp with time zone | YES |  |  |
| 48 | archived_pdf_generated_by | uuid | YES |  |  |
| 49 | archived_pdf_last_synced_at | timestamp with time zone | YES |  |  |

### sales.project_payment_summary

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | project_id | uuid | YES |  |  |
| 2 | project_number | text | YES |  |  |
| 3 | project_name | text | YES |  |  |
| 4 | invoice_count | bigint | YES |  |  |
| 5 | payment_count | bigint | YES |  |  |
| 6 | total_paid | numeric | YES |  |  |
| 7 | total_invoiced | numeric | YES |  |  |
| 8 | total_pending | numeric | YES |  |  |

### sales.purchase_invoice_lines

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | purchase_invoice_id | uuid | NO |  |  |
| 3 | line_order | integer | YES | 1 |  |
| 4 | concept | text | NO |  |  |
| 5 | description | text | YES |  |  |
| 6 | quantity | numeric | YES | 1 |  |
| 7 | unit_price | numeric | YES | 0 |  |
| 8 | discount_percent | numeric | YES | 0 |  |
| 9 | tax_rate | numeric | YES | 21 |  |
| 10 | subtotal | numeric | YES |  |  |
| 11 | tax_amount | numeric | YES |  |  |
| 13 | product_id | uuid | YES |  |  |
| 14 | created_at | timestamp with time zone | YES | now() |  |
| 15 | updated_at | timestamp with time zone | YES | now() |  |
| 16 | withholding_tax_rate | numeric | YES | 0 |  |
| 18 | total | numeric | YES |  |  |
| 19 | withholding_amount | numeric | YES |  |  |

### sales.purchase_invoice_payments

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | purchase_invoice_id | uuid | NO |  |  |
| 3 | amount | numeric | NO |  |  |
| 4 | payment_date | date | NO |  |  |
| 5 | payment_method | text | NO |  |  |
| 6 | bank_reference | text | YES |  |  |
| 7 | notes | text | YES |  |  |
| 8 | is_confirmed | boolean | YES | true |  |
| 9 | registered_by | uuid | NO |  |  |
| 10 | created_at | timestamp with time zone | YES | now() |  |
| 11 | updated_at | timestamp with time zone | YES | now() |  |
| 12 | company_bank_account_id | text | YES |  |  |
| 13 | payer_type | text | NO | 'COMPANY'::text |  |
| 14 | payer_person_id | uuid | YES |  |  |
| 15 | reimbursement_status | text | NO | 'NOT_REQUIRED'::text |  |
| 16 | reimbursement_date | date | YES |  |  |
| 17 | reimbursement_journal_entry_id | uuid | YES |  |  |

### sales.purchase_invoices

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | invoice_number | text | YES |  |  |
| 3 | supplier_name | text | YES |  |  |
| 4 | supplier_tax_id | text | YES |  |  |
| 5 | project_id | uuid | YES |  |  |
| 6 | status | text | YES | 'DRAFT'::text |  |
| 7 | issue_date | date | YES | CURRENT_DATE |  |
| 8 | due_date | date | YES |  |  |
| 9 | subtotal | numeric | YES | 0 |  |
| 10 | tax_amount | numeric | YES | 0 |  |
| 11 | total | numeric | YES | 0 |  |
| 12 | paid_amount | numeric | YES | 0 |  |
| 13 | pending_amount | numeric | YES |  |  |
| 14 | notes | text | YES |  |  |
| 15 | internal_notes | text | YES |  |  |
| 16 | created_by | uuid | YES |  |  |
| 17 | created_at | timestamp with time zone | YES | now() |  |
| 18 | updated_at | timestamp with time zone | YES | now() |  |
| 19 | is_locked | boolean | YES | false |  |
| 20 | locked_at | timestamp with time zone | YES |  |  |
| 21 | supplier_id | uuid | YES |  |  |
| 22 | technician_id | uuid | YES |  |  |
| 23 | document_type | text | YES | 'INVOICE'::text |  |
| 24 | file_path | text | YES |  |  |
| 25 | file_name | text | YES |  |  |
| 26 | expense_category | text | YES |  |  |
| 27 | client_id | uuid | YES |  |  |
| 28 | withholding_amount | numeric | YES | 0 |  |
| 29 | supplier_invoice_number | text | YES |  |  |
| 30 | internal_purchase_number | text | YES |  |  |
| 31 | manual_beneficiary_name | text | YES |  |  |
| 32 | retention_amount | numeric | YES | 0 |  |
| 33 | site_id | uuid | YES |  |  |
| 35 | archived_pdf_provider | text | YES |  |  |
| 36 | sharepoint_site_id | text | YES |  |  |
| 37 | sharepoint_drive_id | text | YES |  |  |
| 38 | sharepoint_item_id | text | YES |  |  |
| 39 | sharepoint_web_url | text | YES |  |  |
| 40 | sharepoint_etag | text | YES |  |  |
| 41 | archived_pdf_path | text | YES |  |  |
| 42 | archived_pdf_file_name | text | YES |  |  |
| 43 | archived_pdf_hash | text | YES |  |  |
| 44 | archived_record_hash | text | YES |  |  |
| 45 | archived_pdf_generated_at | timestamp with time zone | YES |  |  |
| 46 | archived_pdf_generated_by | uuid | YES |  |  |
| 47 | archived_pdf_last_synced_at | timestamp with time zone | YES |  |  |

### sales.purchase_order_lines

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | purchase_order_id | uuid | NO |  |  |
| 3 | line_order | integer | NO | 1 |  |
| 4 | concept | text | NO |  |  |
| 5 | description | text | YES |  |  |
| 6 | quantity | numeric | NO | 1 |  |
| 7 | unit | text | YES | 'ud'::text |  |
| 8 | unit_price | numeric | NO | 0 |  |
| 9 | tax_rate | numeric | NO | 21.00 |  |
| 10 | withholding_rate | numeric | YES | 0 |  |
| 11 | discount_percent | numeric | YES | 0 |  |
| 12 | subtotal | numeric | YES |  |  |
| 13 | tax_amount | numeric | YES |  |  |
| 14 | withholding_amount | numeric | YES |  |  |
| 15 | total | numeric | YES |  |  |
| 16 | group_name | text | YES |  |  |
| 17 | created_at | timestamp with time zone | YES | now() |  |
| 18 | updated_at | timestamp with time zone | YES | now() |  |

### sales.purchase_order_sequences

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | year | integer | NO |  | PK |
| 2 | last_number | integer | NO | 0 |  |

### sales.purchase_orders

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | po_number | text | NO |  |  |
| 3 | supplier_id | uuid | YES |  |  |
| 4 | technician_id | uuid | YES |  |  |
| 5 | project_id | uuid | YES |  |  |
| 6 | supplier_name | text | YES |  |  |
| 7 | supplier_tax_id | text | YES |  |  |
| 8 | status | USER-DEFINED | NO | 'DRAFT'::sales.purchase_order_status |  |
| 9 | issue_date | date | YES | CURRENT_DATE |  |
| 10 | expected_start_date | date | YES |  |  |
| 11 | expected_end_date | date | YES |  |  |
| 12 | actual_start_date | date | YES |  |  |
| 13 | actual_end_date | date | YES |  |  |
| 14 | subtotal | numeric | YES | 0 |  |
| 15 | tax_rate | numeric | YES | 21.00 |  |
| 16 | tax_amount | numeric | YES | 0 |  |
| 17 | withholding_rate | numeric | YES | 0 |  |
| 18 | withholding_amount | numeric | YES | 0 |  |
| 19 | total | numeric | YES | 0 |  |
| 20 | linked_purchase_invoice_id | uuid | YES |  |  |
| 21 | notes | text | YES |  |  |
| 22 | internal_notes | text | YES |  |  |
| 23 | created_by | uuid | YES |  |  |
| 24 | approved_by | uuid | YES |  |  |
| 25 | approved_at | timestamp with time zone | YES |  |  |
| 26 | created_at | timestamp with time zone | YES | now() |  |
| 27 | updated_at | timestamp with time zone | YES | now() |  |
| 28 | site_id | uuid | YES |  |  |
| 29 | archived_pdf_path | text | YES |  |  |
| 30 | archived_pdf_file_name | text | YES |  |  |
| 31 | sharepoint_item_id | text | YES |  |  |
| 32 | sharepoint_web_url | text | YES |  |  |
| 33 | archived_at | timestamp with time zone | YES |  |  |

## security

### security.login_attempts

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | identifier | text | NO |  |  |
| 3 | identifier_type | text | NO |  |  |
| 4 | attempted_at | timestamp with time zone | NO | now() |  |
| 5 | success | boolean | NO | false |  |
| 6 | user_agent | text | YES |  |  |
| 7 | ip_address | inet | YES |  |  |

### security.otp_codes

| # | Columna | Tipo | Nullable | Default | PK |
|---|---------|------|----------|---------|-----|
| 1 | id | uuid | NO | gen_random_uuid() | PK |
| 2 | user_email | text | NO |  |  |
| 3 | code | text | NO |  |  |
| 4 | expires_at | timestamp with time zone | NO |  |  |
| 5 | verified | boolean | YES | false |  |
| 6 | attempts | integer | YES | 0 |  |
| 7 | max_attempts | integer | YES | 3 |  |
| 8 | created_at | timestamp with time zone | YES | now() |  |
| 9 | ip_address | inet | YES |  |  |
| 10 | user_agent | text | YES |  |  |

---

*Documento generado automáticamente a partir de information_schema el 2026-03-26.*