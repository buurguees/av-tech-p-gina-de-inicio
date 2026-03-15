---
name: nexo-sharepoint-documental
description: Estandariza decisiones, estructura, metadatos y reglas operativas de SharePoint como archivo documental oficial del ERP NEXO AV.
---

# NEXO SharePoint Documental

## Guía para agentes

| | |
|---|---|
| **Cuándo cargar** | Diseño o ajustes de estructura de bibliotecas/carpetas en SharePoint; definición de metadatos, columnas Choice y vistas; integración ERP → SharePoint; preparación de documentación para gestor, cierres o auditoría; decisiones de permisos y experiencia de navegación. |
| **Cuándo NO cargar** | Cambios puramente de UI sin impacto documental; reglas contables internas que no toquen archivo documental; tareas de base de datos sin impacto en rutas/metadata SharePoint. |
| **Integración .codex** | Si se corrige drift documental, registrar en `.codex/errores-soluciones.md`; si se define nueva estructura o convención, en `.codex/avances.md`. |

---

## Objetivo

Aplicar de forma consistente la estructura documental de SharePoint definida para NEXO AV, manteniendo trazabilidad con ERP, usabilidad por perfiles no técnicos y alineación con la operativa fiscal/contable.

## Fuente de verdad

Cuando haya dudas o conflicto, usar como referencia canónica:

- `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`

**Principio clave:**

- El ERP es la fuente de verdad transaccional.
- SharePoint es el archivo documental oficial.

---

## Modelo del site (obligatorio)

**Bibliotecas principales:**

1. `Ventas`
2. `Compras`
3. `Clientes`
4. `Contabilidad`
5. `Recursos Humanos`
6. `Plantillas y Documentos Maestros`
7. `Importaciones y OCR`

**Reglas de navegación:**

- Cada biblioteca debe permitir acceso por carpetas, vistas guardadas y metadatos.
- Priorizar localización en menos de 3 clics para administración/gestor.

---

## Lógica principal por biblioteca

| Biblioteca | Organización principal |
|------------|------------------------|
| `Ventas` | Por mes |
| `Compras` | Por mes (con acceso por proveedor) |
| `Clientes` | Por cliente/proyecto |
| `Contabilidad` | Por ejercicio y mes |
| `Recursos Humanos` | Por persona y año |
| `Tickets y Gastos` (dentro Compras) | Por mes |
| `Cierres y Gestoría` (dentro Contabilidad) | Por periodo fiscal |

---

## Rutas recomendadas (canónicas)

- `Ventas/Facturas Emitidas/{AÑO}/{AÑO-MES}`
- `Ventas/Presupuestos Emitidos/{AÑO}/{AÑO-MES}`
- `Compras/{AÑO}/{AÑO-MES}`
- `Compras/Proveedores/{PROVEEDOR}/{AÑO-MES}`
- `Compras/Tickets y Gastos/Por Mes/{AÑO}/{AÑO-MES}`
- `Clientes/{CLIENTE}/{PROYECTO}/Facturas`
- `Clientes/{CLIENTE}/{PROYECTO}/Presupuestos`
- `Clientes/{CLIENTE}/{PROYECTO}/Gastos`
- `Contabilidad/{AÑO}/Resumen PyG {AÑO}.xlsx`
- `Contabilidad/{AÑO}/{AÑO-MES}`
- `Contabilidad/{AÑO}/Cierres y Gestoría/Mensual/{AÑO-MES}`
- `Contabilidad/{AÑO}/Cierres y Gestoría/Trimestral/{AÑO}-T{N}`
- `Recursos Humanos/Empleados/{PERSONA}/Nominas/{AÑO}`
- `Recursos Humanos/Socios/{PERSONA}/Nominas o Retribuciones/{AÑO}`

---

## Reglas operativas por documento

| Tipo | Acción |
|------|--------|
| Factura de venta emitida | Archivar en `Ventas/...` y replicar en `Clientes/.../Facturas` si aplica |
| Presupuesto emitido | Archivar en `Ventas/...` y replicar en `Clientes/.../Presupuestos` si aplica |
| Factura de compra | Archivar en `Compras/...`, replicar en proveedor y en cliente/proyecto si está imputada |
| Ticket | Archivar en `Compras/Tickets y Gastos` y replicar por mes/beneficiario/proyecto si aplica |
| Documento contable | Archivar por ejercicio/mes y actualizar resumen anual |
| Cierre/gestor | Mantener dentro de `Contabilidad/{AÑO}/Cierres y Gestoría` |
| RRHH | Siempre en `Recursos Humanos`, nunca en `Contabilidad` |

---

## Metadatos mínimos (obligatorios)

**Base común:**

- `TipoDocumento`
- `NumeroDocumento`
- `FechaDocumento`
- `MesFiscal`
- `AnoFiscal`
- `DocumentoERPId`
- `HashPDF` o `HashRegistro`
- `ArchivadoPor`
- `ArchivadoEn`

**Metadatos específicos:**

- Ventas: `Cliente`
- Compras: `Proveedor`
- Clientes: `Cliente`, `Proyecto`
- Contabilidad: `FechaGeneracion`, `GeneradoPor`
- RRHH: `TipoPersona`, `Persona`, `TipoContrato`, `Confidencialidad`
- Tickets: `CategoriaGasto`, `Beneficiario`
- Cierres y Gestoría: `PeriodoFiscal`, `EstadoEntregaGestor`

---

## Convención de nombres (obligatoria)

| Tipo | Formato |
|------|---------|
| Facturas venta | `{NUMERO_FACTURA} - {CLIENTE} - {FECHA}.pdf` |
| Presupuestos | `{NUMERO_PRESUPUESTO} - {CLIENTE} - {FECHA}.pdf` |
| Facturas compra | `{NUMERO_INTERNO_COMPRA} - {PROVEEDOR} - {FECHA}.pdf` |
| Tickets | `{NUMERO_TICKET} - {CATEGORIA} - {BENEFICIARIO} - {FECHA}.pdf` |
| Resumen anual | `Resumen PyG {AÑO}.xlsx` |

**Regla de estilo final:** Nombre entendible por usuario no técnico; localizable por gestor por periodo; estable en el tiempo.

---

## Permisos recomendados

**Grupos:**

- `ERP-Administracion`
- `ERP-Direccion`
- `ERP-Comercial`
- `ERP-Tecnicos`
- `ERP-RRHH`
- `ERP-Gestoria`

**Política:** Evitar romper herencia en exceso por carpeta; minimizar excepciones; usar grupos claros.

---

## Checklist de validación

- [ ] La propuesta respeta la fuente canónica de SharePoint.
- [ ] Se mantiene separación ERP transaccional vs archivo documental.
- [ ] Las rutas cumplen la lógica principal por biblioteca.
- [ ] Metadatos mínimos y específicos definidos.
- [ ] Convención de nombres aplicada.
- [ ] No se introduce documentación sensible de RRHH en rutas no autorizadas.
- [ ] La navegación es clara para administración y gestoría.

---

## Formato de salida recomendado

```markdown
- Alcance: <biblioteca/proceso>
- Decisión aplicada: <estructura/metadata/permisos>
- Evidencia canónica: docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md
- Impacto operativo: <administración/gestoría/comercial/rrhh>
- Riesgos: <drift, permisos, trazabilidad>
- Siguiente paso: <implementación o validación>
```
