# MinIO — Guia de Instalacion y Configuracion Completa

> **Fecha de instalacion:** 17 de febrero de 2026  
> **Servidor:** ALB357 (Tailscale IP: `100.117.250.115`)  
> **Proposito:** Archivo fiscal inmutable + catalogo de productos + carpetas personalizadas  
> **Estado:** Operativo — 104 documentos fiscales + explorador de documentos + catalogo  
> **Documento de referencia arquitectural:** `docs/important/archivo-fiscal-minio.md`  
> **Ultima actualizacion:** 17 de febrero de 2026 (U2: Explorador Documentacion + Catalogo)

---

## Indice

1. [Resumen de lo implementado](#1-resumen-de-lo-implementado)
2. [Acceso al servidor ALB357](#2-acceso-al-servidor-alb357)
3. [MinIO — Despliegue Docker](#3-minio--despliegue-docker)
4. [Credenciales y usuarios](#4-credenciales-y-usuarios)
5. [Consola Web MinIO](#5-consola-web-minio)
6. [Bucket y estructura de archivos](#6-bucket-y-estructura-de-archivos)
7. [Seguridad de red](#7-seguridad-de-red)
8. [Edge Function: minio-proxy](#8-edge-function-minio-proxy)
9. [Migraciones de base de datos](#9-migraciones-de-base-de-datos)
10. [Cambios en el frontend](#10-cambios-en-el-frontend)
11. [Scripts de backfill (carga retroactiva)](#11-scripts-de-backfill-carga-retroactiva)
12. [Variables de entorno de Supabase](#12-variables-de-entorno-de-supabase)
13. [Comandos utiles de administracion](#13-comandos-utiles-de-administracion)
14. [Troubleshooting](#14-troubleshooting)
15. [Estructura de archivos del proyecto](#15-estructura-de-archivos-del-proyecto)
16. [U2: Explorador de Documentacion](#16-u2-explorador-de-documentacion)
17. [U2: Catalogo de productos con imagenes](#17-u2-catalogo-de-productos-con-imagenes)

---

## 1. Resumen de lo implementado

El sistema de Archivo Fiscal con MinIO se implemento en multiples fases:

### Instalacion inicial (U1)

| Fase | Descripcion | Estado |
|------|-------------|--------|
| **Fase 1** | Despliegue de MinIO en ALB357 (Docker, Tailscale, firewall, healthcheck, bucket, usuario worker) | Completado |
| **Fase 2** | Migraciones BD: `storage_key` UNIQUE en 5 tablas, campos fiscales en `minio_files`, CHECK constraints, indices | Completado |
| **Fase 3** | Edge Function `minio-proxy`: presigned URLs con JWT+RLS, listado DB-driven, upload restringido | Completado |
| **Fase 4** | `ArchivedPDFViewer` + logica dual en paginas de detalle (Invoice, Quote, PurchaseInvoice) | Completado |
| **Fase 5** | Carga retroactiva: 34 facturas compra + 20 facturas venta + 50 presupuestos = 104 documentos | Completado |

### Explorador de Documentacion + Catalogo (U2 — 17 feb 2026)

| Fase | Descripcion | Estado |
|------|-------------|--------|
| **U2-1** | Explorador tipo Windows Explorer en pagina "Documentacion" con nodo raiz "Contabilidad" | Completado |
| **U2-2** | Renombrado de archivos ventas/presupuestos a formato `Nº - Cliente.pdf` | Completado |
| **U2-3** | Carpetas personalizadas con profundidad ilimitada (`minio_custom_folders`) | Completado |
| **U2-4** | Subida de archivos a carpetas personalizadas con progreso | Completado |
| **U2-5** | Excel trimestral descargable via RPC `get_fiscal_quarter_data` | Completado |
| **U2-6** | Nodo "Catalogo" en explorador: categorias → subcategorias → productos del ERP | Completado |
| **U2-7** | Subida de imagenes a productos del catalogo con `upload_to_catalog_product` | Completado |
| **U2-8** | Galeria de imagenes en `ProductDetailPage` con thumbnails y soft-delete | Completado |

### Resultado de la migracion retroactiva

| Tipo de documento | Cantidad | Metodo | Errores |
|-------------------|----------|--------|---------|
| Facturas de compra | 34 | PDF migrado desde Supabase Storage | 0 |
| Facturas de venta | 20 | PDF generado con `renderToBuffer()` (plantilla React) | 0 |
| Presupuestos | 50 | PDF generado con `renderToBuffer()` (plantilla React) | 0 |
| **TOTAL** | **104** | — | **0** |

---

## 2. Acceso al servidor ALB357

### Conexion SSH

```powershell
ssh -i $env:USERPROFILE\.ssh\cursor_mcp mcpbot@100.117.250.115
```

| Parametro | Valor |
|-----------|-------|
| **Host** | `100.117.250.115` (IP Tailscale) |
| **Usuario SSH** | `mcpbot` |
| **Clave privada** | `%USERPROFILE%\.ssh\cursor_mcp` |
| **Red** | Solo accesible via **Tailscale VPN** |

### Requisitos previos

- Tener **Tailscale** activo y conectado a la red de AV Tech
- Tener la clave SSH `cursor_mcp` en `~/.ssh/`

---

## 3. MinIO — Despliegue Docker

### Ubicacion de archivos en el servidor

```
/opt/nexo-ai-v3/nexo-minio/
├── docker-compose.yml
└── .env                     # Credenciales (NO commitear)

/home/mcpbot/minio-data/     # Volumen de datos de MinIO
```

### docker-compose.yml

```yaml
version: "3.9"
services:
  minio:
    image: minio/minio:latest
    container_name: nexo-minio
    restart: unless-stopped
    ports:
      - "100.117.250.115:9000:9000"   # API S3 — SOLO Tailscale
      - "100.117.250.115:9001:9001"   # Consola Web — SOLO Tailscale
    env_file:
      - .env
    volumes:
      - /home/mcpbot/minio-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: >-
        curl -sf http://localhost:9000/minio/health/live &&
        curl -sf http://localhost:9000/minio/health/ready
      interval: 30s
      timeout: 10s
      retries: 3
```

**Puntos clave:**
- Los puertos estan bindeados EXCLUSIVAMENTE a la IP de Tailscale (`100.117.250.115`)
- El healthcheck verifica tanto `live` (proceso vivo) como `ready` (listo para servir)
- Los datos se almacenan en `/home/mcpbot/minio-data` (directorio con permisos de `mcpbot`)
- El contenedor se reinicia automaticamente (`unless-stopped`)

### Estado del contenedor

```
CONTAINER ID   IMAGE                COMMAND                  STATUS                    PORTS
eeb89821d1ca   minio/minio:latest   "/usr/bin/docker-ent…"   Up (healthy)              100.117.250.115:9000-9001->9000-9001/tcp
```

### Espacio en disco

- **Datos actuales:** ~7.4 MB (104 documentos PDF)
- **Total objetos:** 104
- **Tamano total:** 6.2 MiB

---

## 4. Credenciales y usuarios

> **IMPORTANTE:** Estas credenciales son SENSIBLES. No commitear a repositorios.  
> El fichero `.env` solo existe en el servidor ALB357 en `/opt/nexo-ai-v3/nexo-minio/.env`.

### Fichero .env en el servidor

```env
MINIO_ROOT_USER=nexo-admin
MINIO_ROOT_PASSWORD=14b58B6Ngi5qzrtILW4OAX45Wrx2AloUv0Gj3lR1tzs=
WORKER_PASSWORD=***REDACTED***
```

### Usuario ROOT (solo para administracion)

| Campo | Valor |
|-------|-------|
| **Username** | `nexo-admin` |
| **Password** | `14b58B6Ngi5qzrtILW4OAX45Wrx2AloUv0Gj3lR1tzs=` |
| **Uso** | Solo para administracion via consola web o `mc` CLI |
| **NO usar en** | Aplicaciones, workers, Edge Functions |

### Usuario WORKER (para aplicaciones)

| Campo | Valor |
|-------|-------|
| **Username (Access Key)** | `nexo-worker` |
| **Password (Secret Key)** | `***REDACTED***` |
| **Politica** | `readwrite` |
| **Uso** | Edge Functions (`minio-proxy`, `storage-health`), scripts de backfill, `nexo-file-worker` |

### Generacion de credenciales

Las passwords se generaron en el servidor con:

```bash
openssl rand -base64 32
```

El usuario `nexo-worker` se creo con:

```bash
docker exec nexo-minio mc admin user add local nexo-worker "<password>"
docker exec nexo-minio mc admin policy attach local readwrite --user nexo-worker
```

---

## 5. Consola Web MinIO

| Parametro | Valor |
|-----------|-------|
| **URL** | `http://100.117.250.115:9001` |
| **Red** | Solo via Tailscale |
| **Usuario** | `nexo-admin` |
| **Password** | `14b58B6Ngi5qzrtILW4OAX45Wrx2AloUv0Gj3lR1tzs=` |

Desde la consola web puedes:
- Ver y navegar el bucket `nexo-prod`
- Descargar archivos manualmente
- Ver estadisticas de uso
- Gestionar usuarios y politicas
- Monitorear el estado del servidor

---

## 6. Bucket y estructura de archivos

### Bucket

| Parametro | Valor |
|-----------|-------|
| **Nombre** | `nexo-prod` |
| **Acceso** | Privado (solo via presigned URLs) |
| **Politica de inmutabilidad** | head-before-put (si el objeto existe, no se sobrescribe) |

### Estructura de keys (actualizada U2)

```
nexo-prod/
├── fiscal/                        # Contabilidad trimestral (U1)
│   ├── 2025/
│   │   └── T4/
│   │       ├── compras/           # Facturas de compra T4-2025
│   │       ├── presupuestos/      # Presupuestos T4-2025
│   │       └── ventas/            # Facturas de venta T4-2025
│   └── 2026/
│       └── T1/
│           ├── compras/
│           ├── presupuestos/
│           └── ventas/
│
├── custom/                        # Carpetas personalizadas (U2)
│   └── {folder_uuid}/            # UUID de minio_custom_folders
│       └── {filename}
│
└── catalog/                       # Catalogo de productos (U2)
    └── {category-slug}/
        └── {subcategory-slug}/
            └── {product-sku}/
                ├── foto-frontal.jpg
                ├── datasheet.pdf
                └── ...
```

### Ejemplos de keys reales

| Tipo | Key de ejemplo |
|------|----------------|
| Factura venta | `fiscal/2026/T1/ventas/F-26-000001_SOFT_CONTROLS.pdf` |
| Factura compra | `fiscal/2025/T4/compras/C-25-000012_PROVEEDOR.pdf` |
| Presupuesto | `fiscal/2026/T1/presupuestos/P-26-000015_CLIENTE.pdf` |
| Carpeta custom | `custom/a1b2c3d4-uuid/contrato-alquiler.pdf` |
| Imagen catalogo | `catalog/audio/altavoces/PROD-001/foto-frontal.jpg` |

### Estructura futura (cuando se implemente el worker completo)

```
nexo-prod/
└── fiscal/
    └── {year}/
        └── T{quarter}/
            ├── ventas/        # F-{yy}-{6digits}_{CLIENTE}.pdf
            ├── compras/       # C-{yy}-{6digits}_{PROVEEDOR}.pdf
            ├── presupuestos/  # P-{yy}-{6digits}_{CLIENTE}.pdf
            ├── gastos/        # TK-{yy}-{6digits}_{BENEFICIARIO}.pdf
            ├── nominas/       # NOM-{yy}-{mes}-{NOMBRE}.pdf
            ├── resumenes/     # Excel trimestrales (IVA, retenciones, etc.)
            ├── modelos/       # PDFs de modelos AEAT (303, 111, etc.)
            └── informes/      # Portada de cierre trimestral
```

### Convencion de nombres

- Sin acentos ni caracteres especiales
- Espacios reemplazados por `_`
- Todo en MAYUSCULAS para el nombre del cliente/proveedor
- Prefijos: `F-` (venta), `C-` (compra), `P-` (presupuesto), `TK-` (ticket), `NOM-` (nomina)

---

## 7. Seguridad de red

### Capa 1: Bind a Tailscale IP

El `docker-compose.yml` publica puertos SOLO en la interfaz de Tailscale:

```yaml
ports:
  - "100.117.250.115:9000:9000"   # API S3
  - "100.117.250.115:9001:9001"   # Consola Web
```

Esto significa que **ni la LAN ni la WAN** pueden acceder a MinIO, solo dispositivos conectados a la VPN de Tailscale.

### Capa 2: Firewall UFW (respaldo recomendado)

Para una proteccion adicional, se recomienda configurar UFW:

```bash
sudo ufw deny from any to any port 9000
sudo ufw deny from any to any port 9001
sudo ufw allow from 100.64.0.0/10 to any port 9000
sudo ufw allow from 100.64.0.0/10 to any port 9001
```

> **Nota:** La red `100.64.0.0/10` es el rango CGNAT que Tailscale utiliza para asignar IPs.

### Capa 3: Usuarios separados

- **Root (`nexo-admin`)**: Solo para admin manual, nunca en aplicaciones
- **Worker (`nexo-worker`)**: Politica `readwrite`, usado por Edge Functions y scripts

### Capa 4: Presigned URLs

Los archivos NUNCA se sirven directamente. Siempre se generan URLs temporales (5 min) a traves de la Edge Function `minio-proxy`, que valida JWT + RLS antes de firmar.

---

## 8. Edge Function: minio-proxy

### Informacion general

| Parametro | Valor |
|-----------|-------|
| **Slug** | `minio-proxy` |
| **ID** | `643333e4-63fa-42cd-b7b0-53646a7e5d85` |
| **JWT requerido** | Si (`verify_jwt: true`) |
| **Import map** | `deno.json` con `@aws-sdk/client-s3` y `@aws-sdk/s3-request-presigner` |
| **URL** | `https://takvthfatlcjsqgssnta.supabase.co/functions/v1/minio-proxy` |

### Acciones disponibles (v3 — actualizado U2)

| Accion | Descripcion | Seguridad |
|--------|-------------|-----------|
| `get_presigned_url` | Genera URL temporal por `file_id` de `minio_files` | JWT + RLS |
| `get_presigned_url_by_key` | Genera URL temporal por `storage_key` | JWT + RLS |
| `list_files` | Lista archivos por `fiscal_year`, `fiscal_quarter`, `document_type` | JWT + RLS |
| `get_upload_url` | Genera URL de subida (PUT) para modelos AEAT | JWT + HEAD check inmutabilidad |
| `upload_to_custom_folder` | Presigned PUT + registro en `minio_files` para carpetas personalizadas | JWT + service client + HEAD check |
| `upload_to_catalog_product` | Presigned PUT + registro en `minio_files` para imagenes de productos | JWT + RPC validacion producto + HEAD check |
| `confirm_custom_upload` | Confirma que el archivo llego a MinIO, actualiza status a `READY` | JWT + service client + HEAD verify |

### Flujo de subida (custom folders y catalogo)

```
1. Frontend envia action: upload_to_custom_folder / upload_to_catalog_product
2. Edge Function valida (extension, tamano, existencia de folder/producto)
3. Genera presigned PUT URL → Crea registro en minio_files (status: UPLOADING)
4. Frontend sube directamente a MinIO via XHR (con progreso)
5. Frontend envia action: confirm_custom_upload con file_id
6. Edge Function verifica HEAD en MinIO → Actualiza status a READY + size_bytes real
```

### Extensiones permitidas por accion

| Accion | Extensiones |
|--------|-------------|
| `get_upload_url` (modelos) | `pdf`, `xlsx`, `xls` |
| `upload_to_custom_folder` | `pdf`, `xlsx`, `xls`, `jpg`, `jpeg`, `png`, `webp` |
| `upload_to_catalog_product` | `jpg`, `jpeg`, `png`, `webp`, `pdf` |

### Variables de entorno requeridas (Supabase Secrets)

Estas variables deben estar configuradas en los secretos del proyecto Supabase:

| Variable | Descripcion | Valor |
|----------|-------------|-------|
| `MINIO_ENDPOINT` | URL del endpoint S3 de MinIO | `http://100.117.250.115:9000` |
| `MINIO_ACCESS_KEY` | Usuario de MinIO para la EF | `nexo-worker` |
| `MINIO_SECRET_KEY` | Password del usuario worker | `***REDACTED***` |
| `MINIO_BUCKET` | Nombre del bucket | `nexo-prod` |
| `MINIO_REGION` | Region (requerido por SDK, valor por defecto) | `us-east-1` |
| `SUPABASE_URL` | URL del proyecto Supabase | `https://takvthfatlcjsqgssnta.supabase.co` |
| `SUPABASE_ANON_KEY` | Clave publica de Supabase | (ya configurada en el proyecto) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase | (ya configurada en el proyecto) |

### Ejemplo de llamada desde el frontend

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/minio-proxy`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "get_presigned_url_by_key",
      storage_key: "fiscal/2026/T1/ventas/F-26-000001_CLIENTE.pdf",
    }),
  }
);
const { url } = await response.json();
```

---

## 9. Migraciones de base de datos

Se aplicaron 3 migraciones durante la instalacion inicial (U1) y 7 mas en la actualizacion U2:

### Migracion 1: `add_fiscal_fields_and_storage_keys`

**Version:** `20260217112208`

**Que hace:**

1. **Agrega `storage_key` (TEXT UNIQUE)** a:
   - `sales.invoices`
   - `quotes.quotes`
   - `sales.purchase_invoices`
   - `accounting.payroll_runs`
   - `accounting.partner_compensation_runs`

2. **Agrega campos fiscales a `public.minio_files`:**
   - `fiscal_year` (INTEGER)
   - `fiscal_quarter` (SMALLINT, CHECK 1-4)
   - `fiscal_month` (SMALLINT, CHECK 1-12)
   - `document_date` (DATE)
   - `tax_model` (TEXT)
   - `auto_generated` (BOOLEAN DEFAULT false)
   - `archived_from_status` (TEXT)
   - `source_table` (TEXT)
   - `source_id` (UUID)

3. **Crea indices** para busquedas fiscales eficientes

### Migracion 2: `add_storage_key_to_detail_rpcs`

**Version:** `20260217112712`

**Que hace:**

Recrea las RPCs de detalle para incluir `storage_key` en el resultado:

- `finance_get_invoice` — ahora devuelve `storage_key` y `locked_at`
- `get_quote` — ahora devuelve `storage_key`
- `get_purchase_invoice` — ahora devuelve `storage_key`

### Migracion 3: `add_backfill_helper_rpcs`

**Version:** `20260217113328`

**Que hace:**

Crea RPCs temporales con `SECURITY DEFINER` para los scripts de backfill:

| RPC | Proposito |
|-----|-----------|
| `backfill_list_purchase_invoices_to_migrate` | Lista facturas de compra sin `storage_key` |
| `backfill_get_supplier_name` | Obtiene nombre del proveedor por ID |
| `backfill_get_technician_name` | Obtiene nombre del tecnico por ID |
| `backfill_set_purchase_invoice_storage_key` | Actualiza `storage_key` en `sales.purchase_invoices` |
| `backfill_list_invoices_to_migrate` | Lista facturas de venta sin `storage_key` |
| `backfill_set_invoice_storage_key` | Actualiza `storage_key` en `sales.invoices` |
| `backfill_list_quotes_to_migrate` | Lista presupuestos sin `storage_key` |
| `backfill_set_quote_storage_key` | Actualiza `storage_key` en `quotes.quotes` |

> **Nota:** Estas RPCs de backfill fueron necesarias porque los schemas `sales`, `quotes` e `internal` no estan expuestos via la API REST de Supabase. Usan `SECURITY DEFINER` para ejecutar con privilegios elevados y solo deben llamarse con la `SERVICE_ROLE_KEY`.

### Migraciones U2: Explorador de Documentacion + Catalogo

#### Migracion U2-1: `split_compras_into_facturas_and_tickets`

**Version:** `20260217121416`

**Que hace:**
- Separa los documentos de compra en dos categorias: `facturas_compra` y `tickets_gastos`
- Actualiza los registros existentes en `minio_files` con el campo `document_type` correcto segun el tipo de compra

#### Migracion U2-2: `fix_fiscal_quarter_data_rpc`

**Version:** `20260217121520`

**Que hace:**
- Crea/actualiza la RPC `get_fiscal_quarter_data(p_year, p_quarter)` que retorna todos los datos contables de un trimestre
- Incluye ventas, compras (facturas y tickets) y presupuestos para generacion de Excel

#### Migracion U2-3: `rename_ventas_presupuestos_original_name`

**Version:** `20260217123031`

**Que hace:**
- Actualiza el campo `original_name` de los registros en `minio_files` para ventas y presupuestos
- Nuevo formato: `{Nº de factura/presupuesto} - {CLIENTE}.pdf`
- Ejemplo: `F-26-000001 - SOFT CONTROLS.pdf`, `P-26-000015 - CLIENTE ABC.pdf`
- Garantiza ordenacion numerica correcta en el explorador

#### Migracion U2-4: `create_minio_custom_folders`

**Version:** `20260217123109`

**Que hace:**
1. Crea la tabla `public.minio_custom_folders`:
   - `id` (UUID PK)
   - `name` (TEXT NOT NULL)
   - `parent_id` (UUID FK → self, para profundidad ilimitada)
   - `created_by` (UUID FK → `auth.users`)
   - `created_at`, `updated_at` (TIMESTAMPTZ)
2. Agrega columna `custom_folder_id` (UUID FK) a `minio_files`
3. Habilita RLS en `minio_custom_folders` (lectura para `authenticated`)
4. Crea indice `idx_minio_files_custom_folder_id`

#### Migracion U2-5: `create_get_catalog_explorer_tree_rpc`

**Version:** `20260217125656`

**Que hace:**
- Crea la RPC `public.get_catalog_explorer_tree()` (`SECURITY DEFINER`)
- Retorna un JSON con 3 arrays:
  - `categories`: todas las categorias activas de `catalog.categories` (con `parent_id`, `domain`, `sort_order`)
  - `products`: todos los productos activos de `catalog.products` (con `sku`, `product_type`, `category_id`)
  - `image_counts`: conteo de imagenes por producto desde `minio_files` (donde `source_table = 'catalog.products'`)
- Usado por el frontend para renderizar el arbol completo del catalogo en una sola llamada

#### Migracion U2-6: `create_get_catalog_product_storage_path_rpc`

**Version:** `20260217130227`

**Que hace:**
- Crea la RPC `public.get_catalog_product_storage_path(p_product_id UUID)` (`SECURITY DEFINER`)
- Dado un `product_id`, retorna:
  - `sku`: SKU del producto
  - `name`: nombre del producto
  - `product_type`: tipo (`product`, `service`, `pack`)
  - `category_slugs`: array ordenado de slugs de categorias padre (resuelto recursivamente via CTE)
- Usado por `minio-proxy` para construir la key de MinIO: `catalog/{slug1}/{slug2}/{sku}/{filename}`

### Tabla resumen de migraciones U2

| Version | Nombre | Descripcion |
|---------|--------|-------------|
| `20260217121416` | `split_compras_into_facturas_and_tickets` | Separar compras en facturas y tickets |
| `20260217121520` | `fix_fiscal_quarter_data_rpc` | RPC para datos trimestrales (Excel) |
| `20260217123031` | `rename_ventas_presupuestos_original_name` | Formato `Nº - Cliente.pdf` |
| `20260217123109` | `create_minio_custom_folders` | Tabla carpetas personalizadas + FK |
| `20260217125656` | `create_get_catalog_explorer_tree_rpc` | RPC arbol catalogo completo |
| `20260217130227` | `create_get_catalog_product_storage_path_rpc` | RPC path de producto para MinIO |

---

## 10. Cambios en el frontend

### Nuevo componente: ArchivedPDFViewer

**Archivo:** `src/pages/nexo_av/desktop/components/common/ArchivedPDFViewer.tsx`  
**CSS:** `src/pages/nexo_av/desktop/styles/components/common/archived-pdf-viewer.css`

**Funcionalidad:**
- Recibe un `storageKey` y obtiene una presigned URL de `minio-proxy`
- Muestra el PDF en un `<iframe>`
- Badge verde "Documento archivado" con fecha/hora
- Botones: refrescar enlace, abrir en nueva ventana, descargar
- Manejo de URL caducada con boton "Recargar enlace"
- Cache: solo pide la URL 1 vez por apertura

### Paginas de detalle modificadas (logica dual)

La logica es identica en todas: **si existe `storage_key`, muestra el PDF archivado de MinIO; si no, usa la plantilla React existente.**

#### InvoiceDetailPage.tsx

**Archivo:** `src/pages/nexo_av/desktop/pages/InvoiceDetailPage.tsx`

```typescript
// Si tiene storage_key -> PDF inmutable de MinIO
// Si no -> Plantilla React renderizada en tiempo real
{invoice.storage_key ? (
  <ArchivedPDFViewer
    storageKey={invoice.storage_key}
    archivedAt={invoice.locked_at || invoice.updated_at}
    fileName={pdfFileName}
  />
) : (
  <DocumentPDFViewer /* ... plantilla existente ... */ />
)}
```

#### QuoteDetailPage.tsx

**Archivo:** `src/pages/nexo_av/desktop/pages/QuoteDetailPage.tsx`

Misma logica: `quote.storage_key` determina si se muestra el archivo de MinIO o la plantilla.

#### PurchaseInvoiceDetailPage.tsx

**Archivo:** `src/pages/nexo_av/desktop/pages/PurchaseInvoiceDetailPage.tsx`

Triple prioridad:
1. `invoice.storage_key` -> **ArchivedPDFViewer** (MinIO)
2. `invoice.file_path` -> **FilePreview** (Supabase Storage)
3. Ninguno -> Mensaje "Sin documento adjunto"

---

## 11. Scripts de backfill (carga retroactiva)

### Ubicacion

```
scripts/backfill/
├── package.json              # Dependencias del script
├── package-invoices.json     # Dependencias alternativas
├── backfill-purchases.mjs    # Migracion de facturas de compra
├── backfill-invoices.tsx     # Generacion de facturas de venta
└── backfill-quotes.tsx       # Generacion de presupuestos
```

### backfill-purchases.mjs

**Que hace:** Descarga los PDFs existentes de facturas de compra desde Supabase Storage y los sube a MinIO.

**Ejecucion:** Se ejecuto en el servidor ALB357 dentro de un contenedor Docker Node.js.

**Variables requeridas:**
```bash
SUPABASE_URL=https://takvthfatlcjsqgssnta.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_***REDACTED***
MINIO_ENDPOINT=http://100.117.250.115:9000
MINIO_ACCESS_KEY=nexo-worker
MINIO_SECRET_KEY=***REDACTED***
MINIO_BUCKET=nexo-prod
```

### backfill-invoices.tsx

**Que hace:** Genera PDFs de facturas de venta usando `@react-pdf/renderer` con `renderToBuffer()` y la plantilla `InvoicePDFDocument`, luego sube a MinIO.

**Ejecucion:** Local con `npx tsx` (requiere React para JSX):

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_***REDACTED***"
$env:MINIO_SECRET_KEY = "***REDACTED***"
npx tsx scripts/backfill/backfill-invoices.tsx
```

**Nota:** El script define `(globalThis as any).React = React` al inicio para que JSX funcione en Node.js con `tsx`.

### backfill-quotes.tsx

**Que hace:** Igual que `backfill-invoices.tsx` pero para presupuestos, usando la plantilla `QuotePDFDocument`.

**Ejecucion:**

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_***REDACTED***"
$env:MINIO_SECRET_KEY = "***REDACTED***"
npx tsx scripts/backfill/backfill-quotes.tsx
```

### Caracteristicas comunes de los scripts

- **Modo dry-run:** `--dry-run` para probar sin escribir
- **Idempotencia:** HEAD check antes de PUT; si el objeto ya existe en MinIO, se salta
- **Batches:** Procesa en lotes de 5 documentos
- **Checksum:** Calcula SHA-256 de cada PDF y lo guarda en `minio_files`
- **Trazabilidad:** Registra `source_table` y `source_id` en `minio_files`

---

## 12. Variables de entorno de Supabase

### Proyecto Supabase

| Variable | Valor |
|----------|-------|
| **URL del proyecto** | `https://takvthfatlcjsqgssnta.supabase.co` |
| **Proyecto ID** | `takvthfatlcjsqgssnta` |

### Variables configuradas en Supabase Secrets (Edge Functions)

Las siguientes variables se usan en las Edge Functions `minio-proxy` y `storage-health`:

| Secreto | Valor |
|---------|-------|
| `MINIO_ENDPOINT` | `http://100.117.250.115:9000` |
| `MINIO_ACCESS_KEY` | `nexo-worker` |
| `MINIO_SECRET_KEY` | `***REDACTED***` |
| `MINIO_BUCKET` | `nexo-prod` |
| `MINIO_REGION` | `us-east-1` |

### Clave de servicio (solo para scripts server-side)

| Variable | Valor |
|----------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_***REDACTED***` |

> **ADVERTENCIA:** La `SERVICE_ROLE_KEY` bypasea RLS completamente. NUNCA exponerla en el frontend.

---

## 13. Comandos utiles de administracion

### Conectarse al servidor

```powershell
ssh -i $env:USERPROFILE\.ssh\cursor_mcp mcpbot@100.117.250.115
```

### Ver estado del contenedor MinIO

```bash
docker ps --filter name=nexo-minio
docker logs nexo-minio --tail 50
```

### Healthcheck manual

```bash
curl -sf http://100.117.250.115:9000/minio/health/live && echo " LIVE_OK"
curl -sf http://100.117.250.115:9000/minio/health/ready && echo " READY_OK"
```

### Listar objetos en el bucket

```bash
docker exec nexo-minio mc ls local/nexo-prod/ --recursive --summarize
```

### Listar estructura de carpetas

```bash
docker exec nexo-minio mc ls local/nexo-prod/fiscal/
docker exec nexo-minio mc ls local/nexo-prod/fiscal/2026/T1/
```

### Ver espacio en disco

```bash
du -sh /home/mcpbot/minio-data
df -h /home/mcpbot/minio-data
```

### Reiniciar MinIO

```bash
cd /opt/nexo-ai-v3/nexo-minio
docker compose restart minio
```

### Parar MinIO

```bash
cd /opt/nexo-ai-v3/nexo-minio
docker compose stop minio
```

### Arrancar MinIO

```bash
cd /opt/nexo-ai-v3/nexo-minio
docker compose up -d minio
```

### Usar mc (MinIO Client) como root

```bash
PASS=$(grep MINIO_ROOT_PASSWORD /opt/nexo-ai-v3/nexo-minio/.env | sed "s/MINIO_ROOT_PASSWORD=//")
docker exec nexo-minio mc alias set local http://localhost:9000 nexo-admin "$PASS"
```

### Usar mc como worker

```bash
WPASS=$(grep WORKER_PASSWORD /opt/nexo-ai-v3/nexo-minio/.env | sed "s/WORKER_PASSWORD=//")
docker exec nexo-minio mc alias set worker http://localhost:9000 nexo-worker "$WPASS"
```

### Administrar usuarios

```bash
# Listar usuarios
docker exec nexo-minio mc admin user ls local

# Cambiar password de nexo-worker (si necesario)
NEW_PASS=$(openssl rand -base64 32)
docker exec nexo-minio mc admin user add local nexo-worker "$NEW_PASS"
# IMPORTANTE: Actualizar tambien en:
#   1. /opt/nexo-ai-v3/nexo-minio/.env (WORKER_PASSWORD)
#   2. Supabase Secrets (MINIO_SECRET_KEY)
#   3. Cualquier script que use estas credenciales
```

---

## 14. Troubleshooting

### MinIO no arranca

```bash
# Ver logs detallados
docker logs nexo-minio

# Verificar que el directorio de datos existe y tiene permisos
ls -la /home/mcpbot/minio-data

# Verificar que el puerto no esta ocupado
ss -tlnp | grep -E '9000|9001'

# Verificar docker-compose
cd /opt/nexo-ai-v3/nexo-minio
docker compose config  # Valida el YAML
```

### Presigned URL no funciona desde el frontend

1. **Verificar que Tailscale esta activo** en la maquina que ejecuta la Edge Function (Supabase Cloud)
   - Las Edge Functions de Supabase se ejecutan en la nube. Para que lleguen a MinIO, el endpoint `http://100.117.250.115:9000` debe ser accesible desde Supabase.
   - **Solucion actual:** MinIO esta en la IP Tailscale. Supabase puede alcanzarlo si tiene configurado Tailscale o si el firewall lo permite.

2. **Verificar los secretos de Supabase:**
   - Dashboard > Settings > Edge Functions > Secrets
   - Confirmar que `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` estan correctos

3. **Ver logs de la Edge Function:**
   - Dashboard > Edge Functions > minio-proxy > Logs

### El PDF archivado no se muestra

1. Verificar que el documento tiene `storage_key` en la BD:
   ```sql
   SELECT invoice_number, storage_key FROM sales.invoices WHERE id = '<uuid>';
   ```

2. Verificar que el archivo existe en MinIO:
   ```bash
   docker exec nexo-minio mc stat local/nexo-prod/<storage_key>
   ```

3. Verificar que hay un registro correspondiente en `minio_files`:
   ```sql
   SELECT * FROM public.minio_files WHERE key = '<storage_key>';
   ```

### Error de "signature does not match" en mc

Puede ocurrir si la password contiene caracteres `=`. Usar `sed` en lugar de `cut`:

```bash
# MAL (se rompe con = en la password):
PASS=$(grep MINIO_ROOT_PASSWORD .env | cut -d= -f2)

# BIEN:
PASS=$(grep MINIO_ROOT_PASSWORD .env | sed "s/MINIO_ROOT_PASSWORD=//")
```

### Script de backfill falla con "React is not defined"

El script necesita React global para JSX. Verificar que esta al inicio del archivo:

```typescript
import React from "react";
(globalThis as any).React = React;
```

---

## 15. Estructura de archivos del proyecto

### Archivos creados durante U1

```
# Frontend
src/pages/nexo_av/desktop/components/common/ArchivedPDFViewer.tsx    # NUEVO
src/pages/nexo_av/desktop/styles/components/common/archived-pdf-viewer.css  # NUEVO

# Scripts de backfill
scripts/backfill/package.json              # NUEVO
scripts/backfill/package-invoices.json     # NUEVO
scripts/backfill/backfill-purchases.mjs    # NUEVO
scripts/backfill/backfill-invoices.tsx     # NUEVO
scripts/backfill/backfill-quotes.tsx       # NUEVO
```

### Archivos modificados en U1

```
# Frontend — logica dual de preview
src/pages/nexo_av/desktop/pages/InvoiceDetailPage.tsx
src/pages/nexo_av/desktop/pages/QuoteDetailPage.tsx
src/pages/nexo_av/desktop/pages/PurchaseInvoiceDetailPage.tsx
```

### Archivos creados/modificados en U2

```
# NUEVOS
src/pages/nexo_av/desktop/styles/components/pages/file-explorer.css   # Estilos del explorador

# MODIFICADOS (reescritos)
src/pages/nexo_av/desktop/pages/ReportsPage.tsx                       # Explorador de documentacion completo
src/pages/nexo_av/desktop/pages/ProductDetailPage.tsx                  # Tab "Imagenes"
supabase/functions/minio-proxy/index.ts                                # +3 acciones (upload_to_custom_folder, upload_to_catalog_product, confirm_custom_upload)
```

### Archivos en el servidor ALB357

```
/opt/nexo-ai-v3/nexo-minio/docker-compose.yml   # Configuracion Docker de MinIO
/opt/nexo-ai-v3/nexo-minio/.env                  # Credenciales MinIO
/home/mcpbot/minio-data/                          # Datos del bucket (PDFs)
```

### Edge Functions en Supabase

```
minio-proxy        # U1: Presigned URLs + listado + upload modelos
                   # U2: + upload_to_custom_folder + upload_to_catalog_product + confirm_custom_upload
                   #     (despliegue U2 pendiente — InternalServerErrorException transitorio)
storage-health     # EXISTENTE — Ya usaba MinIO SDK (no modificada)
```

### Migraciones aplicadas en Supabase

```
# U1 — Instalacion inicial
20260217112208  add_fiscal_fields_and_storage_keys     # storage_key + campos fiscales
20260217112712  add_storage_key_to_detail_rpcs          # RPCs actualizadas
20260217113328  add_backfill_helper_rpcs                # RPCs temporales para backfill

# U2 — Explorador de Documentacion + Catalogo
20260217121416  split_compras_into_facturas_and_tickets          # Separar compras
20260217121520  fix_fiscal_quarter_data_rpc                      # RPC datos trimestrales
20260217123031  rename_ventas_presupuestos_original_name         # Formato Nº - Cliente.pdf
20260217123109  create_minio_custom_folders                      # Tabla carpetas + FK
20260217125656  create_get_catalog_explorer_tree_rpc             # RPC arbol catalogo
20260217130227  create_get_catalog_product_storage_path_rpc      # RPC path producto MinIO
```

---

---

## 16. U2: Explorador de Documentacion

### Descripcion general

La pagina "Documentacion" (`ReportsPage.tsx`) se transformo en un explorador de archivos tipo Windows Explorer con tres nodos raiz:

```
Documentacion/
├── Contabilidad/            # Archivo fiscal (U1)
│   ├── 2025/
│   │   └── T4/
│   │       ├── Presupuestos/
│   │       ├── Facturas de Venta/
│   │       ├── Facturas de Compra/
│   │       └── Tickets y Gastos/
│   └── 2026/
│       └── T1/ ...
│
├── Catalogo/                # Nuevo (U2)
│   ├── [Productos]/
│   │   ├── {Categoria}/
│   │   │   ├── {Subcategoria}/
│   │   │   │   └── {Producto SKU} (imagenes)
│   │   │   └── {Producto sin subcategoria}
│   │   └── Sin categoria/
│   └── [Servicios]/
│       └── {Categoria}/ ...
│
└── {Carpetas personalizadas}/   # Nuevo (U2)
    ├── Contratos/
    │   └── contrato-alquiler.pdf
    └── Recursos Humanos/
        └── ...
```

### Componente principal

**Archivo:** `src/pages/nexo_av/desktop/pages/ReportsPage.tsx`

### Funcionalidades implementadas

| Funcionalidad | Descripcion |
|----------------|-------------|
| **Arbol navegable** | Sidebar izquierdo con estructura jerarquica expandible |
| **Breadcrumbs** | Ruta de navegacion interactiva para cada nivel |
| **Contabilidad** | Nodo raiz que agrupa anos > trimestres > tipos de documento |
| **Catalogo** | Nodo raiz con categorias > subcategorias > productos del ERP |
| **Carpetas personalizadas** | Creacion de carpetas anidadas (profundidad ilimitada) |
| **Subida de archivos** | A carpetas personalizadas y productos del catalogo |
| **Progreso de subida** | Barra de progreso en tiempo real via XHR |
| **Preview lateral** | Vista previa de PDF/imagenes al seleccionar archivo |
| **Excel trimestral** | Descarga de resumen con hojas: Resumen, Ventas, Compras y Tickets |
| **Renombrado inteligente** | Ventas/Presupuestos muestran `Nº - Cliente.pdf` |
| **Badges de tipo** | Etiquetas visuales (PDF, XLSX, IMG) con iconos |
| **Barra de estado** | Contadores de archivos, carpetas y productos |

### Sistema de tipos: `SelectedPath` (discriminated union)

```typescript
type FiscalPath = {
  type: "fiscal";
  year: number;
  quarter: number;
  docType: string;
};

type CustomPath = {
  type: "custom";
  folderId: string;
};

type CatalogPath = {
  type: "catalog";
  productId: string;
};

type SelectedPath = FiscalPath | CustomPath | CatalogPath | null;
```

### Tabla: `public.minio_custom_folders`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador unico |
| `name` | TEXT | Nombre de la carpeta |
| `parent_id` | UUID (FK → self) | Carpeta padre (NULL = nivel raiz) |
| `created_by` | UUID (FK → auth.users) | Usuario creador |
| `created_at` | TIMESTAMPTZ | Fecha de creacion |
| `updated_at` | TIMESTAMPTZ | Fecha de ultima modificacion |

**RLS:** Lectura para todos los usuarios autenticados.

### Columna nueva en `minio_files`

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `custom_folder_id` | UUID (FK → minio_custom_folders) | Asocia archivo a carpeta personalizada |

### Estilos

**Archivo:** `src/pages/nexo_av/desktop/styles/components/pages/file-explorer.css`

Se anadieron estilos para:
- Nodos del arbol (catalogo root, dominio, categoria, producto)
- Iconos por tipo de archivo (imagen, PDF)
- Badges de tipo (`img`, `pdf`, `xlsx`)
- Hover y seleccion activa de nodos
- Grid responsive para galeria de imagenes

---

## 17. U2: Catalogo de productos con imagenes

### Objetivo

Sincronizacion bidireccional de imagenes entre el catalogo (explorador de documentacion) y las paginas de detalle de producto. La meta final es automatizar la documentacion de productos para presupuestos.

### Flujo de sincronizacion

```
                  ┌──────────────────────┐
                  │    minio_files        │ ← Fuente unica de verdad
                  │ (source_table =       │
                  │  'catalog.products')  │
                  └────────┬─────────────┘
                           │
              ┌────────────┼────────────┐
              │                         │
    ┌─────────▼─────────┐   ┌──────────▼──────────┐
    │  ReportsPage       │   │  ProductDetailPage   │
    │  (Catalogo nodo)   │   │  (Tab "Imagenes")    │
    │                    │   │                      │
    │  - Navega arbol    │   │  - Grid thumbnails   │
    │  - Sube imagenes   │   │  - Sube imagenes     │
    │  - Preview files   │   │  - Soft-delete       │
    └────────────────────┘   └──────────────────────┘
```

Ambas vistas leen y escriben en la misma tabla `minio_files` filtrada por `source_table = 'catalog.products'` y `source_id = {product_uuid}`. Cualquier imagen subida desde una vista aparece automaticamente en la otra.

### Estructura de keys en MinIO

```
catalog/{category-slug}/{subcategory-slug}/{product-sku}/{filename}
```

**Ejemplos:**
- `catalog/audio/altavoces/PROD-001/foto-frontal.jpg`
- `catalog/iluminacion/focos-led/SRV-042/ficha-tecnica.pdf`
- `catalog/sin-categoria/PACK-007/imagen-principal.png`

La ruta se resuelve dinamicamente mediante la RPC `get_catalog_product_storage_path()` que recorre la cadena de categorias padre recursivamente.

### RPC: `get_catalog_explorer_tree()`

**Uso:** Frontend llama una sola vez al montar el componente. Retorna todo el arbol.

```typescript
const { data } = await supabase.rpc("get_catalog_explorer_tree");
// data = {
//   categories: [{ id, name, slug, parent_id, domain, sort_order }],
//   products: [{ id, sku, name, product_type, category_id }],
//   image_counts: { "uuid-1": 3, "uuid-2": 1 }
// }
```

### RPC: `get_catalog_product_storage_path(p_product_id)`

**Uso:** Edge Function `minio-proxy` la llama para construir la key antes de generar la presigned URL.

```typescript
const { data } = await svc.rpc("get_catalog_product_storage_path", {
  p_product_id: productId
});
// data = {
//   ok: true,
//   sku: "PROD-001",
//   name: "Altavoz XYZ",
//   product_type: "product",
//   category_slugs: ["audio", "altavoces"]
// }
// Key resultante: catalog/audio/altavoces/PROD-001/{filename}
```

### Accion `upload_to_catalog_product` (minio-proxy)

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `product_id` | UUID | Si | ID del producto en `catalog.products` |
| `filename` | string | Si | Nombre del archivo (ej: `foto.jpg`) |
| `mime_type` | string | Si | MIME type (ej: `image/jpeg`) |
| `size_bytes` | number | Si | Tamano en bytes |

**Validaciones:**
1. El producto debe existir y estar activo
2. Extension debe estar en `CATALOG_ALLOWED_EXTENSIONS` (`jpg`, `jpeg`, `png`, `webp`, `pdf`)
3. Tamano maximo: 50 MB
4. HEAD check: no sobreescribir si ya existe en MinIO

**Respuesta exitosa:**
```json
{
  "url": "https://...",
  "file_id": "uuid-del-registro-en-minio-files"
}
```

### Galeria de imagenes en ProductDetailPage

**Archivo:** `src/pages/nexo_av/desktop/pages/ProductDetailPage.tsx`

Se anadio un tab "Imagenes" con las siguientes funcionalidades:

| Funcionalidad | Descripcion |
|----------------|-------------|
| **Grid de thumbnails** | Muestra imagenes con presigned URLs (thumbnails) |
| **Subida con progreso** | Boton "Subir imagen" con barra de progreso |
| **Soft-delete** | Marca `deleted_at` en `minio_files` (no borra de MinIO) |
| **Formatos soportados** | `jpg`, `jpeg`, `png`, `webp`, `pdf` |
| **Solo admin** | Boton de subir y eliminar solo visible para rol `admin` |
| **Contador** | Header muestra `N imagenes` |
| **Icono generico** | PDFs muestran icono en lugar de thumbnail |

### Estado de despliegue del minio-proxy

> **NOTA:** La ultima version del `minio-proxy` con la accion `upload_to_catalog_product` fue escrita localmente pero su despliegue fallo repetidamente con `InternalServerErrorException` en Supabase. El codigo esta guardado en `supabase/functions/minio-proxy/index.ts`. Se debe reintentar el despliegue cuando el servicio este estable.

**Archivo local:** `supabase/functions/minio-proxy/index.ts`

**Para redesplegar:**
```bash
# Desde Supabase CLI
supabase functions deploy minio-proxy --project-ref takvthfatlcjsqgssnta

# O via el dashboard de Supabase:
# Dashboard > Edge Functions > minio-proxy > Deploy
```

### Archivos creados/modificados en U2

```
# NUEVOS
src/pages/nexo_av/desktop/styles/components/pages/file-explorer.css   # Estilos explorador

# MODIFICADOS
src/pages/nexo_av/desktop/pages/ReportsPage.tsx                       # Reescritura completa (explorador)
src/pages/nexo_av/desktop/pages/ProductDetailPage.tsx                  # Tab "Imagenes" con galeria
supabase/functions/minio-proxy/index.ts                                # 3 acciones nuevas
```

### Migraciones aplicadas en U2

```
20260217121416  split_compras_into_facturas_and_tickets
20260217121520  fix_fiscal_quarter_data_rpc
20260217123031  rename_ventas_presupuestos_original_name
20260217123109  create_minio_custom_folders
20260217125656  create_get_catalog_explorer_tree_rpc
20260217130227  create_get_catalog_product_storage_path_rpc
```

---

> **Ultima actualizacion:** 17 de febrero de 2026 (U2)  
> **Autor:** Implementacion automatizada via Cursor AI  
> **Referencia:** `docs/important/archivo-fiscal-minio.md` (arquitectura completa)
