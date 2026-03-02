---
name: nexo-sharepoint-sync-rules
description: Define reglas de sincronizacion ERP a SharePoint para rutas, metadatos, naming y archivado documental en NEXO AV.
---

# NEXO SharePoint Sync Rules

## Objetivo
Garantizar que cada documento generado en el ERP se archive en SharePoint con ruta, nombre y metadatos correctos, de forma reproducible y auditable.

## Fuente canonica
- `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`

## Principios
- ERP = fuente transaccional.
- SharePoint = archivo documental oficial.
- Un documento emitido debe enlazar a un PDF cerrado y estable.
- La regla de archivado debe ser determinista (misma entrada, mismo destino).

## Cuando usar esta skill
- Definir o revisar logica de archivado automatico.
- Implementar mapeo por tipo documental.
- Corregir discrepancias de ruta/naming/metadatos.
- Diseñar validaciones previas de sincronizacion.

## Mapeo de destino por tipo documental
- Factura venta emitida:
  - `Ventas/Facturas Emitidas/{AÑO}/{AÑO-MES}`
  - Replica opcional: `Clientes/{CLIENTE}/{PROYECTO}/Facturas`
- Presupuesto emitido:
  - `Ventas/Presupuestos Emitidos/{AÑO}/{AÑO-MES}`
  - Replica opcional: `Clientes/{CLIENTE}/{PROYECTO}/Presupuestos`
- Factura compra:
  - `Compras/{AÑO}/{AÑO-MES}`
  - Replica: `Compras/Proveedores/{PROVEEDOR}/{AÑO-MES}`
  - Replica opcional: `Clientes/{CLIENTE}/{PROYECTO}/Gastos`
- Ticket:
  - `Compras/Tickets y Gastos/Por Mes/{AÑO}/{AÑO-MES}`
  - Replica opcional por beneficiario/proyecto
- Documento contable:
  - `Contabilidad/{AÑO}/{AÑO-MES}`
  - Mantener anual: `Contabilidad/{AÑO}/Resumen PyG {AÑO}.xlsx`

## Naming obligatorio
- Factura venta: `{NUMERO_FACTURA} - {CLIENTE} - {FECHA}.pdf`
- Presupuesto: `{NUMERO_PRESUPUESTO} - {CLIENTE} - {FECHA}.pdf`
- Factura compra: `{NUMERO_INTERNO_COMPRA} - {PROVEEDOR} - {FECHA}.pdf`
- Ticket: `{NUMERO_TICKET} - {CATEGORIA} - {BENEFICIARIO} - {FECHA}.pdf`

## Metadatos minimos
- `TipoDocumento`
- `NumeroDocumento`
- `FechaDocumento`
- `MesFiscal`
- `AnoFiscal`
- `DocumentoERPId`
- `HashPDF` (o hash equivalente)
- `ArchivadoPor`
- `ArchivadoEn`

## Validaciones previas al archivado
- [ ] Tipo documental reconocido.
- [ ] Numero y fecha presentes.
- [ ] Cliente/proveedor/proyecto disponibles cuando aplique.
- [ ] Ruta destino calculada.
- [ ] Nombre final valido y estable.
- [ ] Metadatos minimos completos.
- [ ] Hash generado antes de persistir referencia.

## Politica de errores
- Si falta dato critico, no archivar en ruta final.
- Enviar a cola/pendiente con motivo (`missing_metadata`, `invalid_path`, etc.).
- Registrar evento de error con `documento_id`, causa y timestamp.

## Trazabilidad minima
Cada sincronizacion debe registrar:
- `documento_erp_id`
- `tipo_documento`
- `ruta_sharepoint`
- `nombre_archivo`
- `hash`
- `resultado` (`ok`/`failed`)
- `error_code` (si aplica)
- `executed_at`

## Formato de salida recomendado
```markdown
- Documento: <tipo/id>
- Ruta calculada: <ruta>
- Nombre final: <nombre>
- Metadatos: <ok/faltantes>
- Estado sync: <ok/fallo>
- Riesgo: <bajo/medio/alto>
- Siguiente accion: <reintento/correccion/escalado>
```
