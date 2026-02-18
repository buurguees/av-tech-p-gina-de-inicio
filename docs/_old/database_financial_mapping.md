# Database Analysis: Dashboard Financial Mapping

This document provides a detailed breakdown of which database tables and fields are now used to drive the real-time metrics on your dashboard.

## Overview of Data Sources

| Metric | Source Table | Key Fields | Logic |
| :--- | :--- | :--- | :--- |
| **Sales Revenue** | `sales.invoices` | `total`, `issue_date` | Sum of `total` for issued/paid invoices. |
| **Purchase Costs** | `purchasing.invoices` | `total`, `date` | Sum of `total` for all purchase invoices. |
| **Gross Profit** | Mixed | `sales - purchasing` | Difference between the two aggregates above. |
| **VAT Collected** | `sales.invoices` | `tax_amount` | IVA Repercutido (from sales). |
| **VAT Paid** | `purchasing.invoices` | `tax_amount` | IVA Soportado (from purchases). |
| **Pending Payables**| `purchasing.invoices` | `status`, `due_date` | Filters for `PENDING_APPROVAL` or `APPROVED`. |

## Missing or Indirect Data

| Item | Status | Recommendation |
| :--- | :--- | :--- |
| **Internal Salaries** | **Missing** | Not found in `purchasing.technicians` (only external). Use a "Fixed Costs" setting in dashboard or a new `hr.salaries` table. |
| **Overhead (Rent, etc.)** | **Missing** | These should be entered as **Purchase Invoices** from regular suppliers to be tracked. |
| **Project Profitability** | **In Progress** | Requires a link between `purchasing.invoices` and `projects.projects`. |

## Applied Solutions

1.  **New RPC**: Created `public.list_purchase_invoices` to securely fetch purchase data.
2.  **Widget Refactoring**:
    -   `ProfitMarginWidget`: Now calculates real margin.
    -   `TaxSummaryWidget`: Now shows real VAT Soportado.
    -   `CashFlowChart`: Expenses are now real totals.
    -   `DashboardListsWidget`: "Pagos" tab shows your actual supplier debt.

> [!TIP]
> To get the most accurate results, ensure you enter all company expenses (material, technicians, services) through the **Facturas de Compra** module.
