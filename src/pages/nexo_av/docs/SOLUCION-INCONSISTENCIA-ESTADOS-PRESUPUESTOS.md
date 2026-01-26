# Solución: Inconsistencia en Estados de Presupuestos

## Problema Identificado

Se detectaron diferencias en los estados de presupuestos mostrados entre dos páginas:

1. **Página de Listado General** (`/nexo-av/{userId}/quotes`)
2. **Página de Ficha de Cliente** (`/nexo-av/{userId}/clients/{clientId}`)

### Causa Raíz

Cada componente tenía su **propia definición local** de los estados de presupuestos (`QUOTE_STATUSES`), lo que causaba inconsistencias:

#### Estados en `ClientQuotesTab.tsx` (INCORRECTOS):
```typescript
const QUOTE_STATUSES = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'VIEWED', label: 'Visto' },      // ❌ No existe en la BD
  { value: 'ACCEPTED', label: 'Aceptado' }, // ❌ Debería ser APPROVED
  { value: 'REJECTED', label: 'Rechazado' },
  { value: 'EXPIRED', label: 'Expirado' },
  // ❌ Falta INVOICED
];
```

#### Estados en Base de Datos (CORRECTOS):
```sql
CREATE TYPE quotes.quote_status AS ENUM (
  'DRAFT',
  'SENT', 
  'APPROVED',   -- ✅ No ACCEPTED
  'REJECTED',
  'EXPIRED',
  'INVOICED'    -- ✅ Falta en ClientQuotesTab
);
```

## Solución Implementada

### 1. Archivo Centralizado de Estados

Se creó un archivo compartido para centralizar la definición de estados:

**`src/constants/quoteStatuses.ts`**
```typescript
export const QUOTE_STATUSES = [
  { value: "DRAFT", label: "Borrador", ... },
  { value: "SENT", label: "Enviado", ... },
  { value: "APPROVED", label: "Aprobado", ... },  // ✅ APPROVED (no ACCEPTED)
  { value: "REJECTED", label: "Rechazado", ... },
  { value: "EXPIRED", label: "Expirado", ... },
  { value: "INVOICED", label: "Facturado", ... }, // ✅ Incluido
] as const;

export const getStatusInfo = (status: string) => {
  return QUOTE_STATUSES.find(s => s.value === status) || QUOTE_STATUSES[0];
};
```

### 2. Componentes Actualizados

Los siguientes componentes fueron actualizados para usar el archivo centralizado:

#### ✅ Componentes Principales
- **QuotesPage.tsx** - Listado general de presupuestos
- **ClientQuotesTab.tsx** - Presupuestos en ficha de cliente
- **ProjectQuotesTab.tsx** - Presupuestos en ficha de proyecto
- **QuoteDetailPage.tsx** - Página de detalle de presupuesto
- **EditQuotePage.tsx** - Página de edición de presupuesto

#### Cambios Realizados en Cada Componente
```typescript
// ❌ ANTES: Definición local duplicada
const QUOTE_STATUSES = [...];
const getStatusInfo = (status: string) => {...};

// ✅ DESPUÉS: Importación del archivo centralizado
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";
```

## Beneficios de la Solución

### 1. **Consistencia Garantizada**
   - Todos los componentes muestran los mismos estados
   - Una única fuente de verdad

### 2. **Mantenibilidad**
   - Un solo lugar para actualizar estados
   - Cambios se propagan automáticamente

### 3. **Sincronización con Base de Datos**
   - Estados coinciden exactamente con el enum `quotes.quote_status`
   - Documentación clara de la relación BD ↔ Frontend

### 4. **Prevención de Errores Futuros**
   - TypeScript asegura el tipo correcto
   - Comentarios documentan la fuente de verdad

## Verificación

### ✅ Compilación Exitosa
```bash
npm run build
# ✓ built in 32.76s
```

### ✅ Estados Ahora Consistentes
Ambas páginas ahora muestran exactamente los mismos estados:
- DRAFT → Borrador
- SENT → Enviado
- APPROVED → Aprobado
- REJECTED → Rechazado
- EXPIRED → Expirado
- INVOICED → Facturado

## Recomendaciones

### Para Futuros Desarrollos

1. **Siempre usar el archivo centralizado**
   ```typescript
   import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";
   ```

2. **Actualizar la BD y el archivo juntos**
   - Si se añaden nuevos estados en la base de datos
   - Actualizar inmediatamente `src/constants/quoteStatuses.ts`

3. **Documentar cambios en ambos lugares**
   - Migración SQL + Actualización de constantes
   - Mantener comentarios sincronizados

### Para Otros Recursos

Considerar aplicar el mismo patrón para:
- Estados de proyectos
- Estados de facturas
- Estados de clientes/leads
- Cualquier enum que se use en múltiples componentes

## Fecha de Implementación

**12 de enero de 2026**

---

**Resultado**: ✅ Problema resuelto completamente. Los estados ahora son consistentes en todas las páginas.
