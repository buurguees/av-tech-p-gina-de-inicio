# 📦 MinIO – Guía Definitiva de Implementación para NEXO AV

> **Documento oficial** del sistema de almacenamiento de archivos del servidor NEXO.  
> Contiene: instalación, configuración, usuarios, políticas, operaciones con `mc`, buenas prácticas, tabla de metadatos y flujo técnico de integración.

**Última actualización:** Febrero 2026

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura y principios](#2-arquitectura-y-principios)
3. [Instalación de MinIO](#3-instalación-de-minio)
4. [Estructura de buckets y prefijos](#4-estructura-de-buckets-y-prefijos)
5. [Usuarios y políticas de acceso](#5-usuarios-y-políticas-de-acceso)
6. [Operaciones con MinIO Client (mc)](#6-operaciones-con-minio-client-mc)
7. [Buenas prácticas operativas](#7-buenas-prácticas-operativas)
8. [Tabla de metadatos en Supabase](#8-tabla-de-metadatos-en-supabase)
9. [Flujo técnico de integración](#9-flujo-técnico-de-integración)
10. [Roadmap de implementación](#10-roadmap-de-implementación)
11. [Anexos](#11-anexos)

---

## 1) Resumen ejecutivo

| Componente | Decisión |
|------------|----------|
| **Storage de binarios** | MinIO (S3-compatible) en servidor NEXCOM |
| **Metadatos y permisos** | Supabase (PostgreSQL) |
| **Acceso desde NEXO AV** | Edge Function / micro-API que genera presigned URLs |
| **Acceso de red** | Solo VPN (Tailscale); no expuesto a Internet |
| **Persistencia** | SSD externo en `/mnt/storage` |

**Qué se guarda en MinIO:**
- Binarios (PDFs, imágenes, documentos, vídeos)

**Qué NO se guarda en MinIO:**
- Metadatos (quién subió, permisos, entidad vinculada) → van a Supabase
- Datos transaccionales → Supabase
- Credenciales de MinIO → nunca en frontend

---

## 2) Arquitectura y principios

### 2.1 Diagrama de componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         NEXO AV (Frontend)                       │
│                     React + Vite + TypeScript                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                       │
│  • Valida sesión/rol                                            │
│  • Consulta/actualiza metadatos en PostgreSQL                   │
│  • Genera presigned URLs (GET/PUT) hacia MinIO                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ VPN (Tailscale)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Servidor NEXCOM (Ubuntu Server)                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               MinIO (Docker)                            │    │
│  │  • API S3: puerto 9000                                  │    │
│  │  • Consola web: puerto 9001                             │    │
│  │  • Datos en /mnt/storage/services/minio/data           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Principios de diseño

1. **Separación de responsabilidades**
   - MinIO = almacén de binarios (archivos físicos)
   - Supabase = metadatos, permisos, relaciones con entidades

2. **Seguridad en capas**
   - MinIO no expuesto a Internet
   - Credenciales de MinIO solo en backend (Edge Function)
   - Frontend solo recibe URLs firmadas temporales

3. **Consistencia**
   - Toda operación pasa por la API → registro en tabla de metadatos
   - Nunca subir archivos "a mano" directamente a MinIO

4. **Persistencia y migración**
   - Todo en `/mnt/storage` (SSD externo)
   - Docker Compose para reproducibilidad
   - Documentación como código

---

## 3) Instalación de MinIO

### 3.1 Prerequisitos

- Ubuntu Server instalado
- Docker y Docker Compose configurados
- SSD montado en `/mnt/storage`
- Tailscale (u otra VPN) para acceso seguro

### 3.2 Estructura de directorios

```bash
# Crear estructura
sudo mkdir -p /mnt/storage/services/minio/{data,config}
sudo mkdir -p /mnt/storage/compose/minio
sudo chown -R $USER:$USER /mnt/storage/services/minio
sudo chown -R $USER:$USER /mnt/storage/compose/minio
```

Resultado:
```text
/mnt/storage/
├── services/
│   └── minio/
│       ├── data/      # Objetos S3 (archivos)
│       └── config/    # Configuración MinIO
└── compose/
    └── minio/
        └── docker-compose.yml
```

### 3.3 Docker Compose

Crear `/mnt/storage/compose/minio/docker-compose.yml`:

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio:latest
    container_name: minio
    restart: unless-stopped
    ports:
      - "9000:9000"   # API S3
      - "9001:9001"   # Consola web
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - /mnt/storage/services/minio/data:/data
      - /mnt/storage/services/minio/config:/root/.minio
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 20s
      retries: 3

networks:
  default:
    name: nexo-network
```

### 3.4 Variables de entorno

Crear `/mnt/storage/compose/minio/.env`:

```bash
# ⚠️ Cambiar estos valores en producción
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=CAMBIAR_CONTRASEÑA_SEGURA_32_CHARS
```

> **IMPORTANTE:** Usar contraseña de al menos 32 caracteres con mayúsculas, minúsculas, números y símbolos.

### 3.5 Levantar el servicio

```bash
cd /mnt/storage/compose/minio
docker compose up -d

# Verificar estado
docker compose ps
docker compose logs -f minio
```

### 3.6 Verificar instalación

```bash
# Comprobar API S3 (desde el servidor)
curl -I http://localhost:9000/minio/health/live

# Acceder a consola web (desde navegador vía Tailscale)
# http://<ip-tailscale>:9001
```

---

## 4) Estructura de buckets y prefijos

### 4.1 Buckets

Mantener **pocos buckets** para simplificar gestión y políticas:

| Bucket | Propósito | Público |
|--------|-----------|---------|
| `nexo-prod` | Producción | No |
| `nexo-staging` | Pruebas/desarrollo | No |
| `nexo-public` | Assets públicos (futuro) | Sí |

### 4.2 Prefijos (carpetas virtuales)

Dentro de `nexo-prod`:

```text
nexo-prod/
├── clients/
│   └── {client_number}/
│       ├── documents/
│       ├── contracts/
│       └── projects/
│           └── {project_number}/
│               ├── documentation/
│               ├── images/
│               ├── plans/
│               ├── invoices/
│               └── purchases/
│
├── billing/
│   ├── quotes/
│   │   └── {quote_number}/
│   └── invoices/
│       └── {invoice_number}/
│
├── purchases/
│   ├── invoices/
│   │   └── {internal_purchase_number}/
│   └── tickets/
│       └── {internal_purchase_number}/
│
├── product/
│   └── {sku}/
│       ├── images/
│       ├── datasheets/
│       └── manuals/
│
├── hr/
│   └── {employee_number}/
│       ├── contracts/
│       ├── payrolls/
│       └── documents/
│
├── marketing/
│   ├── social/
│   ├── designs/
│   └── logos/
│
├── admin/
│   ├── insurance/
│   ├── contracts/
│   └── legal/
│
└── accounting/
    ├── reports/
    │   └── {year}/
    │       └── {month}/
    └── exports/
```

### 4.3 Convención de nombres (keys)

| Entidad | Formato de ID | Ejemplo de key |
|---------|---------------|----------------|
| Cliente | `client_number` (6 dígitos) | `clients/124030/documents/contrato.pdf` |
| Proyecto | `project_number` (6 dígitos) | `clients/124030/projects/000008/images/foto1.jpg` |
| Presupuesto | `P-YY-XXXXXX` | `billing/quotes/P-26-000001/presupuesto.pdf` |
| Factura venta | `F-YY-XXXXXX` | `billing/invoices/F-26-000001/factura.pdf` |
| Factura compra | `C-YY-XXXXXX` | `purchases/invoices/C-26-000001/factura.pdf` |
| Ticket/gasto | `TICKET-YY-XXXXXX` | `purchases/tickets/TICKET-26-000001/ticket.jpg` |
| Producto | SKU | `product/SP-01-0001/images/main.jpg` |
| Empleado | `EMP-XXXXX` | `hr/EMP-00001/payrolls/2026-01.pdf` |

---

## 5) Usuarios y políticas de acceso

### 5.1 Usuarios MinIO

| Usuario | Propósito | Política |
|---------|-----------|----------|
| `root` / admin | Administración puntual | `consoleAdmin` (built-in) |
| `nexo_app` | Aplicación NEXO AV | `nexo-app-policy` (custom) |
| `nexo_ops` | Operaciones/backups (opcional) | `nexo-ops-policy` (custom) |

### 5.2 Crear usuario de aplicación

```bash
# Configurar alias para el servidor MinIO
mc alias set nexo http://localhost:9000 admin TU_CONTRASEÑA_ADMIN

# Crear usuario para la aplicación
mc admin user add nexo nexo_app CONTRASEÑA_NEXO_APP_SEGURA
```

### 5.3 Política para `nexo_app`

Crear archivo `nexo-app-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::nexo-prod",
        "arn:aws:s3:::nexo-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::nexo-staging",
        "arn:aws:s3:::nexo-staging/*"
      ]
    }
  ]
}
```

Aplicar política:

```bash
# Crear política
mc admin policy create nexo nexo-app-policy nexo-app-policy.json

# Asignar política al usuario
mc admin policy attach nexo nexo-app-policy --user nexo_app

# Verificar
mc admin user info nexo nexo_app
```

### 5.4 Política para operaciones/backups (opcional)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketVersioning"
      ],
      "Resource": [
        "arn:aws:s3:::nexo-prod",
        "arn:aws:s3:::nexo-prod/*"
      ]
    }
  ]
}
```

---

## 6) Operaciones con MinIO Client (mc)

### 6.1 Instalación de mc

```bash
# Descargar mc
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  --create-dirs -o $HOME/minio-binaries/mc

# Dar permisos de ejecución
chmod +x $HOME/minio-binaries/mc

# Añadir al PATH (añadir a ~/.bashrc)
export PATH=$PATH:$HOME/minio-binaries/

# Verificar
mc --version
```

### 6.2 Configurar alias

```bash
# Alias para administración (usuario root)
mc alias set nexo-admin http://localhost:9000 admin TU_CONTRASEÑA

# Alias para aplicación (usuario nexo_app)
mc alias set nexo http://localhost:9000 nexo_app CONTRASEÑA_APP

# Listar alias configurados
mc alias list
```

### 6.3 Gestión de buckets

```bash
# Crear buckets
mc mb nexo/nexo-prod
mc mb nexo/nexo-staging

# Listar buckets
mc ls nexo

# Ver información de bucket
mc stat nexo/nexo-prod
```

### 6.4 Operaciones con archivos

```bash
# Subir archivo
mc cp archivo.pdf nexo/nexo-prod/clients/124030/documents/

# Descargar archivo
mc cp nexo/nexo-prod/clients/124030/documents/archivo.pdf ./

# Listar contenido (carpetas virtuales)
mc ls nexo/nexo-prod/clients/
mc ls nexo/nexo-prod/clients/124030/

# Listar recursivo
mc ls --recursive nexo/nexo-prod/clients/124030/

# Mover/renombrar (copy + delete)
mc mv nexo/nexo-prod/temp/file.pdf nexo/nexo-prod/clients/124030/documents/

# Eliminar archivo
mc rm nexo/nexo-prod/temp/archivo.pdf

# Eliminar carpeta recursivamente (¡cuidado!)
mc rm --recursive --force nexo/nexo-prod/temp/
```

### 6.5 URLs firmadas (presigned)

```bash
# URL de descarga temporal (7 días por defecto)
mc share download nexo/nexo-prod/clients/124030/documents/archivo.pdf

# URL de descarga con tiempo personalizado
mc share download --expire 1h nexo/nexo-prod/clients/124030/documents/archivo.pdf

# URL de subida (PUT)
mc share upload nexo/nexo-prod/clients/124030/documents/
```

### 6.6 Información y estadísticas

```bash
# Ver metadatos de objeto
mc stat nexo/nexo-prod/clients/124030/documents/archivo.pdf

# Espacio usado
mc du nexo/nexo-prod/

# Espacio por prefijo
mc du nexo/nexo-prod/clients/
```

---

## 7) Buenas prácticas operativas

### 7.1 Seguridad

| Práctica | Descripción |
|----------|-------------|
| **VPN obligatoria** | MinIO solo accesible vía Tailscale |
| **Contraseñas fuertes** | Mínimo 32 caracteres para usuarios MinIO |
| **Credenciales en backend** | Nunca exponer access/secret keys en frontend |
| **URLs firmadas cortas** | Expiración máxima recomendada: 1 hora para descarga, 5 minutos para subida |
| **Rotación de credenciales** | Cambiar credenciales de `nexo_app` cada 6 meses |

### 7.2 Consistencia de datos

| Práctica | Descripción |
|----------|-------------|
| **Todo vía API** | Nunca subir archivos directamente a MinIO sin registrar en Supabase |
| **Validar antes de subir** | Comprobar tipo MIME, tamaño máximo, nombre sanitizado |
| **Transacción atómica** | Primero subir a MinIO, luego registrar en Supabase; si falla Supabase, borrar de MinIO |
| **Naming consistente** | Usar IDs de negocio (client_number, project_number, etc.), no UUIDs en rutas |

### 7.3 Inmutabilidad de keys (IMPORTANTE)

> **Principio fundamental:** Una vez asignada, la **key de un archivo NO debe cambiar**.

#### ¿Por qué inmutabilidad?

| Problema sin inmutabilidad | Consecuencia |
|---------------------------|--------------|
| URLs firmadas en emails/PDFs | Dejan de funcionar |
| Referencias en BD | Quedan huérfanas |
| Logs de auditoría | Pierden trazabilidad |
| Backups/snapshots | Inconsistencias |

#### Reglas de inmutabilidad

1. **Key = permanente desde el primer upload**
   - Una vez que el archivo está en `clients/124030/projects/000008/docs/plano.pdf`, **no se mueve**.

2. **"Mover" = cambiar referencia lógica, no física**
   - Si un archivo cambia de proyecto, solo se actualiza `owner_id` en `storage.files`.
   - El binario **permanece en su key original**.

3. **Excepciones (raras y justificadas)**
   - Corrección de error grave en la ruta inicial.
   - Migración masiva planificada (con script que actualiza todas las referencias).
   - En estos casos: **copy → update refs → delete original**.

4. **La UI muestra "ubicación lógica", no física**
   ```typescript
   // La UI puede mostrar el archivo bajo "Proyecto B" aunque físicamente esté en:
   // clients/124030/projects/000008/docs/plano.pdf (Proyecto A original)
   // Porque storage.files.owner_id apunta a Proyecto B
   ```

#### Campo adicional recomendado (futuro)

```sql
-- Añadir a storage.files para casos donde la ruta lógica difiera de la física
ALTER TABLE storage.files ADD COLUMN logical_path TEXT;
-- Si es NULL, la UI usa "key" como ruta. Si tiene valor, usa "logical_path" para mostrar.
```

### 7.4 Versionado de documentos (futuro)

> **Estado:** diseño previsto, no implementar aún.

Para documentos que requieren histórico de versiones (facturas rectificativas, presupuestos, contratos), el esquema de prefijos permite versionado elegante:

#### Estrategia de versionado con prefijos

```text
billing/invoices/F-26-000001/
├── v1/
│   └── F-26-000001_v1.pdf          ← Original
├── v2/
│   └── F-26-000001_v2.pdf          ← Corrección
├── v3/
│   └── F-26-000001_v3_rectificativa.pdf
└── current -> v3                    ← Symlink lógico (en BD)
```

#### Modelo de datos para versiones

```sql
-- Añadir a storage.files cuando se implemente versionado
ALTER TABLE storage.files ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE storage.files ADD COLUMN is_current BOOLEAN DEFAULT true;
ALTER TABLE storage.files ADD COLUMN parent_file_id UUID REFERENCES storage.files(id);

-- Constraint: solo una versión "current" por grupo
CREATE UNIQUE INDEX idx_files_current_version 
  ON storage.files(owner_type, owner_id, document_type) 
  WHERE is_current = true AND deleted_at IS NULL;
```

#### Casos de uso de versionado

| Entidad | Necesita versionado | Razón |
|---------|---------------------|-------|
| Factura de venta | ✅ Sí | Rectificativas legales |
| Presupuesto | ✅ Sí | Revisiones con cliente |
| Contrato | ✅ Sí | Adendas, modificaciones |
| Foto de proyecto | ❌ No | Cada foto es única |
| Ticket de gasto | ❌ No | Documento original único |
| Ficha de producto | ⚠️ Opcional | Si cambian especificaciones |

### 7.5 Diferenciación de buckets (futuro)

> **Estado:** diseño previsto para escalar.

Actualmente usamos un bucket único (`nexo-prod`), pero la arquitectura prevé separación futura:

#### Buckets planificados

| Bucket | Propósito | Acceso | Cuándo activar |
|--------|-----------|--------|----------------|
| `nexo-prod` | Documentos internos, facturas, proyectos | Privado (presigned URLs) | **Activo** |
| `nexo-staging` | Pruebas y desarrollo | Privado | **Activo** |
| `nexo-public` | Assets públicos (catálogo web, logos) | Público (CDN opcional) | Cuando haya web pública |
| `nexo-archive` | Histórico > 2 años (cold storage) | Privado, solo lectura | Cuando crezca el volumen |

#### Política de bucket público (cuando se active)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::nexo-public/*"]
    }
  ]
}
```

#### Contenido por bucket

```text
nexo-public/ (futuro)
├── catalog/
│   └── {sku}/
│       ├── main.jpg
│       ├── thumb.jpg
│       └── gallery/
├── logos/
│   ├── logo-main.svg
│   └── logo-white.svg
├── marketing/
│   ├── banners/
│   └── social/
└── downloads/
    └── catalogo-2026.pdf
```

### 7.6 Operaciones

| Práctica | Descripción |
|----------|-------------|
| **Docker Compose siempre** | Gestionar MinIO solo con `docker compose up/down/restart` |
| **Logs rotados** | Configurar logrotate para logs de Docker |
| **Actualizaciones** | Actualizar imagen MinIO mensualmente, probar en staging primero |
| **Monitorización** | Revisar health checks, espacio en disco, uso de CPU |

### 7.7 Backups

| Elemento | Estrategia |
|----------|------------|
| **Datos** | Snapshot diario de `/mnt/storage/services/minio/data` |
| **Configuración** | Versionado de docker-compose.yml y policies en Git |
| **Metadatos (Supabase)** | Backup automático de Supabase (pg_dump de tabla `storage.files`) |
| **Retención** | 7 días diarios + 4 semanales + 3 mensuales |

```bash
# Ejemplo script de backup básico
#!/bin/bash
BACKUP_DIR=/mnt/storage/backups/minio
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf $BACKUP_DIR/minio-data-$DATE.tar.gz /mnt/storage/services/minio/data
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

---

## 8) Tabla de metadatos en Supabase

### 8.1 Diseño de tabla `storage.files`

> **Nota:** Se crea en schema `storage` (propio, no el de Supabase Storage nativo) o en `public` si se prefiere.

```sql
-- Schema para sistema de archivos propio
CREATE SCHEMA IF NOT EXISTS storage;

-- Tabla principal de metadatos
CREATE TABLE storage.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ubicación en MinIO
  bucket TEXT NOT NULL DEFAULT 'nexo-prod',
  key TEXT NOT NULL,  -- Ruta completa: clients/124030/documents/file.pdf
  
  -- Metadatos del archivo
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum TEXT,  -- SHA-256 opcional
  
  -- Vinculación con entidad
  owner_type TEXT NOT NULL,  -- 'client', 'project', 'invoice', 'purchase_invoice', 'quote', 'product', 'employee'
  owner_id UUID NOT NULL,    -- UUID de la entidad en su tabla
  document_type TEXT,        -- 'contract', 'invoice', 'photo', 'datasheet', 'manual', etc.
  
  -- Auditoría
  created_by UUID NOT NULL REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,  -- Soft delete
  
  -- Índices
  CONSTRAINT files_key_unique UNIQUE (bucket, key)
);

-- Índices para consultas frecuentes
CREATE INDEX idx_files_owner ON storage.files(owner_type, owner_id);
CREATE INDEX idx_files_created_by ON storage.files(created_by);
CREATE INDEX idx_files_document_type ON storage.files(document_type);
CREATE INDEX idx_files_key_prefix ON storage.files(key text_pattern_ops);

-- Trigger para updated_at
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON storage.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 8.2 Políticas RLS

```sql
-- Habilitar RLS
ALTER TABLE storage.files ENABLE ROW LEVEL SECURITY;

-- Admin y Manager: acceso completo
CREATE POLICY "Admin full access" ON storage.files
  FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());

-- Usuarios: ver archivos de sus entidades (requiere lógica de negocio)
CREATE POLICY "Users view own entity files" ON storage.files
  FOR SELECT
  USING (
    created_by = internal.get_authorized_user_id(auth.uid())
    OR internal.is_admin()
    OR internal.is_manager()
  );

-- Usuarios: subir archivos
CREATE POLICY "Users can upload" ON storage.files
  FOR INSERT
  WITH CHECK (
    created_by = internal.get_authorized_user_id(auth.uid())
  );

-- Usuarios: eliminar solo propios y no vinculados a entidad confirmada
CREATE POLICY "Users can delete own unassigned" ON storage.files
  FOR DELETE
  USING (
    (created_by = internal.get_authorized_user_id(auth.uid()) AND document_type IS NULL)
    OR internal.is_admin()
  );
```

### 8.3 Valores de `owner_type`

| owner_type | Tabla origen | Descripción |
|------------|--------------|-------------|
| `client` | `crm.clients` | Documentos del cliente |
| `project` | `projects.projects` | Archivos del proyecto |
| `quote` | `sales.quotes` | Adjuntos de presupuesto |
| `invoice` | `sales.invoices` | Factura de venta |
| `purchase_invoice` | `sales.purchase_invoices` | Factura/ticket de compra |
| `product` | `catalog.products` | Imágenes/docs de producto |
| `employee` | `accounting.employees` | Documentos RRHH |
| `company` | `settings.company_settings` | Recursos corporativos |
| `report` | (ad-hoc) | Informes generados |

### 8.4 Valores de `document_type`

| document_type | Descripción |
|---------------|-------------|
| `invoice` | Factura PDF |
| `quote` | Presupuesto PDF |
| `delivery_note` | Albarán |
| `contract` | Contrato |
| `photo` | Fotografía |
| `image` | Imagen genérica |
| `datasheet` | Ficha técnica |
| `manual` | Manual de usuario |
| `plan` | Plano técnico |
| `report` | Informe |
| `ticket` | Ticket/recibo |
| `payroll` | Nómina |
| `other` | Otros |

### 8.5 Ejemplo de registro

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "bucket": "nexo-prod",
  "key": "clients/124030/projects/000008/invoices/F-26-000001.pdf",
  "original_name": "Factura_Proyecto_Centro_Comercial.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 245678,
  "checksum": "sha256:abc123...",
  "owner_type": "invoice",
  "owner_id": "uuid-de-la-factura-en-sales.invoices",
  "document_type": "invoice",
  "created_by": "uuid-del-usuario",
  "created_at": "2026-02-04T10:30:00Z",
  "updated_at": "2026-02-04T10:30:00Z",
  "deleted_at": null
}
```

---

## 9) Flujo técnico de integración

### 9.1 Diagrama de flujo: Subida de archivo

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SUBIDA DE ARCHIVO                               │
└──────────────────────────────────────────────────────────────────────────────┘

  Usuario                  Frontend                Edge Function               MinIO
     │                        │                         │                        │
     │  1. Selecciona archivo │                         │                        │
     │───────────────────────►│                         │                        │
     │                        │                         │                        │
     │                        │  2. POST /storage/upload│                        │
     │                        │  { owner_type, owner_id,│                        │
     │                        │    file_name, mime_type }                        │
     │                        │────────────────────────►│                        │
     │                        │                         │                        │
     │                        │                         │  3. Validar sesión/rol │
     │                        │                         │  4. Generar key:       │
     │                        │                         │     clients/124030/... │
     │                        │                         │  5. Crear presigned    │
     │                        │                         │     PUT URL            │
     │                        │                         │────────────────────────►
     │                        │                         │                        │
     │                        │  6. { presigned_url,    │◄───────────────────────│
     │                        │       key, file_id }    │                        │
     │                        │◄────────────────────────│                        │
     │                        │                         │                        │
     │                        │  7. PUT binario         │                        │
     │                        │─────────────────────────────────────────────────►│
     │                        │                         │                        │
     │                        │  8. 200 OK              │                        │
     │                        │◄─────────────────────────────────────────────────│
     │                        │                         │                        │
     │                        │  9. POST /storage/confirm                        │
     │                        │  { file_id, size_bytes }│                        │
     │                        │────────────────────────►│                        │
     │                        │                         │                        │
     │                        │                         │  10. Actualizar        │
     │                        │                         │      storage.files     │
     │                        │                         │      (size, checksum)  │
     │                        │                         │                        │
     │                        │  11. { success: true }  │                        │
     │                        │◄────────────────────────│                        │
     │  12. Archivo subido ✓  │                         │                        │
     │◄───────────────────────│                         │                        │
```

### 9.2 Diagrama de flujo: Descarga de archivo

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                             DESCARGA DE ARCHIVO                              │
└──────────────────────────────────────────────────────────────────────────────┘

  Usuario                  Frontend                Edge Function               MinIO
     │                        │                         │                        │
     │  1. Click en archivo   │                         │                        │
     │───────────────────────►│                         │                        │
     │                        │                         │                        │
     │                        │  2. GET /storage/download                        │
     │                        │  ?file_id=xxx           │                        │
     │                        │────────────────────────►│                        │
     │                        │                         │                        │
     │                        │                         │  3. Validar sesión/rol │
     │                        │                         │  4. Consultar file     │
     │                        │                         │     en storage.files   │
     │                        │                         │  5. Verificar permiso  │
     │                        │                         │  6. Generar presigned  │
     │                        │                         │     GET URL (1h)       │
     │                        │                         │────────────────────────►
     │                        │                         │                        │
     │                        │  7. { download_url }    │◄───────────────────────│
     │                        │◄────────────────────────│                        │
     │                        │                         │                        │
     │                        │  8. Redirect o fetch    │                        │
     │                        │─────────────────────────────────────────────────►│
     │                        │                         │                        │
     │  9. Archivo descargado │  10. Binario            │                        │
     │◄──────────────────────────────────────────────────────────────────────────│
```

### 9.3 Quién hace qué

| Responsabilidad | Componente |
|-----------------|------------|
| **Autenticar usuario** | Supabase Auth (JWT) |
| **Validar rol/permisos** | Edge Function (consulta `get_current_user_info`) |
| **Generar la ruta (key)** | Edge Function (según `owner_type` + `owner_id`) |
| **Crear presigned URL** | Edge Function (SDK MinIO/S3) |
| **Subir/descargar binario** | Frontend directo a MinIO con URL firmada |
| **Registrar metadatos** | Edge Function → tabla `storage.files` |
| **Listar "carpetas"** | Edge Function consulta `storage.files` por prefijo |

### 9.4 Lógica de generación de rutas

```typescript
// Pseudocódigo en Edge Function
function generateKey(ownerType: string, ownerId: string, fileName: string): string {
  switch (ownerType) {
    case 'client':
      const client = await getClient(ownerId);
      return `clients/${client.client_number}/documents/${sanitize(fileName)}`;
    
    case 'project':
      const project = await getProject(ownerId);
      const client = await getClient(project.client_id);
      return `clients/${client.client_number}/projects/${project.project_number}/documents/${sanitize(fileName)}`;
    
    case 'invoice':
      const invoice = await getInvoice(ownerId);
      return `billing/invoices/${invoice.invoice_number}/${sanitize(fileName)}`;
    
    case 'purchase_invoice':
      const purchase = await getPurchaseInvoice(ownerId);
      const prefix = purchase.document_type === 'TICKET' ? 'tickets' : 'invoices';
      return `purchases/${prefix}/${purchase.internal_purchase_number}/${sanitize(fileName)}`;
    
    case 'product':
      const product = await getProduct(ownerId);
      return `product/${product.sku}/images/${sanitize(fileName)}`;
    
    // ... otros casos
  }
}
```

### 9.5 Navegación tipo "Windows" (UI)

La UI muestra carpetas virtuales consultando la tabla de metadatos:

```typescript
// Listar "carpetas" de un cliente
const { data: folders } = await supabase
  .from('storage.files')
  .select('key')
  .eq('owner_type', 'project')
  .eq('owner_id', projectId);

// Extraer prefijos únicos para mostrar como carpetas
const uniquePrefixes = extractFolders(folders.map(f => f.key));

// Listar archivos de una "carpeta"
const { data: files } = await supabase
  .from('storage.files')
  .select('*')
  .like('key', 'clients/124030/projects/000008/%')
  .is('deleted_at', null);
```

**Importante:** La UI "cree" que navega carpetas, pero en realidad:
- Las carpetas son **prefijos** calculados de las keys
- Los archivos son registros en `storage.files`
- No existe concepto de "carpeta vacía" (solo existen si hay archivos dentro)

---

## 10) Roadmap de implementación

### Fase 1: Infraestructura MinIO ✅ (actual)
- [x] Documentación de instalación
- [x] Docker Compose preparado
- [x] Estructura de buckets definida
- [x] Políticas de usuarios documentadas
- [x] Guía de operaciones con mc

### Fase 2: Base de datos
- [ ] Crear migración para `storage.files`
- [ ] Implementar RLS policies
- [ ] Crear funciones RPC auxiliares
- [ ] Migrar referencias desde Supabase Storage actual

### Fase 3: Edge Functions
- [ ] `storage-upload`: validar + generar presigned PUT
- [ ] `storage-download`: validar + generar presigned GET
- [ ] `storage-list`: listar por prefijo/entidad
- [ ] `storage-delete`: soft delete + borrar de MinIO
- [ ] `storage-move`: mover archivo (copy + delete)

### Fase 4: Integración Frontend
- [ ] Hook `useStorageUpload`
- [ ] Hook `useStorageDownload`
- [ ] Componente `FileExplorer` (navegación tipo Windows)
- [ ] Integración en módulos existentes (facturas, proyectos, scanner)

### Fase 5: Migración y automatismos
- [ ] Script de migración desde Supabase Storage
- [ ] Automatismo: guardar factura generada
- [ ] Automatismo: escáner → almacenamiento
- [ ] Automatismo: informes mensuales

---

## 11) Anexos

### A. Comandos rápidos mc

```bash
# Alias
mc alias set nexo http://localhost:9000 nexo_app PASSWORD

# Buckets
mc mb nexo/nexo-prod
mc ls nexo

# Archivos
mc cp file.pdf nexo/nexo-prod/path/
mc ls nexo/nexo-prod/path/
mc rm nexo/nexo-prod/path/file.pdf

# URLs firmadas
mc share download nexo/nexo-prod/path/file.pdf --expire 1h

# Info
mc stat nexo/nexo-prod/path/file.pdf
mc du nexo/nexo-prod/
```

### B. Variables de entorno necesarias en Edge Functions

```bash
# En Supabase Edge Function Secrets
MINIO_ENDPOINT=http://IP_TAILSCALE:9000
MINIO_ACCESS_KEY=nexo_app
MINIO_SECRET_KEY=CONTRASEÑA_NEXO_APP
MINIO_BUCKET=nexo-prod
MINIO_USE_SSL=false
```

### C. Checklist de seguridad

- [ ] MinIO solo accesible por VPN
- [ ] Contraseñas de 32+ caracteres
- [ ] Usuario `nexo_app` con política limitada (no admin)
- [ ] Credenciales solo en Edge Functions (secrets)
- [ ] URLs firmadas con expiración corta
- [ ] RLS en tabla `storage.files`
- [ ] Validación de MIME types en upload
- [ ] Sanitización de nombres de archivo
- [ ] Logs de auditoría habilitados

### D. Referencias

- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [MinIO Client Reference](https://min.io/docs/minio/linux/reference/minio-mc.html)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Documento mantenido por:** Equipo NEXO AV  
**Versión:** 1.0.0  
**Última actualización:** Febrero 2026
