-- ============================================================
-- public.minio_files — Metadatos para MinIO (S3 compatible)
-- Explorador tipo Windows basado en prefijos de keys
-- ============================================================

-- 1) Helper function for updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Tabla principal de metadatos
CREATE TABLE IF NOT EXISTS public.minio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ubicación en MinIO
  bucket TEXT NOT NULL DEFAULT 'nexo-prod',
  key TEXT NOT NULL,  -- S3 object key completo (ej: clients/124030/docs/contrato.pdf)

  -- Metadatos del archivo
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  checksum TEXT,

  -- Vinculación con entidades de negocio
  owner_type TEXT NOT NULL,  -- 'client' | 'project' | 'invoice' | 'purchase' | 'quote' | 'product' | ...
  owner_id UUID NOT NULL,
  document_type TEXT,        -- 'photo' | 'plan' | 'contract' | 'invoice' | 'ticket' | ...

  -- Estado del archivo
  status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | READY | ERROR

  -- Auditoría
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- 3) Índices y constraints
-- Unicidad: bucket + key
CREATE UNIQUE INDEX IF NOT EXISTS minio_files_unique_bucket_key
  ON public.minio_files(bucket, key);

-- Búsqueda por entidad propietaria
CREATE INDEX IF NOT EXISTS minio_files_owner_idx
  ON public.minio_files(owner_type, owner_id);

-- Búsqueda por creador
CREATE INDEX IF NOT EXISTS minio_files_created_by_idx
  ON public.minio_files(created_by);

-- Búsqueda por tipo de documento
CREATE INDEX IF NOT EXISTS minio_files_document_type_idx
  ON public.minio_files(document_type);

-- Búsqueda por prefijo de key (para navegación tipo Windows)
CREATE INDEX IF NOT EXISTS minio_files_key_prefix_idx
  ON public.minio_files(key text_pattern_ops);

-- Filtrar archivos no borrados
CREATE INDEX IF NOT EXISTS minio_files_active_idx
  ON public.minio_files(deleted_at) WHERE deleted_at IS NULL;

-- 4) Trigger updated_at automático
DROP TRIGGER IF EXISTS trg_minio_files_updated_at ON public.minio_files;
CREATE TRIGGER trg_minio_files_updated_at
  BEFORE UPDATE ON public.minio_files
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5) Habilitar RLS
ALTER TABLE public.minio_files ENABLE ROW LEVEL SECURITY;

-- 6) Políticas RLS (usando funciones existentes internal.is_admin/is_manager)

-- Admin/Manager: acceso completo
DROP POLICY IF EXISTS "minio_files_admin_manager_all" ON public.minio_files;
CREATE POLICY "minio_files_admin_manager_all"
  ON public.minio_files
  FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());

-- User: SELECT solo sus propios ficheros
DROP POLICY IF EXISTS "minio_files_user_select_own" ON public.minio_files;
CREATE POLICY "minio_files_user_select_own"
  ON public.minio_files
  FOR SELECT
  USING (created_by = internal.get_authorized_user_id(auth.uid()));

-- User: INSERT solo para sí mismo
DROP POLICY IF EXISTS "minio_files_user_insert_own" ON public.minio_files;
CREATE POLICY "minio_files_user_insert_own"
  ON public.minio_files
  FOR INSERT
  WITH CHECK (created_by = internal.get_authorized_user_id(auth.uid()));

-- User: UPDATE solo sus propios ficheros (para soft delete, etc.)
DROP POLICY IF EXISTS "minio_files_user_update_own" ON public.minio_files;
CREATE POLICY "minio_files_user_update_own"
  ON public.minio_files
  FOR UPDATE
  USING (created_by = internal.get_authorized_user_id(auth.uid()))
  WITH CHECK (created_by = internal.get_authorized_user_id(auth.uid()));