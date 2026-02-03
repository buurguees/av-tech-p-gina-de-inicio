-- ============================================
-- CATALOG V2: Documentación producto + preparación SharePoint/Excel
-- ============================================
-- product_documents: enlaces SharePoint, subida local, externos.
-- external_catalog_sources / external_catalog_sync_runs: para Excel en SharePoint (sin implementar sync).
-- ============================================

BEGIN;

-- 1. ENUMs para product_documents
DO $$ BEGIN
  CREATE TYPE catalog.document_provider AS ENUM ('sharepoint', 'upload', 'external');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE catalog.document_type AS ENUM ('datasheet', 'manual', 'certificate', 'image', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla product_documents
CREATE TABLE IF NOT EXISTS catalog.product_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  provider catalog.document_provider NOT NULL DEFAULT 'sharepoint',
  title TEXT NOT NULL,
  doc_type catalog.document_type NOT NULL DEFAULT 'other',
  sharepoint_item_id TEXT,
  sharepoint_drive_id TEXT,
  sharepoint_site_id TEXT,
  file_url TEXT,
  file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  metadata JSONB DEFAULT '{}',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_documents_product ON catalog.product_documents(product_id);
COMMENT ON TABLE catalog.product_documents IS 'Documentación por producto. SharePoint (IDs sin URL hasta sync), upload local o enlace externo.';

-- 3. Tabla external_catalog_sources (preparación Excel/SharePoint)
CREATE TABLE IF NOT EXISTS catalog.external_catalog_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'sharepoint' CHECK (provider IN ('sharepoint')),
  source_type TEXT NOT NULL DEFAULT 'excel' CHECK (source_type IN ('excel')),
  sharepoint_site_id TEXT,
  drive_id TEXT,
  item_id TEXT,
  sheet_name TEXT,
  range_name TEXT,
  column_mapping JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_hash TEXT,
  sync_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE catalog.external_catalog_sources IS 'Fuentes externas de catálogo (ej. Excel en SharePoint). Sync no implementado.';

-- 4. Tabla external_catalog_sync_runs
CREATE TABLE IF NOT EXISTS catalog.external_catalog_sync_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES catalog.external_catalog_sources(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('running', 'success', 'failed', 'cancelled')),
  stats JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_external_sync_runs_source ON catalog.external_catalog_sync_runs(source_id, started_at DESC);

-- 5. RLS
ALTER TABLE catalog.product_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view product_documents"
  ON catalog.product_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage product_documents"
  ON catalog.product_documents FOR ALL TO authenticated
  USING (internal.is_admin()) WITH CHECK (internal.is_admin());

ALTER TABLE catalog.external_catalog_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.external_catalog_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage external_catalog_sources"
  ON catalog.external_catalog_sources FOR ALL TO authenticated USING (internal.is_admin()) WITH CHECK (internal.is_admin());
CREATE POLICY "Admin can view external_catalog_sync_runs"
  ON catalog.external_catalog_sync_runs FOR SELECT TO authenticated USING (internal.is_admin());
CREATE POLICY "Admin can insert external_catalog_sync_runs"
  ON catalog.external_catalog_sync_runs FOR INSERT TO authenticated WITH CHECK (internal.is_admin());

COMMIT;
