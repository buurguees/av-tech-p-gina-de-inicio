# 🚨 INFORME DE PROBLEMAS EN PÁGINA DE CONTABILIDAD

**Fecha**: 27 de enero de 2026  
**Estado**: CRÍTICO - Datos incorrectos y cálculos erróneos

---

## 📊 INCONSISTENCIAS DETECTADAS

### 1. **INGRESOS - DESCUADRE**
- **Resumen muestra**: 7.939,24 € 
- **Facturas reales (subtotales 2026)**: 7.488,24 € (21 facturas con asiento contable)
- **Facturado total en página Facturas**: 9.990,54 €
- **PROBLEMA**: El resumen está contando facturas de 2025 o duplicando asientos

### 2. **GASTOS OPERATIVOS - ERROR GRAVE**
- **Resumen muestra**: 96,55 € (solo servicios profesionales)
- **Facturas de Compra reales**: 1.645,30 € (8 documentos)
- **PROBLEMA**: Solo está contando 2 facturas pequeñas, ignorando el resto

### 3. **LIBRO DE CAJA - DESCUADRE**
- **Cobros mostrados**: 14.529,42 €
- **Ingresos reales**: 7.488,24 €
- **PROBLEMA**: Está sumando ajustes bancarios (10.703,72 €) como ingresos

### 4. **LIBRO DIARIO - UI CONFUSA**
- Muestra 26 asientos, pero la primera pantalla solo muestra provisiones IS del 31/12/2026
- El usuario debe hacer scroll para ver los asientos reales del año
- Confunde porque parece que solo hay provisiones

---

## 🔍 ANÁLISIS DETALLADO

### ASIENTOS CONTABLES EN BASE DE DATOS (2026):
```
TIPO                  | CANTIDAD | FECHAS
---------------------|----------|------------------
INVOICE_SALE         | 7 reales | 02/01 - 26/01
INVOICE_PURCHASE     | 3 reales | 15/01 - 20/01  
PAYMENT_RECEIVED     | 4        | 01/01 - 23/01
PAYMENT_MADE         | 2        | 19/01 - 20/01
TAX_PROVISION        | 8 DUPL.  | 31/12/2026 ❌
ADJUSTMENT           | 3        | 26/01 (ajustes bancarios)
PAYMENT              | 2        | 04/01 - 19/01
```

**TOTAL**: 29 asientos reales + 8 provisiones IS duplicadas

### PROBLEMAS ESPECÍFICOS:

#### A) **PROVISIONES IS DUPLICADAS**
- Hay 8-10 provisiones IS idénticas con fecha 31/12/2026
- Todas por 1.847,92 € cada una
- **Total inflado**: 14.783,36 € (debería ser 1.847,92 €)
- Esto distorsiona todos los cálculos

#### B) **AJUSTES BANCARIOS CONTANDO COMO INGRESOS**
- Ajuste Sabadell: 5.432,85 €
- Ajuste CaixaBank: 2.570,87 €
- Ajuste Revolut: 2.700,00 €
- **Total**: 10.703,72 €
- Estos NO son ingresos, son ajustes de saldo inicial

#### C) **FACTURAS DE COMPRA SIN ASIENTO**
- 2 facturas de compra PAGADAS sin asiento contable:
  - PENDIENTE-936186: 66,55 € (16/01/2026) - PAGADA
  - PENDIENTE-325016: 25,00 € (04/01/2026) - PAGADA
- **Total sin contabilizar**: 75,66 €

---

## 📋 DATOS REALES (VERIFICADOS):

### FACTURAS DE VENTA 2026:
| Factura | Fecha | Estado | Subtotal | Asiento |
|---------|-------|--------|----------|---------|
| F-26-000007 | 26/01 | EMITIDA | 1.464,46 € | ✅ AS-2026-3351 |
| F-26-000005 | 23/01 | PAGADA | 423,34 € | ✅ AS-2026-3320 |
| F-26-000004 | 23/01 | EMITIDA | 150,00 € | ✅ AS-2026-3316 |
| F-26-000003 | 16/01 | EMITIDA | 120,00 € | ✅ AS-2026-3028 |
| F-26-000002 | 08/01 | PARCIAL | 4.896,79 € | ✅ AS-2026-3336 |
| F-26-000001 | 02/01 | EMITIDA | 284,65 € | ✅ AS-2026-3027 |
| **TOTAL** | | | **7.339,24 €** | |

### FACTURAS DE COMPRA 2026:
| Factura | Fecha | Estado | Subtotal | Asiento |
|---------|-------|--------|----------|---------|
| C-26-000005 | 22/01 | APROBADA | 83,45 € | ✅ |
| C-26-000006 | 22/01 | PENDIENTE | 423,50 € | ✅ |
| C-26-000001 | 20/01 | PAGADA | 7,93 € | ✅ |
| PENDIENTE-936186 | 16/01 | PAGADA | 66,55 € | ❌ SIN ASIENTO |
| PENDIENTE-963954 | 15/01 | REGISTRADA | 90,00 € | ✅ |
| PENDIENTE-325016 | 04/01 | PAGADA | 25,00 € | ❌ SIN ASIENTO |
| **TOTAL** | | | **696,43 €** | |

---

## ✅ SOLUCIONES NECESARIAS:

### 1. **ELIMINAR PROVISIONES IS DUPLICADAS** (URGENTE)
```sql
-- Mantener solo 1 provisión, eliminar las 7-9 duplicadas
-- Identificar y borrar asientos duplicados AS-2026-3358 a AS-2026-3367
```

### 2. **CORREGIR CÁLCULO DE INGRESOS**
- Excluir ajustes bancarios (account_code = 129000)
- Solo contar facturas de venta reales del período

### 3. **CORREGIR CÁLCULO DE GASTOS**
- Incluir TODAS las facturas de compra, no solo servicios profesionales
- Contar cuentas 600xxx, 623000, etc.

### 4. **GENERAR ASIENTOS FALTANTES**
- Factura PENDIENTE-936186 (66,55 €)
- Factura PENDIENTE-325016 (25,00 €)

### 5. **MEJORAR UI DEL LIBRO DIARIO**
- Ordenar por fecha ASC (no DESC) para ver cronológicamente
- Agrupar por mes
- Mostrar asientos reales primero, provisiones al final

### 6. **LIBRO DE CAJA - FILTRAR AJUSTES**
- NO contar ajustes bancarios iniciales como ingresos
- Solo movimientos reales de clientes/proveedores

---

## 🎯 CIFRAS CORRECTAS (ENERO 2026):

| Concepto | Importe Real |
|----------|-------------|
| **Ingresos** | 7.339,24 € |
| **Gastos Operativos** | 696,43 € |
| **BAI** | 6.642,81 € |
| **IS (25%)** | 1.660,70 € |
| **Resultado Neto** | 4.982,11 € |
| **Saldo Bancos** | 13.838,30 € ✅ |

---

## 🚨 ACCIONES INMEDIATAS:

1. ✅ **Limpiar provisiones IS duplicadas**
2. ✅ **Generar asientos faltantes de facturas de compra**
3. ✅ **Corregir función get_profit_loss para excluir ajustes**
4. ✅ **Actualizar cálculos del dashboard/resumen**
5. ✅ **Mejorar visualización del Libro Diario**

---

**Estado**: Pendiente de corrección  
**Prioridad**: CRÍTICA 🔴
