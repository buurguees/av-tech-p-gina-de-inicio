-- ============================================
-- UPDATE PROJECT FINANCIAL STATS TO USE SUBTOTALS
-- ============================================
-- This migration updates get_project_financial_stats to use subtotals
-- instead of totals (excluding taxes from calculations)

-- Update RPC: Get Project Financial Stats to use subtotals
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
  v_margin NUMERIC := 0;
BEGIN
  -- Budget: Sum of APPROVED quotes subtotals for this project (from quotes.quotes)
  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_budget
  FROM quotes.quotes
  WHERE project_id = p_project_id
    AND status = 'APPROVED';

  -- Invoiced: Sum of non-cancelled invoices subtotals (from sales.invoices)
  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_invoiced
  FROM sales.invoices
  WHERE project_id = p_project_id
    AND status != 'CANCELLED';

  -- Expenses: Sum of project expenses (amount is already without taxes)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_expenses
  FROM projects.expenses
  WHERE project_id = p_project_id;

  v_margin := v_invoiced - v_expenses;
  
  RETURN QUERY SELECT 
    v_budget, 
    v_invoiced, 
    v_expenses, 
    v_margin,
    CASE WHEN v_invoiced > 0 THEN (v_margin / v_invoiced) * 100 ELSE 0 END;
END;
$$;
