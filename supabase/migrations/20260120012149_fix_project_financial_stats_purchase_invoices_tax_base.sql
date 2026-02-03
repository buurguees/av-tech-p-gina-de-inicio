-- ============================================
-- FIX get_project_financial_stats TO USE tax_base FOR PURCHASE INVOICES
-- ============================================
-- This migration fixes the function to:
-- 1. Use tax_base (not subtotal) for purchase invoices
-- 2. Include ALL purchase invoices (not just APPROVED/PAID) except CANCELLED
-- 3. Ensure margin calculation: Issued Invoices - Purchase Invoices - Expenses

-- Update RPC: Get Project Financial Stats
CREATE OR REPLACE FUNCTION projects.get_project_financial_stats(p_project_id UUID)
RETURNS TABLE (
  total_budget NUMERIC,
  total_invoiced NUMERIC,
  total_expenses NUMERIC,
  margin NUMERIC,
  margin_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = projects, quotes, sales, public
AS $$
DECLARE
  v_budget NUMERIC := 0;
  v_invoiced NUMERIC := 0;
  v_expenses NUMERIC := 0;
  v_purchase_invoices NUMERIC := 0;
  v_project_expenses NUMERIC := 0;
  v_margin NUMERIC := 0;
BEGIN
  -- Budget: Sum of APPROVED quotes subtotals for this project (from quotes.quotes)
  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_budget
  FROM quotes.quotes
  WHERE project_id = p_project_id
    AND status = 'APPROVED';

  -- Invoiced: Sum of invoices subtotals (include DRAFT, ISSUED, SENT, PAID, PARTIAL, OVERDUE)
  -- Excluir solo CANCELLED - incluir también DRAFT (Borrador) como solicitó el usuario
  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_invoiced
  FROM sales.invoices
  WHERE project_id = p_project_id
    AND status != 'CANCELLED';

  -- Expenses: Sum of project expenses (amount is already without taxes)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_project_expenses
  FROM projects.expenses
  WHERE project_id = p_project_id;

  -- Purchase Invoices: Sum of purchase invoices tax_base (exclude CANCELLED)
  -- IMPORTANTE: Usar tax_base (no subtotal) para facturas de compra
  SELECT COALESCE(SUM(tax_base), 0)
  INTO v_purchase_invoices
  FROM sales.purchase_invoices
  WHERE project_id = p_project_id
    AND status != 'CANCELLED';

  -- Total expenses = Purchase Invoices + Project Expenses
  v_expenses := v_purchase_invoices + v_project_expenses;

  -- Margin = Issued Invoices - Purchase Invoices - Expenses
  v_margin := v_invoiced - v_expenses;
  
  -- Calculate margin percentage: (margin / invoiced) * 100
  -- Only calculate if there's invoiced amount
  RETURN QUERY SELECT 
    v_budget, 
    v_invoiced, 
    v_expenses, 
    v_margin,
    CASE WHEN v_invoiced > 0 THEN (v_margin / v_invoiced) * 100 ELSE 0 END;
END;
$$;

-- Also update the public wrapper
CREATE OR REPLACE FUNCTION public.get_project_financial_stats(p_project_id UUID)
RETURNS TABLE (
  total_budget NUMERIC,
  total_invoiced NUMERIC,
  total_expenses NUMERIC,
  margin NUMERIC,
  margin_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM projects.get_project_financial_stats(p_project_id);
END;
$$;
