---
name: nexo-document-intelligence-ocr
description: Integra Azure AI Document Intelligence en la bandeja de scanner de NEXO AV para clasificar y extraer datos de facturas y tickets con revision humana. Use when designing or implementing OCR pipelines for `scanned_documents`, purchase invoices, expenses, supplier detection, field extraction, low-confidence review or scanner-assisted accounting intake.
---

# NEXO Document Intelligence OCR

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | OCR de compras/tickets, clasificacion documental, extraccion de campos, integracion del scanner con Azure Document Intelligence. |
| **Cuando NO cargar** | Emision de PDFs de venta, reporting Excel, sync de calendario. |
| **Integracion .codex** | Si se fija el contrato OCR o se corrige un fallo de ingestion, registrarlo. |

## Objetivo

Reducir entrada manual en la bandeja `Scanner` sin saltarse validacion humana ni reglas contables/fiscales.

## Fuente de verdad

- `src/pages/nexo_av/desktop/pages/ScannerPage.tsx`
- `src/pages/nexo_av/desktop/pages/ScannerDetailPage.tsx`
- `references/ocr-review-contract.md`

## Workflow recomendado

1. Ingerir archivo original en `scanned_documents`.
2. Enviar a OCR y obtener clasificacion + campos + confianza.
3. Rellenar borrador en `ScannerDetailPage`.
4. Exigir revision humana antes de crear factura de compra o gasto.
5. Archivar solo despues del alta valida en ERP.

## Guardrails

- No aprobar, contabilizar ni pagar automaticamente.
- No sobrescribir el archivo origen.
- Si la confianza es baja, dejar el campo vacio o pendiente de validacion.
- Mantener trazabilidad entre archivo, OCR bruto y documento ERP resultante.

## Salida esperada del agente

- Tipo documental detectado.
- Campos propuestos y confianza.
- Campos que requieren revision.
- Paso siguiente en scanner/ERP.
