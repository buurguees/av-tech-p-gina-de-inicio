# Flujo Completo: Presupuesto → Factura → Pago → Proyecto Cerrado

**Fecha de Documentación:** 2026-01-22  
**Versión:** 1.0

---

## Índice

1. [Creación del Presupuesto](#1-creación-del-presupuesto)
2. [Emisión del Presupuesto](#2-emisión-del-presupuesto)
3. [Aprobación del Presupuesto](#3-aprobación-del-presupuesto)
4. [Creación de Factura desde Presupuesto](#4-creación-de-factura-desde-presupuesto)
5. [Emisión de la Factura](#5-emisión-de-la-factura)
6. [Bloqueo de la Factura](#6-bloqueo-de-la-factura)
7. [Generación del Número Definitivo](#7-generación-del-número-definitivo)
8. [Actualización del Estado del Proyecto](#8-actualización-del-estado-del-proyecto)
9. [Generación del Asiento Contable](#9-generación-del-asiento-contable)
10. [Registro de Impuestos a Deber](#10-registro-de-impuestos-a-deber)
11. [Registro de Pago](#11-registro-de-pago)
12. [Asiento Contable del Pago](#12-asiento-contable-del-pago)
13. [Registro en Libro de Transacciones](#13-registro-en-libro-de-transacciones)
14. [Cierre del Proyecto](#14-cierre-del-proyecto)

---

## 1. Creación del Presupuesto

### Frontend

**Ubicación:** `src/pages/nexo_av/desktop/pages/NewQuotePage.tsx`

**Proceso:**
1. El usuario completa el formulario de presupuesto:
   - Selecciona cliente (`selectedClientId`)
   - Selecciona proyecto opcional (`selectedProjectId`)
   - Agrega líneas de presupuesto con concepto, cantidad, precio unitario, tasa de impuestos, descuento
   - Define fecha de validez (`validUntil`)

2. Al guardar, se ejecuta:
```typescript
const { data: quoteData, error: quoteError } = await supabase.rpc(
  "create_quote_with_number",
  {
    p_client_id: selectedClientId,
    p_project_name: selectedProject?.project_name || null,
    p_valid_until: calculatedValidUntil,
    p_project_id: selectedProjectId || null,
  }
);
```

3. Se agregan las líneas del presupuesto:
```typescript
for (const line of lines) {
  await supabase.rpc("add_quote_line", {
    p_quote_id: quoteId,
    p_concept: line.concept,
    p_description: line.description || null,
    p_quantity: line.quantity,
    p_unit_price: line.unit_price,
    p_tax_rate: line.tax_rate,
    p_discount_percent: line.discount_percent,
    p_line_order: i,
  });
}
```

### Base de Datos

**Schema:** `quotes`

**Tabla:** `quotes.quotes`

**RPC:** `public.create_quote_with_number(p_client_id UUID, p_project_name TEXT, p_valid_until DATE, p_project_id UUID)`

**Proceso:**
1. Obtiene el usuario autorizado: `v_user_id := internal.get_authorized_user_id(auth.uid())`
2. Genera número de presupuesto: `v_quote_number := quotes.get_next_quote_number()` (formato: `P-YY-XXXXXX`)
3. Inserta el presupuesto:
```sql
INSERT INTO quotes.quotes (
  quote_number,
  client_id,
  project_id,
  project_name,
  valid_until,
  created_by,
  status
) VALUES (
  v_quote_number,
  p_client_id,
  p_project_id,
  p_project_name,
  COALESCE(p_valid_until, CURRENT_DATE + INTERVAL '30 days'),
  v_user_id,
  'DRAFT'
)
```

**Columnas principales:**
- `id` (UUID, PK)
- `quote_number` (TEXT, UNIQUE) - Formato: `P-YY-XXXXXX`
- `client_id` (UUID, FK → `crm.clients.id`)
- `project_id` (UUID, FK → `projects.projects.id`)
- `status` (`quotes.quote_status` ENUM: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `EXPIRED`, `INVOICED`)
- `subtotal` (NUMERIC(12,2))
- `tax_amount` (NUMERIC(12,2))
- `total` (NUMERIC(12,2))
- `created_by` (UUID, FK → `internal.authorized_users.id`)

**Tabla:** `quotes.quote_lines`

**RPC:** `public.add_quote_line(...)`

**Columnas principales:**
- `id` (UUID, PK)
- `quote_id` (UUID, FK → `quotes.quotes.id`)
- `concept` (TEXT)
- `description` (TEXT, nullable)
- `quantity` (NUMERIC)
- `unit_price` (NUMERIC)
- `tax_rate` (NUMERIC, default: 21.00)
- `discount_percent` (NUMERIC, nullable)
- `subtotal` (NUMERIC, GENERATED)
- `tax_amount` (NUMERIC, GENERATED)
- `total` (NUMERIC, GENERATED)

**Trigger:** `trigger_recalculate_quote_totals` - Recalcula automáticamente `subtotal`, `tax_amount` y `total` del presupuesto cuando se modifican las líneas.

---

## 2. Emisión del Presupuesto

### Frontend

**Ubicación:** `src/pages/nexo_av/desktop/pages/QuoteDetailPage.tsx`

**Proceso:**
1. El usuario hace clic en "Enviar" en un presupuesto en estado `DRAFT`
2. Se ejecuta:
```typescript
const { error } = await supabase.rpc("update_quote", {
  p_quote_id: quoteId!,
  p_status: "SENT",
});
```

### Base de Datos

**RPC:** `public.update_quote(p_quote_id UUID, p_status quotes.quote_status)`

**Proceso:**
1. Valida que el presupuesto no esté bloqueado (`is_locked = false`)
2. Si el estado cambia de `DRAFT` a `SENT`:
   - Genera número definitivo si aún no existe (formato: `P-YY-XXXXXX`)
   - Establece `is_locked = true`
   - Establece `locked_at = now()`
3. Actualiza el estado:
```sql
UPDATE quotes.quotes
SET 
  status = p_status,
  is_locked = CASE WHEN p_status = 'SENT' THEN true ELSE is_locked END,
  locked_at = CASE WHEN p_status = 'SENT' THEN now() ELSE locked_at END,
  updated_at = now()
WHERE id = p_quote_id
```

**Resultado:**
- Estado: `SENT`
- `is_locked`: `true`
- `locked_at`: Fecha/hora actual
- Presupuesto bloqueado (no editable)

---

## 3. Aprobación del Presupuesto

### Frontend

**Ubicación:** `src/pages/nexo_av/desktop/pages/QuoteDetailPage.tsx`

**Proceso:**
1. El usuario cambia el estado del presupuesto a `APPROVED` mediante el selector de estado
2. Se ejecuta:
```typescript
const { error } = await supabase.rpc("update_quote", {
  p_quote_id: quoteId!,
  p_status: "APPROVED",
});
```

### Base de Datos

**RPC:** `public.update_quote(p_quote_id UUID, p_status quotes.quote_status)`

**Proceso:**
1. Valida que el presupuesto esté en estado `SENT`
2. Actualiza el estado:
```sql
UPDATE quotes.quotes
SET 
  status = 'APPROVED',
  updated_at = now()
WHERE id = p_quote_id
```

**Resultado:**
- Estado: `APPROVED`
- Presupuesto listo para facturar

---

## 4. Creación de Factura desde Presupuesto

### Frontend

**Ubicación:** `src/pages/nexo_av/desktop/pages/QuoteDetailPage.tsx`

**Proceso:**
1. El usuario hace clic en "Facturar" en un presupuesto en estado `APPROVED`
2. Se ejecuta:
```typescript
const { data, error } = await supabase.rpc("create_invoice_from_quote", {
  p_quote_id: quoteId!,
});
```

3. Se navega a la página de detalle de la factura creada:
```typescript
navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
```

### Base de Datos

**RPC:** `public.create_invoice_from_quote(p_quote_id UUID)`

**Proceso:**
1. Valida que el presupuesto exista y esté en estado `APPROVED`:
```sql
SELECT q.id, q.client_id, q.project_id, q.project_name, q.status, q.notes
INTO v_quote
FROM quotes.quotes q
WHERE q.id = p_quote_id;

IF v_quote.status != 'APPROVED' THEN
  RAISE EXCEPTION 'Only approved quotes can be invoiced';
END IF;
```

2. Genera número preliminar de factura: `v_invoice_number := public.get_next_invoice_number()` (formato: `F-BORR-XXXX`)

3. Crea la factura:
```sql
INSERT INTO sales.invoices (
  invoice_number,
  source_quote_id,
  client_id,
  project_id,
  project_name,
  status,
  issue_date,
  due_date,
  notes,
  created_by
) VALUES (
  v_invoice_number,
  p_quote_id,
  v_quote.client_id,
  v_quote.project_id,
  v_quote.project_name,
  'DRAFT',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  v_quote.notes,
  internal.get_authorized_user_id(auth.uid())
)
RETURNING id INTO v_invoice_id;
```

4. Copia las líneas del presupuesto a la factura:
```sql
INSERT INTO sales.invoice_lines (
  invoice_id,
  concept,
  description,
  quantity,
  unit_price,
  tax_rate,
  discount_percent,
  line_order
)
SELECT 
  v_invoice_id,
  concept,
  description,
  quantity,
  unit_price,
  tax_rate,
  discount_percent,
  line_order
FROM quotes.quote_lines
WHERE quote_id = p_quote_id
ORDER BY line_order;
```

5. Actualiza el estado del presupuesto a `INVOICED`:
```sql
UPDATE quotes.quotes 
SET status = 'INVOICED', updated_at = now() 
WHERE id = p_quote_id;
```

**Schema:** `sales`

**Tabla:** `sales.invoices`

**Columnas principales:**
- `id` (UUID, PK)
- `invoice_number` (TEXT, nullable, UNIQUE) - Número definitivo o preliminar
- `preliminary_number` (TEXT, nullable) - Número borrador (ej: `F-BORR-0009`)
- `source_quote_id` (UUID, FK → `quotes.quotes.id`)
- `client_id` (UUID, FK → `crm.clients.id`)
- `project_id` (UUID, FK → `projects.projects.id`)
- `status` (TEXT) - Valores: `DRAFT`, `ISSUED`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`
- `issue_date` (DATE)
- `due_date` (DATE)
- `subtotal` (NUMERIC(12,2))
- `tax_amount` (NUMERIC(12,2))
- `total` (NUMERIC(12,2))
- `is_locked` (BOOLEAN)
- `locked_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK → `internal.authorized_users.id`)

**Tabla:** `sales.invoice_lines`

**Columnas principales:**
- `id` (UUID, PK)
- `invoice_id` (UUID, FK → `sales.invoices.id`)
- `concept` (TEXT)
- `quantity` (NUMERIC)
- `unit_price` (NUMERIC)
- `tax_rate` (NUMERIC)
- `discount_percent` (NUMERIC)
- `line_order` (INTEGER)

**Trigger:** `trigger_recalculate_invoice_totals` - Recalcula automáticamente `subtotal`, `tax_amount` y `total` de la factura cuando se modifican las líneas.

**Resultado:**
- Factura creada en estado `DRAFT`
- Presupuesto actualizado a estado `INVOICED`
- Líneas copiadas del presupuesto a la factura

---

## 5. Emisión de la Factura

### Frontend

**Ubicación:** `src/pages/nexo_av/desktop/pages/InvoiceDetailPage.tsx`

**Proceso:**
1. El usuario hace clic en "Enviar" en una factura en estado `DRAFT`
2. Se ejecuta:
```typescript
const { error } = await supabase.rpc("finance_issue_invoice", {
  p_invoice_id: invoiceId!,
});
```

### Base de Datos

**RPC:** `public.finance_issue_invoice(p_invoice_id UUID)`

**Proceso:**
1. Valida usuario autorizado:
```sql
v_user_id := internal.get_authorized_user_id(auth.uid());
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Usuario no autorizado';
END IF;
```

2. Valida que la factura esté en estado `DRAFT`:
```sql
IF v_invoice.status != 'DRAFT' THEN
  RAISE EXCEPTION 'Solo se pueden emitir facturas en estado DRAFT';
END IF;
```

3. Genera número definitivo si no existe o es preliminar:
```sql
IF v_current_invoice_number IS NULL OR v_current_invoice_number = '' OR v_current_invoice_number LIKE '%BORR%' THEN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  INSERT INTO audit.sequence_counters (prefix, year, current_number, last_generated_at)
  VALUES ('INV', v_year, 1, now())
  ON CONFLICT (prefix, year) DO UPDATE
  SET current_number = audit.sequence_counters.current_number + 1,
      last_generated_at = now()
  RETURNING current_number INTO v_next_number;
  
  -- Formato: F-YY-XXXXXX (ej: F-26-000001)
  v_invoice_number := 'F-' || RIGHT(v_year::TEXT, 2) || '-' || LPAD(v_next_number::TEXT, 6, '0');
END IF;
```

4. Actualiza la factura:
```sql
UPDATE sales.invoices inv
SET
  preliminary_number = CASE 
    WHEN inv.preliminary_number IS NULL THEN v_current_invoice_number 
    ELSE inv.preliminary_number 
  END,
  invoice_number = v_invoice_number,
  issue_date = CURRENT_DATE,
  due_date = CURRENT_DATE + INTERVAL '30 days',
  status = 'ISSUED',
  is_locked = true,
  locked_at = now(),
  updated_at = now()
WHERE inv.id = p_invoice_id;
```

**Schema:** `audit`

**Tabla:** `audit.sequence_counters`

**Columnas:**
- `prefix` (TEXT, PK) - Prefijo del contador (ej: `'INV'`)
- `year` (INTEGER, PK) - Año del contador
- `current_number` (INTEGER) - Número actual
- `last_generated_at` (TIMESTAMPTZ)

**Resultado:**
- Estado: `ISSUED`
- `invoice_number`: Número definitivo (formato: `F-YY-XXXXXX`)
- `preliminary_number`: Número borrador guardado (si existía)
- `issue_date`: Fecha actual
- `due_date`: 30 días después de la emisión
- `is_locked`: `true`
- `locked_at`: Fecha/hora actual

---

## 6. Bloqueo de la Factura

### Frontend

**Ubicación:** `src/pages/nexo_av/desktop/pages/InvoiceDetailPage.tsx`

**Proceso:**
- El bloqueo es automático al emitir la factura
- El botón "Editar" desaparece cuando `is_locked = true`
- Se muestra el componente `LockedIndicator` cuando la factura está bloqueada

### Base de Datos

**Trigger:** `trigger_lock_invoice_on_issue`

**Función:** `sales.lock_invoice_on_issue()`

**Proceso:**
- Se ejecuta automáticamente cuando `status` cambia a `ISSUED`
- Establece `is_locked = true` y `locked_at = now()`

**Validaciones:**
- La RPC `finance_update_invoice` valida `is_locked = true` y rechaza ediciones (excepto cambiar a `CANCELLED`)
- El frontend `EditInvoicePage.tsx` verifica `is_locked` antes de permitir edición

**Resultado:**
- Factura bloqueada (no editable)
- Solo se pueden registrar pagos, descargar PDF, enviar factura o cancelar

---

## 7. Generación del Número Definitivo

### Base de Datos

**Proceso:**
- Se genera en el paso 5 (Emisión de la Factura)
- Formato: `F-YY-XXXXXX` (ej: `F-26-000001`)
- Se guarda en `sales.invoices.invoice_number`
- El número preliminar se guarda en `sales.invoices.preliminary_number`

**Schema:** `audit`

**Tabla:** `audit.sequence_counters`

**Proceso de generación:**
```sql
INSERT INTO audit.sequence_counters (prefix, year, current_number, last_generated_at)
VALUES ('INV', v_year, 1, now())
ON CONFLICT (prefix, year) DO UPDATE
SET current_number = audit.sequence_counters.current_number + 1,
    last_generated_at = now()
RETURNING current_number INTO v_next_number;
```

**Resultado:**
- Número definitivo único y secuencial
- Número preliminar preservado para referencia

---

## 8. Actualización del Estado del Proyecto

### Frontend

**Nota:** Actualmente no hay un proceso automático que actualice el estado del proyecto a "Facturado" cuando se emite una factura. Esto podría implementarse mediante un trigger o una función RPC adicional.

### Base de Datos

**Schema:** `projects`

**Tabla:** `projects.projects`

**Estados disponibles:**
- `PLANNED`
- `IN_PROGRESS`
- `PAUSED`
- `COMPLETED`
- `CANCELLED`

**Nota:** No existe un estado "FACTURADO" en el enum `project_status`. El estado del proyecto se actualizaría manualmente o mediante un trigger cuando se emite una factura asociada al proyecto.

**Posible implementación:**
```sql
-- Trigger que actualiza el estado del proyecto cuando se emite una factura
CREATE OR REPLACE FUNCTION projects.update_project_on_invoice_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'ISSUED' AND OLD.status != 'ISSUED' AND NEW.project_id IS NOT NULL THEN
    -- Actualizar proyecto a estado COMPLETED o mantener estado actual
    UPDATE projects.projects
    SET updated_at = now()
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;
```

---

## 9. Generación del Asiento Contable

### Frontend

**Proceso:**
- Automático al emitir la factura
- No requiere acción del usuario

### Base de Datos

**Trigger:** `trigger_auto_create_invoice_sale_entry`

**Función:** `accounting.auto_create_invoice_sale_entry()`

**Proceso:**
1. Se ejecuta automáticamente cuando `sales.invoices.status` cambia a `ISSUED`
2. Verifica que no exista ya un asiento para esta factura:
```sql
SELECT id INTO v_entry_id
FROM accounting.journal_entries
WHERE reference_id = NEW.id
  AND reference_type = 'invoice'
  AND entry_type = 'INVOICE_SALE';
```

3. Si no existe, llama a `accounting.create_invoice_sale_entry()`:
```sql
PERFORM accounting.create_invoice_sale_entry(
  p_invoice_id := NEW.id,
  p_entry_date := NEW.issue_date
);
```

**RPC:** `accounting.create_invoice_sale_entry(p_invoice_id UUID, p_entry_date DATE)`

**Proceso:**
1. Obtiene datos de la factura y cliente
2. Valida importes (no negativos, coherencia)
3. Determina `created_by` (valida que exista en `authorized_users`)
4. Genera número de asiento: `v_entry_number := accounting.get_next_entry_number()`
5. Crea el asiento contable:

**Schema:** `accounting`

**Tabla:** `accounting.journal_entries`

**Columnas principales:**
- `id` (UUID, PK)
- `entry_number` (TEXT, UNIQUE)
- `entry_date` (DATE)
- `entry_type` (ENUM) - Valor: `INVOICE_SALE`
- `description` (TEXT) - Ej: "Factura emitida: F-26-000001 - Nombre Cliente"
- `reference_id` (UUID) - ID de la factura
- `reference_type` (TEXT) - Valor: `'invoice'`
- `project_id` (UUID, FK → `projects.projects.id`)
- `created_by` (UUID, FK → `internal.authorized_users.id`)
- `is_locked` (BOOLEAN)
- `locked_at` (TIMESTAMPTZ)

**Tabla:** `accounting.journal_entry_lines`

**Líneas del asiento:**

**Línea 1 - DEBE: Clientes (430000)**
```sql
INSERT INTO accounting.journal_entry_lines (
  journal_entry_id,
  account_code,
  debit_credit,
  amount,
  third_party_id,
  third_party_type,
  description,
  line_order
) VALUES (
  v_entry_id,
  '430000',  -- Clientes
  'DEBIT',
  v_total_amount,  -- Total de la factura (ej: 181.50)
  v_client.id,
  'CLIENT',
  'Factura ' || v_invoice.invoice_number,
  1
);
```

**Línea 2 - HABER: Ventas (700000)**
```sql
INSERT INTO accounting.journal_entry_lines (
  journal_entry_id,
  account_code,
  debit_credit,
  amount,
  third_party_id,
  third_party_type,
  description,
  line_order
) VALUES (
  v_entry_id,
  '700000',  -- Ventas
  'CREDIT',
  v_base_amount,  -- Base imponible (ej: 150.00)
  v_client.id,
  'CLIENT',
  'Base imponible factura ' || v_invoice.invoice_number,
  2
);
```

**Línea 3 - HABER: IVA repercutido (477000)**
```sql
IF v_vat_amount > 0 THEN
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    '477000',  -- IVA repercutido
    'CREDIT',
    v_vat_amount,  -- Importe de impuestos (ej: 31.50)
    'IVA repercutido factura ' || v_invoice.invoice_number,
    3
  );
END IF;
```

**Columnas principales:**
- `id` (UUID, PK)
- `journal_entry_id` (UUID, FK → `accounting.journal_entries.id`)
- `account_code` (TEXT) - Código de cuenta contable
- `debit_credit` (TEXT) - `'DEBIT'` o `'CREDIT'`
- `amount` (NUMERIC(12,2)) - Importe
- `third_party_id` (UUID, nullable) - ID del tercero (cliente, proveedor, etc.)
- `third_party_type` (ENUM, nullable) - Tipo: `'CLIENT'`, `'SUPPLIER'`, etc.
- `description` (TEXT, nullable)
- `line_order` (INTEGER)

**Resultado:**
- Asiento contable creado automáticamente
- DEBE = HABER (balanceado)
- DEBE: Clientes (430000) = Total factura
- HABER: Ventas (700000) = Base imponible
- HABER: IVA repercutido (477000) = Impuestos

---

## 10. Registro de Impuestos a Deber

### Base de Datos

**Proceso:**
- El IVA repercutido (477000) se registra en el HABER del asiento contable (Línea 3)
- Este importe representa el IVA que la empresa debe a Hacienda
- Se acumula en la cuenta 477000 hasta la liquidación trimestral

**Cuenta Contable:** `477000 - IVA repercutido`

**Características:**
- Es una cuenta de PASIVO (HABER)
- Se incrementa cada vez que se emite una factura con IVA
- Se liquida trimestralmente mediante la función `accounting.create_vat_settlement_entry()`

**Ejemplo:**
- Factura: 181.50 € (150.00 + 31.50 IVA)
- En el asiento contable:
  - DEBE: Clientes (430000) = 181.50 €
  - HABER: Ventas (700000) = 150.00 €
  - HABER: IVA repercutido (477000) = 31.50 €

**Resultado:**
- IVA repercutido registrado en cuenta 477000
- Listo para liquidación trimestral

---

## 11. Registro de Pago

### Frontend

**Ubicación:** `src/pages/nexo_av/desktop/components/invoices/RegisterPaymentDialog.tsx`

**Proceso:**
1. El usuario hace clic en "Registrar Pago" en una factura emitida
2. Completa el formulario:
   - Importe (`amount`)
   - Fecha de pago (`paymentDate`)
   - Método de pago (`paymentMethod`) - `TRANSFER`, `CASH`, `CHECK`, etc.
   - Referencia bancaria (`bankReference`) - Opcional
   - Notas (`notes`) - Opcional
   - Cuenta bancaria (`bankAccountId`) - Opcional

3. Se ejecuta:
```typescript
const { error } = await supabase.rpc("finance_register_payment", {
  p_invoice_id: invoiceId,
  p_amount: numAmount,
  p_payment_date: format(paymentDate, "yyyy-MM-dd"),
  p_payment_method: paymentMethod,
  p_bank_reference: bankReference || null,
  p_notes: notes || null,
  p_company_bank_account_id: bankAccountId === "NONE" ? null : bankAccountId
});
```

### Base de Datos

**RPC:** `public.finance_register_payment(p_invoice_id UUID, p_amount NUMERIC, p_payment_date DATE, p_payment_method TEXT, p_bank_reference TEXT, p_notes TEXT, p_company_bank_account_id TEXT)`

**Proceso:**
1. Valida usuario autorizado
2. Valida que `amount > 0`
3. Valida que la factura esté en estado `ISSUED`, `PARTIAL` o `OVERDUE`
4. Calcula total actual de pagos:
```sql
SELECT COALESCE(SUM(amount), 0)
INTO v_current_total_paid
FROM sales.invoice_payments
WHERE invoice_id = p_invoice_id
  AND is_confirmed = true;
```

5. Valida que no exceda el total:
```sql
IF (v_current_total_paid + p_amount) > (COALESCE(v_invoice.total, 0) + 0.01) THEN
  RAISE EXCEPTION 'El importe del pago excede el saldo pendiente de la factura';
END IF;
```

6. Inserta el pago:
```sql
INSERT INTO sales.invoice_payments (
  invoice_id,
  amount,
  payment_date,
  payment_method,
  bank_reference,
  notes,
  registered_by,
  company_bank_account_id
)
VALUES (
  p_invoice_id,
  p_amount,
  p_payment_date,
  p_payment_method,
  p_bank_reference,
  p_notes,
  v_user_id,
  p_company_bank_account_id
)
RETURNING id INTO v_payment_id;
```

**Schema:** `sales`

**Tabla:** `sales.invoice_payments`

**Columnas principales:**
- `id` (UUID, PK)
- `invoice_id` (UUID, FK → `sales.invoices.id`)
- `amount` (NUMERIC(12,2))
- `payment_date` (DATE)
- `payment_method` (TEXT) - `TRANSFER`, `CASH`, `CHECK`, etc.
- `bank_reference` (TEXT, nullable)
- `notes` (TEXT, nullable)
- `registered_by` (UUID, FK → `internal.authorized_users.id`)
- `company_bank_account_id` (TEXT, nullable)
- `is_confirmed` (BOOLEAN, default: `true`)
- `created_at` (TIMESTAMPTZ)

**Trigger:** `trigger_recalculate_paid_amount`

**Función:** `sales.recalculate_invoice_paid_amount()`

**Proceso:**
- Se ejecuta automáticamente cuando se inserta, actualiza o elimina un pago
- Recalcula `paid_amount` en `sales.invoices`:
```sql
UPDATE sales.invoices
SET paid_amount = (
  SELECT COALESCE(SUM(amount), 0)
  FROM sales.invoice_payments
  WHERE invoice_id = NEW.invoice_id
    AND is_confirmed = true
)
WHERE id = NEW.invoice_id;
```

**Trigger:** `trigger_update_invoice_status_from_payments`

**Función:** `sales.update_invoice_status_from_payments()`

**Proceso:**
- Actualiza automáticamente el estado de la factura:
  - `PAID`: cuando `paid_amount >= total`
  - `PARTIAL`: cuando `paid_amount > 0 AND paid_amount < total`
  - `OVERDUE`: cuando `due_date < CURRENT_DATE AND status = 'ISSUED' AND paid_amount < total`

**Resultado:**
- Pago registrado en `sales.invoice_payments`
- `paid_amount` actualizado automáticamente en la factura
- Estado de la factura actualizado automáticamente

---

## 12. Asiento Contable del Pago

### Frontend

**Proceso:**
- Automático al registrar el pago
- No requiere acción del usuario

### Base de Datos

**RPC:** `accounting.create_invoice_payment_entry(p_payment_id UUID, p_entry_date DATE)`

**Proceso:**
1. Se llama automáticamente desde `finance_register_payment` si la factura es del 2026 o posterior:
```sql
IF v_invoice.issue_date >= '2026-01-01' AND p_payment_date >= '2026-01-01' THEN
  v_entry_id := accounting.create_invoice_payment_entry(
    v_payment_id,
    p_payment_date
  );
END IF;
```

2. Obtiene datos del pago y factura
3. Verifica que no exista ya un asiento para este pago
4. Genera número de asiento: `v_entry_number := accounting.get_next_entry_number()`
5. Crea el asiento contable:

**Tabla:** `accounting.journal_entries`

**Columnas:**
- `entry_type`: `'PAYMENT_RECEIVED'`
- `reference_id`: ID del pago
- `reference_type`: `'payment_received'`
- `description`: "Cobro factura: F-26-000001"

**Tabla:** `accounting.journal_entry_lines`

**Línea 1 - DEBE: Banco (572000)**
```sql
INSERT INTO accounting.journal_entry_lines (
  journal_entry_id,
  account_code,
  debit_credit,
  amount,
  description,
  line_order
) VALUES (
  v_entry_id,
  '572000',  -- Banco
  'DEBIT',
  v_payment.amount,  -- Importe del pago (ej: 181.50)
  'Cobro ' || v_payment.invoice_number,
  1
);
```

**Línea 2 - HABER: Clientes (430000)**
```sql
INSERT INTO accounting.journal_entry_lines (
  journal_entry_id,
  account_code,
  debit_credit,
  amount,
  description,
  line_order,
  third_party_id,
  third_party_type
) VALUES (
  v_entry_id,
  '430000',  -- Clientes
  'CREDIT',
  v_payment.amount,  -- Importe del pago (ej: 181.50)
  'Cobro factura ' || v_payment.invoice_number,
  2,
  v_payment.client_id,
  'CLIENT'
);
```

**Resultado:**
- Asiento contable creado automáticamente
- DEBE = HABER (balanceado)
- DEBE: Banco (572000) = Importe del pago
- HABER: Clientes (430000) = Importe del pago (reduce la deuda del cliente)

---

## 13. Registro en Libro de Transacciones

### Base de Datos

**Proceso:**
- El "Libro de Transacciones" es la tabla `accounting.journal_entries`
- Cada asiento contable es una transacción registrada
- Se puede consultar mediante vistas o funciones RPC

**Tabla:** `accounting.journal_entries`

**Vista del Libro de Transacciones:**
- Cada fila representa una transacción (asiento contable)
- Campos relevantes:
  - `entry_number`: Número de asiento
  - `entry_date`: Fecha de la transacción
  - `entry_type`: Tipo de transacción (`INVOICE_SALE`, `PAYMENT_RECEIVED`, etc.)
  - `description`: Descripción de la transacción
  - `reference_id`: ID del documento origen (factura, pago, etc.)
  - `reference_type`: Tipo de documento (`'invoice'`, `'payment_received'`, etc.)

**Ejemplo de consulta:**
```sql
SELECT 
  je.entry_number,
  je.entry_date,
  je.entry_type,
  je.description,
  jel.account_code,
  jel.debit_credit,
  jel.amount,
  jel.description as line_description
FROM accounting.journal_entries je
JOIN accounting.journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.reference_type = 'invoice'
  AND je.reference_id = 'invoice_id_aqui'
ORDER BY je.entry_date, je.entry_number, jel.line_order;
```

**Resultado:**
- Todas las transacciones registradas en el libro contable
- Trazabilidad completa de facturas y pagos

---

## 14. Cierre del Proyecto

### Frontend

**Ubicación:** `src/pages/nexo_av/desktop/pages/ProjectDetailPage.tsx` (si existe)

**Proceso:**
1. El usuario cambia el estado del proyecto a `COMPLETED`
2. Se ejecuta una función RPC para actualizar el estado del proyecto

### Base de Datos

**Schema:** `projects`

**Tabla:** `projects.projects`

**Estados disponibles:**
- `PLANNED`
- `IN_PROGRESS`
- `PAUSED`
- `COMPLETED` ← Estado de cierre
- `CANCELLED`

**RPC:** (Función para actualizar estado del proyecto)

**Proceso:**
```sql
UPDATE projects.projects
SET 
  status = 'COMPLETED',
  updated_at = now()
WHERE id = p_project_id;
```

**Validaciones recomendadas:**
- Verificar que todas las facturas del proyecto estén pagadas
- Verificar que no haya facturas pendientes
- Opcional: Verificar que todas las tareas estén completadas

**Resultado:**
- Proyecto cerrado (`status = 'COMPLETED'`)
- Proyecto finalizado y archivado

---

## Resumen del Flujo Completo

### Estados y Transiciones

1. **Presupuesto:**
   - `DRAFT` → `SENT` → `APPROVED` → `INVOICED`

2. **Factura:**
   - `DRAFT` → `ISSUED` → `PARTIAL` → `PAID`

3. **Proyecto:**
   - `PLANNED` → `IN_PROGRESS` → `COMPLETED`

### Asientos Contables Generados

1. **Al emitir factura:**
   - DEBE: Clientes (430000) = Total factura
   - HABER: Ventas (700000) = Base imponible
   - HABER: IVA repercutido (477000) = Impuestos

2. **Al registrar pago:**
   - DEBE: Banco (572000) = Importe del pago
   - HABER: Clientes (430000) = Importe del pago

### Tablas Principales Involucradas

1. `quotes.quotes` - Presupuestos
2. `quotes.quote_lines` - Líneas de presupuesto
3. `sales.invoices` - Facturas
4. `sales.invoice_lines` - Líneas de factura
5. `sales.invoice_payments` - Pagos
6. `accounting.journal_entries` - Asientos contables (Libro de Transacciones)
7. `accounting.journal_entry_lines` - Líneas de asientos contables
8. `projects.projects` - Proyectos
9. `audit.sequence_counters` - Contadores de secuencia

### Triggers Automáticos

1. `trigger_recalculate_quote_totals` - Recalcula totales del presupuesto
2. `trigger_recalculate_invoice_totals` - Recalcula totales de la factura
3. `trigger_lock_invoice_on_issue` - Bloquea factura al emitir
4. `trigger_auto_create_invoice_sale_entry` - Crea asiento contable al emitir factura
5. `trigger_recalculate_paid_amount` - Recalcula importe pagado
6. `trigger_update_invoice_status_from_payments` - Actualiza estado según pagos

---

## Notas Importantes

1. **Validaciones de Seguridad:**
   - Todas las RPCs validan usuario autorizado mediante `internal.get_authorized_user_id(auth.uid())`
   - Validación de estados en cada transición
   - Validación de importes (no negativos, coherencia)

2. **Integridad de Datos:**
   - Foreign keys en todas las relaciones
   - Triggers para mantener consistencia
   - Validación de balance en asientos contables

3. **Trazabilidad:**
   - `created_by` en todas las tablas principales
   - `created_at` y `updated_at` para auditoría
   - `reference_id` y `reference_type` en asientos contables

4. **Números de Documentos:**
   - Presupuestos: `P-YY-XXXXXX` (ej: `P-26-000001`)
   - Facturas preliminares: `F-BORR-XXXX` (ej: `F-BORR-0009`)
   - Facturas definitivas: `F-YY-XXXXXX` (ej: `F-26-000001`)

---

**Fin del Documento**
