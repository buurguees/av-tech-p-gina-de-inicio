# OCR review contract

## Entrada actual

- `ScannerPage` sube PDF/JPG/PNG a `purchase-documents`
- crea registro en `scanned_documents` con estado `UNASSIGNED`
- `ScannerDetailPage` revisa y crea factura de compra o gasto

## Salida deseada del OCR

- `document_type`: `INVOICE` o `EXPENSE`
- `supplier_name`
- `supplier_tax_id`
- `invoice_number`
- `issue_date`
- `subtotal`
- `tax_amount`
- `total`
- `currency`
- `line_candidates`
- `confidence_by_field`

## Regla de UI

- El OCR rellena sugerencias.
- El usuario valida antes de confirmar.
- Si un campo critico no es fiable, no debe autocompletarse como definitivo.

## Campos que no deben inferirse a ciegas

- Proyecto
- Site
- Categoria contable final
- Beneficiario final
- Retencion aplicable
