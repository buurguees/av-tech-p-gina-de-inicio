# KPI contracts

## Drift ya documentado

El repo ya tiene evidencia de que distintos modulos miden cosas distintas con etiquetas parecidas.

Fuentes mencionadas en la auditoria:

- `dashboard_get_admin_overview`
- `finance_get_period_summary`
- `get_period_profit_summary`
- `get_fiscal_quarter_data`
- `finance_list_invoices`

## Familias metricas que deben separarse

- `billed_gross_total`: facturado emitido con IVA.
- `billed_net_total`: ingreso neto sin IVA.
- `vat_on_sales`: IVA repercutido.
- `cash_collected_total`: cobros confirmados.
- `open_receivables_total`: saldo pendiente de cobro.

## Regla para Power BI

No construir el modelo semantico final hasta que cada KPI tenga:

1. nombre estable
2. definicion de negocio
3. fuente ERP/RPC canonica
4. regla de exclusiones
5. ejemplo validado en un periodo real
