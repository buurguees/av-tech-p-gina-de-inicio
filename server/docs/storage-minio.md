# 🗄️ Storage – MinIO (S3 privado) para NEXO AV

Este documento describe el **paso de implementación del storage de archivos** en el servidor `nexo-storage` usando **MinIO** (S3-compatible) sobre Docker.

**Objetivo**: almacenar y servir (con control) todos los archivos de NEXO AV:

* Facturas, presupuestos, compras
* Documentación de clientes y proyectos
* Imágenes, recursos, anexos
* Archivos de producto (fichas, manuales, renders)

La navegación estilo "Windows" se construirá **dentro de NEXO AV** mediante "carpetas virtuales" basadas en **prefijos** (`prefix/`) de S3.

---

## 0) Principios de diseño (importante)

* **Supabase** se usa para datos transaccionales y metadatos (quién sube, permisos, entidad vinculada, etc.).
* **MinIO** se usa para el **binario** (el archivo real) y para generar URLs firmadas.
* **No se expone** MinIO a Internet de forma directa; acceso recomendado por **VPN (Tailscale)**.
* Persistencia total en SSD: **todo vive en `/mnt/storage`**.

---

## 1) Arquitectura

### 1.1 Componentes

* **MinIO Server**: API S3 + consola web
* **MinIO Client (mc)**: herramienta para crear buckets, usuarios y políticas
* **NEXO AV backend**: genera/solicita URLs firmadas (presigned) y guarda metadatos

### 1.2 Puertos

* `9000/tcp` → API S3
* `9001/tcp` → Consola web

> Nota: estos puertos deben estar accesibles **solo** por red privada/VPN.

---

## 2) Estructura de directorios en SSD

Ubicación estándar en el servidor:

```text
/mnt/storage
├─ services/
│  └─ minio/
│     ├─ data/    # datos (objetos S3)
│     └─ config/  # configuración MinIO
└─ compose/
   └─ minio/
      └─ docker-compose.yml
```

**Regla**: no colocar datos de servicios dentro de `/mnt/storage/docker`.

---

## 3) Convención de buckets y prefijos

### 3.1 Buckets (recomendación)

Mantener pocos buckets para simplificar:

* `nexo-prod` → producción
* `nexo-staging` → pruebas (opcional)
* `nexo-public` → público (opcional, solo si algún día se publican assets)

### 3.2 Prefijos base dentro de `nexo-prod`

```text
clients/
projects/
billing/
purchases/
product/
hr/
marketing/
admin/
accounting/
```

### 3.3 Ejemplos de rutas (keys) por entidad

* Cliente: `clients/<client_id>/...`
* Proyecto: `projects/<project_id>/...`
* Presupuesto: `billing/quotes/P-YY-000001/...`
* Factura: `billing/invoices/F-YY-000001/...`
* Compra: `purchases/invoices/C-YY-000001/...`
* Producto (SKU): `product/<sku>/...`

> Estas rutas permiten construir el explorador tipo Windows usando prefijos.

---

## 4) Seguridad y roles

### 4.1 Usuarios MinIO

* `root` (admin): solo para administración puntual.
* `nexo_app` (aplicación): credenciales usadas por el backend de NEXO AV.
* (opcional) `nexo_ops` (operaciones): para tareas internas/automatizaciones.

### 4.2 Políticas

* `nexo_app` debe tener permisos **limitados** al bucket `nexo-prod`.
* Para "borrar" y "mover", se requieren permisos de `DeleteObject` y `PutObject`.
* Se recomienda operar mediante **URLs firmadas** generadas por el backend.

---

## 5) Integración con NEXO AV (contrato mínimo)

### 5.1 Metadatos en Supabase

Por cada archivo, NEXO AV guarda:

* `bucket` (ej: `nexo-prod`)
* `key` (ej: `projects/000008/docs/plano.pdf`)
* `entity_type` (client/project/invoice/purchase/product)
* `entity_id`
* `document_type` (quote, invoice, delivery_note, photo, etc.)
* `uploaded_by`
* `mime_type`, `size_bytes`, `checksum` (opcional)
* `created_at`

### 5.2 Operaciones MVP

* Listar por `prefix` (carpetas + archivos)
* Subir (presigned PUT/POST)
* Descargar (presigned GET)
* Mover/Renombrar (copy+delete)

---

## 6) Observabilidad y backups

* Los datos de MinIO viven en `/mnt/storage/services/minio/data`.
* Backups recomendados (más adelante):

  * snapshot de directorio + rotación
  * exportación de configuración/policies

---

## 7) Checklist del paso (lo que vamos a ejecutar)

> Importante: **no ejecutar todavía**. Esto es el plan.

1. Crear carpetas de MinIO en SSD
2. Crear `docker-compose.yml` de MinIO
3. Levantar MinIO y verificar (API + consola)
4. Crear buckets (`nexo-prod`, etc.)
5. Crear usuario `nexo_app` y policy
6. Prueba de subida/descarga (URL firmada o `mc`)
7. Documentar "key schema" final por módulo de NEXO AV

---

## 8) Notas de operación

* MinIO se gestiona siempre por `docker compose`.
* Actualizaciones: se actualiza la imagen y se reinicia el servicio.
* Nunca se deben almacenar archivos "a mano" fuera de MinIO si queremos consistencia con NEXO AV.

---

**Última actualización:** Febrero 2026
