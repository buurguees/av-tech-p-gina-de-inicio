---
name: nexo-inventory-product-ops
description: Define y revisa control de stock, catalogo de productos, compras, ventas, trazabilidad y KPIs operativos para NEXO AV o cualquier modulo ERP interno con inventario. Use when designing product master data, purchase-to-receipt flows, order-to-cash flows, stock movements, cycle counts, reorder logic, lots/serials, warehouse rules or inventory dashboards.
---

# NEXO Inventory Product Ops

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | Diseno funcional de inventario, catalogo, compras, ventas, almacenes, lotes, series, caducidades, recepcion, picking, devoluciones o KPIs de stock. |
| **Cuando NO cargar** | Cambios puramente contables sin inventario, OCR sin impacto en producto, UI aislada sin reglas operativas, o reporting financiero sin semantica de stock. |
| **Integracion .codex** | Si se define una regla canonica de stock o producto, registrarla en `.codex/avances.md`. Si se corrige un incidente real de inventario o trazabilidad, documentarlo en `.codex/errores-soluciones.md`. |

## Objetivo

Dar al agente un marco profesional y reutilizable para modelar inventario y operaciones de producto sin mezclar datos maestros, flujo fisico, reservas, compras, ventas y trazabilidad.

## Fuente canonica

- `references/process-flows.md`
- `references/product-master-data.md`
- `references/kpis-and-controls.md`
- `references/implementation-blueprint.md`
- `references/sources.md`

## Workflow recomendado

1. Identificar si la tarea es de `catalogo`, `compras`, `ventas`, `almacen`, `trazabilidad` o `reporting`.
2. Leer `references/product-master-data.md` si falta definir SKU, variantes, unidades, lotes, series o atributos obligatorios.
3. Leer `references/process-flows.md` para alinear el flujo operativo antes de tocar esquema, UI, automatizaciones o integraciones.
4. Leer `references/kpis-and-controls.md` si la tarea afecta conteos, mermas, rotacion, stockouts o calidad operativa.
5. Leer `references/implementation-blueprint.md` cuando haya que convertir la operativa en tablas, estados, APIs, jobs o validaciones.
6. Forzar una semantica explicita para cada cantidad: `on_hand`, `reserved`, `available`, `incoming`, `outgoing`, `damaged`, `blocked`.

## Principios

- `SKU` interno unico y estable por variante vendible o gestionable.
- Separar `producto`, `variante`, `unidad`, `packaging`, `movimiento`, `lote/serie` y `ubicacion`.
- No usar una unica cifra de stock si en realidad hay fisico, reservado y disponible.
- La recepcion y la expedicion mueven stock; la factura no deberia inventar movimiento fisico.
- El catalogo manda sobre la operativa: sin datos maestros correctos, compras y ventas derivan en drift.
- Si hay caducidad, usar `FEFO`; si no, como minimo `FIFO` consistente.
- Las devoluciones no vuelven automaticamente a stock util sin inspeccion.
- Los conteos deben generar ajuste auditable, no sobrescribir cantidades sin rastro.

## Guardrails

- No mezclar productos almacenables con servicios bajo el mismo comportamiento logico.
- No permitir inventario negativo salvo decision explicita y controlada.
- No usar texto libre como unica clave de producto; exigir `SKU` y, cuando aplique, `GTIN/barcode`.
- No reservar mas unidades de las disponibles sin registrar backorder o falta de stock.
- No perder trazabilidad de lote/serie en recepcion, movimientos internos, venta y devolucion.
- No calcular KPIs ejecutivos desde listados operativos ambiguos si existe una capa canonica.

## Salida esperada del agente

- Flujo propuesto o validado.
- Entidades y estados necesarios.
- Reglas de negocio y validaciones.
- KPIs y controles asociados.
- Riesgos de drift pendientes.
