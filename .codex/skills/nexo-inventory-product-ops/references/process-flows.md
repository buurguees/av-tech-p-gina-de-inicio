# Process flows

## Compras: procure to pay

Flujo base:

1. Detectar necesidad por pedido de cliente, minimo/maximo, stock previsto o planificacion.
2. Crear solicitud o propuesta de compra.
3. Seleccionar proveedor, MOQ, precio, lead time y fecha esperada.
4. Emitir `purchase_order`.
5. Recibir mercancia total o parcial.
6. Validar cantidades, calidad, lote/serie, caducidad y ubicacion.
7. Registrar diferencias, rechazos o mermas.
8. Confirmar recepcion para actualizar stock.
9. Conciliar con factura proveedor segun politica.

Reglas:

- La recepcion parcial debe dejar backorder o pendiente claro.
- La factura de compra no debe sustituir la recepcion fisica.
- Si hay discrepancia, separar `ordered_qty`, `received_qty`, `accepted_qty`, `rejected_qty`.

## Ventas: order to cash

Flujo base:

1. Crear oferta o `sales_order`.
2. Confirmar stock disponible o promesa de suministro.
3. Reservar stock.
4. Preparar picking.
5. Empaquetar y expedir.
6. Confirmar entrega.
7. Facturar segun politica: pedido o entrega.
8. Gestionar devoluciones, incidencias o reposiciones.

Reglas:

- La reserva consume disponibilidad, no stock fisico.
- La expedicion reduce stock fisico.
- Si no hay stock suficiente, crear backorder o bloqueo explicito.

## Movimientos de stock

Estados de cantidad que conviene separar:

- `on_hand`: fisico existente.
- `reserved`: comprometido para ordenes.
- `available`: `on_hand - reserved - blocked`.
- `incoming`: compras o transferencias entrantes confirmadas.
- `outgoing`: salidas comprometidas aun no ejecutadas.
- `damaged`: no utilizable.
- `blocked`: retenido por calidad, cuarentena o incidencia.

Tipos de movimiento:

- recepcion de compra
- salida por venta
- transferencia interna
- ajuste por conteo
- merma o rotura
- devolucion de cliente
- devolucion a proveedor

## Conteo fisico y ajustes

Practica recomendada:

- Usar `cycle counting` por clasificacion `ABC`.
- Contar mas veces los productos A y los de alta criticidad.
- Congelar o controlar movimientos mientras se cuenta la ubicacion afectada.
- Registrar diferencia y requerir aprobacion si supera tolerancia.

Tolerancias tipicas a parametrizar:

- por unidades
- por importe
- por familia de producto

## Trazabilidad

Usar `lot` o `serial` cuando exista alguna de estas necesidades:

- garantia
- caducidad
- retirada de producto
- regulacion
- alto valor unitario

Reglas:

- El lote o serie nace en recepcion o fabricacion.
- Debe mantenerse en transferencias internas, reservas, ventas y devoluciones.
- Si hay caducidad, usar prioridad `FEFO`.

## Devoluciones

### Devolucion de cliente

1. Autorizar RMA o motivo equivalente.
2. Recibir producto.
3. Inspeccionar estado, lote, serie y motivo.
4. Decidir destino: stock util, reparacion, cuarentena, desecho.
5. Registrar efecto economico y operativo.

### Devolucion a proveedor

1. Detectar defecto o discrepancia.
2. Bloquear stock afectado.
3. Crear envio de retorno.
4. Confirmar salida y regularizacion.

## Reposicion

Mecanismos utiles:

- `min/max`
- punto de pedido
- cobertura por dias
- compra bajo demanda
- reposicion por proyecto

Entradas necesarias:

- lead time real
- demanda media
- variabilidad
- stock de seguridad

## Errores operativos que la skill debe detectar

- SKU duplicado o ambiguo
- reserva sin stock disponible real
- recepcion sin lote/serie cuando es obligatorio
- devolucion que vuelve a stock sin inspeccion
- inventario negativo
- stock fisico distinto del sistema sin ajuste auditable
- ventas sobre producto `inactive` u `obsolete`
