# Implementation blueprint

## Objetivo

Convertir la operativa de inventario en un diseno implementable para ERP, API y automatizaciones.

## Entidades minimas

- `products`
- `product_variants`
- `product_suppliers`
- `warehouses`
- `stock_locations`
- `inventory_balances`
- `inventory_movements`
- `inventory_reservations`
- `purchase_orders`
- `purchase_order_lines`
- `receipts`
- `receipt_lines`
- `sales_orders`
- `sales_order_lines`
- `pickings`
- `shipments`
- `inventory_counts`
- `inventory_adjustments`
- `lots`
- `serial_numbers`
- `returns`

## Contratos de estado recomendados

### Purchase order

- `draft`
- `sent`
- `partially_received`
- `received`
- `closed`
- `cancelled`

### Sales order

- `draft`
- `confirmed`
- `partially_reserved`
- `reserved`
- `partially_shipped`
- `shipped`
- `delivered`
- `invoiced`
- `cancelled`

### Receipt line

- `expected`
- `received`
- `accepted`
- `rejected`
- `putaway_done`

### Inventory count

- `scheduled`
- `in_progress`
- `pending_approval`
- `posted`
- `cancelled`

## Reglas de integridad

- No permitir movimiento sin SKU y ubicacion.
- Si `tracking_mode` es `lot` o `serial`, exigir identificador en movimientos afectados.
- Una reserva no puede exceder `available`.
- Un ajuste no puede borrar historial; solo crear movimiento compensatorio.
- El cierre de recepcion debe recalcular `on_hand`, `incoming` y backorders.

## API o servicios utiles

- `create_product`
- `upsert_supplier_item`
- `get_inventory_snapshot`
- `reserve_inventory`
- `release_inventory`
- `receive_purchase_order`
- `post_inventory_count`
- `create_inventory_adjustment`
- `create_sales_shipment`
- `register_customer_return`

## Vistas o RPC canonicas recomendadas

- `inventory_snapshot_by_sku_location`
- `inventory_availability_by_sku`
- `inventory_expiring_lots`
- `purchase_open_lines`
- `sales_backorders`
- `inventory_kpi_summary`

## Eventos utiles para automatizacion

- recepcion confirmada
- stock bajo minimo
- lote proximo a caducar
- discrepancia de conteo
- pedido bloqueado por falta de stock
- devolucion aprobada

## Preguntas que el agente debe cerrar antes de implementar

1. Que productos son almacenables, consumibles y servicios.
2. Si se permitira inventario negativo.
3. Si la facturacion depende del pedido o de la entrega.
4. Que nivel de trazabilidad exige el negocio.
5. Que almacenes y ubicaciones existen de verdad.
6. Que KPIs son operativos y cuales ejecutivos.
