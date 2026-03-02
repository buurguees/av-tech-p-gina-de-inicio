---
name: nexo-sharepoint-documental
description: Estandariza decisiones, estructura, metadatos y reglas operativas de SharePoint como archivo documental oficial del ERP NEXO AV.
---

# NEXO SharePoint Documental

## Objetivo
Aplicar de forma consistente la estructura documental de SharePoint definida para NEXO AV, manteniendo trazabilidad con ERP, usabilidad por perfiles no tecnicos y alineacion con la operativa fiscal/contable.

## Fuente de verdad
Cuando haya dudas o conflicto, usar como referencia canonica:
- `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`

Principio clave:
- El ERP es la fuente de verdad transaccional.
- SharePoint es el archivo documental oficial.

## Cuando usar esta skill
- Diseno o ajustes de estructura de bibliotecas/carpetas en SharePoint.
- Definicion de metadatos, columnas Choice y vistas.
- Integracion ERP -> SharePoint (rutas, nombres, archivado, trazabilidad).
- Preparacion de documentacion para gestor, cierres o auditoria.
- Decisiones de permisos y experiencia de navegacion.

## Cuando NO usar esta skill
- Cambios puramente de UI sin impacto documental.
- Reglas contables internas que no toquen archivo documental.
- Tareas de base de datos sin impacto en rutas/metadata SharePoint.

## Modelo del site (obligatorio)
Bibliotecas principales:
1. `Ventas`
2. `Compras`
3. `Clientes`
4. `Contabilidad`
5. `Recursos Humanos`
6. `Plantillas y Documentos Maestros`
7. `Importaciones y OCR`

Reglas de navegacion:
- Cada biblioteca debe permitir acceso por carpetas, vistas guardadas y metadatos.
- Priorizar localizacion en menos de 3 clics para administracion/gestor.

## Logica principal por biblioteca
- `Ventas`: principal por mes.
- `Compras`: principal por mes (con acceso por proveedor).
- `Clientes`: principal por cliente/proyecto.
- `Contabilidad`: principal por ejercicio y mes.
- `Recursos Humanos`: principal por persona y ano.
- `Tickets y Gastos`: dentro de `Compras`, principal por mes.
- `Cierres y Gestoria`: dentro de `Contabilidad`, principal por periodo fiscal.

## Rutas recomendadas (canonicas)
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
- `Contabilidad/{AÑO}/Cierres y Gestoria/Mensual/{AÑO-MES}`
- `Contabilidad/{AÑO}/Cierres y Gestoria/Trimestral/{AÑO}-T{N}`
- `Recursos Humanos/Empleados/{PERSONA}/Nominas/{AÑO}`
- `Recursos Humanos/Socios/{PERSONA}/Nominas o Retribuciones/{AÑO}`

## Reglas operativas por documento
- Factura de venta emitida: archivar en `Ventas/...` y replicar en `Clientes/.../Facturas` si aplica.
- Presupuesto emitido: archivar en `Ventas/...` y replicar en `Clientes/.../Presupuestos` si aplica.
- Factura de compra: archivar en `Compras/...`, replicar en proveedor y en cliente/proyecto si esta imputada.
- Ticket: archivar en `Compras/Tickets y Gastos` y replicar por mes/beneficiario/proyecto si aplica.
- Documento contable: archivar por ejercicio/mes y actualizar resumen anual.
- Cierre/gestor: mantener dentro de `Contabilidad/{AÑO}/Cierres y Gestoria`.
- RRHH: siempre en `Recursos Humanos`, nunca en `Contabilidad`.

## Metadatos minimos (obligatorios)
Base comun recomendada:
- `TipoDocumento`
- `NumeroDocumento`
- `FechaDocumento`
- `MesFiscal`
- `AnoFiscal`
- `DocumentoERPId`
- `HashPDF` o `HashRegistro`
- `ArchivadoPor`
- `ArchivadoEn`

Metadatos especificos:
- Ventas: `Cliente`.
- Compras: `Proveedor`.
- Clientes: `Cliente`, `Proyecto`.
- Contabilidad: `FechaGeneracion`, `GeneradoPor`.
- RRHH: `TipoPersona`, `Persona`, `TipoContrato`, `Confidencialidad`.
- Tickets: `CategoriaGasto`, `Beneficiario`.
- Cierres y Gestoria: `PeriodoFiscal`, `EstadoEntregaGestor`.

## Convencion de nombres (obligatoria)
- Facturas venta: `{NUMERO_FACTURA} - {CLIENTE} - {FECHA}.pdf`
- Presupuestos: `{NUMERO_PRESUPUESTO} - {CLIENTE} - {FECHA}.pdf`
- Facturas compra: `{NUMERO_INTERNO_COMPRA} - {PROVEEDOR} - {FECHA}.pdf`
- Tickets: `{NUMERO_TICKET} - {CATEGORIA} - {BENEFICIARIO} - {FECHA}.pdf`
- Resumen anual: `Resumen PyG {AÑO}.xlsx`

Regla de estilo final:
- Nombre entendible por usuario no tecnico.
- Localizable por gestor por periodo.
- Estable en el tiempo.

## Permisos recomendados
Grupos:
- `ERP-Administracion`
- `ERP-Direccion`
- `ERP-Comercial`
- `ERP-Tecnicos`
- `ERP-RRHH`
- `ERP-Gestoria`

Politica:
- Evitar romper herencia en exceso por carpeta.
- Minimizar excepciones; usar grupos claros.

## Checklist de validacion
- [ ] La propuesta respeta la fuente canonica de SharePoint.
- [ ] Se mantiene separacion ERP transaccional vs archivo documental.
- [ ] Las rutas cumplen la logica principal por biblioteca.
- [ ] Metadatos minimos y especificos definidos.
- [ ] Convencion de nombres aplicada.
- [ ] No se introduce documentacion sensible de RRHH en rutas no autorizadas.
- [ ] La navegacion es clara para administracion y gestoria.

## Formato de salida recomendado
Al responder cambios de SharePoint, usar:

```markdown
- Alcance: <biblioteca/proceso>
- Decision aplicada: <estructura/metadata/permisos>
- Evidencia canonica: docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md
- Impacto operativo: <administracion/gestoria/comercial/rrhh>
- Riesgos: <drift, permisos, trazabilidad>
- Siguiente paso: <implementacion o validacion>
```
