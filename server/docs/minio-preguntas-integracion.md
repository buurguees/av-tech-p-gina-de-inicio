# Respuestas para integrar MinIO en NEXO AV

Este documento responde **todas las preguntas** necesarias para integrar MinIO correctamente en la plataforma NEXO AV. Las respuestas están basadas en el análisis del **código fuente**, las **migraciones de Supabase** y la **documentación existente** del servidor y del sistema de archivos.

---

## 1️⃣ Arquitectura de la plataforma

### Backend

**¿Qué usas?**  
**Otro (sin backend tradicional).**

- La aplicación es un **frontend SPA** (React + Vite + TypeScript).
- No hay servidor Node.js (Express/Nest), ni Python (FastAPI/Django).
- Toda la lógica de negocio y acceso a datos se hace desde el **cliente** mediante:
  - **Supabase JS** (`@supabase/supabase-js`): Auth, base de datos (RPC, tablas), Storage.
- Las operaciones se ejecutan con **RPC** (funciones en PostgreSQL) y acceso directo a tablas vía Supabase client; no existe una API REST propia en otro proceso.

**¿El backend es monolito o API separada?**  
**Frontend y “backend” unidos:** una sola aplicación (frontend) que habla directamente con Supabase. No hay API intermedia; Supabase actúa como BFF (Backend for Frontend).

**¿Dónde se despliega?**  
**Firebase Hosting.**

- `package.json`: script `"deploy": "npm run build && firebase deploy"`.
- `firebase.json`: hosting sobre la carpeta `build`, rewrites a `/index.html` (SPA).
- El frontend se construye con Vite (`vite build`) y se publica en Firebase; la base de datos y el storage actual son de Supabase (cloud).

**Implicación para MinIO:**  
Para usar MinIO desde la app actual hace falta **algún componente que genere URLs firmadas y/o proxy** porque el frontend no puede (ni debe) tener credenciales de MinIO. Opciones: **Edge Functions de Supabase**, un **microservicio/API ligera** (Node/Deno) que solo exponga “crear presigned URL / listar por prefijo”, o un **backend futuro** en el servidor NEXCOM que ya se documenta en `server/`.

---

## 2️⃣ Base de datos (muy importante)

**¿Usas Supabase como DB principal?**  
**Sí.** Supabase (PostgreSQL) es la única base de datos de la aplicación.

**¿Tienes ya tablas tipo clientes, proyectos, facturas, compras?**  
**Sí.** Todas existen en esquemas concretos:

| Entidad            | Schema + tabla               | PK              | Identificador “legible” / negocio      |
|--------------------|------------------------------|-----------------|----------------------------------------|
| Clientes           | `crm.clients`                | `id` UUID       | `client_number` TEXT (ej. 124030)     |
| Proyectos          | `projects.projects`          | `id` UUID       | `project_number` TEXT (ej. 000008)     |
| Presupuestos venta | `sales.quotes`               | `id` UUID       | `quote_number` (ej. P-26-000001)       |
| Facturas de venta  | `sales.invoices`            | `id` UUID       | `invoice_number` (ej. F-26-000001)     |
| Facturas de compra | `sales.purchase_invoices`   | `id` UUID       | `invoice_number` + `internal_purchase_number` (C-26-000001, TICKET-26-000001) |
| Compras / gastos   | Misma tabla `sales.purchase_invoices` + `sales.purchase_invoice_lines` | — | Igual que arriba |
| Documentos escaneados | `public.scanned_documents` | `id` UUID    | — (solo `file_path`, `file_name`)      |

Referencias en migraciones:  
`20260105110052_*` (crm.clients), `20260112124624_add_client_number_field.sql`, `20260105110310_*` (projects.projects), `20260105110203_*` (sales.quotes), `20260115141628_*` (sales.invoices), `20260118200000_purchasing_module.sql` (sales.purchase_invoices), `20260118200142_*` (storage + purchase_invoices file_path/file_name).

**¿Cada entidad tiene un id único estable?**  
**Sí.**

- **UUID estable:** todas las tablas usan `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Identificadores de negocio únicos:**  
  - `crm.clients.client_number` UNIQUE  
  - `projects.projects.project_number` UNIQUE  
  - `sales.quotes.quote_number` UNIQUE  
  - Facturas de venta y compra: números generados por secuencias/funciones (ej. `get_next_quote_number`, `generate_internal_purchase_number`), con formato estable (F-YY-XXXXXX, C-YY-XXXXXX, TICKET-YY-XXXXXX).

**Uso para rutas en MinIO:**  
Las rutas en MinIO deben construirse con estos identificadores estables (client_number, project_number, quote_number, invoice_number, internal_purchase_number) para que sean legibles y coherentes con la BD. La documentación ya recoge esto en `server/docs/vision-sistema-archivos.md` (sección 7) y `server/docs/storage-minio.md` (prefijos y ejemplos de keys).

---

## 3️⃣ Modelo mental de archivos (clave)

**Cómo está pensado hoy (y cómo encaja con MinIO):**

**Factura (venta):**  
- Pertenece a un **proyecto** (`sales.invoices` tiene `project_id` → `projects.projects`) y por tanto a un **cliente** (proyecto → `client_id`).  
- En el modelo mental: **Factura → Proyecto → Cliente**.  
- Ruta lógica en MinIO: por ejemplo `billing/invoices/<invoice_number>/` o `clients/<client_id>/projects/<project_id>/invoices/`.

**Factura de compra / ticket (gasto):**  
- Puede ser **independiente** (sin proyecto) o **asociada a un proyecto** (`sales.purchase_invoices.project_id`).  
- Tiene documento en Supabase Storage: `file_path` + `file_name` en `sales.purchase_invoices`; ruta actual bucket `purchase-documents`: `<auth_user_id>/<filename>` o `<auth_user_id>/scanner/<filename>`.  
- Modelo mental: **Compras/tickets** pueden vivir bajo “Facturación/Compras” por periodo o bajo “Proyecto → Compras”.  
- Ruta en MinIO: p.ej. `purchases/invoices/<internal_purchase_number>/` o `projects/<project_id>/purchases/`.

**Proyecto:**  
- Puede tener: documentación, imágenes, contratos, planos.  
- En BD: `projects.projects`; documentos de proyecto hoy están en `sales.quote_documents` (por presupuesto) o en rutas genéricas de storage; no hay una tabla única “project_documents”.  
- Modelo mental deseado (visión): **todo dentro del mismo árbol** por proyecto, por ejemplo:  
  `projects/<project_number>/`  
  - `documentacion/`  
  - `imagenes/`  
  - `contratos/`  
  - `planos/`  
  - `facturas/` (venta)  
  - `compras/` (compras del proyecto)

**Cliente:**  
- Documentos “del cliente” (no de un proyecto concreto): contratos marco, datos fiscales, etc.  
- Ruta: `clients/<client_number>/` con subcarpetas (documentos, proyectos, facturas, etc.).

Esto está alineado con los **grupos de contenido** de `vision-sistema-archivos.md`: RRHH, Facturación, Clientes, Producto, Marketing, Administración, Contabilidad. Las rutas en MinIO deben reflejar este árbol (clientes → proyectos → facturas/documentación/compras, etc.).

---

## 4️⃣ Navegación tipo Windows (UI)

Lo que tiene sentido para el usuario (sin pensar en MinIO) y que la UI puede construir con **prefijos/carpetas virtuales** sobre MinIO:

```text
Clientes
 └── Cliente X (client_number / company_name)
     ├── Documentos          (clients/<id>/documentos/)
     ├── Proyectos
     │   └── Proyecto Y (project_number)
     │       ├── Facturas    (venta: billing o projects/.../invoices)
     │       ├── Compras     (purchases o projects/.../purchases)
     │       ├── Imágenes
     │       ├── Documentación
     │       └── Planos / Contratos
     └── Facturación        (facturas de venta del cliente)

Facturación (global)
 ├── Presupuestos (P-YY-XXXXXX)
 ├── Facturas venta (F-YY-XXXXXX)
 └── Compras / Tickets (C-YY-XXXXXX, TICKET-YY-XXXXXX)

Producto
 └── Por SKU / categoría (product/<sku>/...)

RRHH, Marketing, Administración, Contabilidad
 └── Según grupos en vision-sistema-archivos.md
```

La UI puede listar “carpetas” y “archivos” mediante **listado por prefijo** en MinIO; cada “carpeta” es un prefijo; no hace falta que MinIO tenga concepto de carpeta, solo keys con `/`.

---

## 5️⃣ Seguridad y permisos

**Roles de usuario (en BD):**  
Definidos en `internal.roles` (nombre) y asignados vía `internal.user_roles` a `internal.authorized_users`. Valores de rol en código y migraciones:

- **admin**
- **manager**
- **sales** (comercial)
- **tech** (técnico)
- **readonly**

Fuente: migración `20260105105924_*` (INSERT INTO internal.roles).  
El frontend obtiene roles con `supabase.rpc('get_current_user_info')`, que devuelve entre otros `roles: string[]` (nombres de rol). Comprobaciones típicas: `userInfo?.roles?.includes('admin')`, `roles?.includes('tecnico')` o `'tech'`.

**¿Existe rol “cliente” (acceso externo)?**  
**No.** Solo usuarios internos (authorized_users vinculados a auth.users). No hay rol “cliente” ni portal de cliente en el análisis del código.

**¿Un usuario puede ver archivos de otros clientes?**  
- Hoy en **Supabase Storage** las políticas del bucket `purchase-documents` permiten SELECT/INSERT a `authenticated` sin filtrar por cliente.  
- La **lógica de negocio** (qué facturas/proyectos ve cada uno) está en RLS y en las pantallas (listados por RPC); no hay hoy restricción “solo mis clientes” a nivel de storage.  
- Para MinIO: **la autorización debe hacerla la aplicación (o el backend que genere presigned)**: comprobar rol y que el recurso (cliente/proyecto/factura) pertenezca al contexto permitido para ese usuario. MinIO no sabe de usuarios finales.

**¿Puede subir archivos?**  
Sí, los usuarios autenticados con los que se usa la app (admin, manager, sales, tech) suben hoy a Supabase Storage (gastos, escáner, logo empresa). Con MinIO, quien genere la presigned URL debe comprobar que el usuario tenga permiso para subir en ese “contexto” (proyecto, cliente, factura, etc.).

**¿Puede borrar?**  
En la app se borra (ej. documento escaneado no asignado, logo empresa). Con MinIO, igual: solo si la política de negocio lo permite; el backend/Edge Function que exponga “borrar” debe comprobar rol y pertenencia del recurso.

**Resumen:**  
- **Admin y Manager:** en la práctica acceso completo (documentado en vision-sistema-archivos y en código).  
- **Sales, tech, readonly:** permisos más granulares según pantalla/RPC; permisos por “grupo de archivos” (RRHH, Facturación, etc.) están en standby en la visión.  
- MinIO: solo almacén; **permisos = aplicación (o capa que genera presigned y recibe las peticiones)**.

---

## 6️⃣ Flujo de subida y descarga

**¿Desde dónde se suben los archivos?**  
- **Navegador (desktop):** sí (ExpensesPage, PurchaseInvoicesPage, ScannerPage, ConvertPOToInvoiceDialog, CompanyDataTab).  
- **Móvil:** sí (MobileScannerPage, etc.: mismo bucket `purchase-documents`).  
- **Integraciones (futuro):** no implementado aún; el diseño puede preverlo.

**¿Subida directa a MinIO (presigned) o siempre pasando por backend?**  
- **Hoy con Supabase:** subida **directa desde el cliente** al bucket (`supabase.storage.from('...').upload(...)`); el navegador usa el token de sesión Supabase (Auth).  
- **Con MinIO:**  
  - **Recomendado:** **subida/descarga con URLs firmadas (presigned)** generadas por un backend/Edge Function que: (1) valide sesión/rol, (2) decida la key (ruta) según entidad y permisos, (3) devuelva la URL. El cliente sube/descarga directo a MinIO con esa URL, sin que las credenciales de MinIO estén en el frontend.  
  - “Siempre pasando por backend” en el sentido de “siempre hay un paso que valida y genera la URL”; el binario puede ir directo al bucket vía presigned.

---

## 7️⃣ Metadatos que quieres guardar

**Ejemplo que propones:**

```json
{
  "id": "uuid",
  "bucket": "nexo-prod",
  "path": "clientes/123/facturas/factura_001.pdf",
  "size": 234234,
  "mime": "application/pdf",
  "owner_type": "factura",
  "owner_id": "factura_id",
  "created_by": "user_id"
}
```

**¿Encaja?**  
Sí. Es coherente con lo que ya se hace en la app (entidad + id + path) y con lo descrito en `storage-minio.md` (metadatos en Supabase, binario en MinIO).

**Recomendaciones y añadidos según tu BD y visión:**

1. **Dónde guardarlo:** en **Supabase** (tabla tipo `storage_objects` o `file_registry`), no en MinIO como único sitio. MinIO guarda el objeto y sus metadatos S3; la app necesita consultar por `owner_type`/`owner_id`/`prefix` y controlar permisos, por eso conviene una tabla en Postgres.
2. **owner_type** según entidades reales: `client`, `project`, `invoice` (venta), `purchase_invoice`, `quote`, `product`, `scanned_document`, `company_asset`, etc.
3. **owner_id:** UUID de la entidad (id de factura, proyecto, cliente…) para unión con las tablas existentes.
4. **path:** la **key** completa en MinIO (ej. `clients/124030/projects/000008/facturas/F-26-000001.pdf`), para no duplicar lógica.
5. **created_at / updated_at:** útiles para listados ordenados y auditoría.
6. **document_type** (opcional): como en `sales.quote_documents` y en `purchase_invoices` (quote, invoice, delivery_note, photo, ticket, etc.) para filtrar por tipo.
7. **original_name:** nombre de archivo original (como en `file_name` en purchase_invoices y scanned_documents).
8. **checksum** (opcional): para integridad, como se menciona en storage-minio.

Ejemplo ampliado:

```json
{
  "id": "uuid",
  "bucket": "nexo-prod",
  "path": "clients/124030/projects/000008/invoices/F-26-000001.pdf",
  "size": 234234,
  "mime": "application/pdf",
  "owner_type": "invoice",
  "owner_id": "uuid-de-la-factura",
  "document_type": "invoice",
  "original_name": "factura_001.pdf",
  "created_by": "user_id",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "checksum": "opcional"
}
```

Con esto se puede listar “todos los archivos de este proyecto” o “todas las facturas de este cliente” y generar presigned URLs para cada `path` validando permisos por `owner_type` y `owner_id`.

---

## Resumen ejecutivo

| Tema | Respuesta breve |
|------|-----------------|
| Backend | Sin backend tradicional; frontend + Supabase (RPC, Auth, Storage). |
| Despliegue | Firebase Hosting (build estático). |
| Base de datos | Supabase (PostgreSQL); tablas clientes, proyectos, facturas, compras con UUID + IDs de negocio estables. |
| IDs para rutas | client_number, project_number, quote_number, invoice_number, internal_purchase_number (ver vision-sistema-archivos). |
| Modelo archivos | Factura venta → proyecto → cliente; compras/tickets pueden ser por proyecto o globales; proyecto = árbol documentación/imágenes/contratos/planos. |
| Navegación UI | Clientes → Cliente → Documentos / Proyectos → Proyecto → Facturas, Compras, Imágenes, etc.; más Facturación global y Producto/RRHH/Marketing/Admin/Contabilidad. |
| Roles | admin, manager, sales, tech, readonly; sin rol “cliente”. Permisos finos por grupo en standby; MinIO no aplica permisos de app. |
| Subida/descarga | Hoy directo a Supabase desde navegador/móvil; con MinIO: presigned URLs generadas por backend/Edge Function que valide sesión y contexto. |
| Metadatos | Tabla en Supabase con bucket, path, size, mime, owner_type, owner_id, created_by, created_at, document_type, original_name; opcional checksum. |

Este documento sirve como **especificación de integración** para quien implemente la capa entre NEXO AV y MinIO (API/Edge Functions, esquema de metadatos y políticas de permisos).
