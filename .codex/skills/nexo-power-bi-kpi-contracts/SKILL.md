---
name: nexo-power-bi-kpi-contracts
description: Define contratos canonicos de KPI antes de exponer contabilidad, ventas y cobros en Power BI para NEXO AV. Use when designing or reviewing dashboards, semantic models, metric definitions, accounting-vs-billing reconciliation or Power BI integrations over ERP data.
---

# NEXO Power BI KPI Contracts

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | Dashboards ejecutivos, Power BI, definicion de metricas, reconciliacion entre contabilidad y facturacion, o cualquier cambio de KPI de ventas. |
| **Cuando NO cargar** | OCR documental, UI de tareas, automatizacion de correo sin implicacion de metricas. |
| **Integracion .codex** | Si se cierra una definicion canonica de KPI, debe registrarse en `.codex/avances.md` y usarse como contrato previo a tocar RPCs o dashboards. |

## Objetivo

Evitar que Power BI cristalice en cuadros de mando el drift actual entre facturado bruto, ingreso neto contable y cobrado.

## Fuente de verdad

- `.codex/avances.md`
- `audits/accounting/2026-03-13_accounting_audit_report.md`
- `references/kpi-contracts.md`

## Workflow recomendado

1. Leer el informe de auditoria y `references/kpi-contracts.md`.
2. Identificar que familia metrica necesita el usuario: facturado bruto, neto, cobrado o pendiente.
3. Proponer nombres y definiciones explicitas antes de tocar queries o dashboards.
4. Forzar una fuente canonica para cada KPI antes de modelarla en Power BI.
5. Validar los numeros contra el trimestre auditado o el periodo de referencia.

## Guardrails

- No usar la etiqueta `facturacion` si no se especifica bruto o neto.
- No mezclar metricas operativas, contables y de tesoreria en una misma tarjeta.
- No construir Power BI sobre queries con semantica ambigua.
- No considerar un dashboard correcto solo porque los calculos cierran internamente; tambien deben cerrar semanticamente.

## Salida esperada del agente

- Diccionario de KPI propuesto o validado.
- Fuente SQL/RPC canonica por metrica.
- Riesgos de drift pendientes.
- Criterio de validacion contra datos reales.
