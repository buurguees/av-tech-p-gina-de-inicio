# Catálogo V2: Stock ledger y analítica

## Stock movements (ledger)

La tabla **catalog.stock_movements** registra todos los movimientos de stock por producto:

- **Tipos:** IN, OUT, ADJUST, RETURN_IN, RETURN_OUT.
- **Campos:** product_id, movement_type, quantity (no cero), reference_schema, reference_table, reference_id, notes, created_at, created_by (sin FK; la app puede rellenar con internal.get_authorized_user_id(auth.uid())).
- **Actualización de stock:** un trigger después de INSERT aplica el movimiento a `catalog.products.stock_quantity` (solo si `track_stock = true`):
  - IN, RETURN_IN: suma quantity.
  - OUT, RETURN_OUT: resta quantity.
  - ADJUST: suma quantity (puede ser negativo para correcciones).

### Idempotencia con facturas/compras

- **Clave única:** un solo movimiento IN u OUT por **(reference_table, reference_id, product_id)**. Así la misma línea de factura puede tener varios OUT (uno por producto: el producto simple o cada componente del bundle). Índice: `idx_stock_movements_ref_product_unique`.
- **Ventas (sales.invoice_lines):** El trigger evalúa **BUNDLE antes que track_stock**: si el producto es BUNDLE, no se usa el flag track_stock del bundle (es false); se generan OUT/ADJUST solo por componentes con track_stock. INSERT → OUT por producto simple o por cada componente si es BUNDLE. UPDATE de cantidad → ADJUST con delta (por producto o por cada componente). DELETE → ADJUST que revierte la cantidad.
- **Compras (sales.purchase_invoice_lines):** un IN por línea; UPDATE/DELETE vía ADJUST como arriba.

### Bundles (comportamiento implementado)

- Al facturar una línea con un producto tipo **BUNDLE** (track_stock = false en el bundle):
  - **No** se inserta OUT para el producto bundle.
  - **Sí** se inserta un OUT por cada componente en `catalog.product_bundles` cuyo producto tenga `track_stock = true`, con cantidad = cantidad_componente × cantidad_línea.
- Al **actualizar** la cantidad de la línea: se inserta ADJUST por cada componente con delta × cantidad_componente.
- Al **borrar** la línea: se inserta ADJUST positivo (reversión) por cada componente con OLD.quantity × cantidad_componente.
- **Tipos de stock:** `catalog.products.stock_quantity` y `min_stock_alert` son NUMERIC(12,3) (soporte m2, ml, etc.); las RPCs devuelven y aceptan NUMERIC sin truncar.

## Stock alerts

- **catalog.stock_alerts:** product_id, status (open, ack, resolved), created_at, last_notified_at, resolved_at.
- Solo puede haber **una alerta abierta por producto** (índice único parcial `WHERE status = 'open'`).
- **Trigger en catalog.products:** tras INSERT o UPDATE de stock_quantity, min_stock_alert o track_stock:
  - Si `track_stock` y `min_stock_alert` no nulos y `stock_quantity <= min_stock_alert` → se crea una alerta open (si no existe).
  - Si `stock_quantity > min_stock_alert` → se marcan como resolved las alertas open de ese producto.

## Analítica (RPCs)

- **get_catalog_product_analytics(product_id, from?, to?):** devuelve units_sold (OUT + RETURN_OUT), units_purchased (IN + RETURN_IN) y movement_count en el rango de fechas, calculado desde **catalog.stock_movements**.
- **list_stock_movements(product_id, from?, to?, limit?):** listado de movimientos del producto (id, movement_type, quantity, reference_table, reference_id, notes, created_at) ordenado por fecha descendente.

La analítica de “veces usado en presupuestos” queda pendiente hasta que las líneas de presupuesto (quotes.quote_lines) guarden product_id; por ahora se basa en movimientos de stock y en líneas de factura/compra con product_id.

## Ajuste manual de stock

- **adjust_stock(product_id, quantity_delta, notes?):** inserta un movimiento ADJUST con la delta (positiva o negativa). Solo admin o manager. El trigger de stock actualiza `stock_quantity` y el de alertas puede abrir o resolver LOW_STOCK.

## Resumen de triggers

| Tabla / evento | Efecto |
|----------------|--------|
| catalog.stock_movements INSERT | Actualiza products.stock_quantity según movement_type y quantity. |
| catalog.products INSERT/UPDATE (stock_quantity, min_stock_alert, track_stock) | Crea o resuelve fila en stock_alerts (LOW_STOCK). |
| sales.invoice_lines INSERT (product_id) | Si BUNDLE: solo OUT por cada componente (track_stock). Si producto simple y track_stock: un OUT. |
| sales.invoice_lines UPDATE (quantity) | ADJUST con delta; si BUNDLE, un ADJUST por cada componente. |
| sales.invoice_lines DELETE | ADJUST reversión; si BUNDLE, un ADJUST por cada componente. |
| sales.purchase_invoice_lines INSERT (con product_id, track_stock) | Inserta IN en stock_movements. |
| sales.purchase_invoice_lines UPDATE (quantity) | Inserta ADJUST con (NEW.quantity - OLD.quantity). |
| sales.purchase_invoice_lines DELETE | Inserta ADJUST con -OLD.quantity (reversión). |
