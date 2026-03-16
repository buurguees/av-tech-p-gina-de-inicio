# Product master data

## Objetivo

Definir el minimo canonico que debe existir para que compras, ventas y stock funcionen sin ambiguedad.

## Modelo recomendado

Separar al menos estas entidades:

- `product_template`: familia comercial o tecnica.
- `product_variant`: SKU gestionable real.
- `uom`: unidad base y conversiones.
- `packaging`: caja, pack, pallet o formato logico.
- `supplier_item`: relacion producto-proveedor.
- `storage_rule`: ubicacion, rotacion, temperatura o restricciones.

## Campos minimos por SKU

- `sku`: identificador interno unico.
- `gtin_barcode`: codigo de barras o GTIN si existe.
- `name`
- `variant_attributes`: color, medida, acabado, capacidad o equivalente.
- `product_type`: `storable`, `consumable`, `service`.
- `status`: `active`, `inactive`, `obsolete`.
- `base_uom`
- `purchase_uom`
- `sales_uom`
- `cost_method`: `standard`, `fifo`, `weighted_average` o el metodo elegido.
- `default_cost`
- `list_price`
- `tax_profile`
- `preferred_supplier_id`
- `supplier_lead_time_days`
- `reorder_min_qty`
- `reorder_max_qty`
- `safety_stock_qty`
- `tracking_mode`: `none`, `lot`, `serial`.
- `shelf_life_days` y fechas de caducidad si aplica.
- `storage_conditions`
- `is_returnable`
- `is_sellable`
- `is_purchasable`

## Reglas de calidad de dato

- Un `SKU` no debe reutilizarse para otro producto.
- Si una variante cambia de forma material, crear nuevo SKU.
- El barcode externo puede cambiar por mercado o packaging; el SKU interno no.
- La unidad base debe ser la unidad fisica de control real.
- Las conversiones de unidades deben ser deterministas y versionadas.
- Si hay lotes o series, la configuracion debe existir antes del primer movimiento.

## Packaging y jerarquia

Cuando el producto se compra o vende en varios formatos, modelar:

- unidad base
- pack intermedio
- caja
- pallet

Cada nivel debe indicar:

- `units_per_pack`
- barcode propio si existe
- dimensiones y peso si afectan logistica

## Proveedor y compras

Por cada combinacion producto-proveedor conviene guardar:

- referencia del proveedor
- MOQ
- lead time habitual
- precio negociado
- moneda
- frecuencia de compra
- incidencias historicas

## Estados utiles del catalogo

- `draft`: alta incompleta, no comprable ni vendible.
- `active`: operable.
- `inactive`: visible para historico, no operable.
- `obsolete`: bloqueado para nuevas operaciones salvo reposicion excepcional.

## Checklist de alta de producto

- [ ] SKU creado y unico
- [ ] Nombre y variante definidos
- [ ] Tipo de producto correcto
- [ ] UOM base y conversiones validadas
- [ ] Coste, precio e impuestos cargados
- [ ] Proveedor preferido y lead time informados
- [ ] Politica de reposicion definida
- [ ] Tracking por lote/serie decidido
- [ ] Caducidad y FEFO activados si aplica
- [ ] Barcode o GTIN cargado si aplica
