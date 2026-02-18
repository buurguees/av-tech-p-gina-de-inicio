# Mejoras de Arquitectura Pendientes

Este documento recoge las mejoras recomendadas para la arquitectura contable-fiscal de Nexo AV.

## ✅ Validación de la Arquitectura Actual

La arquitectura actual está **muy bien planteada** y sigue patrones de ERPs profesionales:
- Separación por dominios funcionales (schemas PostgreSQL)
- Contabilidad desacoplada (journal_entries / lines)
- Flujo: Documentos → Pagos → Asientos
- RRHH separado entre socios y empleados
- Bancos como 572.xxx, no como "movimientos sueltos"

## 🔧 Ajustes Recomendados (Por Implementar)

### 1. Separar Estados de Documento vs Estados de Pago/Cobro

**Problema actual:** Los estados mezclan lógica administrativa y financiera.

**Solución:** Sistema dual de estados.

```sql
-- Facturas de Venta
document_status: DRAFT → PENDING_ISSUE → ISSUED → CANCELLED → RECTIFIED
collection_status: PENDING → OVERDUE → PARTIAL → COLLECTED

-- Facturas de Compra  
document_status: SCANNED → DRAFT → PENDING_VALIDATION → APPROVED → BLOCKED
payment_status: PENDING → OVERDUE → PARTIAL → PAID
```

**Beneficio:** Evita lógica confusa con pagos parciales + vencidos.

**Estado:** ✅ Implementado en `src/constants/salesInvoiceStatuses.ts` y `src/constants/purchaseInvoiceStatuses.ts`

---

### 2. Añadir Reversión Contable (Entry Reversal)

**Problema:** Los asientos automáticos no se pueden corregir limpiamente.

**Solución:** Crear función `reverse_journal_entry(entry_id)`.

```sql
-- Genera asiento espejo con signo invertido
CREATE OR REPLACE FUNCTION accounting.reverse_journal_entry(p_entry_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_entry_id UUID;
  v_original RECORD;
BEGIN
  -- 1. Obtener asiento original
  SELECT * INTO v_original FROM accounting.journal_entries WHERE id = p_entry_id;
  
  -- 2. Crear asiento de reversión
  INSERT INTO accounting.journal_entries (
    entry_type, description, reference_type, reference_id, reversed_entry_id
  ) VALUES (
    'REVERSAL',
    'Reversión de ' || v_original.entry_number,
    v_original.reference_type,
    v_original.reference_id,
    p_entry_id
  ) RETURNING id INTO v_new_entry_id;
  
  -- 3. Copiar líneas con signo invertido
  INSERT INTO accounting.journal_entry_lines (
    entry_id, account_code, description, debit_credit, amount
  )
  SELECT 
    v_new_entry_id,
    account_code,
    description,
    CASE WHEN debit_credit = 'DEBIT' THEN 'CREDIT' ELSE 'DEBIT' END,
    amount
  FROM accounting.journal_entry_lines 
  WHERE entry_id = p_entry_id;
  
  -- 4. Marcar original como revertido
  UPDATE accounting.journal_entries SET is_reversed = true WHERE id = p_entry_id;
  
  RETURN v_new_entry_id;
END;
$$ LANGUAGE plpgsql;
```

**Regla de oro:** Nunca borrar asientos, solo revertir.

**Estado:** ⏳ Pendiente

---

### 3. Tipar source_type con ENUM

**Problema:** `journal_entries.source_type` usa TEXT libre → propenso a errores.

**Solución:** Crear ENUM tipado.

```sql
CREATE TYPE accounting.journal_source_type AS ENUM (
  'INVOICE_SALE',           -- Emisión factura venta
  'INVOICE_SALE_COLLECTION',-- Cobro factura venta
  'INVOICE_PURCHASE',       -- Registro factura compra
  'INVOICE_PURCHASE_PAYMENT',-- Pago factura compra
  'PAYROLL_PARTNER',        -- Nómina socio (devengo)
  'PAYROLL_PARTNER_PAYMENT',-- Pago nómina socio
  'PAYROLL_EMPLOYEE',       -- Nómina empleado
  'TAX_SETTLEMENT_VAT',     -- Liquidación IVA (Modelo 303)
  'TAX_SETTLEMENT_IRPF',    -- Liquidación IRPF (Modelo 111)
  'TAX_SETTLEMENT_IS',      -- Provisión IS (Modelo 200)
  'BANK_TRANSFER',          -- Transferencia entre bancos
  'BANK_OPENING',           -- Apertura de cuenta
  'BANK_ADJUSTMENT',        -- Ajuste de conciliación
  'MANUAL'                  -- Asiento manual
);
```

**Estado:** ⏳ Pendiente

---

## 📊 Diagrama de Flujos Contables

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VENTAS (Clientes)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Presupuesto → Factura DRAFT → Emitir (ISSUED)                         │
│                                   │                                     │
│                                   ▼                                     │
│                    ┌──────────────────────────────┐                    │
│                    │ ASIENTO AUTOMÁTICO           │                    │
│                    │ DEBE 430 (Cliente)           │                    │
│                    │ HABER 700 (Ventas)           │                    │
│                    │ HABER 477 (IVA Repercutido)  │                    │
│                    └──────────────────────────────┘                    │
│                                   │                                     │
│                                   ▼                                     │
│                             Cobrar factura                              │
│                                   │                                     │
│                                   ▼                                     │
│                    ┌──────────────────────────────┐                    │
│                    │ ASIENTO AUTOMÁTICO           │                    │
│                    │ DEBE 572 (Banco)             │                    │
│                    │ HABER 430 (Cliente)          │                    │
│                    └──────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     COMPRAS (Proveedores/Técnicos)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Escanear PDF → Registrar → Aprobar (APPROVED)                         │
│                                   │                                     │
│                                   ▼                                     │
│                    ┌──────────────────────────────┐                    │
│                    │ ASIENTO AUTOMÁTICO           │                    │
│                    │ DEBE 600 (Compras)           │                    │
│                    │ DEBE 472 (IVA Soportado)     │                    │
│                    │ HABER 400/410 (Proveedor)    │                    │
│                    │ HABER 4751 (IRPF si técnico) │                    │
│                    └──────────────────────────────┘                    │
│                                   │                                     │
│                                   ▼                                     │
│                             Pagar factura                               │
│                                   │                                     │
│                                   ▼                                     │
│                    ┌──────────────────────────────┐                    │
│                    │ ASIENTO AUTOMÁTICO           │                    │
│                    │ DEBE 400/410 (Proveedor)     │                    │
│                    │ HABER 572 (Banco)            │                    │
│                    └──────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      RRHH - NÓMINAS DE SOCIOS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Crear nómina (DRAFT) → Confirmar (POSTED)                             │
│                                   │                                     │
│                                   ▼                                     │
│                    ┌──────────────────────────────┐                    │
│                    │ ASIENTO DEVENGO              │                    │
│                    │ DEBE 640 (Retribución socios)│                    │
│                    │ HABER 4751 (HP IRPF)         │                    │
│                    │ HABER 465 (Remun. pendientes)│                    │
│                    └──────────────────────────────┘                    │
│                                   │                                     │
│                                   ▼                                     │
│                              Pagar nómina                               │
│                                   │                                     │
│                                   ▼                                     │
│                    ┌──────────────────────────────┐                    │
│                    │ ASIENTO PAGO                 │                    │
│                    │ DEBE 465 (Remun. pendientes) │                    │
│                    │ HABER 572 (Banco)            │                    │
│                    └──────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        LIQUIDACIONES FISCALES                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  IVA (Modelo 303 trimestral)                                           │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ IVA a Ingresar = 477 (Repercutido) - 472 (Soportado)               │
│  │                                                   │                  │
│  │ ASIENTO PAGO:                                    │                  │
│  │ DEBE 477 (IVA Repercutido)                       │                  │
│  │ HABER 472 (IVA Soportado)                        │                  │
│  │ HABER 572 (Banco) [diferencia]                   │                  │
│  └──────────────────────────────────────────────────┘                  │
│                                                                         │
│  IRPF (Modelo 111 trimestral)                                          │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ IRPF a Ingresar = Suma 4751 del trimestre        │                  │
│  │                                                   │                  │
│  │ ASIENTO PAGO:                                    │                  │
│  │ DEBE 4751 (HP IRPF retenido)                     │                  │
│  │ HABER 572 (Banco)                                │                  │
│  └──────────────────────────────────────────────────┘                  │
│                                                                         │
│  IS (Modelo 200 anual)                                                  │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ BAI = 7xx (Ingresos) - 6xx (Gastos sin 630)     │                  │
│  │ Provisión = BAI × 25%                            │                  │
│  │                                                   │                  │
│  │ ASIENTO PROVISIÓN:                               │                  │
│  │ DEBE 6300 (IS ejercicio)                         │                  │
│  │ HABER 4752 (HP IS)                               │                  │
│  └──────────────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Plan de Implementación

| Prioridad | Mejora | Complejidad | Impacto |
|-----------|--------|-------------|---------|
| 🔴 Alta | Reversión contable | Media | Crítico para correcciones |
| 🟡 Media | ENUM source_type | Baja | Previene errores |
| 🟢 Baja | tax_provisions table | Media | Automatiza cierres |

---

**Última actualización:** 2026-01-26
