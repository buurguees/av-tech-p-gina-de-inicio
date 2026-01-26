# Ejecutar Migración: Sistema de Pagos y Facturas

## Archivo de Migración
`supabase/migrations/20260115141628_complete_invoices_payments_system.sql`

## Instrucciones para Ejecutar

### Opción 1: Supabase Dashboard (Recomendado)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: **takvthfatlcjsqgssnta**
3. Ve a **SQL Editor** (icono `</>` en el menú lateral)
4. Click en **+ New query**
5. Abre el archivo `supabase/migrations/20260115141628_complete_invoices_payments_system.sql`
6. Copia TODO el contenido (926 líneas)
7. Pégalo en el SQL Editor
8. Click en **Run** o presiona `Ctrl+Enter`
9. Verifica que aparezca "Success" ✅

### Opción 2: Supabase CLI (Si está instalado)

```bash
cd "c:\Users\AlexBurgues\AV TECH ESDEVENIMENTS SL\Marketing - Documentos\V2_WEB\av-tech-p-gina-de-inicio"
supabase db push
```

## Verificación Post-Migración

Después de ejecutar la migración, verifica en el SQL Editor:

```sql
-- 1. Verificar que la tabla invoice_payments existe
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'sales' 
AND table_name = 'invoice_payments'
ORDER BY ordinal_position;

-- 2. Verificar columnas nuevas en invoices
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'sales' 
AND table_name = 'invoices'
AND column_name IN ('paid_amount', 'pending_amount', 'is_locked', 'discount_amount', 'internal_notes', 'payment_terms', 'locked_at')
ORDER BY column_name;

-- 3. Verificar que las funciones RPC existen
SELECT proname, proargnames
FROM pg_proc 
WHERE proname IN ('finance_get_invoice', 'finance_register_payment', 'finance_get_invoice_payments', 'finance_delete_payment')
AND pronamespace = 'public'::regnamespace;

-- 4. Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'sales'
AND trigger_name LIKE '%invoice%payment%'
ORDER BY trigger_name;

-- 5. Verificar vistas
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'sales'
AND table_name LIKE '%payment%'
ORDER BY table_name;
```

## Qué Hace Esta Migración

- ✅ Añade 7 columnas nuevas a `sales.invoices`
- ✅ Crea tabla `sales.invoice_payments` completa
- ✅ Crea 3 funciones de triggers automáticos
- ✅ Crea 8 RPCs de finance funcionales
- ✅ Crea 3 vistas para reporting
- ✅ Configura RLS con 4 políticas
- ✅ Prepara estructura para facturas de compra

## Importante

- La migración está envuelta en `BEGIN; ... COMMIT;` para ser transaccional
- Si algo falla, se hace ROLLBACK automático
- No afecta datos existentes (solo añade columnas y crea nuevas tablas)
