# Accounting Audit Report - 2026-03-02

## Executive Summary

Estado: parcial.

El patron de ventas para asignacion por `site` ya estaba consolidado en presupuestos y facturas de venta. En compras existia drift entre UI y RPC: algunas altas ya aceptaban `site`, pero escaner, edicion y validaciones no mantenian la misma invariantes, lo que impedia una trazabilidad fiable por `site` para KPIs de proyecto.

## Findings

### ACC-201
- Severidad: P1
- Dominio: compras / ui / rpc
- Sintoma: compras y tickets podian crearse o editarse sin una asignacion consistente de `site` aunque el proyecto fuera `MULTI_SITE`.
- Evidencia:
  - `src/pages/nexo_av/desktop/pages/NewInvoicePage.tsx`
  - `src/pages/nexo_av/desktop/pages/NewQuotePage.tsx`
  - `src/pages/nexo_av/desktop/pages/ScannerDetailPage.tsx`
  - `src/pages/nexo_av/mobile/pages/MobileScannerDetailPage.tsx`
  - `src/pages/nexo_av/desktop/pages/PurchaseInvoiceDetailPage.tsx`
  - `src/pages/nexo_av/desktop/pages/ExpenseDetailPage.tsx`
  - `supabase/migrations/20260302153000_purchase_invoices_site_assignment_parity.sql`
- Causa: el contrato funcional de ventas se replico solo parcialmente en compras. La validacion de `site_mode`, el auto-assign para `SINGLE_SITE` y la exigencia de `site_id` en `MULTI_SITE` no estaban unificados.
- Fix propuesto: unificar `create_purchase_invoice` y `update_purchase_invoice` con la misma logica que ventas y obligar la seleccion en UI cuando proceda.
- Riesgo: KPIs por `site` incompletos o sesgados; documentos ligados al proyecto pero no al sitio real.

### ACC-202
- Severidad: P2
- Dominio: compras / workflow
- Sintoma: las pantallas de listado que crean borradores rapidos (`PurchaseInvoicesPage`, `ExpensesPage`) siguen generando documentos sin `project_id` ni `site_id`.
- Evidencia:
  - `src/pages/nexo_av/desktop/pages/PurchaseInvoicesPage.tsx`
  - `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx`
- Causa: el flujo de subida crea el borrador antes de conocer el contexto de proyecto/sitio.
- Fix propuesto: mantenerlo como borrador sin `site` solo mientras no exista proyecto asignado, y exigir completar proyecto + `site` antes de aprobar o computar KPIs.
- Riesgo: bajo si reporting filtra por documentos completos; medio si se consumen borradores en metricas.

## Implemented Corrections

- RPC de compras alineado con ventas para `SINGLE_SITE` y `MULTI_SITE`.
- Escaner desktop y mobile ya envian `p_site_id`.
- Dialogo de creacion y pantallas de detalle de compra/gasto ya permiten asignar y persistir `site`.
- Validacion UI anadida en detalle de compra y gasto para bloquear guardado sin `site` en proyectos `MULTI_SITE`.

## Verification Plan

1. Crear presupuesto y factura de venta en proyecto `MULTI_SITE` y confirmar patron de referencia.
2. Crear factura de compra desde escaner en proyecto `MULTI_SITE` y verificar que exige `site`.
3. Crear ticket/gasto desde escaner en proyecto `MULTI_SITE` y verificar que exige `site`.
4. Editar una factura de compra existente, cambiar de proyecto y comprobar que el selector de `site` se actualiza.
5. Editar un gasto existente y validar persistencia de `site_id` en `sales.purchase_invoices`.
6. Confirmar que KPIs por `site` excluyen borradores sin proyecto/sitio, si ese reporting ya existe.

## Checklist

- [x] Drift ventas vs compras identificado
- [x] RPCs de compras alineadas con el contrato funcional
- [x] UI principal de compras/tickets alineada
- [ ] Build/QA ejecutado en entorno sin restricciones
- [ ] Revisar reporting/KPIs para excluir borradores sin asignacion
