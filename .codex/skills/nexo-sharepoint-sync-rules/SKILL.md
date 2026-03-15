---
name: nexo-sharepoint-sync-rules
description: Define reglas de sincronización ERP a SharePoint para rutas, metadatos, naming y archivado documental en NEXO AV.
---

# NEXO SharePoint Sync Rules

## Guía para agentes

| | |
|---|---|
| **Cuándo cargar** | Definir o revisar lógica de archivado automático; implementar mapeo por tipo documental; corregir discrepancias de ruta/naming/metadatos; diseñar validaciones previas de sincronización. |
| **Cuándo NO cargar** | Cambios de UI sin impacto documental; tareas de BD sin impacto en rutas/metadata SharePoint. |
| **Integración .codex** | Si se corrige drift de sync, registrar en `.codex/errores-soluciones.md`; si se define nueva regla reutilizable, en `.codex/avances.md`. |

---

## Objetivo

Garantizar que cada documento generado en el ERP se archive en SharePoint con ruta, nombre y metadatos correctos, de forma reproducible y auditable.

## Fuente canónica

- `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`

## Principios

- **ERP** = fuente transaccional.
- **SharePoint** = archivo documental oficial.
- Un documento emitido debe enlazar a un PDF cerrado y estable.
- La regla de archivado debe ser **determinista** (misma entrada, mismo destino).

---

## Mapeo de destino por tipo documental

| Tipo | Ruta principal | Réplica opcional |
|------|----------------|------------------|
| Factura venta emitida | `Ventas/Facturas Emitidas/{AÑO}/{AÑO-MES}` | `Clientes/{CLIENTE}/{PROYECTO}/Facturas` |
| Presupuesto emitido | `Ventas/Presupuestos Emitidos/{AÑO}/{AÑO-MES}` | `Clientes/{CLIENTE}/{PROYECTO}/Presupuestos` |
| Factura compra | `Compras/{AÑO}/{AÑO-MES}` | `Compras/Proveedores/{PROVEEDOR}/{AÑO-MES}`; `Clientes/{CLIENTE}/{PROYECTO}/Gastos` |
| Ticket | `Compras/Tickets y Gastos/Por Mes/{AÑO}/{AÑO-MES}` | Por beneficiario/proyecto |
| Documento contable | `Contabilidad/{AÑO}/{AÑO-MES}` | `Contabilidad/{AÑO}/Resumen PyG {AÑO}.xlsx` |

---

## Naming obligatorio

| Tipo | Formato |
|------|---------|
| Factura venta | `{NUMERO_FACTURA} - {CLIENTE} - {FECHA}.pdf` |
| Presupuesto | `{NUMERO_PRESUPUESTO} - {CLIENTE} - {FECHA}.pdf` |
| Factura compra | `{NUMERO_INTERNO_COMPRA} - {PROVEEDOR} - {FECHA}.pdf` |
| Ticket | `{NUMERO_TICKET} - {CATEGORIA} - {BENEFICIARIO} - {FECHA}.pdf` |

---

## Metadatos mínimos

- `TipoDocumento`
- `NumeroDocumento`
- `FechaDocumento`
- `MesFiscal`
- `AnoFiscal`
- `DocumentoERPId`
- `HashPDF` (o hash equivalente)
- `ArchivadoPor`
- `ArchivadoEn`

---

## Validaciones previas al archivado

- [ ] Tipo documental reconocido.
- [ ] Número y fecha presentes.
- [ ] Cliente/proveedor/proyecto disponibles cuando aplique.
- [ ] Ruta destino calculada.
- [ ] Nombre final válido y estable.
- [ ] Metadatos mínimos completos.
- [ ] Hash generado antes de persistir referencia.

---

## Política de errores

- Si falta dato crítico, **no archivar** en ruta final.
- Enviar a cola/pendiente con motivo (`missing_metadata`, `invalid_path`, etc.).
- Registrar evento de error con `documento_id`, causa y timestamp.

---

## Trazabilidad mínima

Cada sincronización debe registrar:

- `documento_erp_id`
- `tipo_documento`
- `ruta_sharepoint`
- `nombre_archivo`
- `hash`
- `resultado` (`ok`/`failed`)
- `error_code` (si aplica)
- `executed_at`

---

## Formato de salida recomendado

```markdown
- Documento: <tipo/id>
- Ruta calculada: <ruta>
- Nombre final: <nombre>
- Metadatos: <ok/faltantes>
- Estado sync: <ok/fallo>
- Riesgo: <bajo/medio/alto>
- Siguiente acción: <reintento/corrección/escalado>
```
