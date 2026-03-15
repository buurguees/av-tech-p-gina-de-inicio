# Reporting flow

## Estado actual del repo

- `ReportsPage.tsx` genera un Excel trimestral local con `XLSX.writeFile(...)`.
- El dataset de ese Excel viene de la RPC `get_fiscal_quarter_data`.
- `monthly-report-worker` genera un PDF de cierre mensual con `get_monthly_closure_report_dataset`.
- El worker guarda el PDF en el bucket `reports` y opcionalmente lo envia por correo.

## Oportunidades claras para M365

1. Publicar el `Resumen Fiscal` trimestral tambien en SharePoint.
2. Mantener un `Resumen PyG {year}.xlsx` vivo dentro de `Contabilidad/{year}`.
3. Versionar reportes mensuales y anuales por periodo, no por descarga manual del usuario.
4. Reutilizar la estructura documental definida en `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`.

## Contrato recomendado

- El ERP calcula.
- El backend genera el archivo.
- SharePoint aloja el documento publicado.
- El estado del reporte sigue en ERP o en una tabla de control, no en el propio Excel.

## No hacer

- Tratar el Excel abierto en SharePoint como verdad contable.
- Corregir importes directamente en el workbook publicado.
- Mezclar en el mismo fichero metricas sin contrato semantico claro.
