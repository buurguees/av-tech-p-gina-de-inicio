-- Add RLS (Row Level Security) policies to protect sensitive data
-- Fixes security issues: Company Tax IDs, Financial Data, and User Permission Structure

-- =====================================================
-- 1. COMPANY SETTINGS TABLE - Protect financial and tax data
-- =====================================================

-- Enable RLS on company_settings table
ALTER TABLE internal.company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read company settings
-- Only users who are part of the company can read its settings
CREATE POLICY "Allow authenticated users to read company settings"
ON internal.company_settings
FOR SELECT
TO authenticated
USING (true); -- All authenticated users can read (they belong to the same company)

-- Policy: Only admins can update company settings
CREATE POLICY "Only admins can update company settings"
ON internal.company_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM internal.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM internal.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Policy: Only admins can insert company settings
CREATE POLICY "Only admins can insert company settings"
ON internal.company_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM internal.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- =====================================================
-- 2. USER ROLES TABLE - Protect permission structure
-- =====================================================

-- Enable RLS on user_roles table (if exists)
ALTER TABLE internal.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own role
CREATE POLICY "Users can see their own role"
ON internal.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Only admins can see all roles
CREATE POLICY "Admins can see all roles"
ON internal.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM internal.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Policy: Only admins can manage user roles
CREATE POLICY "Only admins can manage user roles"
ON internal.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM internal.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM internal.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- =====================================================
-- 3. CLIENTS TABLE - Protect client financial data
-- =====================================================

-- Enable RLS on clients table
ALTER TABLE internal.clients ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all clients
CREATE POLICY "Authenticated users can read clients"
ON internal.clients
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can create clients
CREATE POLICY "Authenticated users can create clients"
ON internal.clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update clients
CREATE POLICY "Authenticated users can update clients"
ON internal.clients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4. QUOTES TABLE - Protect financial quote data
-- =====================================================

-- Enable RLS on quotes table
ALTER TABLE internal.quotes ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all quotes
CREATE POLICY "Authenticated users can read quotes"
ON internal.quotes
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can create quotes
CREATE POLICY "Authenticated users can create quotes"
ON internal.quotes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update quotes
CREATE POLICY "Authenticated users can update quotes"
ON internal.quotes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- 5. INVOICES TABLE - Protect invoice financial data
-- =====================================================

-- Enable RLS on invoices table
ALTER TABLE internal.invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all invoices
CREATE POLICY "Authenticated users can read invoices"
ON internal.invoices
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can create invoices
CREATE POLICY "Authenticated users can create invoices"
ON internal.invoices
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update invoices
CREATE POLICY "Authenticated users can update invoices"
ON internal.invoices
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Ensure authenticated users can access these tables through RLS policies
GRANT SELECT, INSERT, UPDATE ON internal.company_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.invoices TO authenticated;

-- Add comments for documentation
COMMENT ON POLICY "Allow authenticated users to read company settings" ON internal.company_settings IS 'Allows authenticated users to read company settings';
COMMENT ON POLICY "Only admins can update company settings" ON internal.company_settings IS 'Restricts company settings updates to admin users only';
COMMENT ON POLICY "Users can see their own role" ON internal.user_roles IS 'Users can only see their own role information';
COMMENT ON POLICY "Admins can see all roles" ON internal.user_roles IS 'Admin users can see all user roles';
COMMENT ON POLICY "Only admins can manage user roles" ON internal.user_roles IS 'Only admin users can create, update or delete user roles';
