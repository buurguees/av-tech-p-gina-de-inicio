# Auditoría Técnica y Contable — NEXO AV

> **Fecha:** 18 de febrero de 2026  
> **Equipo auditor:**  
> - Arquitecto de Software Senior (15+ años)  
> - Controller Financiero / Contable Senior (20+ años)  
> **Alcance:** Plataforma ERP completa — código fuente, base de datos, flujos contables, integraciones  
> **Versión del código auditado:** Branch `main`, commit actual a fecha de auditoría

---

## Resumen Ejecutivo

NEXO AV es una plataforma ERP desarrollada internamente para AV TECH ESDEVENIMENTS SL, construida con React 18 + TypeScript + Vite 7 en frontend y Supabase (PostgreSQL + Edge Functions + Auth) como backend. El sistema cubre gestión de proyectos, CRM, facturación (venta y compra), contabilidad, nóminas, catálogo de productos, escáner documental y archivo fiscal con MinIO.

### Estado general

La plataforma es **funcional y operativa** para las necesidades actuales del negocio. El sistema de facturación y contabilidad está bien diseñado conceptualmente, con separación clara entre estados de documento, estados de pago y condiciones derivadas. El archivo fiscal con MinIO es una pieza bien diseñada y parcialmente implementada.

Sin embargo, existen **áreas críticas que requieren atención inmediata**, especialmente en seguridad (credenciales hardcodeadas en el repositorio), consistencia del código (sistemas de estado duplicados, archivos legacy) y piezas funcionales incompletas (gestión de cuotas de financiación, pago masivo de nóminas).

### Métricas clave

| Métrica | Valor |
|---------|-------|
| Páginas desktop | 54 |
| Directorios de componentes | 20+ |
| Edge Functions | 10 |
| Constantes/status | 13 archivos |
| Migraciones aplicadas | 9+ (U1+U2) |
| Documentos archivados MinIO | 104 |
| Módulos funcionales principales | 12 |

---

## Hallazgos Críticos (requieren acción inmediata)

### AUDIT-001 — Credenciales y claves expuestas en repositorio

- **ID:** AUDIT-001
- **Severidad:** 🔴 Crítico
- **Módulo afectado:** Seguridad / Infraestructura
- **Descripción técnica:** La URL de Supabase y la clave pública (anon key) están hardcodeadas directamente en `src/integrations/supabase/client.ts` (líneas 5-6) y en `src/pages/nexo_av/ai/logic/aiProxy.ts` (línea 3), en lugar de usar variables de entorno (`import.meta.env.VITE_*`). Adicionalmente, el documento `docs/important/minio_installation.md` contiene en texto plano: passwords de MinIO root y worker, la `SUPABASE_SERVICE_ROLE_KEY` completa, IPs de servidores internos y configuración de seguridad detallada. Este documento está en el repositorio Git.
- **Impacto real en el negocio:** Si el repositorio se expone (GitHub público, leak, acceso no autorizado), un atacante tendría acceso completo a: la API de Supabase (anon key), la base de datos con bypass de RLS (service role key), el servidor MinIO con todos los documentos fiscales, y la topología interna de red.
- **Evidencia:**
  - `src/integrations/supabase/client.ts:5-6`: URL y key hardcodeadas
  - `docs/important/minio_installation.md:161-198`: Passwords root y worker de MinIO en texto plano
  - `docs/important/minio_installation.md:636-638`: `SUPABASE_SERVICE_ROLE_KEY` completa
  - `docs/important/minio_installation.md:647-648`: `MINIO_SECRET_KEY` en scripts
- **Recomendación:** 
  1. **INMEDIATO:** Rotar todas las credenciales expuestas (MinIO root, MinIO worker, Supabase service role key)
  2. Mover URL y anon key a `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `client.ts`
  3. Eliminar todas las credenciales de `minio_installation.md` y reemplazar con marcadores (`<REDACTED>`)
  4. Añadir `docs/important/minio_installation.md` a `.gitignore` o crear una versión sanitizada
  5. Verificar el historial Git: si ya se pusheó a remoto, las credenciales están en el historial
- **Esfuerzo estimado:** 2-4 horas (rotación + refactor + limpieza)

---

### AUDIT-002 — Sin protección de rutas a nivel de componente (Route Guards)

- **ID:** AUDIT-002
- **Severidad:** 🔴 Crítico
- **Módulo afectado:** Autenticación / Routing
- **Descripción técnica:** No existe un componente `PrivateRoute`, `ProtectedRoute` ni `AuthGuard`. La protección de rutas depende exclusivamente de que `NexoAvLayout` y `NexoAvMobileLayout` ejecuten `getSession()` y `get_current_user_info()` en su `useEffect`. Si un usuario accede directamente a una ruta (deep link) y el layout aún no ha resuelto la autenticación, hay un breve período donde el contenido podría renderizarse antes del redirect. Además, rutas de admin como `/users` y `/developer` no tienen protección explícita más allá de la visibilidad en el sidebar.
- **Impacto real en el negocio:** Un usuario con sesión pero sin rol de admin podría acceder a `/nexo-av/:userId/users` o `/developer` directamente por URL. La protección real depende del backend (RPCs con `SECURITY DEFINER` y RLS), pero el frontend no lo bloquea explícitamente.
- **Evidencia:**
  - `src/App.tsx`: Rutas bajo `/nexo-av/:userId` no tienen wrapper de auth
  - `NexoAvLayout.tsx`: Auth check en `useEffect` (asíncrono, no bloqueante del render inicial)
  - Sidebar.tsx: `available: isAdmin` solo oculta el enlace, no la ruta
- **Recomendación:** Crear un componente `<ProtectedRoute requiredRoles={['admin']}>` que envuelva rutas sensibles y verifique roles antes de renderizar. Esto es defensa en profundidad (el backend ya protege, pero el frontend debe ser consistente).
- **Esfuerzo estimado:** 4-6 horas

---

### AUDIT-003 — Asiento contable incorrecto en pagos personales de socio (parcialmente corregido)

- **ID:** AUDIT-003
- **Severidad:** 🔴 Crítico (corregido en backend — pendiente verificación de datos históricos)
- **Módulo afectado:** Contabilidad / Pagos de compra
- **Descripción técnica:** Según la auditoría de cobros y pagos (`docs/important/auditoria-cobros-pagos.md`), el trigger `auto_create_purchase_payment_entry` generaba asientos incorrectos para pagos de tipo `PERSONAL`: registraba D.400/H.572 (como si la empresa pagara por banco) cuando debería usar la cuenta del socio (551xxx). La corrección fue implementada el 2026-02-13, y se indica que "no existían pagos PERSONAL en producción". Sin embargo, no se ha documentado una verificación exhaustiva post-corrección.
- **Impacto real en el negocio:** Si existieran pagos PERSONAL anteriores a la corrección, los saldos bancarios y las cuentas de proveedores estarían incorrectamente calculados. El balance de tesorería mostraría salidas de banco que no ocurrieron.
- **Evidencia:** `docs/important/auditoria-cobros-pagos.md`, sección 8 (Crítico #1), sección 9 (Prioridad 1, punto 1: ✅ Implementado)
- **Recomendación:** Ejecutar una query de verificación en producción para confirmar que no existen asientos con `entry_type = 'PAYMENT'` y contrapartida en 572xxx para pagos donde `payer_type = 'PERSONAL'`.
- **Esfuerzo estimado:** 1 hora (verificación)

---

### AUDIT-004 — Sin constraint de equilibrio en asientos contables

- **ID:** AUDIT-004
- **Severidad:** 🔴 Crítico
- **Módulo afectado:** Contabilidad / Base de datos
- **Descripción técnica:** No existe un CHECK constraint ni trigger a nivel de tabla que valide `SUM(debit) = SUM(credit)` en `accounting.journal_entry_lines` por `journal_entry_id`. Se creó la función `accounting.assert_entry_balanced(p_entry_id)` pero según la documentación está "pendiente de inyectar en todas las funciones existentes". El equilibrio depende de que cada función/trigger genere correctamente ambas líneas.
- **Impacto real en el negocio:** Un bug en cualquier función generadora de asientos podría crear asientos desequilibrados sin que el sistema lo detecte. Esto causaría que el balance no cuadre y requeriría revisión manual.
- **Evidencia:** `docs/important/auditoria-cobros-pagos.md`, sección 8 (Crítico #3), sección 9 (Prioridad 1, punto 3: función creada pero pendiente de integración)
- **Recomendación:** 
  1. Crear un trigger `AFTER INSERT` en `accounting.journal_entry_lines` que valide automáticamente el equilibrio del asiento padre cada vez que se insertan líneas
  2. Ejecutar `assert_entry_balanced` para TODOS los asientos existentes en producción como test de regresión
  3. Integrar la llamada en todas las funciones `create_*_entry` como paso final obligatorio
- **Esfuerzo estimado:** 4-8 horas

---

### AUDIT-005 — Flujo de cuotas de financiación sin UI

- **ID:** AUDIT-005
- **Severidad:** 🔴 Crítico
- **Módulo afectado:** Pagos / Financiación externa
- **Descripción técnica:** La infraestructura backend para gestionar cuotas de financiación externa (Aplazame) está parcialmente implementada: existen las tablas `credit_operations`, `credit_installments`, `credit_settlements` y la RPC `settle_credit_installment`. Sin embargo, **no existe interfaz de usuario** para: ver cuotas pendientes, registrar pagos de cuotas individuales, ver el estado de una operación de crédito, o gestionar el calendario de pagos.
- **Impacto real en el negocio:** Las operaciones de financiación se crean correctamente (reclasificación 400→520), pero las cuotas nunca se marcan como pagadas desde el sistema. La deuda financiera (cuenta 520xxx) nunca se cancela contablemente a través del ERP. Los pagos de cuotas se hacen "fuera del sistema".
- **Evidencia:** 
  - `docs/important/auditoria-cobros-pagos.md`, sección 3.5 y hallazgo #2
  - No existe componente de UI para cuotas en `src/pages/nexo_av/desktop/`
  - RPC `settle_credit_installment` existe pero no se llama desde el frontend
- **Recomendación:** Crear una vista dentro del detalle de factura de compra (o una sección en AccountingPage) que muestre las cuotas pendientes y permita registrar pagos individuales usando `settle_credit_installment`.
- **Esfuerzo estimado:** 8-16 horas (UI + integración)

---

## Hallazgos Importantes (planificar en próximo sprint)

### AUDIT-006 — Sistemas de estados duplicados y legacy

- **ID:** AUDIT-006
- **Severidad:** 🟠 Alto
- **Módulo afectado:** Frontend / Constantes
- **Descripción técnica:** Existen múltiples archivos de constantes para estados de factura de venta que se solapan y pueden crear confusión:
  - `invoiceStatuses.ts` (legacy): DRAFT, SENT, PAID, OVERDUE, CANCELLED — mezcla estados de documento y pago
  - `financeStatuses.ts`: DRAFT, ISSUED, CANCELLED — solo documento
  - `salesInvoiceStatuses.ts`: Sistema correcto con separación doc/pago/vencida + mapeo legacy
  - `documentImmutabilityRules.ts`: usa "ACCEPTED" para quotes cuando `quoteStatuses.ts` usa "APPROVED"
- **Impacto real en el negocio:** Riesgo de que diferentes partes del código usen diferentes archivos de constantes y muestren estados incorrectos o permitan acciones indebidas.
- **Evidencia:**
  - `src/constants/invoiceStatuses.ts`: LOCKED_INVOICE_STATES = ["PAID", "CANCELLED"] (incorrecto: "ISSUED" ya debería bloquear)
  - `src/constants/salesInvoiceStatuses.ts`: LOCKED_SALES_STATUSES = ["ISSUED", "CANCELLED"] (correcto)
  - `src/constants/documentImmutabilityRules.ts:74`: LOCKED_QUOTE_STATUSES = ["ACCEPTED", ...] vs `quoteStatuses.ts` que usa "APPROVED"
- **Recomendación:** 
  1. Deprecar y eliminar `invoiceStatuses.ts` (legacy, no refleja el modelo actual)
  2. Unificar en `salesInvoiceStatuses.ts` + `financeStatuses.ts` como fuente única
  3. Corregir `documentImmutabilityRules.ts` para usar "APPROVED" en vez de "ACCEPTED" para quotes
  4. Buscar todas las importaciones de `invoiceStatuses.ts` y migrar a `salesInvoiceStatuses.ts`
- **Esfuerzo estimado:** 4-6 horas

---

### AUDIT-007 — Doble superficie de API para facturas de venta

- **ID:** AUDIT-007
- **Severidad:** 🟠 Alto
- **Módulo afectado:** Facturación / API
- **Descripción técnica:** Existen dos conjuntos de RPCs para facturas de venta:
  - **Legacy:** `update_invoice`, `update_invoice_line`, `add_invoice_line`, `delete_invoice_line` (usados por `EditInvoicePage.tsx`)
  - **Finance:** `finance_update_invoice`, `finance_update_invoice_line`, `finance_delete_invoice_line` (usados por `InvoiceDetailPage.tsx`)
  
  Ambos modifican las mismas tablas pero podrían tener diferentes validaciones, permisos o lógica de negocio.
- **Impacto real en el negocio:** Posibles inconsistencias si un flujo aplica validaciones que el otro no. Riesgo de modificar facturas bloqueadas si una de las APIs no verifica el estado.
- **Evidencia:**
  - `EditInvoicePage.tsx`: usa `update_invoice`, `update_invoice_line`, etc.
  - `InvoiceDetailPage.tsx`: usa `finance_update_invoice`, `finance_get_invoice`, etc.
- **Recomendación:** Unificar en un solo conjunto de RPCs (`finance_*`), añadiendo las operaciones faltantes. Deprecar las RPCs legacy y migrar `EditInvoicePage` a usar la API financiera.
- **Esfuerzo estimado:** 6-10 horas

---

### AUDIT-008 — Doble fuente de cuentas bancarias

- **ID:** AUDIT-008
- **Severidad:** 🟠 Alto
- **Módulo afectado:** Contabilidad / Cuentas Bancarias
- **Descripción técnica:** Existen dos fuentes para cuentas bancarias:
  1. `internal.company_bank_accounts` — Tabla relacional con `accounting_code` (fuente correcta)
  2. `internal.company_preferences.bank_accounts` — Campo JSONB con `{id, bank, iban}`
  
  Los cobros de venta resuelven la cuenta bancaria a través del JSONB (nombre → búsqueda en tabla), mientras que pagos de compra y nóminas usan directamente la tabla. Adicionalmente, `company_bank_account_id` es `TEXT` en `sales.invoice_payments` pero `UUID` en `accounting.payroll_payments`.
- **Impacto real en el negocio:** Si los nombres en el JSONB no coinciden con los de la tabla, los cobros de venta usarán la cuenta genérica `572000` en vez de la específica. Esto genera asientos contables con la cuenta incorrecta.
- **Evidencia:** `docs/important/auditoria-cobros-pagos.md`, sección 5.3 y hallazgos #4, #5
- **Recomendación:**
  1. Eliminar `company_preferences.bank_accounts` JSONB
  2. Modificar `create_invoice_payment_entry` para buscar directamente por UUID en `company_bank_accounts`
  3. Migrar `company_bank_account_id` de TEXT a UUID en `sales.invoice_payments`
- **Esfuerzo estimado:** 6-10 horas

---

### AUDIT-009 — Sin Error Boundaries en React

- **ID:** AUDIT-009
- **Severidad:** 🟠 Alto
- **Módulo afectado:** Frontend / Estabilidad
- **Descripción técnica:** No se encontraron componentes `ErrorBoundary` ni uso de `componentDidCatch` en toda la aplicación. Un error no capturado en cualquier componente hijo causará que toda la aplicación se desmonte, mostrando una pantalla en blanco.
- **Impacto real en el negocio:** Un error en un widget del dashboard o en un componente menor puede dejar toda la aplicación inaccesible, requiriendo un refresh completo y perdiendo datos no guardados.
- **Evidencia:** Búsqueda exhaustiva de "ErrorBoundary", "componentDidCatch", "error boundary" en `src/` sin resultados.
- **Recomendación:** Implementar al menos 3 niveles de Error Boundaries:
  1. Layout level (NexoAvLayout) — captura errores en el contenido principal sin perder sidebar/header
  2. Page level — cada ruta captura sus propios errores
  3. Widget level — en el dashboard, cada widget aislado
- **Esfuerzo estimado:** 4-6 horas

---

### AUDIT-010 — React Query disponible pero no utilizado

- **ID:** AUDIT-010
- **Severidad:** 🟠 Alto
- **Módulo afectado:** Frontend / Arquitectura
- **Descripción técnica:** `@tanstack/react-query` v5.83.0 está instalado y el `QueryClientProvider` envuelve toda la app en `App.tsx`, pero **ningún componente de NEXO AV usa `useQuery` o `useMutation`**. Todos los datos se obtienen con `supabase.rpc()` o `supabase.from()` directamente en `useEffect`, con manejo manual de loading/error/refetch en cada componente.
- **Impacto real en el negocio:** 
  - Sin caché compartida: la misma factura se recarga desde cero cada vez que se navega
  - Sin deduplicación: múltiples componentes pueden solicitar los mismos datos simultáneamente
  - Sin revalidación automática: datos potencialmente stale sin feedback visual
  - Código duplicado de loading/error en cada página
- **Evidencia:** `App.tsx` incluye `QueryClientProvider`; búsqueda de `useQuery` en `src/pages/nexo_av/` sin resultados relevantes.
- **Recomendación:** Migración progresiva a React Query, empezando por las páginas más visitadas (Dashboard, Invoices, Projects). Crear custom hooks como `useInvoice(id)`, `useInvoices(filters)`.
- **Esfuerzo estimado:** 20-40 horas (migración progresiva)

---

### AUDIT-011 — Archivos residuales y duplicados (-DESKTOP-4033E83)

- **ID:** AUDIT-011
- **Severidad:** 🟠 Alto
- **Módulo afectado:** Frontend / Mantenimiento
- **Descripción técnica:** Existen múltiples archivos con sufijo `-DESKTOP-4033E83` que son copias o versiones alternativas de componentes:
  - `NewPurchaseInvoicePage-DESKTOP-4033E83.tsx`
  - `PurchaseInvoiceDetailPage-DESKTOP-4033E83.tsx`
  - `ScannerDetailPage-DESKTOP-4033E83.tsx`
  - `sidebar-DESKTOP-4033E83.css`
  
  Estos parecen ser artefactos de sincronización de OneDrive/SharePoint.
- **Impacto real en el negocio:** Confusión para desarrolladores, posible inclusión accidental en imports, aumento innecesario del bundle si se importan.
- **Evidencia:** Búsqueda de `DESKTOP-4033E83` en el proyecto.
- **Recomendación:** Eliminar todos los archivos con este sufijo tras verificar que las versiones sin sufijo son las correctas.
- **Esfuerzo estimado:** 1 hora

---

## Hallazgos Menores (backlog técnico)

### AUDIT-012 — Dos sistemas de toast

- **ID:** AUDIT-012
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Frontend / UX
- **Descripción técnica:** Se usan dos sistemas de notificaciones toast en paralelo: `useToast` (Radix-based, desde `@/hooks/use-toast`) y `toast` de `sonner`. Diferentes componentes usan uno u otro sin criterio unificado.
- **Impacto real en el negocio:** Inconsistencia visual y de comportamiento en las notificaciones al usuario.
- **Evidencia:** `InvoiceDetailPage`, `QuoteDetailPage` usan `useToast`; `ProductDetailPage`, `PacksTab`, `PurchaseInvoiceDetailPage` usan `sonner`.
- **Recomendación:** Unificar en `sonner` (más moderno, API más simple) y eliminar `useToast`.
- **Esfuerzo estimado:** 4-6 horas

---

### AUDIT-013 — Type safety debilitada con `(supabase.rpc as any)`

- **ID:** AUDIT-013
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Frontend / TypeScript
- **Descripción técnica:** Múltiples componentes usan `(supabase.rpc as any)('nombre_rpc', {...})` para llamar a RPCs que no están tipadas en `types.ts`. Esto elimina la comprobación de tipos en tiempo de compilación.
- **Impacto real en el negocio:** Errores de parámetros o nombres de RPC no se detectan hasta runtime. Mayor riesgo de bugs en refactorizaciones.
- **Evidencia:** Patrón encontrado en múltiples archivos de componentes desktop.
- **Recomendación:** Regenerar tipos con `supabase gen types typescript` y asegurar que todas las RPCs públicas estén tipadas.
- **Esfuerzo estimado:** 2-4 horas

---

### AUDIT-014 — Sin validación de "al menos una línea" en facturas

- **ID:** AUDIT-014
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Facturación
- **Descripción técnica:** `NewInvoicePage` y `NewQuotePage` no validan en el frontend que exista al menos una línea de detalle con concepto no vacío antes de guardar. Las líneas se filtran por `concept.trim()` pero no se muestra error si el resultado es 0 líneas.
- **Impacto real en el negocio:** Posibilidad de crear facturas/presupuestos sin líneas de detalle, que serían documentos vacíos. La validación debería estar también en backend.
- **Evidencia:** `NewInvoicePage.tsx` y `NewQuotePage.tsx`, flujo de guardado.
- **Recomendación:** Añadir validación frontend ("Se requiere al menos una línea") y verificar que el backend también lo valide.
- **Esfuerzo estimado:** 1-2 horas

---

### AUDIT-015 — Sin virtualización de listas largas

- **ID:** AUDIT-015
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Frontend / Performance
- **Descripción técnica:** Las páginas de listado (facturas, gastos, asientos contables, archivo fiscal) renderizan todos los elementos en el DOM sin virtualización (`react-window` o `@tanstack/virtual`). Aunque existe paginación en algunos casos, las tablas pueden ser lentas con muchos registros.
- **Impacto real en el negocio:** Degradación de rendimiento a medida que crezcan los datos.
- **Recomendación:** Implementar virtualización en las tablas más pesadas (InvoicesPage, ExpensesPage, AccountingPage journal entries).
- **Esfuerzo estimado:** 8-12 horas

---

### AUDIT-016 — Conciliación bancaria limitada a ajuste global

- **ID:** AUDIT-016
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Contabilidad / Bancos
- **Descripción técnica:** La conciliación bancaria actual solo permite "Ajustar Saldo" (un asiento de ajuste contra cuenta 129000). No existe conciliación por punteo donde se emparejen movimientos del extracto bancario con asientos contables individuales.
- **Impacto real en el negocio:** No se puede identificar qué movimientos específicos no cuadran entre el banco y la contabilidad. Solo se puede ver la diferencia global.
- **Evidencia:** `docs/important/auditoria-cobros-pagos.md`, hallazgo #8
- **Recomendación:** Para el volumen actual de operaciones, el ajuste global es aceptable. Cuando el volumen crezca, implementar tabla `accounting.bank_reconciliation_items` con punteo.
- **Esfuerzo estimado:** 20-30 horas (futuro)

---

### AUDIT-017 — Sin pago masivo de nóminas

- **ID:** AUDIT-017
- **Severidad:** 🟡 Medio
- **Módulo afectado:** RRHH / Nóminas
- **Descripción técnica:** Solo se puede pagar una retribución/nómina individual a la vez. No existe RPC ni UI para pagar todas las nóminas pendientes de un mes en una sola operación.
- **Impacto real en el negocio:** Ineficiente cuando hay múltiples socios/empleados. Actualmente viable porque hay pocos perceptores.
- **Evidencia:** `docs/important/auditoria-cobros-pagos.md`, hallazgo #7
- **Recomendación:** Crear RPC `pay_all_pending_compensations(p_bank_account_id, p_payment_date)` cuando el equipo crezca.
- **Esfuerzo estimado:** 6-8 horas

---

### AUDIT-018 — Accesibilidad básica no implementada

- **ID:** AUDIT-018
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Frontend / Accesibilidad
- **Descripción técnica:** Los componentes Radix/shadcn proporcionan accesibilidad básica, pero los componentes custom de NEXO AV (explorador de archivos, árbol de navegación, breadcrumbs custom) no implementan ARIA attributes, focus management ni keyboard navigation. No hay "skip links" ni gestión de foco en modales custom.
- **Impacto real en el negocio:** Bajo impacto actual (aplicación interna), pero relevante para cumplimiento de accesibilidad web si se expone externamente.
- **Recomendación:** Priorizar accesibilidad en keyboard navigation del explorador de archivos y formularios principales.
- **Esfuerzo estimado:** 8-12 horas

---

### AUDIT-019 — Asientos contables solo desde 2026

- **ID:** AUDIT-019
- **Severidad:** 🟢 Bajo
- **Módulo afectado:** Contabilidad
- **Descripción técnica:** Los cobros de facturas de venta solo generan asiento contable automático si `issue_date >= 2026-01-01 AND payment_date >= 2026-01-01`. Facturas anteriores a 2026 no generan contabilización automática.
- **Impacto real en el negocio:** Correcto por diseño (la empresa empezó a contabilizar desde 2026), pero puede generar confusión si se registran cobros de facturas antiguas.
- **Evidencia:** `docs/important/auditoria-cobros-pagos.md`, hallazgo #6
- **Recomendación:** Documentar claramente esta regla en la UI. Considerar un warning cuando se registre un cobro de factura pre-2026.
- **Esfuerzo estimado:** 1 hora

---

### AUDIT-020 — Archivo .env en la raíz del repositorio

- **ID:** AUDIT-020
- **Severidad:** 🟢 Bajo
- **Módulo afectado:** Seguridad / Configuración
- **Descripción técnica:** Existe un archivo `.env` en la raíz del repositorio. Aunque no se ha verificado su contenido, su presencia sugiere que podría contener variables sensibles. No se encontró `.env.example` en la raíz.
- **Impacto real en el negocio:** Riesgo de exposición de credenciales si el archivo contiene secretos.
- **Recomendación:** Verificar que `.env` está en `.gitignore`, crear `.env.example` con marcadores.
- **Esfuerzo estimado:** 30 minutos

---

## Análisis por Módulo

### Módulo 1: Autenticación y Sesiones

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Proveedor de auth | ✅ Funcional | Supabase Auth (email/password) |
| Restricción de dominio | ✅ Implementado | Solo `@avtechesdeveniments.com` |
| OTP (2FA) | ✅ Implementado | Via Edge Functions `send-otp` / `verify-otp`, skippable 1x/día |
| Rate limiting | ✅ Implementado | Via Edge Function `rate-limit` |
| Gestión de sesión | ✅ Funcional | `localStorage`, `autoRefreshToken`, `persistSession` |
| Timeout por inactividad | ✅ Implementado | 60 min timeout, 5 min warning (`useInactivityLogout`) |
| Logout | ✅ Funcional | `signOut()` + limpieza localStorage |
| Roles | ✅ Funcional | Via RPC `get_current_user_info` desde `internal.authorized_users` |
| Protección de rutas | ⚠️ Parcial | Sin ProtectedRoute component; depende del layout (ver AUDIT-002) |
| CSRF | ✅ N/A | Bearer token en header (no cookies), CORS en Supabase |
| XSS | ✅ Bien | Solo 1 `dangerouslySetInnerHTML` controlado (chart theme) |
| Simulador de roles | ✅ Implementado | Solo admins pueden simular otros roles (RoleSimulator) |

**Veredicto:** Sistema de auth robusto con capas múltiples (domain check + rate limit + OTP + roles). El punto débil principal es la falta de route guards explícitos.

---

### Módulo 2: Facturación de Venta

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Creación de factura | ✅ Funcional | Cliente + proyecto + líneas; número automático desde backend |
| Edición | ✅ Funcional | Solo en DRAFT; doble API surface (ver AUDIT-007) |
| Emisión (DRAFT→ISSUED) | ✅ Funcional | Número definitivo, bloqueo, asiento contable |
| Anulación | ✅ Funcional | ISSUED→CANCELLED con preservación para auditoría |
| Numeración | ✅ Secuencial | Backend con retry para evitar duplicados |
| Campos obligatorios | ⚠️ Parcial | Cliente obligatorio; no valida mínimo 1 línea (ver AUDIT-014) |
| IVA | ✅ Funcional | Múltiples tipos desde `list_taxes`; default 21% |
| IRPF | ❓ No verificado | Depende de la configuración de impuestos en backend |
| Conversión desde presupuesto | ✅ Funcional | `create_invoice_from_quote` copia líneas automáticamente |
| Inmutabilidad post-emisión | ✅ Funcional | DB triggers + constants en frontend |
| Archivo PDF (MinIO) | ✅ Funcional | 20 facturas migradas; lógica dual plantilla/archivo |
| PDF plantilla | ✅ Funcional | `InvoicePDFDocument.tsx` con @react-pdf/renderer |

**Veredicto:** Módulo maduro y bien implementado. Pendiente: unificar APIs, validar líneas mínimas.

---

### Módulo 3: Facturación de Compra

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Creación | ✅ Funcional | Proveedor + líneas + PDF adjunto |
| Aprobación | ✅ Funcional | PENDING_VALIDATION→APPROVED, genera asiento y número definitivo |
| Categoría contable | ✅ Obligatoria | 6 categorías mapeadas a cuentas PGC |
| Pagos (Standard) | ✅ Funcional | Trigger genera asiento automático |
| Pagos (Personal/Socio) | ✅ Corregido | Trigger corregido para usar 551xxx |
| Pagos (Financiación) | ⚠️ Parcial | Reclasificación funciona; gestión de cuotas sin UI (ver AUDIT-005) |
| Conversión desde PO | ✅ Funcional | `ConvertPOToInvoiceDialog` |
| Archivo PDF (MinIO) | ✅ Funcional | 34 facturas migradas |
| Inmutabilidad | ✅ Funcional | Triggers en DB |

**Veredicto:** Módulo funcional con un gap importante en la gestión de cuotas de financiación.

---

### Módulo 4: Presupuestos

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Creación y edición | ✅ Funcional | Similar a facturas con líneas editables |
| Envío (DRAFT→SENT) | ✅ Funcional | Genera PDF archivado en MinIO |
| Aprobación/Rechazo | ✅ Funcional | Flujo completo de estados |
| Expiración | ✅ Documentado | Automático por fecha |
| Conversión a factura | ✅ Funcional | `create_invoice_from_quote` |
| Quick Quote | ✅ Funcional | Dialog rápido con Zod validation |
| Archivo MinIO | ✅ Funcional | 50 presupuestos migrados |
| Inconsistencia ACCEPTED/APPROVED | ⚠️ Menor | Ver AUDIT-006 |

**Veredicto:** Módulo completo y bien integrado con el flujo de ventas.

---

### Módulo 5: Contabilidad

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Plan de cuentas | ✅ Funcional | ChartOfAccountsTab con balance sheet |
| Asientos automáticos | ✅ Funcional | Se generan al emitir/aprobar/cobrar/pagar |
| Asientos manuales | ⚠️ Limitado | ManualMovementDialog; no hay editor genérico de asientos |
| Balance de situación | ✅ Funcional | `get_balance_sheet` |
| Cuenta de P&L | ✅ Funcional | `get_profit_loss` |
| Libro diario | ✅ Funcional | `list_journal_entries` con filtros |
| Cierre de periodo | ✅ Funcional | Mensual con `close_period` / `open_period` |
| IVA (Modelo 303) | ✅ Funcional | Resumen en Excel trimestral y TaxPaymentDialog |
| IRPF (Modelo 111) | ✅ Funcional | `get_irpf_model_111_summary` + TaxPaymentDialog |
| Traspasos bancarios | ✅ Funcional | `BankTransferDialog` (D.572x / H.572y) |
| Ajuste de saldo | ✅ Funcional | `BankBalanceAdjustmentDialog` (contra 129000) |
| Equilibrio de asientos | ⚠️ Sin constraint | Ver AUDIT-004 |
| Conciliación bancaria | ⚠️ Solo ajuste global | Ver AUDIT-016 |

**Veredicto:** Sistema contable sorprendentemente completo para un ERP interno. Cubre las necesidades operativas principales. Gaps en conciliación y validación de asientos.

---

### Módulo 6: Nóminas y RRHH

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Retribuciones socios | ✅ Funcional | `partner_compensation_runs` con IRPF |
| Nóminas empleados | ✅ Funcional | `payroll_runs` con IRPF + SS (preparado) |
| Bonus productividad | ✅ Funcional | Cálculo automático basado en beneficio |
| Pago individual | ✅ Funcional | `pay_partner_compensation_run` con asiento |
| Pago masivo | ❌ No existe | Ver AUDIT-017 |
| Cierre de periodo | ✅ Integrado | Vinculado con `period_closures` |

---

### Módulo 7: CRM y Proyectos

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Gestión de clientes | ✅ Funcional | Lead stages: NEGOTIATION, WON, LOST, RECURRING |
| Mapa de leads | ✅ Funcional | Leaflet + geocoding |
| Proyectos | ✅ Funcional | 7 estados, flujo completo hasta cierre |
| Dashboard de proyecto | ✅ Funcional | KPIs, planning, historial, gastos, facturas |
| Vinculación proyecto→factura | ✅ Funcional | Transiciones automáticas de estado |

---

### Módulo 8: Catálogo

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Productos y servicios | ✅ Funcional | CatalogPage con tabs Products/Packs |
| Detalle de producto | ✅ Funcional | ProductDetailPage con galería de imágenes |
| Explorador de catálogo | ✅ Funcional | Integrado en ReportsPage (File Explorer) |
| Subida de imágenes | ✅ Funcional | Via minio-proxy, almacenamiento en MinIO |
| Importación de categorías | ✅ Funcional | CategoryImportDialog |

---

### Módulo 9: Escáner Documental

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Escáner integrado | ✅ Funcional | DocumentScanner con jscanify |
| Procesamiento | ✅ Funcional | ScannerPage y ScannerDetailPage |
| Vinculación a factura | ✅ Funcional | Creación de factura de compra desde escáner |

---

### Módulo 10: Archivo Fiscal (MinIO)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| MinIO desplegado | ✅ Operativo | Docker en ALB357, solo Tailscale |
| Bucket configurado | ✅ Funcional | `nexo-prod`, privado |
| Edge Function minio-proxy | ✅ Funcional | Presigned URLs, upload, listado |
| ArchivedPDFViewer | ✅ Funcional | Visor dual plantilla/archivo |
| Backfill completado | ✅ 104 docs | 34 compras + 20 ventas + 50 presupuestos |
| Explorador de archivos | ✅ Funcional | ReportsPage tipo Windows Explorer |
| Carpetas personalizadas | ✅ Funcional | Profundidad ilimitada |
| Excel trimestral | ✅ Funcional | Descargable via `get_fiscal_quarter_data` |
| nexo-file-worker (auto-archivado) | ❌ No existe | Archivado automático al emitir/aprobar pendiente |
| Generación automática de Excel | ❌ No existe | Pendiente de Fase 6 |
| ZIP trimestral | ❌ No existe | Pendiente de Fase 9 |

---

### Módulo 11: Dashboard

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Dashboards por rol | ✅ Funcional | Admin, Manager, Comercial, Técnico |
| Widgets | ✅ Funcional | Revenue, CashFlow, Tasks, Invoices, Projects, etc. |
| KPIs | ✅ Funcional | Métricas financieras y operativas |

---

### Módulo 12: Configuración y Administración

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Gestión de usuarios | ✅ Funcional | Admin-only, via Edge Function `admin-users` |
| Preferencias empresa | ✅ Funcional | CompanyDataTab |
| Impuestos | ✅ Funcional | TaxesTab con tipos venta/compra |
| Plantillas PDF | ✅ Funcional | TemplatesTab |
| Categorías de producto | ✅ Funcional | ProductCategoriesTab |
| Proveedores de crédito | ✅ Funcional | ExternalCreditProvidersTab |
| Políticas de nómina | ✅ Funcional | PayrollSettingsTab |

---

## Auditoría del Sistema Contable

### Evaluación como Controller Financiero (20+ años de experiencia)

#### Ciclo completo de factura de venta

```
Creación (DRAFT) → Edición libre → Emisión (ISSUED) → Cobro → Cierre
                                       ↓
                              Número definitivo F-YY-XXXXXX
                              Asiento: D.430 / H.700 + D.430 / H.477
                              Documento bloqueado (trigger)
                              PDF archivado (MinIO)
```

**Análisis:**
- ✅ La separación doc_status / payment_status / is_overdue es correcta y moderna
- ✅ La inmutabilidad post-emisión es crítica y está implementada a nivel de DB (triggers)
- ✅ Los cobros generan asiento automático (D.572 / H.430) correctamente
- ✅ Validación de sobrepago con tolerancia de 0.01€
- ⚠️ No se verifica la existencia de campos fiscales obligatorios (NIF/CIF del cliente) antes de emitir

#### Numeración de facturas

- ✅ Secuencial y automática desde backend
- ✅ Retry en caso de colisión (`unique_violation`)
- ❓ **No verificado:** Si existe validación de gaps (huecos en la numeración). La normativa fiscal española exige numeración correlativa sin saltos. Si una factura se cancela, el número debe conservarse (no reutilizarse).

#### Tratamiento de impuestos

| Impuesto | Estado | Detalle |
|----------|--------|---------|
| IVA 21% | ✅ | Default, configurable |
| IVA 10% | ✅ | Configurable via `list_taxes` |
| IVA 4% | ✅ | Configurable |
| IVA 0% / Exento | ❓ | No verificado |
| IRPF en compras | ✅ | Campo `retention_rate` |
| Recargo de equivalencia | ❌ | No implementado (no aplica a SL normalmente) |

#### Facturas rectificativas

- ❌ **No existe flujo de factura rectificativa**. El estado "RECTIFIED" aparece en `documentImmutabilityRules.ts` pero no hay UI ni RPC para crear una factura rectificativa vinculada a la original. Actualmente, la única opción es "Anular" (CANCELLED).
- **Riesgo fiscal:** Si se necesita corregir una factura ya emitida, la normativa exige emitir una factura rectificativa (no simplemente anularla y crear otra, ya que se perdería la trazabilidad).

#### Cuentas contables mapeadas

| Operación | Cuenta Debe | Cuenta Haber | Correcto PGC |
|-----------|-------------|--------------|-------------|
| Emisión factura venta | 430000 (Clientes) | 700xxx + 477xxx | ✅ |
| Cobro de cliente | 572xxx (Banco) | 430000 (Clientes) | ✅ |
| Aprobación factura compra | 6xx (Gasto) | 400000 (Proveedores) | ✅ |
| Pago a proveedor | 400000 (Proveedores) | 572xxx (Banco) | ✅ |
| Pago personal socio | 400000 (Proveedores) | 551xxx (Socio) | ✅ (corregido) |
| Reembolso a socio | 551xxx/465xxx (Socio) | 572xxx (Banco) | ✅ |
| Reclasificación crédito | 400000 (Proveedor) | 520xxx (Acreedor) | ✅ |
| Nómina socio | 465xxx (Socio) | 572xxx (Banco) | ✅ |
| Traspaso bancario | 572xxx (destino) | 572xxx (origen) | ✅ |
| Ajuste saldo | 572xxx / 129000 | 129000 / 572xxx | ⚠️ |

**Nota sobre ajuste de saldo (129000):** La cuenta 129000 se usa para ajustes, lo cual no es ortodoxo. La cuenta 129 es "Resultado del ejercicio". Para ajustes bancarios debería usarse una cuenta de regularización específica (p.ej. 778/678 para diferencias).

#### Libros contables disponibles

| Libro | Estado | Fuente |
|-------|--------|--------|
| Libro Diario | ✅ | `list_journal_entries` + AccountingPage |
| Libro Mayor | ⚠️ Parcial | ChartOfAccountsTab muestra saldos; no hay vista de mayor por cuenta |
| Balance de Situación | ✅ | `get_balance_sheet` |
| Cuenta de P&L | ✅ | `get_profit_loss` |
| Libro de IVA | ✅ | Excel trimestral con desglose |
| Libro de Retenciones | ✅ | Excel trimestral + `get_irpf_model_111_summary` |

#### Cierre de ejercicio

- ✅ Cierre mensual implementado y operativo
- ❓ **Cierre anual no verificado:** No se encontró flujo explícito de cierre de ejercicio (asiento de regularización de ingresos/gastos → cuenta 129, distribución de resultado).
- **Riesgo:** Sin cierre de ejercicio formal, el balance de apertura del año siguiente no reflejará correctamente los saldos.

---

## Estado de Integraciones

### Integraciones activas y operativas

| Integración | Estado | Uso |
|-------------|--------|-----|
| **Supabase Auth** | ✅ Operativa | Autenticación, sesiones, JWT |
| **Supabase Database** | ✅ Operativa | 4 schemas (sales, accounting, internal, crm, public) |
| **Supabase Edge Functions** | ✅ Operativa | 10 funciones activas |
| **Supabase Storage** | ✅ Operativa | Facturas de compra (PDFs escaneados) |
| **MinIO (ALB357)** | ✅ Operativa | Archivo fiscal, catálogo, carpetas custom |
| **Leaflet** | ✅ Operativa | Mapa de leads/canvassing |
| **Firebase** | ⚠️ Instalada | Importada en `main.tsx` pero uso no claro; posible legacy |
| **@react-pdf/renderer** | ✅ Operativa | Generación de PDFs (facturas, presupuestos) |
| **ExcelJS + XLSX** | ✅ Operativa | Exportación de datos a Excel |
| **jsPDF** | ✅ Instalada | Alternativa a react-pdf para server-side; uso no verificado |

### Integraciones en desarrollo / pendientes

| Integración | Estado | Bloqueante |
|-------------|--------|-----------|
| **nexo-file-worker** | ❌ No existe | Archivado automático al emitir/aprobar |
| **minio-proxy v3** (con catálogo) | ⚠️ Deploy fallido | Acciones de upload a catálogo no funcionan en producción |
| **AI Chat (ai-chat-processor)** | ✅ Edge Function existe | Uso interno, interfaz en `/ai/chat` |

---

## Recomendaciones Priorizadas

### Prioridad 1 — Acción inmediata (esta semana)

| # | Acción | Hallazgo | Esfuerzo |
|---|--------|----------|----------|
| 1 | **Rotar credenciales** y limpiar `minio_installation.md` | AUDIT-001 | 2-4h |
| 2 | **Mover Supabase URL/key** a variables de entorno | AUDIT-001 | 1h |
| 3 | **Eliminar archivos -DESKTOP-4033E83** | AUDIT-011 | 1h |
| 4 | **Verificar asientos de pagos PERSONAL** en producción | AUDIT-003 | 1h |

### Prioridad 2 — Próximo sprint (1-2 semanas)

| # | Acción | Hallazgo | Esfuerzo |
|---|--------|----------|----------|
| 5 | Implementar **ProtectedRoute** component | AUDIT-002 | 4-6h |
| 6 | Crear **trigger de equilibrio** en journal_entry_lines | AUDIT-004 | 4-8h |
| 7 | **Unificar constantes** de estados (eliminar legacy) | AUDIT-006 | 4-6h |
| 8 | **Unificar API** de facturas de venta (eliminar legacy RPCs) | AUDIT-007 | 6-10h |
| 9 | Implementar **Error Boundaries** | AUDIT-009 | 4-6h |
| 10 | **Unificar fuente** de cuentas bancarias | AUDIT-008 | 6-10h |

### Prioridad 3 — Backlog técnico (próximo mes)

| # | Acción | Hallazgo | Esfuerzo |
|---|--------|----------|----------|
| 11 | UI para **cuotas de financiación** | AUDIT-005 | 8-16h |
| 12 | Migrar a **React Query** (progresivo) | AUDIT-010 | 20-40h |
| 13 | **Unificar toasts** (sonner) | AUDIT-012 | 4-6h |
| 14 | **Regenerar tipos** Supabase | AUDIT-013 | 2-4h |
| 15 | **Validación de líneas** mínimas en facturas/quotes | AUDIT-014 | 1-2h |
| 16 | Implementar **flujo de factura rectificativa** | N/A | 16-24h |
| 17 | Implementar **Libro Mayor** por cuenta | N/A | 8-12h |

### Prioridad 4 — Mejoras futuras

| # | Acción | Hallazgo | Esfuerzo |
|---|--------|----------|----------|
| 18 | Virtualización de listas | AUDIT-015 | 8-12h |
| 19 | Conciliación bancaria por punteo | AUDIT-016 | 20-30h |
| 20 | Pago masivo de nóminas | AUDIT-017 | 6-8h |
| 21 | Accesibilidad (ARIA + keyboard) | AUDIT-018 | 8-12h |
| 22 | nexo-file-worker (auto-archivado) | N/A | 40-60h |
| 23 | Cierre de ejercicio formal | N/A | 16-24h |

---

## Plan de Acción Sugerido

### Semana 1 (18-24 feb 2026) — Seguridad y limpieza

- [ ] Rotar TODAS las credenciales expuestas (AUDIT-001)
- [ ] Refactorizar `client.ts` para usar env vars
- [ ] Limpiar `minio_installation.md` (redactar credenciales)
- [ ] Eliminar archivos `-DESKTOP-4033E83`
- [ ] Verificar query de asientos PERSONAL en producción

### Semana 2 (25 feb - 3 mar 2026) — Robustez

- [ ] Implementar `ProtectedRoute` con verificación de roles
- [ ] Crear trigger `assert_balanced` en `journal_entry_lines`
- [ ] Ejecutar validación de equilibrio en todos los asientos existentes
- [ ] Implementar Error Boundaries (layout + page level)

### Semana 3-4 (4-17 mar 2026) — Deuda técnica

- [ ] Unificar constantes de estados (eliminar `invoiceStatuses.ts`)
- [ ] Corregir `documentImmutabilityRules.ts` (ACCEPTED→APPROVED)
- [ ] Unificar API de facturas de venta a `finance_*`
- [ ] Eliminar `company_preferences.bank_accounts` JSONB
- [ ] Migrar `company_bank_account_id` a UUID

### Mes 2 (mar-abr 2026) — Funcionalidad

- [ ] UI para gestión de cuotas de financiación
- [ ] Inicio migración a React Query (Dashboard + Invoices)
- [ ] Unificar sistema de toasts
- [ ] Regenerar tipos Supabase

---

## Apéndice A: Lo que funciona bien

No toda la auditoría es sobre problemas. Estos son los puntos fuertes del sistema:

1. **Diseño de estados:** La separación doc_status / payment_status / is_overdue es un patrón excelente que evita estados inconsistentes. Bien documentado en `docs/important/estados-nexo.md`.

2. **Inmutabilidad de documentos:** Implementada tanto en frontend (constantes) como en backend (triggers). Esto es crítico para cumplimiento fiscal y está bien hecho.

3. **Sistema de categorías contables:** Mapeo claro entre categorías de gasto y cuentas PGC, unificado entre facturas de compra y tickets.

4. **Archivo fiscal con MinIO:** Arquitectura bien pensada con presigned URLs, inmutabilidad de documentos, estructura fiscal por trimestre. La documentación es exhaustiva.

5. **Lazy loading:** Code splitting aplicado consistentemente a nivel de rutas y componentes pesados.

6. **Edge Functions:** Separación clara de responsabilidades (auth, OTP, rate-limit, storage, AI, reportes).

7. **Responsive:** Arquitectura limpia de desktop/mobile con detección y lazy loading de layouts específicos.

8. **Auditoría interna previa:** La existencia de `auditoria-cobros-pagos.md` demuestra un proceso de revisión continua, y las correcciones ya implementadas (pago personal, cuotas) son evidencia de mejora activa.

---

## Apéndice B: Stack tecnológico completo

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Runtime** | React | 18.3.1 |
| **Build** | Vite | 7.3.1 |
| **Language** | TypeScript | 5.8.3 |
| **Routing** | React Router DOM | 6.30.1 |
| **State (server)** | TanStack React Query | 5.83.0 (instalado, no usado) |
| **Forms** | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| **UI Components** | Radix UI / shadcn | Múltiples @radix-ui/* |
| **Styling** | Tailwind CSS + Plain CSS | 3.4.17 |
| **Icons** | Lucide React | 0.462.0 |
| **Charts** | Recharts | 2.15.4 |
| **Animations** | Motion | 12.23.26 |
| **Maps** | Leaflet + React Leaflet | 1.9.4 / 4.2.1 |
| **PDF Generation** | @react-pdf/renderer + jsPDF | 4.3.2 / 4.0.0 |
| **Excel** | ExcelJS + XLSX | 4.4.0 / 0.18.5 |
| **Backend** | Supabase (PostgreSQL) | supabase-js 2.89.0 |
| **Auth** | Supabase Auth | Integrado |
| **Storage** | Supabase Storage + MinIO | S3 compatible |
| **Edge Functions** | Supabase (Deno) | 10 funciones |
| **PWA** | vite-plugin-pwa | 1.2.0 |
| **Firebase** | Firebase SDK | 12.7.0 (legacy?) |
| **S3 SDK** | @aws-sdk/client-s3 | 3.991.0 |
| **Linting** | ESLint + typescript-eslint | 9.32.0 / 8.38.0 |
| **Scanner** | jscanify | 1.4.2 |
| **Toasts** | Sonner + Radix Toast | 1.7.4 |

---

## Apéndice C: Segundo Barrido — Hallazgos Adicionales

> Segundo escáner realizado el 18 de febrero de 2026 para cubrir áreas no analizadas en la primera pasada.

### Hallazgos adicionales de seguridad en Edge Functions

#### AUDIT-021 — Edge Function `storage-health` sin autenticación

- **ID:** AUDIT-021
- **Severidad:** 🔴 Crítico
- **Módulo afectado:** Edge Functions / MinIO
- **Descripción técnica:** La Edge Function `storage-health` no requiere JWT ni ninguna autenticación. Cualquier persona que conozca la URL puede llamarla y obtener la lista de objetos del bucket MinIO (nombres de archivos/keys, tamaños). Además usa CORS `Access-Control-Allow-Origin: *`.
- **Impacto real en el negocio:** Exposición de la estructura de archivos fiscales a internet. Un atacante podría enumerar todos los documentos archivados (nombres de facturas, clientes, números).
- **Evidencia:** `supabase/functions/storage-health/index.ts` — sin verificación de JWT, CORS wildcard, devuelve keys de objetos.
- **Recomendación:** Añadir verificación JWT + rol admin, o restringir a llamadas internas/cron.
- **Esfuerzo estimado:** 1-2 horas

#### AUDIT-022 — `monthly-report-worker` sin protección si CRON_SECRET no está configurado

- **ID:** AUDIT-022
- **Severidad:** 🔴 Crítico
- **Módulo afectado:** Edge Functions / Reportes
- **Descripción técnica:** La Edge Function `monthly-report-worker` verifica `CRON_SECRET` solo si la variable de entorno existe. Si `CRON_SECRET` no está configurado, la condición `cronSecret && authHeader !== ...` es falsa, y la función acepta cualquier petición sin autenticación. Esto permitiría a cualquiera generar reportes mensuales y potencialmente enviar emails.
- **Impacto real en el negocio:** Generación no autorizada de reportes, posible abuso del servicio de email (Resend), exposición de datos financieros.
- **Evidencia:** `supabase/functions/monthly-report-worker/index.ts`, líneas 10-16.
- **Recomendación:** Requerir `CRON_SECRET` obligatoriamente. Si no existe, rechazar todas las peticiones.
- **Esfuerzo estimado:** 30 minutos

#### AUDIT-023 — `rate-limit` reset accesible por cualquier usuario autenticado

- **ID:** AUDIT-023
- **Severidad:** 🟠 Alto
- **Módulo afectado:** Edge Functions / Autenticación
- **Descripción técnica:** La acción `reset` de la Edge Function `rate-limit` solo verifica que el usuario esté autenticado, pero no comprueba si tiene rol de admin. Cualquier usuario autenticado podría resetear el rate limit de cualquier email, lo que anularía la protección contra ataques de fuerza bruta.
- **Impacto real en el negocio:** Un atacante con cuenta válida podría desbloquear intentos de login de cualquier cuenta.
- **Evidencia:** `supabase/functions/rate-limit/index.ts`, líneas 155-179 — no hay verificación de rol.
- **Recomendación:** Añadir verificación `role_name === 'admin'` igual que en `admin-users`.
- **Esfuerzo estimado:** 1 hora

#### AUDIT-024 — XSS en emails de formulario de contacto

- **ID:** AUDIT-024
- **Severidad:** 🟠 Alto
- **Módulo afectado:** Edge Functions / Contacto
- **Descripción técnica:** En `send-contact-form`, los datos del usuario (nombre, empresa, email, teléfono, mensaje) se interpolan directamente en el HTML del email sin escapar caracteres HTML. Si un usuario introduce `<script>` o HTML malicioso, este se renderizará en el email del destinatario.
- **Impacto real en el negocio:** XSS en clientes de email que renderizen HTML, posible phishing interno.
- **Evidencia:** `supabase/functions/send-contact-form/index.ts`, líneas 198-227.
- **Recomendación:** Escapar HTML o usar plantillas de texto plano.
- **Esfuerzo estimado:** 1 hora

#### AUDIT-025 — URL de invitación usa `origin` del request (spoofeable)

- **ID:** AUDIT-025
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Edge Functions / Invitaciones
- **Descripción técnica:** En `send-user-invitation`, la URL de configuración de cuenta se construye usando el `origin` de la petición HTTP. Un atacante que intercepte o modifique el origin podría hacer que el email de invitación apunte a un dominio malicioso.
- **Impacto real en el negocio:** Phishing: el invitado podría ser dirigido a un sitio falso que capture sus credenciales.
- **Evidencia:** `supabase/functions/send-user-invitation/index.ts`, línea 221.
- **Recomendación:** Usar una URL base fija desde variable de entorno (`APP_BASE_URL`).
- **Esfuerzo estimado:** 30 minutos

#### AUDIT-026 — Endpoint `send-otp` sin rate limiting propio

- **ID:** AUDIT-026
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Edge Functions / OTP
- **Descripción técnica:** El endpoint `send-otp` no tiene rate limiting propio. Aunque existe la Edge Function `rate-limit` para el login, el envío de OTP en sí mismo no está limitado. Un atacante podría hacer spam de emails OTP (email bombing).
- **Impacto real en el negocio:** Abuso del servicio de email (Resend), costes, molestias al destinatario.
- **Evidencia:** `supabase/functions/send-otp/index.ts` — sin rate limit; `supabase/functions/send-contact-form/index.ts` — mismo problema.
- **Recomendación:** Implementar rate limit por email e IP, o reutilizar la lógica de `rate-limit`.
- **Esfuerzo estimado:** 2-4 horas

---

### Hallazgos de calidad de código

#### AUDIT-027 — Sin suite de tests automatizados

- **ID:** AUDIT-027
- **Severidad:** 🟠 Alto
- **Módulo afectado:** Calidad / Testing
- **Descripción técnica:** No existe ningún archivo de test (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `__tests__/`) en todo el repositorio. No hay framework de testing configurado (Jest, Vitest, Playwright, etc.). Cero cobertura de tests.
- **Impacto real en el negocio:** Cada cambio en el código se hace "a ciegas", sin validación automática de regresiones. En un ERP que maneja facturación y contabilidad, esto es especialmente riesgoso.
- **Recomendación:** Implementar Vitest (compatible con Vite) para tests unitarios. Priorizar tests en: cálculos de IVA/totales, helpers de estado (calculatePaymentStatus, isOverdue, isDocumentEditable), flujos de facturación (create → issue → pay).
- **Esfuerzo estimado:** 8-16 horas (setup + tests críticos iniciales)

#### AUDIT-028 — Exceso de console.log en producción

- **ID:** AUDIT-028
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Frontend / Rendimiento
- **Descripción técnica:** Se encontraron **más de 60 ocurrencias** de `console.log` en código de producción. El componente `LeadMap.tsx` solo tiene **más de 50** console.log. Otros archivos afectados: `ProductSearchInput.tsx`, `SupplierSearchInput.tsx`, `UserAvatarDropdown.tsx`, `ProductCategoriesTab.tsx`, `MobileProjectDetailPage.tsx`, `MobileClientDetailPage.tsx`.
- **Impacto real en el negocio:** Degradación de rendimiento, exposición de información interna en la consola del navegador.
- **Evidencia:** `LeadMap.tsx` (50+ líneas), `SupplierSearchInput.tsx` (4 líneas), `ProductSearchInput.tsx` (4+ líneas), etc.
- **Recomendación:** Eliminar todos los console.log o reemplazar con un logger que se desactive en producción.
- **Esfuerzo estimado:** 2-3 horas

#### AUDIT-029 — Span de DEBUG en producción

- **ID:** AUDIT-029
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Frontend / UI
- **Descripción técnica:** En `InvoicePaymentsSection.tsx` (línea 294) existe un comentario `{/* DEBUG: Remove this span in production */}` con un span de depuración visible en la UI.
- **Recomendación:** Eliminar el span.
- **Esfuerzo estimado:** 5 minutos

#### AUDIT-030 — Filtro roto en ProjectSearchInput

- **ID:** AUDIT-030
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Frontend / Búsqueda
- **Descripción técnica:** En `ProjectSearchInput.tsx` (línea 90), el filtro por `clientId` tiene `|| true`, lo que hace que la condición siempre sea verdadera y el filtro no se aplique nunca. Hay un TODO asociado.
- **Evidencia:** `projects = projects.filter(p => p.id === clientId || true);`
- **Recomendación:** Implementar el filtro correctamente cuando la RPC soporte `client_id`, o eliminar el código muerto.
- **Esfuerzo estimado:** 30 minutos

#### AUDIT-031 — Archivos de más de 1000 líneas que requieren refactorización

- **ID:** AUDIT-031
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Frontend / Mantenimiento
- **Descripción técnica:** Se identificaron archivos excesivamente grandes:
  - `LeadMap.tsx` — **~1.409 líneas** (mapa de leads con toda la lógica de canvassing, POIs, UI)
  - `EditQuotePage.tsx` — **~1.000+ líneas** (editor de presupuestos)
  - `MobileQuoteDetailPage.tsx` — **~1.200+ líneas** (detalle mobile de presupuesto)
- **Impacto real en el negocio:** Archivos grandes son difíciles de mantener, propensos a conflictos de merge, y lentos de parsear en el IDE.
- **Recomendación:** Dividir en componentes más pequeños (hooks custom, componentes de sección, etc.).
- **Esfuerzo estimado:** 8-16 horas por archivo

---

### Hallazgos de arquitectura adicionales

#### AUDIT-032 — Firebase solo para Analytics (posible dependencia innecesaria)

- **ID:** AUDIT-032
- **Severidad:** 🟢 Bajo
- **Módulo afectado:** Dependencias
- **Descripción técnica:** El SDK de Firebase (`firebase@12.7.0`, ~300KB gzip) se importa en `src/main.tsx` pero solo se usa para `initializeApp` y `getAnalytics`. No se usa Firebase Auth, Firestore, ni ningún otro servicio.
- **Impacto real en el negocio:** Bundle size innecesariamente grande para solo analytics.
- **Recomendación:** Si solo se necesita Google Analytics, considerar usar `gtag.js` directamente (mucho más ligero) o eliminarlo si no se están analizando las métricas.
- **Esfuerzo estimado:** 2 horas

#### AUDIT-033 — PWA cacheando respuestas de Supabase API con NetworkFirst

- **ID:** AUDIT-033
- **Severidad:** 🟢 Bajo
- **Módulo afectado:** PWA / Cache
- **Descripción técnica:** La configuración de Workbox en `vite.config.ts` usa `NetworkFirst` para todas las peticiones a `*.supabase.co/*` con un cache de 50 entradas y 5 minutos de max-age. Esto significa que si la red falla o es lenta, el service worker servirá datos stale de hasta 5 minutos de antigüedad.
- **Impacto real en el negocio:** En un ERP financiero, datos stale podrían causar decisiones incorrectas (p.ej. ver una factura como "pendiente" cuando ya fue pagada hace 4 minutos).
- **Recomendación:** Considerar excluir endpoints financieros críticos del cache de Workbox (`/rpc/*`, endpoints de facturas/pagos).
- **Esfuerzo estimado:** 1-2 horas

#### AUDIT-034 — Módulo AI con worker Ollama (digital-ops)

- **ID:** AUDIT-034
- **Severidad:** 🟢 Bajo (informativo)
- **Módulo afectado:** AI / digital-ops
- **Descripción técnica:** Existe un módulo de IA con chat interno (`src/pages/nexo_av/ai/`) que procesa mensajes a través de un worker externo (`digital-ops/worker/`) que ejecuta Ollama (LLM local, modelo `qwen2.5:3b`). El worker corre en Docker en ALB357 y se conecta a Supabase con service role key. El chat es solo desktop (no mobile).
- **Estado:** Funcional con limitaciones (generación de plantillas V1, no LLM real en la Edge Function — el Edge Function `ai-chat-processor` solo genera respuestas template, el worker real es `digital-ops/worker`).
- **Recomendación:** Documentar mejor la arquitectura AI (qué hace el edge function vs. el worker). Considerar rate limiting en el chat para evitar abuso del LLM.
- **Esfuerzo estimado:** N/A (informativo)

---

### Base de datos — Análisis ampliado

#### AUDIT-035 — 266 RPCs: superficie de API masiva

- **ID:** AUDIT-035
- **Severidad:** 🟡 Medio
- **Módulo afectado:** Base de datos / Seguridad
- **Descripción técnica:** La base de datos expone **266 funciones RPC públicas** agrupadas en: AI (~38), Contabilidad (~35), Compras/Proveedores (~35), Catálogo (~25), Facturación (~25), Auth/Usuarios (~25), Proyectos (~25), Nóminas (~18), Presupuestos (~15), Técnicos/Workers (~14), Clientes (~13), Tareas (11), Crédito (~8), Canvassing (~7), Empresa (~6), Dashboard (5), Notificaciones (5), Auditoría (2), Otros (~10).
- **Impacto real en el negocio:** Superficie de ataque grande. Cada RPC pública es un endpoint potencial. Las RPCs con `SECURITY DEFINER` son especialmente sensibles porque bypasean RLS.
- **Recomendación:** 
  1. Auditar todas las RPCs con `SECURITY DEFINER` para verificar que validan permisos internamente
  2. Considerar mover RPCs internas/admin a schema no expuesto
  3. Documentar qué RPCs son públicas vs. internas
- **Esfuerzo estimado:** 8-16 horas (auditoría progresiva)

#### AUDIT-036 — Esquema multi-schema con tipos solo para public

- **ID:** AUDIT-036
- **Severidad:** 🟢 Bajo (informativo)
- **Módulo afectado:** Base de datos / TypeScript
- **Descripción técnica:** La base de datos usa múltiples schemas (sales, accounting, internal, catalog, crm, quotes, projects, ai, audit, purchasing) pero el archivo de tipos TypeScript (`types.ts`) solo refleja el schema `public` (3 tablas: `minio_files`, `scanned_documents`, `user_roles`). Todos los demás datos se acceden exclusivamente vía RPCs. Esto es correcto arquitectónicamente (schemas no expuestos en PostgREST) pero significa que la mayoría de la estructura de datos no es visible en TypeScript.
- **Impacto real en el negocio:** Los desarrolladores no pueden ver los tipos de tablas internas directamente. La tipificación depende de las RPCs.
- **Recomendación:** Es un diseño válido. Mantener los tipos de RPC actualizados con `supabase gen types`.

#### AUDIT-037 — Tablas de auditoría, notificaciones y tareas existentes

- **ID:** AUDIT-037
- **Severidad:** 🟢 Bajo (informativo)
- **Módulo afectado:** Base de datos
- **Descripción técnica:** El segundo barrido confirma la existencia de:
  - **Auditoría:** Schema `audit` con `retention_policy`, `archived_records`. RPCs: `audit_get_stats`, `audit_list_events`. Hay una página `AuditPage.tsx` y `AuditEventDetailPage.tsx`.
  - **Notificaciones:** Tabla `internal.user_notifications`. RPCs: `notifications_count_unread`, `notifications_list`, `notifications_mark_all_read`, `notifications_mark_read`, `notifications_refresh_for_user`.
  - **Tareas:** Tablas `internal.tasks`, `internal.task_assignees`, `internal.task_activity`. RPCs: `tasks_create`, `tasks_get`, `tasks_list_for_user`, `tasks_set_status`, etc. Páginas: `TasksPage.tsx`, `TaskDetailPage.tsx`.
- **Estado:** Estos módulos están funcionales y no se detectaron problemas específicos.

---

### TODOs pendientes en el código

| Archivo | TODO |
|---------|------|
| `QuoteDetailPage.tsx:468` | Crear RPC pública `get_quote_notes` |
| `QuoteDetailPage.tsx:495` | Crear RPC pública `create_quote_note` |
| `InvoiceDetailPage.tsx:524` | Implementar notas de facturas |
| `InvoiceDetailPage.tsx:545` | Implementar guardado de notas |
| `ProductsTab.tsx:283` | Implement archive functionality |
| `MobileProjectDetailPage.tsx:334` | Abrir diálogo para asignar técnicos |
| `ProjectDetailPage.tsx:286` | Abrir diálogo para editar proyecto |
| `ProjectDetailPage.tsx:298` | Abrir diálogo para asignar técnicos |
| `CanvassingMapSidebar.tsx:49` | Sistema de alertas automáticas |
| `ProjectSearchInput.tsx:90` | Filtro por client_id (actualmente `\|\| true`) |

---

### Resumen del segundo barrido

| Categoría | Nuevos hallazgos | Más crítico |
|-----------|-----------------|-------------|
| **Seguridad Edge Functions** | 6 (AUDIT-021 a 026) | `storage-health` sin auth (AUDIT-021) |
| **Calidad de código** | 5 (AUDIT-027 a 031) | Sin tests (AUDIT-027) |
| **Arquitectura** | 3 (AUDIT-032 a 034) | Informativo |
| **Base de datos** | 3 (AUDIT-035 a 037) | 266 RPCs con SECURITY DEFINER (AUDIT-035) |
| **TODOs pendientes** | 10 items | Funcionalidad incompleta |

### Plan de acción actualizado — Adiciones del segundo barrido

**Inmediato (junto con Semana 1):**
- [ ] Proteger `storage-health` con JWT o desactivar (AUDIT-021)
- [ ] Forzar `CRON_SECRET` en `monthly-report-worker` (AUDIT-022)
- [ ] Restringir `reset` de rate-limit a admin (AUDIT-023)
- [ ] Eliminar span DEBUG de `InvoicePaymentsSection` (AUDIT-029)

**Próximo sprint:**
- [ ] Escapar HTML en `send-contact-form` (AUDIT-024)
- [ ] Usar URL base fija en `send-user-invitation` (AUDIT-025)
- [ ] Rate limiting en `send-otp` y `send-contact-form` (AUDIT-026)
- [ ] Limpiar console.log (AUDIT-028)
- [ ] Configurar Vitest y tests iniciales (AUDIT-027)

**Backlog:**
- [ ] Refactorizar archivos grandes (AUDIT-031)
- [ ] Evaluar reemplazo de Firebase por gtag.js (AUDIT-032)
- [ ] Revisar cache de PWA para endpoints financieros (AUDIT-033)
- [ ] Auditoría de RPCs SECURITY DEFINER (AUDIT-035)

---

## Apéndice D: Verificación con Datos Reales de la Base de Datos (Supabase MCP)

> Datos extraídos directamente de la base de datos de producción el 18 de febrero de 2026 mediante Supabase MCP.

---

### D.1 — Volumetría General

| Tabla | Registros |
|-------|-----------|
| `sales.invoices` (Facturas de venta) | 23 |
| `sales.invoice_lines` | 75 |
| `sales.invoice_payments` | 10 |
| `sales.purchase_invoices` (Facturas de compra) | 54 |
| `sales.purchase_invoice_lines` | 65 |
| `sales.purchase_invoice_payments` | 26 |
| `quotes.quotes` (Presupuestos) | 54 |
| `quotes.quote_lines` | 384 |
| `projects.projects` | 25 |
| `crm.clients` | 7 |
| `internal.suppliers` | 12 |
| `internal.technicians` | 9 |
| `internal.partners` | 2 |
| `internal.authorized_users` | 2 |
| `accounting.journal_entries` (Asientos) | 145 |
| `accounting.journal_entry_lines` | 326 |
| `accounting.payroll_payments` | 2 |
| `accounting.period_closures` | 1 |
| `accounting.credit_operations` | 0 |
| `public.minio_files` (Archivo fiscal) | 104 |
| `public.scanned_documents` | 57 |
| `catalog.products` | 75 |
| `catalog.categories` | 31 |

**Observaciones:**
- Solo 2 usuarios autorizados y 2 socios — plataforma en fase inicial/piloto.
- 568 migraciones aplicadas — ratio migraciones/datos extremadamente alto, indica desarrollo iterativo intenso.
- Solo 1 período cerrado (enero 2026) — módulo de contabilidad en uso real reciente.

---

### D.2 — Integridad Contable: Equilibrio de Asientos

> ✅ **RESULTADO: TODOS los 145 asientos contables están perfectamente equilibrados** (SUM(debe) = SUM(haber) para cada asiento).

No se encontró ningún asiento con diferencia > 0.01€. Esto confirma que:
- Los triggers de validación (`trigger_validate_balanced_entry`) funcionan correctamente.
- La generación automática de asientos desde facturas/pagos/nóminas mantiene integridad.

**Distribución de asientos por tipo:**

| Tipo | Cantidad |
|------|----------|
| `TAX_PROVISION` | 63 |
| `PAYMENT` | 26 |
| `INVOICE_SALE` | 20 |
| `INVOICE_PURCHASE` | 17 |
| `PAYMENT_RECEIVED` | 10 |
| `ADJUSTMENT` | 3 |
| `PAYMENT_MADE` | 3 |
| `PAYROLL_PARTNER` | 2 |
| `BANK_TRANSFER` | 1 |

---

### D.3 — Numeración de Facturas de Venta

> ✅ **Numeración secuencial sin saltos**: F-26-000001 a F-26-000018, secuencia perfecta.

| Estado | Cantidad | Total EUR |
|--------|----------|-----------|
| PAID | 10 | 2.839,13 € |
| ISSUED | 9 | 8.259,65 € |
| DRAFT | 3 | 1.399,24 € |
| PARTIAL | 1 | 5.925,12 € |

**⚠️ Hallazgo AUDIT-038 — Inversión cronológica en facturas emitidas:**

La factura **F-26-000006** tiene `issue_date = 2026-02-10` pero fue creada el 05/02. La factura **F-26-000007** tiene `issue_date = 2026-01-26` y fue creada el 22/01. Esto significa que la factura con número mayor (F-26-000007) tiene una fecha de emisión **anterior** a la de número menor (F-26-000006).

- **ID:** AUDIT-038
- **Severidad:** 🟡 Medio
- **Módulo:** Facturación / Numeración
- **Descripción técnica:** El número de factura es secuencial por orden de creación, pero la fecha de emisión (issue_date) puede ser posterior. Esto genera una inversión cronológica: F-26-000006 (10/02) > F-26-000007 (26/01). La AEAT requiere que la numeración sea correlativa y cronológica.
- **Impacto real:** Posible requerimiento en inspección fiscal por inversión de fechas.
- **Recomendación:** Asignar número definitivo solo en el momento de emisión (status → ISSUED), no en la creación.
- **Esfuerzo estimado:** 4-8 horas

---

### D.4 — Facturas de Compra por Estado

| Estado | Cantidad | Total EUR |
|--------|----------|-----------|
| PAID | 24 | 2.815,61 € |
| DRAFT | 19 | 0,00 € |
| APPROVED | 9 | 3.969,32 € |
| PARTIAL | 1 | 3.217,39 € |
| PENDING_VALIDATION | 1 | 2,50 € |

**⚠️ Hallazgo AUDIT-039 — 19 tickets borrador vacíos acumulados:**

Se encontraron **19 documentos de compra en DRAFT** con `total = 0.00 €`, `0 líneas`, y `supplier_name = NULL`. Todos tienen formato `TICKET-BORR-26-XXXXXX` (del 000003 al 000022). Esto indica que se crean borradores automáticamente (o manualmente) que nunca se completan ni se eliminan.

- **ID:** AUDIT-039
- **Severidad:** 🟡 Medio
- **Módulo:** Compras / Limpieza de datos
- **Descripción técnica:** 19 registros huérfanos sin datos útiles en `sales.purchase_invoices`. Consumo de secuencia de numeración BORR sin propósito.
- **Impacto real:** Ruido en listados, confusión al filtrar, secuencia inflada.
- **Recomendación:** Implementar limpieza automática de borradores vacíos (> 7 días sin cambio), o impedir la creación de borradores sin datos mínimos.
- **Esfuerzo estimado:** 2-4 horas

---

### D.5 — Verificación de Coherencia de Cobros y Pagos

**⚠️ Hallazgo AUDIT-040 — Factura de venta con paid_amount inconsistente:**

| Factura | Status | Total | paid_amount (campo) | Pagos reales confirmados | Diferencia |
|---------|--------|-------|---------------------|--------------------------|------------|
| F250047 | PAID | 194,81 € | 194,81 € | **0,00 €** | **194,81 €** |

La factura **F250047** está marcada como `PAID` con `paid_amount = 194.81`, pero **no tiene ningún registro en `sales.invoice_payments`** (0 pagos). Esto indica que:
1. El pago fue registrado manualmente actualizando `paid_amount` sin crear un registro de pago, o
2. Se eliminó el registro de pago pero no se recalculó el campo.

- **ID:** AUDIT-040
- **Severidad:** 🔴 Crítico
- **Módulo:** Facturación / Cobros
- **Descripción técnica:** `sales.invoices.paid_amount` desincronizado de `sales.invoice_payments`. El trigger `trigger_recalculate_paid_amount` debería mantenerlos sincronizados, pero esta factura (prefijo F250047, año 2025) podría ser anterior a la implementación del trigger.
- **Impacto real:** Dato contable incorrecto. El asiento de cobro puede existir sin soporte en la tabla de pagos. Riesgo de discrepancia en libro de caja.
- **Recomendación:** Ejecutar un script de reconciliación para todas las facturas: `UPDATE sales.invoices i SET paid_amount = (SELECT COALESCE(SUM(amount),0) FROM sales.invoice_payments ip WHERE ip.invoice_id = i.id AND ip.is_confirmed = true)`.
- **Esfuerzo estimado:** 1 hora

**⚠️ Hallazgo AUDIT-041 — Factura de compra con paid_amount inconsistente:**

| Factura | Nº Interno | Status | Total | paid_amount (campo) | Pagos confirmados | Diferencia |
|---------|-----------|--------|-------|---------------------|-------------------|------------|
| PENDIENTE-226394 | C-26-000005 | APPROVED | 83,45 € | 83,45 € | **0,00 €** | **83,45 €** |

Misma situación que AUDIT-040 pero en compras. La factura C-26-000005 tiene `paid_amount = 83.45` pero 0 registros de pago confirmados.

- **ID:** AUDIT-041
- **Severidad:** 🔴 Crítico
- **Módulo:** Compras / Pagos
- **Recomendación:** Misma reconciliación que AUDIT-040 en `sales.purchase_invoices`.
- **Esfuerzo estimado:** 1 hora

---

### D.6 — Presupuestos y Proyectos

**Presupuestos por estado:**

| Estado | Cantidad |
|--------|----------|
| SENT | 35 |
| REJECTED | 9 |
| DRAFT | 4 |
| APPROVED | 3 |
| INVOICED | 3 |

**Proyectos por estado:**

| Estado | Cantidad |
|--------|----------|
| NEGOTIATION | 13 |
| INVOICED | 5 |
| IN_PROGRESS | 3 |
| PLANNED | 1 |
| COMPLETED | 1 |
| CLOSED | 1 |
| CANCELLED | 1 |

**Observación:** 13 de 25 proyectos (52%) están en `NEGOTIATION` — pipeline comercial activo. Solo 1 proyecto cerrado (CLOSED) indica que el flujo de cierre completo se ha ejecutado una vez.

---

### D.7 — Resumen Financiero Global

| Concepto | Total EUR | Documentos |
|----------|-----------|------------|
| Ventas emitidas (ISSUED+PAID+PARTIAL) | **17.023,90 €** | 20 |
| Cobros confirmados | **5.606,88 €** | 10 |
| Compras aprobadas (APPROVED+PAID+PARTIAL) | **10.002,32 €** | 34 |
| Pagos a proveedores confirmados | **4.003,38 €** | 26 |

**Ratio de cobro ventas:** 32,9% (5.606,88 / 17.023,90)
**Ratio de pago compras:** 40,0% (4.003,38 / 10.002,32)

**⚠️ Observación:** Solo el ~33% de las ventas emitidas están cobradas. Hay **11.417,02 € pendientes de cobro**. Prioridad para gestión de tesorería.

---

### D.8 — Saldos Bancarios Contables

| Banco | Código | IBAN | Saldo contable |
|-------|--------|------|----------------|
| SABADELL NEGOCIOS | 572001 | ES52•••37679 | **9.547,66 €** |
| CAIXABANK EMPRESES | 572002 | ES16•••32615 | **930,09 €** |
| REVOLUT BUSINESS | 572003 | ES61•••47468 | **800,00 €** |

**Total tesorería contable: 11.277,75 €**

---

### D.9 — IVA: Análisis de Tipos Aplicados

**Ventas (facturas emitidas):**

| Tipo IVA | Líneas | Base imponible | Cuota IVA |
|----------|--------|----------------|-----------|
| 21% | 66 | 14.069,34 € | 2.954,56 € |

> Todas las líneas de facturación de venta aplican IVA al 21%. Consistente con servicios profesionales B2B en España.

**Compras (facturas aprobadas+pagadas):**

| Tipo IVA | Líneas | Base imponible | Cuota IVA |
|----------|--------|----------------|-----------|
| 0% | 8 | 183,89 € | 0,00 € |
| 10% | 5 | 11,72 € | 1,17 € |
| 21% | 51 | 8.074,70 € | 1.647,39 € |

**Liquidación IVA estimada (datos actuales):**
- IVA repercutido (ventas): **2.954,56 €**
- IVA soportado (compras): **1.648,56 €** (1.647,39 + 1,17)
- **Resultado Modelo 303: 1.306,00 € a ingresar**

---

### D.10 — Archivo Fiscal MinIO

| Carpeta | Archivos | Tamaño |
|---------|----------|--------|
| `fiscal/` | 104 | 6,25 MB |

**Cobertura de archivado:**

| Verificación | Resultado |
|-------------|-----------|
| Facturas emitidas sin `storage_key` | ✅ **0** — todas archivadas |
| Presupuestos enviados sin `storage_key` | ✅ **0** — todos archivados |
| Compras aprobadas sin `storage_key` | ✅ **0** — todas archivadas |

> ✅ **100% de cobertura**: Todos los documentos emitidos/aprobados tienen su PDF archivado en MinIO.

---

### D.11 — Cierre de Períodos

| Período | Año | Mes | Cerrado el | is_locked |
|---------|-----|-----|------------|-----------|
| Enero 2026 | 2026 | 1 | 29/01/2026 16:36 | **false** |

**⚠️ Hallazgo AUDIT-042 — Período cerrado pero no bloqueado:**

- **ID:** AUDIT-042
- **Severidad:** 🟡 Medio
- **Módulo:** Contabilidad / Períodos
- **Descripción técnica:** El período de enero 2026 está marcado como cerrado (`closed_at` tiene valor) pero `is_locked = false`. Esto significa que los asientos del período podrían ser modificados a pesar de estar "cerrado". Además, `closed_by = NULL`, lo que impide auditar quién cerró el período.
- **Impacto real:** Posible manipulación de asientos en período supuestamente cerrado.
- **Recomendación:** Asegurar que `close_period` también setee `is_locked = true` y registre `closed_by`.
- **Esfuerzo estimado:** 1 hora

---

### D.12 — Seguridad: Tablas SIN Row-Level Security (RLS)

> ⚠️ **21 tablas detectadas sin RLS habilitado:**

| Tabla | Riesgo |
|-------|--------|
| **`sales.purchase_invoices`** | 🔴 ALTO — datos financieros sensibles |
| **`sales.purchase_invoice_payments`** | 🔴 ALTO — pagos a proveedores |
| **`sales.purchase_orders`** | 🟠 ALTO — pedidos de compra |
| **`sales.purchase_order_lines`** | 🟠 ALTO — líneas de pedido |
| **`internal.technicians`** | 🟠 ALTO — datos personales |
| **`internal.company_bank_accounts`** | 🔴 CRÍTICO — cuentas bancarias (IBANs) |
| **`accounting.period_closures`** | 🟡 MEDIO — control de períodos |
| **`accounting.monthly_reports`** | 🟡 MEDIO — informes mensuales |
| **`internal.products`** | 🟢 BAJO — catálogo legacy |
| **`internal.product_categories`** | 🟢 BAJO |
| **`internal.product_subcategories`** | 🟢 BAJO |
| **`internal.product_packs`** | 🟢 BAJO |
| **`internal.product_pack_items`** | 🟢 BAJO |
| **`internal.product_sequences`** | 🟢 BAJO |
| **`internal.taxes`** | 🟢 BAJO |
| **`internal.payroll_settings_audit`** | 🟡 MEDIO — auditoría de nóminas |
| **`catalog._mig_*`** (4 tablas) | 🟢 BAJO — tablas de migración |
| **`sales.purchase_order_sequences`** | 🟢 BAJO |

**AUDIT-043 — Tablas financieras sin RLS:**

- **ID:** AUDIT-043
- **Severidad:** 🔴 Crítico
- **Módulo:** Seguridad / Base de datos
- **Descripción técnica:** Las tablas `sales.purchase_invoices`, `sales.purchase_invoice_payments`, e `internal.company_bank_accounts` no tienen RLS habilitado. Aunque los datos se acceden principalmente via RPCs `SECURITY DEFINER`, un usuario autenticado podría acceder directamente a estas tablas via PostgREST si los schemas están expuestos.
- **Impacto real:** Exposición de datos financieros sensibles (facturas de compra, pagos, IBANs de cuentas bancarias) a cualquier usuario autenticado.
- **Recomendación:** Habilitar RLS en `sales.purchase_invoices`, `sales.purchase_invoice_payments`, `internal.company_bank_accounts`, y `internal.technicians` con políticas restrictivas.
- **Esfuerzo estimado:** 4-8 horas

---

### D.13 — Supabase Security Advisors

> Alertas reportadas directamente por el linter de seguridad de Supabase:

**1. Leaked Password Protection deshabilitada:**
- La protección contra contraseñas comprometidas (HaveIBeenPwned) está deshabilitada en Supabase Auth.
- **Recomendación:** Habilitar en Settings > Auth > Password Security.

**2. Funciones con `search_path` mutable (15 funciones):**
- Funciones como `finance_get_invoice`, `get_quote`, `get_purchase_invoice`, `list_projects`, `create_quote_with_number`, `list_project_sites`, `log_quote_change`, y varias `backfill_*` no tienen `search_path` inmutable.
- **Riesgo:** Un atacante podría manipular el `search_path` para ejecutar funciones maliciosas con el mismo nombre en otro schema.
- **Remediación:** https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

**3. Políticas RLS excesivamente permisivas (15 políticas `USING(true)`):**
- `sales.invoice_payments` — INSERT/UPDATE/DELETE permiten a cualquier usuario autenticado.
- `sales.purchase_invoice_lines` — INSERT/UPDATE/DELETE permiten a cualquier usuario autenticado.
- `internal.suppliers` — INSERT/UPDATE/DELETE permiten a cualquier usuario autenticado.
- `projects.site_technician_assignments` — ALL sin restricción.
- `projects.site_visits` — ALL sin restricción.
- **Remediación:** https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy

---

### D.14 — Funciones SECURITY DEFINER por Schema

| Schema | Funciones SECURITY DEFINER |
|--------|---------------------------|
| `public` | **359** |
| `accounting` | 67 |
| `internal` | 26 |
| `sales` | 14 |
| `audit` | 12 |
| `projects` | 10 |
| `crm` | 9 |
| `quotes` | 8 |
| `security` | 7 |
| `catalog` | 6 |
| `backup` | 5 |
| `ai` | 4 |
| **TOTAL** | **528** |

> ⚠️ **528 funciones con SECURITY DEFINER** — cada una bypasea RLS y ejecuta con privilegios del creador. El schema `public` (expuesto via PostgREST) tiene 359 de ellas. Esto amplifica el hallazgo AUDIT-035.

---

### D.15 — Triggers Activos en el Negocio

Se detectaron **~100 triggers activos** distribuidos en todas las tablas principales. Los más relevantes para la auditoría:

| Trigger | Tabla | Función |
|---------|-------|---------|
| `trigger_validate_balanced_entry` | `accounting.journal_entries` | ✅ Valida equilibrio de asientos |
| `trigger_check_journal_entry_period_closed` | `accounting.journal_entries` | ✅ Impide asientos en períodos cerrados |
| `trigger_auto_create_invoice_sale_entry` | `sales.invoices` | ✅ Auto-genera asiento al emitir factura |
| `trigger_auto_create_invoice_purchase_entry` | `sales.purchase_invoices` | ✅ Auto-genera asiento al aprobar compra |
| `trigger_auto_create_purchase_payment_entry` | `sales.purchase_invoice_payments` | ✅ Auto-genera asiento al pagar |
| `trigger_lock_invoice_on_issue` | `sales.invoices` | ✅ Bloquea factura al emitir |
| `trg_prevent_locked_purchase_invoice_modification` | `sales.purchase_invoices` | ✅ Inmutabilidad |
| `trg_prevent_locked_purchase_line_modification` | `sales.purchase_invoice_lines` | ✅ Inmutabilidad |
| `trigger_recalculate_invoice_totals` | `sales.invoice_lines` | ✅ Recálculo auto |
| `trigger_recalculate_paid_amount` | `sales.invoice_payments` | ✅ Recálculo auto |
| `trigger_purchase_invoice_line_stock` | `sales.purchase_invoice_lines` | ✅ Integración stock |
| `trigger_auto_recalculate_corporate_tax` | `accounting.journal_entry_lines` | ✅ Provisión IS automática |
| `trigger_quote_status_to_project` | `quotes.quotes` | ✅ Sync presupuesto→proyecto |
| `trigger_invoice_status_to_project` | `sales.invoices` | ✅ Sync factura→proyecto |
| `audit_clients` | `crm.clients` | ✅ Auditoría de cambios |
| `audit_authorized_users` | `internal.authorized_users` | ✅ Auditoría de cambios |

> ✅ La base de datos tiene una capa sólida de triggers para integridad, automatización contable, inmutabilidad y auditoría.

---

### D.16 — Migraciones

- **Total de migraciones:** 568
- **Primera migración:** 30/12/2025
- **Última migración:** 17/02/2026
- **Período:** ~50 días
- **Ratio:** ~11.4 migraciones/día de media
- **Observación:** Muchas migraciones no tienen nombre (campo `name` vacío), lo que dificulta la trazabilidad. A partir de mediados de enero se empezaron a usar nombres descriptivos.

---

### Resumen de hallazgos del análisis de BD (AUDIT-038 a AUDIT-043)

| ID | Hallazgo | Severidad |
|----|----------|-----------|
| AUDIT-038 | Inversión cronológica en numeración de facturas (F-26-000006 vs F-26-000007) | 🟡 Medio |
| AUDIT-039 | 19 tickets borrador vacíos acumulados | 🟡 Medio |
| AUDIT-040 | Factura F250047 marcada PAID sin registros de pago | 🔴 Crítico |
| AUDIT-041 | Factura compra C-26-000005 con paid_amount inconsistente | 🔴 Crítico |
| AUDIT-042 | Período enero 2026 cerrado pero no bloqueado (is_locked=false) | 🟡 Medio |
| AUDIT-043 | Tablas financieras sin RLS (purchase_invoices, bank_accounts, technicians) | 🔴 Crítico |

### Plan de acción — Adiciones del análisis de BD

**Inmediato (esta semana):**
- [ ] Reconciliar `paid_amount` de facturas con pagos reales (AUDIT-040, AUDIT-041)
- [ ] Habilitar RLS en `sales.purchase_invoices`, `purchase_invoice_payments`, `internal.company_bank_accounts` (AUDIT-043)
- [ ] Bloquear período enero 2026 (`is_locked = true`) (AUDIT-042)
- [ ] Habilitar Leaked Password Protection en Supabase Auth

**Próximo sprint:**
- [ ] Implementar limpieza de borradores vacíos (AUDIT-039)
- [ ] Corregir asignación de número de factura para garantizar cronología (AUDIT-038)
- [ ] Fijar `search_path` en las 15 funciones reportadas por Supabase Advisor
- [ ] Restringir políticas RLS permisivas (`USING(true)`) en pagos, proveedores y líneas

**Backlog:**
- [ ] Auditar las 528 funciones SECURITY DEFINER progresivamente
- [ ] Añadir nombres descriptivos a migraciones futuras
- [ ] Implementar cleanup automático de tablas de migración `catalog._mig_*`

---

> **Fin del informe de auditoría (v3 — con datos reales de BD)**  
> Documento generado y actualizado el 18 de febrero de 2026  
> Total de hallazgos: **43** (AUDIT-001 a AUDIT-043)  
> Críticos: 10 | Altos: 9 | Medios: 17 | Bajos: 5 | Informativos: 2  
> Datos verificados directamente contra la base de datos de producción via Supabase MCP  
> Próxima revisión recomendada: Marzo 2026 (post-implementación de Prioridad 1 y 2)
