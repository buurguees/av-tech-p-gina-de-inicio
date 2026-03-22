-- Migration: add suggested_project_id, suggested_site_id and suggested_project_name
-- to scanned_documents to support the mobile pre-assignment workflow.
--
-- The mobile scanner now saves these fields WITHOUT creating the purchase invoice.
-- The document stays UNASSIGNED so the desktop scanner can pick it up and pre-fill
-- the project field before completing the full data entry.

ALTER TABLE public.scanned_documents
  ADD COLUMN IF NOT EXISTS suggested_project_id   UUID,
  ADD COLUMN IF NOT EXISTS suggested_site_id       UUID,
  ADD COLUMN IF NOT EXISTS suggested_project_name  TEXT;
