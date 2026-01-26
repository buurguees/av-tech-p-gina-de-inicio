# Correcciones de Seguridad - NexoAV

## Problemas Detectados y Soluciones

### 1. ✅ Company Tax IDs and Financial Data Could Be Stolen

**Problema:** La tabla `company_settings` que contiene datos fiscales y financieros sensibles (NIF, CIF, direcciones fiscales) no tenía políticas RLS (Row Level Security) habilitadas.

**Solución Implementada:**
- ✅ Habilitado RLS en `internal.company_settings`
- ✅ Política creada: Solo usuarios autenticados pueden leer los datos
- ✅ Política creada: Solo administradores pueden actualizar/crear datos de empresa
- ✅ Archivo de migración: `20260112111521_add_rls_policies_security.sql`

**Acción Requerida:**
Ejecutar la migración SQL en Supabase:
```bash
# Opción 1: SQL Editor en Supabase
# Copiar y pegar el contenido de supabase/migrations/20260112111521_add_rls_policies_security.sql

# Opción 2: CLI de Supabase (si está instalado)
supabase db push
```

---

### 2. ✅ User Permission Structure Could Be Mapped by Attackers

**Problema:** La tabla `user_roles` que define la estructura de permisos de usuarios estaba expuesta sin políticas RLS.

**Solución Implementada:**
- ✅ Habilitado RLS en `internal.user_roles`
- ✅ Política creada: Los usuarios solo pueden ver su propio rol
- ✅ Política creada: Los administradores pueden ver todos los roles
- ✅ Política creada: Solo administradores pueden gestionar roles
- ✅ Archivo de migración: `20260112111521_add_rls_policies_security.sql`

**Acción Requerida:**
Ejecutar la migración SQL en Supabase (mismo archivo que el punto 1).

---

### 3. ✅ Missing RLS on company_settings table

**Problema:** Error duplicado del punto 1, marcado como "outdated".

**Solución Implementada:**
Resuelto con la migración del punto 1.

---

### 4. ✅ Vulnerabilidad en dependencia xlsx - RESUELTA

**Problema:** 
El paquete `xlsx` (v0.18.5) tenía vulnerabilidades conocidas:
- **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6)
- **Regular Expression Denial of Service (ReDoS)** (GHSA-5pgg-2g8v-p4x9)

**Solución Implementada:**
- ✅ Desinstalado paquete `xlsx` vulnerable
- ✅ Instalado paquete `exceljs` como reemplazo seguro
- ✅ Actualizado `ProductImportDialog.tsx` para usar ExcelJS
- ✅ Actualizado `CategoryImportDialog.tsx` para usar ExcelJS
- ✅ Actualizado `ProductsTab.tsx` (función exportToExcel) para usar ExcelJS

**Archivos modificados:**
- `src/pages/nexo_av/components/catalog/ProductImportDialog.tsx`
- `src/pages/nexo_av/components/catalog/ProductsTab.tsx`
- `src/pages/nexo_av/components/settings/CategoryImportDialog.tsx`

**Beneficios de ExcelJS:**
- ✅ Sin vulnerabilidades conocidas
- ✅ Más mantenido y actualizado
- ✅ API más moderna con soporte TypeScript nativo
- ✅ Mejor manejo de estilos y formatos

---

## Políticas RLS Adicionales Implementadas

Para proteger otros datos financieros sensibles, también se han añadido políticas RLS a:

### Tabla `clients`
- ✅ Solo usuarios autenticados pueden acceder
- ✅ Control completo (CRUD) para usuarios autenticados

### Tabla `quotes`
- ✅ Solo usuarios autenticados pueden acceder
- ✅ Control completo (CRUD) para usuarios autenticados

### Tabla `invoices`
- ✅ Solo usuarios autenticados pueden acceder
- ✅ Control completo (CRUD) para usuarios autenticados

---

## Instrucciones de Aplicación

### 1. Aplicar las Políticas RLS en Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Accede a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de:
   ```
   supabase/migrations/20260112111521_add_rls_policies_security.sql
   ```
5. Ejecuta la query
6. Verifica que no haya errores

### 2. Verificar las Políticas

En Supabase Dashboard:
1. Ve a **Authentication** > **Policies**
2. Verifica que aparezcan las nuevas políticas para:
   - `company_settings`
   - `user_roles`
   - `clients`
   - `quotes`
   - `invoices`

### 3. Decidir sobre xlsx

Evalúa las dos opciones presentadas arriba y:
- Si eliges Opción A: Planifica la refactorización a ExcelJS
- Si eliges Opción B: Documenta el riesgo aceptado

---

## Próximos Pasos Recomendados

1. **Inmediato:**
   - ✅ Aplicar migración RLS en Supabase
   - ✅ Verificar políticas en Dashboard
   - ✅ Probar funcionalidad con usuario no-admin

2. **Corto plazo (1-2 semanas):**
   - 📋 Decidir estrategia para xlsx
   - 📋 Si se elige ExcelJS, planificar refactorización
   - 📋 Añadir más pruebas de seguridad

3. **Medio plazo (1 mes):**
   - 📋 Implementar audit logging para accesos a datos sensibles
   - 📋 Añadir 2FA (Two-Factor Authentication) para administradores
   - 📋 Revisar otras dependencias con `npm audit`

---

## Contacto y Soporte

Si tienes dudas sobre estas correcciones de seguridad:
1. Revisa la documentación de Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
2. Consulta las políticas implementadas en el archivo de migración
3. Realiza pruebas en un entorno de desarrollo antes de aplicar en producción

---

**Fecha de creación:** 12/01/2026  
**Última actualización:** 12/01/2026  
**Versión:** 1.0
