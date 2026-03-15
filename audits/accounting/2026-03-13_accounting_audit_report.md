# Accounting Audit Report - 2026-03-13

## Executive Summary

The quarterly billing mismatch is real and reproducible in the live Supabase project on 2026-03-13.

For Q1 2026 (`2026-01-01` to `2026-03-31`), the platform currently shows different values because each module is measuring a different concept:

| Source | Current Q1 2026 value | What it is actually measuring |
|---|---:|---|
| `dashboard_get_admin_overview('quarter')` | `20,389.09 EUR` | Sum of `sales.invoices.total` for legacy issued/paid-like statuses, excluding drafts |
| `finance_get_period_summary('2026-01-01','2026-03-31')` | `20,845.70 EUR` | Sum of `sales.invoices.total` for all invoices in range, including drafts |
| `get_fiscal_quarter_data(2026, 1)` -> `ventas_total` | `20,389.09 EUR` | Same family as dashboard: gross billed amount including VAT |
| `get_period_profit_summary('2026-01-01','2026-03-31')` | `16,850.49 EUR` | Accounting revenue from P&L accounts, net of VAT |
| `finance_get_period_summary(...).total_paid` | `15,800.59 EUR` | Cash collected snapshot, not billing |

The difference is not random:

- `20,389.09 - 16,850.49 = 3,538.60 EUR`
- `3,538.60 EUR` is exactly the VAT amount of the non-draft Q1 invoices
- `20,845.70 - 20,389.09 = 456.61 EUR`
- `456.61 EUR` is one draft invoice (`F-BORR-0031`) being included by `finance_get_period_summary`

Conclusion: today the platform mixes three incompatible KPI families under similar labels:

1. Gross billing including VAT
2. Net accounting revenue excluding VAT
3. Cash collected

## Scope

- Docs and business contract:
  - `docs/important/estados-nexo.md`
  - `src/constants/salesInvoiceStatuses.ts`
- DB / RPC layer:
  - `supabase/migrations/20260303220000_baseline_remote_20260303.sql`
- Frontend consumers:
  - `src/pages/nexo_av/desktop/components/dashboard/roles/AdminDashboard.tsx`
  - `src/pages/nexo_av/mobile/pages/MobileDashboard.tsx`
  - `src/pages/nexo_av/desktop/pages/AccountingPage.tsx`
  - `src/pages/nexo_av/desktop/pages/InvoicesPage.tsx`
  - `src/pages/nexo_av/mobile/pages/MobileInvoicesPage.tsx`
  - `src/pages/nexo_av/desktop/components/dashboard/widgets/InvoicesReceivableWidget.tsx`
  - `src/pages/nexo_av/desktop/components/dashboard/widgets/DashboardListsWidget.tsx`
  - `src/pages/nexo_av/desktop/pages/ReportsPage.tsx`

## Live Validation Performed

Read-only RPC validation executed against the live Supabase project on 2026-03-13:

- `dashboard_get_admin_overview('quarter')`
- `finance_get_period_summary('2026-01-01','2026-03-31')`
- `get_period_profit_summary('2026-01-01','2026-03-31')`
- `get_fiscal_quarter_data(2026, 1)`
- `finance_list_invoices(null, null)`

Observed Q1 2026 invoice status distribution:

- `PAID`: 17
- `ISSUED`: 12
- `DRAFT`: 1

Draft that inflates the finance summary:

- `F-BORR-0031`
- Client: `CANON BCN 22`
- Issue date: `2026-03-11`
- Subtotal: `377.36 EUR`
- VAT: `79.25 EUR`
- Total: `456.61 EUR`

## Findings

### ACC-001 - P0 - No canonical KPI definition for "facturacion trimestral"

Different modules use different bases for the same business question:

- Admin dashboard uses invoice `total`
- Fiscal quarterly export uses invoice `total`
- Accounting P&L uses revenue accounts / net revenue
- Finance summary includes drafts
- Collections widgets and mobile stats mix document status and payment state

Evidence:

- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:12523`
- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:14206`
- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:15879`
- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:15929`
- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:4901`
- `src/pages/nexo_av/desktop/pages/AccountingPage.tsx:244`

Impact:

- Q1 2026 currently exposes values from `16,850.49 EUR` to `20,845.70 EUR` depending on where the user looks
- Business users cannot trust quarterly billing KPIs
- Margin and performance analysis are distorted by metric mixing

### ACC-002 - P1 - `finance_get_period_summary` includes drafts in `total_invoiced`

`finance_get_period_summary` sums `sales.invoices.total` for every invoice with `issue_date` in range, regardless of draft/issued state. It only excludes cancelled invoices in `invoice_count`, not in `total_invoiced`.

Evidence:

- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:14206`
- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:14209`

Live impact in Q1 2026:

- Reported by finance summary: `20,845.70 EUR`
- Same set without drafts: `20,389.09 EUR`
- Inflation caused by draft `F-BORR-0031`: `456.61 EUR`

Risk:

- Any draft created inside the quarter inflates billing and invoice count comparability

### ACC-003 - P1 - Status contract drift between docs/UI and DB/RPC logic

The documented and frontend contract says sales document status should be:

- `DRAFT`
- `ISSUED`
- `CANCELLED`

But the DB constraint and multiple RPCs still treat `PAID`, `PARTIAL`, `OVERDUE`, `SENT`, and `RECTIFIED` as raw document statuses.

Evidence:

- Docs: `docs/important/estados-nexo.md`
- UI mapping: `src/constants/salesInvoiceStatuses.ts`
- DB constraint: `supabase/migrations/20260303220000_baseline_remote_20260303.sql:28289`
- Dashboard KPI filter: `supabase/migrations/20260303220000_baseline_remote_20260303.sql:12523`
- Fiscal export filter: `supabase/migrations/20260303220000_baseline_remote_20260303.sql:15879`

Impact:

- The repo contains two incompatible status models at the same time
- Future normalization to the documented model will break KPI filters and widgets unless they are rewritten to use derived payment state

### ACC-004 - P1 - Dashboard margin is not comparable to Accounting P&L

The admin dashboard gross margin is computed from:

- Revenue: `sales.invoices.total` including VAT
- Expenses: `sales.purchase_invoices.total` including VAT and only purchase documents

The accounting page uses:

- Revenue accounts from journal entries, net of VAT
- Expense accounts from the accounting ledger, including broader operating expenses

Evidence:

- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:12545`
- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:12547`
- `supabase/migrations/20260303220000_baseline_remote_20260303.sql:4901`
- `src/pages/nexo_av/desktop/pages/AccountingPage.tsx:172`
- `src/pages/nexo_av/desktop/pages/AccountingPage.tsx:178`

Live impact in Q1 2026:

- Admin dashboard gross margin: `+9,373.29 EUR`
- Accounting P&L profit before tax: `-653.29 EUR`

This is not a bug in arithmetic. It is a bug in metric semantics.

### ACC-005 - P2 - Receivables widgets still infer pending invoices from legacy raw statuses

Several screens still interpret "pending receivable" as `status !== 'PAID' && status !== 'DRAFT' && status !== 'CANCELLED'`.

Evidence:

- `src/pages/nexo_av/desktop/components/dashboard/widgets/InvoicesReceivableWidget.tsx:37`
- `src/pages/nexo_av/desktop/components/dashboard/widgets/InvoicesReceivableWidget.tsx:40`
- `src/pages/nexo_av/desktop/components/dashboard/widgets/DashboardListsWidget.tsx:123`
- `src/pages/nexo_av/mobile/pages/MobileInvoicesPage.tsx:70`
- `src/pages/nexo_av/mobile/pages/MobileInvoicesPage.tsx:80`

Impact:

- Current behavior only works because live data still writes `PAID` to `sales.invoices.status`
- If the system moves to the documented contract (`ISSUED` + derived payment status), these widgets will start showing fully paid invoices as pending

### ACC-006 - P2 - Invoices list totals are not aligned with quarterly KPI semantics

The desktop invoices page footer sums whatever is currently loaded in the list, including drafts, and without a period filter. That makes it unsuitable as a quarterly billing reference even if the user informally reads it as one.

Evidence:

- `src/pages/nexo_av/desktop/pages/InvoicesPage.tsx:639`
- `src/pages/nexo_av/desktop/pages/InvoicesPage.tsx:643`

Impact:

- Page totals can differ from dashboard totals even without a bug in the backend
- The UI does not communicate that this is a list total, not a canonical quarter KPI

## Root Cause

This is a contract problem first, and an implementation problem second.

The platform never standardized one canonical KPI dictionary for sales metrics. As a result:

- fiscal views report gross billed amount including VAT
- accounting views report net revenue excluding VAT
- finance summary mixes billing and collections
- list screens expose raw sums of the currently loaded dataset
- legacy raw statuses remain active in DB filters despite the newer documented model

## Recommended Correction Plan

### Phase 1 - Decide KPI contract

Define and document, at minimum, these separate metrics:

1. `billed_gross_total`
   - sum of issued sales invoices, including VAT
2. `billed_net_total`
   - sum of issued sales invoices, excluding VAT
3. `vat_on_sales`
   - billed VAT
4. `cash_collected_total`
   - confirmed collections in the period
5. `open_receivables_total`
   - pending amount on issued invoices as of today

Important:

- "Facturacion trimestral" must not be used as a label until the business owner chooses whether it means gross or net
- Accounting screens should keep using net revenue terminology, not generic "facturado"

### Phase 2 - Create one canonical sales KPI RPC

Add a single RPC or view, for example:

- `accounting.get_sales_kpi_summary(p_start, p_end)`

It should return:

- billed gross
- billed net
- VAT
- collected cash
- issued count
- draft count
- cancelled count
- pending receivables

All dashboard, invoices, mobile, and reports consumers should read from the same source.

### Phase 3 - Stop using raw legacy status filters in KPI code

Replace filters like:

- `status IN ('ISSUED','PAID','PARTIAL','OVERDUE')`
- `status != 'PAID'`

with rules derived from:

- document state
- payment amounts / payment status
- due date

### Phase 4 - Relabel screens

Examples:

- Dashboard card: `Facturado bruto`
- Accounting card: `Ingresos netos`
- Collections card: `Cobrado`
- Invoices list footer: `Total listado`

## Verification Plan

After the KPI contract is implemented:

1. Q1 2026 must produce one agreed value for gross billing across dashboard, reports, and invoice KPI surfaces.
2. Accounting P&L must remain intentionally different and be labeled as net revenue.
3. Draft invoices must never affect billed KPIs.
4. Paid invoices must not appear as pending receivables when the document status model is normalized.

## Decision Needed Before Code Changes

The product owner needs to choose the business meaning of "facturacion trimestral":

- gross amount including VAT
- net amount excluding VAT

My recommendation is:

- operational dashboards: show both gross and net
- accounting/P&L: use net only
- collections: use paid cash only

