# Visión: Sistema de archivos propio NEXO AV

Documento que resume la **idea inicial y el diseño** del servidor de almacenamiento de archivos como alternativa a SharePoint, integrado con la plataforma NEXO AV. Los datos de la sección **7 (IDs)** y **estado actual** están contrastados con la base de datos y el código de NEXO AV.

---

## 0. Estado actual en NEXO AV (referencia)

- **Base de datos:** Supabase (PostgreSQL). Datos transaccionales, usuarios, facturas, proyectos, catálogo, etc.
- **Almacenamiento de archivos hoy:** Supabase Storage. Buckets en uso:
  - `purchase-documents`: documentos de facturas de compra, tickets (gastos), escáner (rutas con `.../scanner/...` para móvil/escritorio).
  - `company-assets`: recursos de la empresa (p. ej. configuración/company data).
- **Roles:** la plataforma usa `get_current_user_info` (RPC) que devuelve un array `roles`. Se comprueba `roles?.includes('admin')` para acciones de administrador; Admin y Manager tienen acceso completo. Los permisos por grupo de archivos están en standby.
- **Numeración:** generada en la BD (secuencias, funciones `get_next_*`). Ver tabla en sección 7.

---

## 1. Contexto

- La **plataforma NEXO AV** utiliza **Supabase** como base de datos. Esto es correcto, funciona y es muy útil.
- **SharePoint y el ecosistema Microsoft** son complejos de integrar con una plataforma vía APIs y otras herramientas.
- Por ello se plantea un **servidor de almacenamiento de archivos propio**: un equipo **NEXCOM ALB357** (procesador Intel, 8 GB RAM) que actúe como **almacén de datos** (documentos, facturas, imágenes, etc.), no como sustitución de Supabase para datos transaccionales.

---

## 2. Objetivo del servidor

- Ser el **almacenamiento de archivos** de la empresa.
- La **plataforma NEXO AV** se conecta al servidor mediante **API** para:
  - **Guardar** documentos (facturas, tickets, presupuestos, imágenes, etc.).
  - **Consultar** y listar archivos según permisos y contexto (cliente, proyecto, tipo).
- En el futuro el servidor puede albergar también:
  - (Futuro) Modelos de **IA** para consultas, cálculos y trabajo con datos.
  - (Futuro) **CMS de contenidos** para equipos que emiten contenidos en los clientes.

Si hace falta más rendimiento, más adelante se puede sustituir el NEXCOM por un equipo más potente; la estructura y la documentación deben permitir esa migración.

---

## 3. Decisiones técnicas (a desarrollar)

- **Imagen del NEXCOM:** servidor (p. ej. Ubuntu Server) vs escritorio: se recomienda **imagen de servidor** para estabilidad, menos consumo y gestión remota. Ver [README.md](../README.md) y [docker.md](docker.md).
- **Programas para guardar datos:** los datos los guarda la **plataforma** vía API; en el servidor bastan **sistema de archivos** bien estructurado y **servicios** (API, opcionalmente SMB/NFS para acceso en red local). No es necesario “un programa” tipo SharePoint en el NEXCOM; la lógica está en NEXO AV + API.
- **Conexión con la plataforma:**
  - **Tailscale** (o similar VPN mesh) para acceso seguro desde la plataforma (hosteada en cloud) al servidor en la red de la empresa.
  - Otras opciones: túneles (Cloudflare Tunnel, ngrok, etc.) según se decida en implementación.
  - Objetivo: la plataforma pueda llamar a la API del servidor de forma segura sin exponer puertos a internet.

---

## 4. Requisitos clave del sistema de archivos

### 4.1 Trazabilidad por usuario

- Cada usuario debe usar una **API identificada** (token o API key por usuario, o usuario en cada petición).
- Todas las acciones (crear, modificar, mover, eliminar) deben quedar registradas con **“modificado por”** (o “creado por”) para auditoría y control interno.

### 4.2 Acceso remoto (fuera de la red del servidor)

- Necesidad de **acceder a los archivos desde los ordenadores del equipo** (fuera de la red donde está el NEXCOM):
  - Presentar modelos a Hacienda.
  - Presentar informes.
  - Ver, descargar y trabajar con documentos.
- Objetivo: tener un **“SharePoint propio y privado”**: misma idea de repositorio centralizado y accesible, pero bajo nuestro control.
- Opciones a implementar: acceso vía **plataforma NEXO AV** (listados, descargas, subidas) y/o **acceso directo** (SMB/NFS sobre VPN, sync tipo Nextcloud, etc.) según se decida.

### 4.3 Estructura de carpetas

- Estructura **muy clara**: cliente → proyecto → documentos, y equivalentes por grupo (RRHH, Facturación, etc.).
- Nombres de carpetas y archivos alineados con los **IDs internos** de la plataforma (ver sección 7).
- Desde la **plataforma** se podrá consultar (según rol) los archivos que correspondan; por ahora **Admin y Manager** pueden acceder a todo (roles más finos en standby).

---

## 5. Grupos de contenido (carpetas / “buckets” lógicos)

Hoy la plataforma usa **Supabase Storage** (buckets `purchase-documents`, `company-assets`). Los **grupos** siguientes son el objetivo para el **servidor de archivos propio**: pueden mapearse a rutas en disco y/o a “buckets” o namespaces en la API. La idea de **tres buckets** comentada en contexto se puede concretar en algo como:

- Un bucket/área **operativa** (facturación, clientes, proyectos).
- Un bucket/área **recursos** (producto, marketing, RRHH).
- Un bucket/área **corporativo** (administración, contabilidad).

A nivel lógico, los grupos son:

| Grupo | Contenido |
|-------|-----------|
| **RRHH** | Documentos por trabajador/socio, herramientas, EPIs, documentación de máquinas, vehículos, etc. |
| **Facturación** | Compras y ventas separadas por mes, trimestre, etc. Facturas con nombres normalizados. |
| **Clientes** | Proyectos, presupuestos, facturas de proyectos, documentos de proyecto, imágenes de final de proyecto. |
| **Producto** | Catálogo, categorías, productos, Excels de importación/exportación, documentación por producto, imágenes, datos por producto. |
| **Marketing** | Imágenes para redes, posts, diseños, logos, etc. |
| **Administración** | Documentos de la empresa para cualquier trámite: documentación necesaria, seguros, contratos, datos esenciales. |
| **Contabilidad** | Informes mensuales, trimestrales, anuales, por proyecto; analítica detallada exportada en PDF de forma automática. |

Los nombres y números de cada elemento siguen el **control interno** ya definido (ver sección 7).

---

## 6. Roles y permisos

- En NEXO AV los roles se obtienen vía RPC `get_current_user_info`, que devuelve entre otros un array `roles` (valores en BD: p. ej. `admin`, `manager`, `sales`). La comprobación en código es del tipo `roles?.includes('admin')`.
- **Por ahora en standby**: no se implementan permisos granulares por grupo de archivos en el servidor propio.
- **Admin y Manager** tienen acceso completo en la plataforma; se asume que podrán acceder a todo el sistema de archivos cuando esté integrado.
- En el futuro se podrá restringir por grupo o por tipo de documento según rol.

---

## 7. Convención de IDs internos (comprobado con BD y código)

Para mantener **control interno** y evitar IDs tipo hash poco legibles, se usan en el proyecto identificadores con formato fijo. La tabla siguiente refleja lo **implementado en la base de datos y en el código** de NEXO AV. El sistema de archivos del servidor debe usar estos mismos códigos en rutas y nombres.

| Entidad | Formato en BD / código | Borrador (si aplica) | Ejemplo definitivo |
|---------|-------------------------|----------------------|---------------------|
| **Clientes** | `client_number` (crm.clients), texto; convención interna 6 dígitos | — | 124030 |
| **Proyectos** | `project_number` (projects.projects), 6 dígitos con ceros a la izquierda; `get_next_project_number()` | — | 000008 |
| **Presupuestos de venta** | `quote_number` (quotes.quotes) | `BORR-P-YY-XXXXXX` | P-26-000001 |
| **Facturas de venta** | `invoice_number` (sales.invoices), generado al emitir | `preliminary_number` con BORR si aplica | F-26-000001 |
| **Facturas de compra** | `internal_purchase_number` (sales.purchase_invoices), asignado al aprobar | `C-BORR-YY-XXXXXX` (invoice_number) | C-26-000001 |
| **Tickets de compra (gastos)** | `internal_purchase_number`, asignado al aprobar | `TICKET-BORR-YY-XXXXXX` (invoice_number) | TICKET-26-000001 |
| **Proveedores** | Convención interna (no secuencia en BD en el análisis) | — | PRO-000001 |
| **Técnicos autónomos** | Convención interna (no secuencia en BD en el análisis) | — | TEC-0001 |
| **Socios** | Convención interna | — | SOC-0001 |
| **Trabajadores (RRHH)** | `employee_number` (accounting.employees), p. ej. EMP-00001 | — | EMP-00001 |
| **Producto (catálogo)** | `sku` (catalog.products); convención AA-XX-XXXX (categoría-subcategoría-número) | — | 01-02-0001 o SP-01-0001 |

**Detalles técnicos (BD):**

- **Proyectos:** `projects.get_next_project_number()` → `LPAD(número, 6, '0')`; solo se consideran `project_number` numéricos.
- **Presupuestos:** borrador `quotes.get_next_draft_number()` → `BORR-P-YY-XXXXXX`; definitivo `quotes.get_next_quote_number()` → `P-YY-XXXXXX` (6 dígitos).
- **Facturas de venta:** `F-YY-XXXXXX` (6 dígitos), generado al pasar a estado emitido.
- **Facturas de compra:** `get_next_factura_borr_number()` → `C-BORR-YY-XXXXXX`; al aprobar → `C-YY-XXXXXX` (misma secuencia `purchase_invoice_definitive_seq`).
- **Tickets:** `get_next_ticket_number()` → `TICKET-BORR-YY-XXXXXX`; al aprobar → `TICKET-YY-XXXXXX` (secuencia `purchase_invoice_ticket_seq`).

La plataforma ya utiliza estos identificadores; la API del servidor de archivos y la estructura en disco deben ser coherentes con ellos.

---

## 8. Relación con el resto de la documentación del servidor

- **[README.md](../README.md)**: visión general del servidor, Ubuntu Server, SSD en `/mnt/storage`, Docker, IA.
- **[storage-setup.md](storage-setup.md)**: particionado y montaje del SSD externo.
- **[docker.md](docker.md)**: instalación de Docker, estructura bajo `/mnt/storage` (docker, services, compose, data, backups, models).

El **sistema de archivos** descrito en este documento debe materializarse bajo algo como `/mnt/storage/data/` (o similar), con subcarpetas por grupo y, dentro de cada grupo, por cliente/proyecto/año según corresponda. La API que desarrolle la plataforma leerá/escribirá en esas rutas y registrará “creado por / modificado por”.

---

## 9. Roadmap de alto nivel (resumen)

1. **Fase actual:** servidor NEXCOM con Ubuntu Server, SSD en `/mnt/storage`, Docker y estructura de carpetas base.
2. **API de almacenamiento:** desarrollo de la API (autenticación por usuario, “modificado por”, integración con NEXO AV).
3. **Acceso remoto:** Tailscale (o alternativa) y, si se desea, acceso tipo “SharePoint propio” (web y/o sync).
4. **Estructura por grupos:** RRHH, Facturación, Clientes, Producto, Marketing, Administración, Contabilidad.
5. **Más adelante:** CMS de contenidos para equipos de emisión; integración de IA para consultas y cálculos; posible cambio de hardware (NEXCOM → equipo más potente) manteniendo la misma estructura y documentación.

---

**Nota de verificación:** La sección 0 (estado actual), la sección 6 (roles) y la sección 7 (convención de IDs) han sido contrastadas con el código fuente de NEXO AV y las migraciones de Supabase (`supabase/migrations/`) para que el documento sea fiel a lo desarrollado hasta la fecha. Fuentes revisadas: migraciones de numeración (p. ej. `20260203120000_purchase_numbering_ticket_vs_factura.sql`, `20260118160500_fix_quote_numbering.sql`, `20260107130107_*` para proyectos, `20260120000001_fix_finance_issue_invoice_ambiguous.sql` para F-YY-XXXXXX), tablas `crm.clients`, `projects.projects`, `quotes.quotes`, `sales.invoices`, `sales.purchase_invoices`, `catalog.products`, uso de Storage en `src/`, y RPC `get_current_user_info`.

*Documento creado a partir de la idea planteada al inicio del proyecto de servidor de almacenamiento NEXO AV. Para detalles técnicos de instalación y operación, ver el resto de la documentación en `server/docs/`.*
