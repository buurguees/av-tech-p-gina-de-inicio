# Reasignar pagos de compras de Revolut a CaixaBank

**Fecha:** 2 de febrero de 2026  
**Contexto:** Los pagos de compras deben ir a CaixaBank. Revolut solo para nóminas.

---

## Pasos para ejecutar la corrección

### 1. Aplicar la migración

```bash
npx supabase db push
```

O ejecutar manualmente el SQL de `supabase/migrations/20260202120000_fix_purchase_payments_bank_to_caixabank.sql` en el SQL Editor de Supabase.

### 2. Obtener los IDs de las cuentas bancarias

En **Ajustes > Preferencias**, revisa las cuentas bancarias configuradas. Cada una tiene un ID (UUID).

Alternativamente, ejecuta en el SQL Editor:

```sql
SELECT bank_accounts FROM get_company_preferences() LIMIT 1;
```

De la respuesta JSON, identifica:
- El `id` de la cuenta **Revolut** (bank contiene "Revolut")
- El `id` de la cuenta **CaixaBank** (bank contiene "Caixa" o "CaixaBank")

### 3. Ejecutar la corrección

En el SQL Editor de Supabase, ejecuta:

```sql
SELECT fix_purchase_payments_bank_to_caixabank(
  'ID_REVOLUT_AQUI',   -- Reemplazar con el UUID de Revolut
  'ID_CAIXABANK_AQUI'  -- Reemplazar con el UUID de CaixaBank
);
```

El resultado indica cuántos pagos se actualizaron.

---

## Nota

El banco se selecciona en cada pago según el que se haya usado realmente. No hay banco predefinido.
