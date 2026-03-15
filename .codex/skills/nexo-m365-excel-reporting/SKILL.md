---
name: nexo-m365-excel-reporting
description: Publica y gobierna reportes Excel contables y fiscales de NEXO AV en SharePoint/M365 sin romper la fuente de verdad del ERP. Use when implementing or reviewing quarterly Excel exports, annual PYG workbooks, report publication to SharePoint, accounting report automation or Microsoft 365 reporting flows.
---

# NEXO M365 Excel Reporting

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | Reporting Excel fiscal/contable, publicacion en SharePoint, automatizacion de `Resumen PyG`, evolucion de `ReportsPage` o del worker de reportes mensuales. |
| **Cuando NO cargar** | OCR de compras, sincronizacion de calendarios, aprobaciones por correo. |
| **Integracion .codex** | Si se cierra un flujo reusable de reporting o se detecta drift entre Excel y ERP, registrarlo en `.codex/avances.md` o `.codex/errores-soluciones.md`. |

## Objetivo

Usar Microsoft 365 como capa de publicacion y colaboracion sobre reportes ya calculados por NEXO AV, manteniendo `Supabase/ERP` como fuente de verdad economica.

## Fuente de verdad

- `src/pages/nexo_av/desktop/pages/ReportsPage.tsx`
- `supabase/functions/monthly-report-worker/index.ts`
- `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`
- `references/reporting-flow.md`

## Workflow recomendado

1. Leer `references/reporting-flow.md` para distinguir export local, reporte mensual y publicacion SharePoint.
2. Identificar el dataset canonico ERP o RPC origen antes de tocar el formato Excel.
3. Generar el archivo en backend o mediante job reproducible; no depender solo de descarga local desde navegador.
4. Publicar el fichero final en la ruta documental de `Contabilidad` definida para el ejercicio y periodo.
5. Persistir estado, periodo, ruta y hash cuando el flujo de negocio lo requiera.

## Guardrails

- El Excel publicado no puede convertirse en la fuente de verdad del dato.
- No usar ediciones manuales en SharePoint para corregir cifras del ERP.
- No mezclar KPI brutos con netos bajo la misma etiqueta.
- No dejar la publicacion en cliente si el reporte debe auditarse o regenerarse.

## Salida esperada del agente

- Dataset/RPC origen y su semantica.
- Flujo de generacion/publicacion recomendado.
- Ruta SharePoint o almacenamiento destino.
- Riesgos de drift y checklist de validacion.
