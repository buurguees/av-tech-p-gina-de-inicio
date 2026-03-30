-- Área 6: Índices FK faltantes + adicionales identificados en auditoría 2026-03-26
--
-- Tarea 6.1 — Auditoría de índices existentes:
--   10 de 12 índices target ya existían con nombres distintos.
--   2 ausentes (FK críticos):
--     - purchase_invoices(supplier_id): sin índice
--     - events(user_id, created_at): solo índices individuales, faltaba compuesto
--
-- Tarea 6.5 — Índices adicionales recomendados por patrones WHERE en RPCs:
--   - invoices(due_date): filtros de facturas vencidas / AR overdue
--   - purchase_invoices(due_date): filtros de compras vencidas / AP
--   - purchase_invoices(expense_category): filtro en Gastos (TRANSPORT/FUEL/DIET...)
--   - crm.clients(created_at): métricas de leads nuevos en dashboard
--
-- Nota: CONCURRENTLY no es válido dentro de transacciones implícitas del CLI de migración.
-- Se usa IF NOT EXISTS para garantizar idempotencia.

-- === ÍNDICES FK FALTANTES (TAREA 6.1) ===

-- FK: sales.purchase_invoices → internal.suppliers (historial de compras por proveedor)
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_id
  ON sales.purchase_invoices(supplier_id);

-- Compuesto: auditoría por usuario en rango de fechas
CREATE INDEX IF NOT EXISTS idx_audit_events_user_created
  ON audit.events(user_id, created_at);

-- === ÍNDICES ADICIONALES RECOMENDADOS (TAREA 6.5) ===

-- Facturas vencidas / pendientes de cobro (AR overdue)
CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON sales.invoices(due_date);

-- Compras vencidas / pendientes de pago (AP)
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_due_date
  ON sales.purchase_invoices(due_date);

-- Filtrado por categoría de gasto en módulo Gastos
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_expense_category
  ON sales.purchase_invoices(expense_category);

-- Nuevos leads por período en dashboard CRM
CREATE INDEX IF NOT EXISTS idx_clients_created_at
  ON crm.clients(created_at);
