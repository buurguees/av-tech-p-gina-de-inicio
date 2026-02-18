# Ejecutar Migración: Incluir Facturas DRAFT en Cálculos Financieros

## Problema
Las facturas en estado DRAFT (Borrador) no se están contabilizando en el cálculo del margen del proyecto, lo que provoca que el "Margen Neto" sea incorrecto.

## Solución
Ejecutar la migración que actualiza la función `get_project_financial_stats` para incluir facturas DRAFT en los cálculos.

## Instrucciones para Ejecutar

### Paso 1: Abrir Supabase SQL Editor

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (icono `</>` en el menú lateral)
4. Click en **+ New query**

### Paso 2: Ejecutar la Migración

Abre el archivo: `supabase/migrations/20260120012418_include_draft_invoices_in_financial_stats.sql`

Copia **TODO** el contenido del archivo y pégalo en el SQL Editor.

Click en **Run** o presiona `Ctrl+Enter`.

Verifica que aparezca "Success" ✅

### Paso 3: Verificar que Funcionó

Ejecuta esta query en el SQL Editor para verificar que la función está actualizada:

```sql
-- Verificar que la función incluye DRAFT en el filtro
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'get_project_financial_stats' 
AND pronamespace = 'projects'::regnamespace;
```

Deberías ver en el código de la función que ahora incluye:
```sql
AND status != 'CANCELLED'
```

En lugar de:
```sql
AND status IN ('ISSUED', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE')
```

### Paso 4: Recargar la Aplicación

1. Recarga la página del proyecto en tu navegador (F5)
2. El dashboard debería mostrar:
   - **3 facturas** (en lugar de 2)
   - **Total Facturado** incluyendo la factura en borrador
   - **Margen Neto** recalculado correctamente

## Verificación Final

Después de ejecutar la migración, verifica en el dashboard del proyecto:

- ✅ El contador de facturas muestra "3 facturas"
- ✅ El "Total Facturado" incluye el subtotal de la factura en borrador
- ✅ El "Margen Neto" se recalcula correctamente

## Nota Importante

Si después de ejecutar la migración sigues viendo valores incorrectos:

1. **Limpia la caché del navegador** (Ctrl+Shift+Delete)
2. **Recarga la página** (F5)
3. **Verifica en la consola del navegador** si hay errores
