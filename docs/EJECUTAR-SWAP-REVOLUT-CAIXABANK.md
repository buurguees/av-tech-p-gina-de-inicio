# Intercambiar códigos contables Revolut ↔ CaixaBank

**Fecha:** 2 de febrero de 2026  
**Contexto:** Revolut y CaixaBank tienen la información cruzada (id o código contable).

---

## Qué hace la migración

La migración `20260202140000_swap_revolut_caixabank_accounting_codes.sql`:

1. **Identifica** Revolut y CaixaBank en `internal.company_bank_accounts` (por `bank_name` o `notes`)
2. **Intercambia** los `accounting_code` entre ambos en la tabla
3. **Actualiza** los asientos ya registrados en `accounting.journal_entry_lines` para que los movimientos aparezcan en el banco correcto

---

## Cómo aplicar

```bash
npx supabase db push
```

O ejecutar manualmente el SQL en Supabase Dashboard → SQL Editor.

---

## Si la migración falla

Si `internal.company_bank_accounts` usa otro nombre de columna (ej. `bank` en vez de `bank_name`), ejecuta manualmente en el SQL Editor:

```sql
-- Ver estructura actual
SELECT id, accounting_code, bank_name, bank, name, notes 
FROM internal.company_bank_accounts 
WHERE is_active = TRUE;

-- Intercambio manual (reemplaza REVOLUT_CODE y CAIXA_CODE con los valores reales)
-- Ejemplo: si Revolut tiene 572001 y CaixaBank tiene 572003 (cruzados)
UPDATE internal.company_bank_accounts SET accounting_code = '572003' WHERE id = 'ID_REVOLUT';
UPDATE internal.company_bank_accounts SET accounting_code = '572001' WHERE id = 'ID_CAIXA';

UPDATE accounting.journal_entry_lines 
SET account_code = CASE 
  WHEN account_code = '572001' THEN '572003' 
  WHEN account_code = '572003' THEN '572001' 
END 
WHERE account_code IN ('572001', '572003');
```

---

## Verificación

Tras aplicar:

1. **Contabilidad → Resumen** → pestaña Revolut: debe mostrar el positivo del traspaso Sabadell→Revolut
2. **Pagos de compras**: deben estar asignados a CaixaBank (no Revolut)
3. **Nóminas**: deben estar en Revolut
