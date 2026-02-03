-- ============================================
-- PROJECT FINANCIALS & EXPENSES (FIXED)
-- ============================================

-- 1. Create projects.expenses table
CREATE TABLE IF NOT EXISTS projects.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('MATERIAL', 'LABOR', 'TRANSPORT', 'OTHER')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_amount_positive CHECK (amount >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON projects.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON projects.expenses(date);

-- RLS
ALTER TABLE projects.expenses ENABLE ROW LEVEL SECURITY;

-- Note: projects.can_access_project should exist in the projects schema
CREATE POLICY "Users can view expenses of accessible projects"
  ON projects.expenses FOR SELECT
  USING (projects.can_access_project(project_id));

CREATE POLICY "Users can manage expenses of accessible projects"
  ON projects.expenses FOR ALL
  USING (projects.can_access_project(project_id))
  WITH CHECK (projects.can_access_project(project_id));


-- 2. RPC: Get Project Financial Stats
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
  -- Budget: Sum of APPROVED quotes for this project (from quotes.quotes)
  SELECT COALESCE(SUM(total), 0)
  INTO v_budget
  FROM quotes.quotes
  WHERE project_id = p_project_id
    AND status = 'APPROVED';

  -- Invoiced: Sum of non-cancelled invoices (from sales.invoices)
  SELECT COALESCE(SUM(total), 0)
  INTO v_invoiced
  FROM sales.invoices
  WHERE project_id = p_project_id
    AND status != 'CANCELLED';

  -- Expenses: Sum of project expenses
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


-- 3. RPC: Get Portfolio Summary
CREATE OR REPLACE FUNCTION projects.get_projects_portfolio_summary()
RETURNS TABLE (
  total_active_projects BIGINT,
  total_pipeline_value NUMERIC,
  avg_project_ticket NUMERIC,
  max_project_value NUMERIC,
  min_project_value NUMERIC,
  total_invoiced_ytd NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = projects, quotes, sales, public
AS $$
DECLARE
  v_active_count BIGINT;
  v_pipeline NUMERIC;
  v_avg_ticket NUMERIC;
  v_max_val NUMERIC;
  v_min_val NUMERIC;
  v_invoiced_ytd NUMERIC;
BEGIN
  -- Active Projects
  SELECT COUNT(*) INTO v_active_count
  FROM projects.projects
  WHERE status IN ('IN_PROGRESS', 'PLANNED');

  -- Pipeline Value: Sum of Budget of Active Projects
  SELECT COALESCE(SUM(q.total), 0)
  INTO v_pipeline
  FROM quotes.quotes q
  JOIN projects.projects p ON p.id = q.project_id
  WHERE p.status IN ('IN_PROGRESS', 'PLANNED')
    AND q.status = 'APPROVED';
    
  -- Avg/Max/Min Ticket (Based on Total Invoiced per Project)
  WITH project_totals AS (
    SELECT 
      project_id, 
      SUM(total) as project_total 
    FROM sales.invoices 
    WHERE status != 'CANCELLED' AND project_id IS NOT NULL
    GROUP BY project_id
  )
  SELECT 
    AVG(project_total),
    MAX(project_total),
    MIN(project_total)
  INTO 
    v_avg_ticket,
    v_max_val,
    v_min_val
  FROM project_totals;

  -- Total Invoiced YTD
  SELECT COALESCE(SUM(total), 0)
  INTO v_invoiced_ytd
  FROM sales.invoices
  WHERE status != 'CANCELLED'
    AND issue_date >= DATE_TRUNC('year', CURRENT_DATE);

  RETURN QUERY SELECT 
    v_active_count,
    v_pipeline,
    COALESCE(v_avg_ticket, 0),
    COALESCE(v_max_val, 0),
    COALESCE(v_min_val, 0),
    v_invoiced_ytd;
END;
$$;
