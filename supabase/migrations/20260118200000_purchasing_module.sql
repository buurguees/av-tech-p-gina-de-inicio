--
-- Módulo de Compras - Fase 1: Infraestructura de Base de Datos
--

-- 1. Esquema Internal: Asegurar técnicos y crear proveedores
CREATE TABLE IF NOT EXISTS internal.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_number TEXT UNIQUE NOT NULL,  -- SUP-YYYYMMDD-XXXX
  company_name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,  -- CIF/NIF
  contact_name TEXT,
  contact_phone TEXT,
  contact_phone_secondary TEXT,
  contact_email TEXT,
  billing_email TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'España',
  latitude NUMERIC,
  longitude NUMERIC,
  payment_terms TEXT,  -- "30 días", "Contado", etc.
  iban TEXT,
  notes TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar internal.technicians (si ya existe en purchasing, la movemos o recreamos)
-- Nota: En un entorno real haríamos un ALTER TABLE RENAME SCHEMA, pero aquí recreamos para consistencia.
CREATE TABLE IF NOT EXISTS internal.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_number TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT NOT NULL,
  type TEXT CHECK (type IN ('FREELANCE', 'COMPANY', 'EMPLOYEE')),
  contact_name TEXT,
  contact_phone TEXT,
  contact_phone_secondary TEXT,
  contact_email TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'España',
  iban TEXT,
  swift TEXT,
  payment_terms TEXT,
  daily_rate NUMERIC(10, 2),
  hourly_rate NUMERIC(10, 2),
  specialties TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Actualizar Tabla sales.purchase_invoices
DO $$
BEGIN
  -- Si ya existe la tabla de migraciones previas (temp_resto_ultimo.sql por ejemplo)
  -- solo añadimos las columnas necesarias si no existen.
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'sales' AND table_name = 'purchase_invoices') THEN
    CREATE TABLE sales.purchase_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number TEXT,
      project_id UUID REFERENCES projects.projects(id),
      status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'REGISTERED', 'PAID', 'PARTIAL', 'CANCELLED')),
      issue_date DATE DEFAULT CURRENT_DATE,
      due_date DATE,
      subtotal NUMERIC(12,2) DEFAULT 0,
      tax_amount NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0,
      paid_amount NUMERIC(12,2) DEFAULT 0,
      pending_amount NUMERIC(12,2) GENERATED ALWAYS AS (COALESCE(total, 0) - COALESCE(paid_amount, 0)) STORED,
      notes TEXT,
      internal_notes TEXT,
      created_by UUID REFERENCES internal.authorized_users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      is_locked BOOLEAN DEFAULT false,
      locked_at TIMESTAMPTZ
    );
  END IF;

  -- Añadir columnas de la Fase 1
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'supplier_id') THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN supplier_id UUID REFERENCES internal.suppliers(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'technician_id') THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN technician_id UUID REFERENCES internal.technicians(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'retention_percentage') THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN retention_percentage NUMERIC(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'retention_amount') THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN retention_amount NUMERIC(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'file_path') THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN file_path TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'file_name') THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN file_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'document_type') THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN document_type TEXT DEFAULT 'INVOICE' CHECK (document_type IN ('INVOICE', 'TICKET'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'expense_category') THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN expense_category TEXT;
  END IF;

  -- Constraint de unicidad
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unique_purchase_invoice_per_provider') THEN
    ALTER TABLE sales.purchase_invoices ADD CONSTRAINT unique_purchase_invoice_per_provider UNIQUE (invoice_number, supplier_id, technician_id);
  END IF;

  -- Constraint de tipo de proveedor
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_provider_type_requirement') THEN
    ALTER TABLE sales.purchase_invoices ADD CONSTRAINT check_provider_type_requirement 
    CHECK (
      (supplier_id IS NOT NULL AND technician_id IS NULL) OR
      (supplier_id IS NULL AND technician_id IS NOT NULL) OR
      (supplier_id IS NULL AND technician_id IS NULL AND document_type = 'TICKET')
    );
  END IF;
END $$;

-- 3. Tabla sales.purchase_invoice_lines
CREATE TABLE IF NOT EXISTS sales.purchase_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES sales.purchase_invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 21,  -- IVA
  tax_amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price * tax_rate / 100) STORED,
  total NUMERIC GENERATED ALWAYS AS (quantity * unit_price * (1 + tax_rate / 100)) STORED,
  product_id UUID,  -- Opcional: vincular a producto del catálogo
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Actualizar sales.purchase_invoice_payments
CREATE TABLE IF NOT EXISTS sales.purchase_invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES sales.purchase_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('TRANSFER', 'CASH', 'CARD', 'CHECK', 'OTHER')),
  bank_reference TEXT,
  notes TEXT,
  is_confirmed BOOLEAN DEFAULT true,
  registered_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sales' AND table_name = 'purchase_invoice_payments' AND column_name = 'company_bank_account_id') THEN
    ALTER TABLE sales.purchase_invoice_payments ADD COLUMN company_bank_account_id TEXT;
  END IF;
END $$;

-- 5. Bucket de Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'purchase-documents', 'purchase-documents', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'purchase-documents');
