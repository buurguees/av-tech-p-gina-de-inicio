# KPIs and controls

## KPIs operativos minimos

- `inventory_accuracy_pct`: exactitud entre stock sistema y conteo.
- `stockout_rate_pct`: porcentaje de demanda no servida por falta de stock.
- `fill_rate_pct`: porcentaje servido completo y a tiempo.
- `inventory_turnover`: rotacion del inventario.
- `days_on_hand`: dias promedio de cobertura.
- `carrying_cost`: coste de mantener stock.
- `obsolete_stock_value`: valor inmovilizado u obsoleto.
- `expired_stock_value`: valor caducado.
- `supplier_on_time_pct`: entregas a tiempo por proveedor.
- `receiving_discrepancy_pct`: recepciones con diferencia.
- `return_rate_pct`: devoluciones sobre ventas.
- `pick_accuracy_pct`: exactitud de preparacion.

## Controles recomendados

- Conteo ciclico por ABC.
- Aprobacion obligatoria de ajustes por encima de tolerancia.
- Auditoria de inventario negativo.
- Bloqueo de recepcion incompleta si faltan datos criticos.
- Trazabilidad de lote/serie en todo el flujo.
- Alertas de caducidad cercana.
- Revision periodica de `safety_stock` y `lead_time`.

## Clasificacion ABC orientativa

- `A`: alto valor o alta criticidad. Conteos frecuentes y aprobacion reforzada.
- `B`: control intermedio.
- `C`: baja criticidad. Conteo menos frecuente.

La clasificacion puede basarse en:

- valor anual consumido
- criticidad operativa
- riesgo de rotura
- riesgo regulatorio

## Politica de ajustes

Todo ajuste debe guardar:

- fecha y hora
- usuario
- ubicacion
- SKU
- lote/serie si aplica
- cantidad anterior
- cantidad nueva
- diferencia
- motivo
- aprobador si supera umbral

## Semantica de KPI

Antes de modelar dashboards, fijar:

1. nombre estable
2. definicion de negocio
3. fuente canonica
4. filtros y exclusiones
5. periodo y granularidad
6. ejemplo validado

## Riesgos frecuentes de drift

- usar `on_hand` como si fuera `available`
- medir ventas con pedidos en lugar de entregas cuando el KPI espera salidas reales
- ocultar mermas y stock bloqueado dentro del stock util
- no separar devoluciones, rechazos y caducados
- mezclar productos y servicios en el mismo KPI
