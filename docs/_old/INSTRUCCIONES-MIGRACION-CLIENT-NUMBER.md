# Instrucciones: Aplicar Migración de Client Number

## Problema Actual

El listado de clientes no carga debido a un error de estructura en la función `list_clients`. Esto ocurre porque la migración que añade el campo `client_number` no se ha ejecutado en Supabase.

## Error en Consola

```
Error fetching clients: (code: "42883", details: "Returned type industry_sector does not match expected type text in column 8", hint: null, message: "structure of query does not match function result type")
```

## Solución: Ejecutar la Migración

### Paso 1: Abrir Supabase SQL Editor

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (icono `</>` en el menú lateral)
4. Click en **+ New query**

### Paso 2: Ejecutar la Migración

Abre el archivo `supabase/migrations/20260112124624_add_client_number_field.sql` y copia TODO su contenido (las 140 líneas).

Pégalo en el SQL Editor y ejecuta con **Run** o `Ctrl+Enter`.

### Paso 3: Verificar que Funcionó

Después de ejecutar la migración, verifica en el SQL Editor:

```sql
-- Verificar que la función existe y tiene la estructura correcta
SELECT proname, proargnames, proargtypes 
FROM pg_proc 
WHERE proname = 'list_clients' AND pronamespace = 'public'::regnamespace;

-- Verificar que el campo client_number existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'crm' 
AND table_name = 'clients' 
AND column_name = 'client_number';
```

Si ambas queries devuelven resultados, la migración se aplicó correctamente.

### Paso 4: Actualizar Tipos TypeScript (Opcional)

Si después de la migración sigues viendo errores de tipos en el código, actualiza los tipos de Supabase:

```bash
# Si tienes Supabase CLI instalado
supabase gen types typescript --project-id <tu-project-id> > src/integrations/supabase/types.ts
```

### Paso 5: Recargar la Aplicación

Una vez ejecutada la migración en Supabase:
1. Recarga la página web (F5)
2. El listado de clientes debería cargar correctamente
3. Debería aparecer la columna "Nº Cliente" en el listado

## Cambios que Incluye esta Migración

La migración `20260112124624_add_client_number_field.sql` hace lo siguiente:

1. ✅ Añade el campo `client_number` a la tabla `crm.clients`
2. ✅ Crea un índice para el campo
3. ✅ Actualiza la función `list_clients` para devolver el `client_number`
4. ✅ Actualiza la función `get_client` para devolver el `client_number`
5. ✅ Elimina políticas RLS conflictivas

## Archivos Actualizados en el Código

Estos archivos ya están actualizados en el repositorio para usar `client_number`:

- `src/pages/nexo_av/ClientsPage.tsx` - Muestra columna "Nº Cliente"
- `src/pages/nexo_av/ClientDetailPage.tsx` - Muestra el número en el detalle
- `src/integrations/supabase/types.ts` - Tipos TypeScript actualizados
- `src/pages/nexo_av/components/ClientQuotesTab.tsx` - Refactorizado
- `src/pages/nexo_av/components/QuotePDFViewer.tsx` - PDF actualizado

## Si el Error Persiste

Si después de ejecutar la migración el error persiste:

1. **Verifica que la migración se ejecutó sin errores** en el SQL Editor
2. **Limpia la caché del navegador** (Ctrl+Shift+Delete)
3. **Recarga con caché limpia** (Ctrl+F5)
4. **Verifica la consola del navegador** para nuevos errores

## Contacto

Si tienes problemas ejecutando la migración o el error persiste, revisa:
- Los logs del SQL Editor en Supabase
- La consola del navegador (F12) para errores específicos
- Que estés conectado al proyecto correcto de Supabase
