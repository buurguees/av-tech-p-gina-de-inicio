# Approval patterns

## Casos buenos

- Excepcion de planning o cambio de fecha.
- Confirmacion de tecnico asignado o reasignacion.
- Autorizacion para pasar un site a `READY_TO_INVOICE`.
- Revision de discrepancias OCR antes de registrar la compra.
- Recordatorios o confirmaciones de entrega documental al gestor.

## Casos malos

- Emitir una factura por simple respuesta de correo.
- Registrar un pago sin entrar en ERP.
- Cerrar un periodo contable solo con una aprobacion externa.
- Aprobar automaticamente una compra de baja confianza OCR.

## Payload minimo recomendado

- `entity_type`
- `entity_id`
- `action_requested`
- `summary`
- `deep_link`
- `requested_by`
- `requested_at`
- `decision`
- `decided_by`
- `decided_at`
