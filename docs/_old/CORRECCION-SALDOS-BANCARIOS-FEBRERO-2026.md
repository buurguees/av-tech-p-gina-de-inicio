# Corrección de Saldos Bancarios - Febrero 2026

**Fecha:** 2 de febrero de 2026  
**Estado:** PENDIENTE DE EJECUTAR MANUALMENTE

---

## Problema Detectado

Los saldos bancarios en el sistema contable no coinciden con los saldos reales:

| Banco | Saldo Sistema | Saldo Real | Diferencia |
|-------|---------------|------------|------------|
| SABADELL (572001) | 9.170,14 € | 6.347,22 € | -2.822,92 € |
| CAIXABANK (572002) | -1.840,78 € | 0,00 € | +1.840,78 € |
| REVOLUT (572003) | 3.570,87 € | 801,38 € | -2.769,49 € |

---

## Causas del Descuadre

1. **Ajustes iniciales cruzados:** Los ajustes de Revolut y CaixaBank tienen las cuentas intercambiadas
2. **Traspaso incorrecto:** Se registró Sabadell→Revolut de 1000€ cuando debía ser otro importe
3. **Falta traspaso:** Sabadell→CaixaBank del 09/01/2026 (3.305,87€) no registrado
4. **Nóminas en banco incorrecto:** Las nóminas salen de 572002 (CaixaBank) pero deberían salir de 572003 (Revolut)
5. **Pagos de impuestos no registrados:**
   - Modelo 111 (20/01/2026): 477,40€
   - Impuesto 1 (23/01/2026): 272,29€
   - Impuesto 2 (23/01/2026): 107,79€
   - Modelo 303 (30/01/2026): 1.165,11€
   - Tarjeta crédito (01/02/2026): 1.405,76€

---

## SQL para Ejecutar en Supabase Dashboard

**IMPORTANTE:** Ejecutar en Supabase Dashboard → SQL Editor (https://supabase.com/dashboard/project/takvthfatlcjsqgssnta/sql/new)

### Paso 1: Intercambiar cuentas cruzadas en ajustes

```sql
-- Los ajustes AS-2026-3360 y AS-2026-3363 tienen las cuentas cruzadas
-- 3360 dice "REVOLUT" pero usa 572002 (CaixaBank) → debe ser 572003
-- 3363 dice "CAIXABANK" pero usa 572003 (Revolut) → debe ser 572002

-- Paso 1a: Mover 3360 a cuenta temporal
UPDATE accounting.journal_entry_lines
SET account_code = '572999'
WHERE journal_entry_id = (SELECT id FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3360')
  AND account_code = '572002';

-- Paso 1b: Mover 3363 de 572003 a 572002
UPDATE accounting.journal_entry_lines
SET account_code = '572002'
WHERE journal_entry_id = (SELECT id FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3363')
  AND account_code = '572003';

-- Paso 1c: Mover 3360 de temporal a 572003
UPDATE accounting.journal_entry_lines
SET account_code = '572003'
WHERE journal_entry_id = (SELECT id FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3360')
  AND account_code = '572999';
```

### Paso 2: Eliminar traspaso incorrecto

```sql
DELETE FROM accounting.journal_entry_lines 
WHERE journal_entry_id = (SELECT id FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3453');

DELETE FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3453';
```

### Paso 3: Mover nóminas de CaixaBank a Revolut

```sql
UPDATE accounting.journal_entry_lines
SET account_code = '572003'
WHERE journal_entry_id IN (
  SELECT id FROM accounting.journal_entries WHERE entry_number IN ('AS-2026-3447', 'AS-2026-3450')
)
AND account_code = '572002';
```

### Paso 4: Crear traspaso Sabadell→CaixaBank (09/01/2026)

```sql
INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked, created_at
) VALUES (
  'AS-2026-3700', '2026-01-09', 'BANK_TRANSFER', 
  'Traspaso SABADELL NEGOCIOS → CAIXABANK BUSINESS', 'BANK_TRANSFER', false, now()
);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '572002', 'DEBIT', 3305.87, 'Traspaso entrante desde Sabadell'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3700';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '572001', 'CREDIT', 3305.87, 'Traspaso saliente a CaixaBank'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3700';
```

### Paso 5: Crear traspaso Sabadell→Revolut (27/01/2026) - 3700€ para nóminas

```sql
INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked, created_at
) VALUES (
  'AS-2026-3701', '2026-01-27', 'BANK_TRANSFER', 
  'Traspaso SABADELL NEGOCIOS → REVOLUT BUSINESS', 'BANK_TRANSFER', false, now()
);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '572003', 'DEBIT', 3700.00, 'Traspaso entrante desde Sabadell para nóminas'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3701';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '572001', 'CREDIT', 3700.00, 'Traspaso saliente a Revolut'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3701';
```

### Paso 6: Registrar ganancia tipo cambio USD/EUR en Revolut

```sql
INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, description, is_active)
VALUES ('769000', 'Diferencias positivas de cambio', 'REVENUE', 'Ganancias por tipo de cambio de divisas', true)
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked, created_at
) VALUES (
  'AS-2026-3702', '2026-01-31', 'ADJUSTMENT', 
  'Ganancia por tipo de cambio USD/EUR en Revolut', 'BANK_ADJUSTMENT', false, now()
);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '572003', 'DEBIT', 1.38, 'Ganancia por tipo de cambio en Revolut'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3702';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '769000', 'CREDIT', 1.38, 'Diferencias positivas de cambio'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3702';
```

### Paso 7: Registrar pagos de impuestos

```sql
-- Crear cuentas necesarias
INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, description, is_active)
VALUES ('470000', 'Hacienda Pública deudora', 'ASSET', 'IVA a compensar y otros créditos fiscales', true)
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, description, is_active)
VALUES ('521000', 'Deudas a corto plazo - Tarjeta de crédito', 'LIABILITY', 'Saldo de tarjeta de crédito pendiente de pago', true)
ON CONFLICT (account_code) DO NOTHING;

-- Pago Modelo 111 (20/01/2026) - 477.40€
INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked
) VALUES ('AS-2026-3703', '2026-01-20', 'PAYMENT', 'Pago Modelo 111 - IRPF 4T 2025', 'TAX_PAYMENT', false);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '475100', 'DEBIT', 477.40, 'Liquidación IRPF retenido 4T 2025'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3703';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '572002', 'CREDIT', 477.40, 'Pago Modelo 111 desde CaixaBank'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3703';

-- Pago impuesto 1 (23/01/2026) - 272.29€
INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked
) VALUES ('AS-2026-3704', '2026-01-23', 'PAYMENT', 'Pago impuesto - Liquidación fiscal 4T 2025', 'TAX_PAYMENT', false);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '470000', 'DEBIT', 272.29, 'Liquidación impuesto 4T 2025'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3704';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '572002', 'CREDIT', 272.29, 'Pago impuesto desde CaixaBank'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3704';

-- Pago impuesto 2 (23/01/2026) - 107.79€
INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked
) VALUES ('AS-2026-3705', '2026-01-23', 'PAYMENT', 'Pago impuesto - Liquidación fiscal adicional 4T 2025', 'TAX_PAYMENT', false);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '470000', 'DEBIT', 107.79, 'Liquidación impuesto adicional 4T 2025'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3705';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '572002', 'CREDIT', 107.79, 'Pago impuesto desde CaixaBank'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3705';

-- Pago Modelo 303 (30/01/2026) - 1165.11€
INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked
) VALUES ('AS-2026-3706', '2026-01-30', 'PAYMENT', 'Pago Modelo 303 - IVA 4T 2025', 'TAX_PAYMENT', false);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '477000', 'DEBIT', 1165.11, 'Liquidación IVA repercutido 4T 2025'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3706';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '572002', 'CREDIT', 1165.11, 'Pago Modelo 303 desde CaixaBank'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3706';

-- Pago tarjeta de crédito (01/02/2026) - 1405.76€
INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked
) VALUES ('AS-2026-3707', '2026-02-01', 'PAYMENT', 'Pago mensualidad tarjeta de crédito CaixaBank', 'CREDIT_CARD_PAYMENT', false);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '521000', 'DEBIT', 1405.76, 'Liquidación tarjeta de crédito'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3707';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '572002', 'CREDIT', 1405.76, 'Pago tarjeta desde CaixaBank'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3707';
```

### Paso 8: Ajustar saldos iniciales

```sql
-- Eliminar ajustes incorrectos
DELETE FROM accounting.journal_entry_lines 
WHERE journal_entry_id = (SELECT id FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3357');
DELETE FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3357';

DELETE FROM accounting.journal_entry_lines 
WHERE journal_entry_id = (SELECT id FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3360');
DELETE FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3360';

DELETE FROM accounting.journal_entry_lines 
WHERE journal_entry_id = (SELECT id FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3363');
DELETE FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3363';

-- Nuevo ajuste inicial Sabadell (8615.80€ para que quede en 6347.22€)
INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked
) VALUES ('AS-2026-3710', '2026-01-01', 'ADJUSTMENT', 'Saldo inicial SABADELL NEGOCIOS 2026', 'BANK_ADJUSTMENT', false);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '572001', 'DEBIT', 8615.80, 'Saldo inicial Sabadell 2026'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3710';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '129000', 'CREDIT', 8615.80, 'Contrapartida ajuste saldo inicial'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3710';

-- Nuevo ajuste inicial CaixaBank (132.48€)
INSERT INTO accounting.journal_entries (
  entry_number, entry_date, entry_type, description, reference_type, is_locked
) VALUES ('AS-2026-3711', '2026-01-01', 'ADJUSTMENT', 'Saldo inicial CAIXABANK BUSINESS 2026', 'BANK_ADJUSTMENT', false);

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 1, '572002', 'DEBIT', 132.48, 'Saldo inicial CaixaBank 2026'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3711';

INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, debit_credit, amount, description)
SELECT id, 2, '129000', 'CREDIT', 132.48, 'Contrapartida ajuste saldo inicial'
FROM accounting.journal_entries WHERE entry_number = 'AS-2026-3711';
```

### Paso 9: Verificar saldos finales

```sql
SELECT 
  jel.account_code,
  coa.account_name,
  SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE -jel.amount END) as balance
FROM accounting.journal_entry_lines jel
JOIN accounting.chart_of_accounts coa ON coa.account_code = jel.account_code
WHERE jel.account_code LIKE '572%'
GROUP BY jel.account_code, coa.account_name
ORDER BY jel.account_code;
```

**Resultado esperado:**
| Cuenta | Banco | Saldo |
|--------|-------|-------|
| 572001 | Sabadell | 6.347,22 € |
| 572002 | CaixaBank | 0,00 € |
| 572003 | Revolut | 801,38 € |

---

## Notas

- Las compras y ventas adicionales que el usuario mencione deben registrarse posteriormente
- Este SQL ajusta los saldos a los valores reales proporcionados por el usuario
- Si hay más pagos no registrados en Sabadell, deberán ajustarse los valores
