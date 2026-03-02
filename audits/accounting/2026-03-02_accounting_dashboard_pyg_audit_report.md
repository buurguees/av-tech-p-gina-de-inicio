# Accounting Audit Report - Dashboard y PyG - 2026-03-02

## Executive Summary

Estado: parcial.

La revision de codigo no permite certificar como fiable la coherencia entre el dashboard contable y el resumen PyG. El backend ya define una fuente unica de verdad para rentabilidad por periodo (`get_period_profit_summary`), pero parte de la UI sigue recalculando BAI y neto por su cuenta con reglas distintas. Ademas, el detalle mensual muestra el tipo de Impuesto de Sociedades multiplicado por 100, aunque el backend ya lo entrega en porcentaje entero.

Importante: la revision se ha completado con consultas reales por API/RPC contra Supabase el 2026-03-02. No ha sido posible usar SQL directo porque el endpoint PostgreSQL solo resolvia por IPv6 y no era alcanzable desde esta maquina, pero la conectividad via HTTPS y las RPC publicas ha quedado validada.

## Findings

### ACC-301
- Severidad: P1
- Dominio: dashboard / pyg / ui / rpc
- Sintoma: dashboard y PyG no usan de forma consistente la misma fuente de verdad para BAI, neto y margen.
- Evidencia:
  - `supabase/migrations/20260129100000_period_closures_and_rpcs.sql:20-79`
  - `supabase/migrations/20260121000002_accounting_corporate_tax.sql:43-59`
  - `src/pages/nexo_av/desktop/components/dashboard/widgets/ProfitMarginWidget.tsx:33-50`
  - `src/pages/nexo_av/desktop/pages/MonthlyPyGDetailPage.tsx:115-163`
  - `src/pages/nexo_av/desktop/pages/AccountingPage.tsx:169-187`
- Causa: el backend expone `get_period_profit_summary` como fuente unica, pero `MonthlyPyGDetailPage` y `AccountingPage` recalculan BAI y neto a partir de `get_profit_loss` + `get_corporate_tax_summary`. En esa recomputacion la UI excluye cualquier cuenta `630*`, mientras que el backend excluye solo `630000`.
- Fix propuesto: dejar de recalcular en frontend y renderizar directamente `profit_before_tax`, `corporate_tax_amount` y `net_profit` desde `get_period_profit_summary`. Si se necesita desglose PyG, usar `get_profit_loss` solo para la tabla, no para reconstruir KPIs.
- Riesgo: dashboard, pagina contable y detalle PyG pueden divergir entre si cuando existan subcuentas `630xxx` distintas de `630000` o futuros cambios en la logica fiscal.

### ACC-302
- Severidad: P1
- Dominio: pyg / impuestos / ui
- Sintoma: el detalle mensual puede mostrar un tipo de IS incorrecto visualmente, por ejemplo `2500%` en lugar de `25%`.
- Evidencia:
  - `supabase/migrations/20260121000002_accounting_corporate_tax.sql:253-270`
  - `src/pages/nexo_av/desktop/pages/MonthlyPyGDetailPage.tsx:356`
  - `src/pages/nexo_av/desktop/pages/MonthlyPyGDetailPage.tsx:421`
  - `src/pages/nexo_av/desktop/pages/AccountingPage.tsx:1225`
  - `src/pages/nexo_av/desktop/pages/AccountingPage.tsx:1902`
- Causa: `get_corporate_tax_summary` devuelve `tax_rate` como porcentaje entero (`25.00`), pero `MonthlyPyGDetailPage` lo multiplica por `100` antes de mostrarlo. `AccountingPage` lo presenta correctamente con `%` directo.
- Fix propuesto: eliminar la multiplicacion por `100` en `MonthlyPyGDetailPage` y normalizar el contrato visual para todos los componentes contables.
- Riesgo: lectura fiscal errónea por parte de administracion, confusion en validaciones manuales y perdida de confianza en el PyG mensual.

### ACC-303
- Severidad: P2
- Dominio: dashboard / ux / reporting
- Sintoma: el widget de rentabilidad etiqueta como "Margen Bruto Real" y "Beneficio Bruto Total" un dato que realmente corresponde a BAI.
- Evidencia:
  - `src/pages/nexo_av/desktop/components/dashboard/widgets/ProfitMarginWidget.tsx:41-50`
  - `src/pages/nexo_av/desktop/components/dashboard/widgets/ProfitMarginWidget.tsx:81-82`
  - `src/pages/nexo_av/desktop/components/dashboard/widgets/ProfitMarginWidget.tsx:115-117`
- Causa: el widget usa `summary.profit_before_tax` del RPC, pero la terminologia visible habla de margen/beneficio bruto.
- Fix propuesto: renombrar el widget y sus etiquetas a "BAI" o "Resultado antes de impuestos", o bien cambiar la formula si realmente se quiere mostrar margen bruto.
- Riesgo: interpretacion incorrecta del KPI por direccion y comparativas internas inconsistentes con el PyG.

### ACC-304
- Severidad: P1
- Dominio: backend / rpc / pyg
- Sintoma: la fuente canonica `get_period_profit_summary` devuelve un neto incorrecto en enero 2026 porque no descuenta IS, mientras `get_corporate_tax_summary` para el mismo periodo si devuelve cuota positiva.
- Evidencia:
  - RPC real `get_period_profit_summary(2026-01-01, 2026-01-31)` -> `profit_before_tax = 5785.80`, `corporate_tax_amount = 0`, `net_profit = 5785.80`
  - RPC real `get_corporate_tax_summary(2026-01-01, 2026-01-31)` -> `profit_before_tax = 5785.80`, `tax_rate = 25`, `tax_amount = 1446.45`
  - RPC real `get_profit_loss(2026-01-01, 2026-01-31)` no devuelve cuentas `630*`, por lo que el neto reconstruido por UI queda en `4339.35`
- Causa: drift entre la implementacion actualmente desplegada de `get_period_profit_summary` y la logica efectiva de `get_corporate_tax_summary` en base real.
- Fix propuesto: revisar la funcion desplegada `accounting.get_period_profit_summary` y su wrapper publico en Supabase, verificar si existe drift respecto a la migracion del repo y corregir para que `corporate_tax_amount` y `net_profit` salgan del mismo calculo que `get_corporate_tax_summary`.
- Riesgo: el dashboard o cualquier KPI que consuma `get_period_profit_summary` puede sobrevalorar beneficio neto mensual. Para enero 2026 la desviacion observada es `1.446,45 EUR`.

## Verification Plan

1. Corregir `get_period_profit_summary` desplegado y repetir las RPC de enero 2026 para confirmar `corporate_tax_amount = 1446.45` y `net_profit = 4339.35`.
2. Comprobar si existen movimientos en cuentas `630xxx` distintas de `630000`; si existen, comparar el BAI del backend frente al reconstruido por UI.
3. Abrir dashboard, `AccountingPage` y `MonthlyPyGDetailPage` para enero 2026 y verificar que muestran exactamente los mismos importes de BAI, IS y neto.
4. Revisar visualmente el tipo de IS en detalle mensual y confirmar que se muestra `25%` y no `2500%`.

## Checklist

- [x] Fuente unica de verdad backend identificada
- [x] Drift UI vs backend identificado
- [x] Error de representacion del tipo de IS identificado
- [x] Validacion contra datos vivos de Supabase via RPC HTTPS
- [ ] Fix implementado y probado en UI
