# Archivo Fiscal con MinIO — Nexo AV

> Sistema de almacenamiento documental orientado a contabilidad trimestral y presentacion de modelos a Hacienda.  
> Fecha de diseno: 2026-02-17  
> Estado: Pendiente de implementacion  
> Servidor: ALB357 (100.117.250.115 via Tailscale)  
> Ultima revision: 2026-02-17

---

## 0. Estado de preparacion — Go / No-Go

### Veredicto global

| Decision | Estado |
|----------|--------|
| **GO** para Fase 1–2 (infra MinIO + migraciones DB) | Listo para ejecutar inmediatamente |
| **NO-GO** para archivo fiscal end-to-end | Faltan 3 piezas centrales (ver abajo) |

### Piezas bloqueantes para end-to-end

| Pieza | Estado | Fase |
|-------|--------|------|
| MinIO instalado en ALB357 | **NO EXISTE** — pendiente de deploy | Fase 1 |
| `nexo-file-worker` (genera PDFs, sube a MinIO, actualiza `storage_key`) | **NO EXISTE** — por construir | Fase 3 |
| `minio-proxy` (Edge Function) + `ArchivedPDFViewer` + logica dual frontend | **NO EXISTE** — por construir | Fases 4–5 |

### Mapa de readiness por seccion

| Seccion | Tema | Estado | Notas |
|---------|------|--------|-------|
| 1–3 | Objetivo, reglas, flujo ideal | ✅ Definido | Pendiente de materializar: nada funciona hasta MinIO + worker + UI |
| 4 | Que es MinIO | ✅ OK | Sin dependencias raras |
| 5 | Infraestructura existente | ✅ READY parcial | `minio_files` existe, `storage-health` operativa, plantillas PDF existen. Falta MinIO y SSD |
| 6 | Despliegue MinIO | 🟡 Casi listo | Healthcheck corregido, `.env` especificado (ver seccion). Listo para Fase 1 |
| 7 | Estructura de keys | ✅ Definido | Considerar normalizacion de longitudes de nombre (no bloquea) |
| 8 | Convencion de nombres | ✅ Definido | El worker debe aplicar estas reglas de forma determinista |
| 9 | Documento definitivo / inmutabilidad | ✅ Definido | **Mayor no-go**: requiere DB (`storage_key`), worker (genera PDF), frontend (`ArchivedPDFViewer`) |
| 10 | Triggers de archivado | ✅ Definido | Falta mecanismo de escucha real (webhook/realtime en worker) |
| 11 | Nominas y resumenes | ✅ Definido | Falta generacion real de PDFs y Excel en worker |
| 12 | Excel pre-generados | ✅ Definido | Falta worker + ExcelJS + validar que RPCs devuelven campos necesarios |
| 13 | Modelos AEAT | ✅ Mapeo correcto | Sistema = archivo, no asesor fiscal. Plazos pueden variar segun regimen real |
| 14 | Campos adicionales `minio_files` | 🟡 Parcial | Tabla base existe. Faltan columnas fiscales + indices. Es Fase 2, rapido |
| 15 | Arquitectura tecnica | ✅ Definido | Falta `minio-proxy` Edge Function (no existe) |
| 16 | Componentes a construir | ✅ Listado | Todo pendiente de implementacion |
| 17 | UI Archivo Fiscal | ✅ Disenado | Fase media (7), no bloquea lo critico |
| 18 | Seguridad | ✅ OK | |
| 19 | Calendario fiscal | ✅ Referencia | Plazos orientativos, confirmar con gestor |
| 20 | Plan de fases | ✅ Definido | Fases 1–2 GO, resto secuencial |
| 21 | Dependencias tecnicas | ✅ Listado | |
| 22 | Migracion almacenamiento → SSD 1TB | ✅ Definido | Procedimiento completo con rollback. Ejecutar cuando Fases 1–5 funcionen |
| 23 | Notas finales | ✅ OK | |

### Orden de ejecucion recomendado

```
INMEDIATO (esta semana):
  Fase 1 → Instalar MinIO en Docker (30 min)
  Fase 2 → Migraciones DB: storage_key + campos fiscales (1h)

SIGUIENTE (cuando Fase 1-2 completadas):
  Fase 3 → nexo-file-worker: core del archivado automatico
  Fase 4 → minio-proxy: presigned URLs para servir archivos

DESPUES (cuando Fase 3-4 completadas):
  Fase 5 → ArchivedPDFViewer + refactor Detail Pages
  Fase 6 → Generacion de Excel trimestrales

LUJO (funcional pero no critico):
  Fases 7–10 → UI Archivo Fiscal, uploads manuales, ZIP, Excel anuales

HARDWARE:
  Fase 11 → Conectar SSD 1TB
  Fase 12 → Migracion almacenamiento interno → SSD
```

---

## 1. Que problema resuelve

Este sistema es **exclusivamente de archivo fiscal**. No se mezcla con IA ni con otras funcionalidades del ERP. Resuelve tres problemas concretos:

### 1.1 Orden unico y consistente

Todo lo del trimestre vive en `fiscal/{year}/T{q}/` (ventas, compras, gastos, nominas, bancos, informes, modelos). Esto elimina el "¿donde esta X?" y evita duplicados dispersos en carpetas locales, emails o Google Drive.

### 1.2 Entrega al gestor en 1 click

El boton "Descargar ZIP T1/T2/T3/T4" produce un paquete completo y cerrado por periodo: exactamente lo que necesita una gestoria. Sin recopilar nada manualmente.

### 1.3 Evidencia + trazabilidad para Hacienda

Cada fichero archivado tiene metadatos en `minio_files` (anyo, trimestre, mes, fecha del documento, tipo, checksum). Si Hacienda pide algo, se puede auditar y filtrar en segundos.

---

## 2. Tres reglas operativas clave

Estas reglas hacen que el archivo fiscal sea **valido y sin dolores**:

### Regla 1: Privado y accesible solo por VPN

MinIO NO se expone a internet. Solo es accesible via Tailscale (VPN). Los ficheros se sirven al frontend mediante **presigned URLs de corta duracion** (5-15 minutos). Nadie puede acceder a un documento sin autenticarse primero.

### Regla 2: Documentos inmutables

Una vez archivado, un documento **nunca se sobrescribe**. Si hay una correccion (factura rectificativa, anulacion), se archiva el nuevo documento con su propio nombre. El original permanece intacto. Solo se permite soft delete (marcar `deleted_at`), nunca borrado fisico. Esto es critico para no "reescribir el pasado" ante una inspeccion.

### Regla 3: La fecha que manda es la del documento

El trimestre se asigna por la **fecha del documento** (`invoice_date`, `expense_date`, `period_year/period_month`), NO por la fecha de subida. Si una factura de marzo se aprueba en abril, va a T1 (no a T2). Esto garantiza que el trimestre siempre es correcto fiscalmente.

> **Gaps tecnicos pendientes de las 3 reglas:**
> - Regla 1: Implementada cuando exista `minio-proxy` (Fase 4). La politica de presigned URLs se aplica alli.
> - Regla 2: Requiere logica de no-sobrescritura en `nexo-file-worker` (Fase 3) + permisos de MinIO (bucket policy deny `s3:PutObject` sobre keys existentes o versionado).
> - Regla 3: El `nexo-file-worker` debe calcular trimestre SIEMPRE desde `document_date`, nunca desde `created_at`/`NOW()`. Implementar en Fase 3.

---

## 3. Flujo fiscal ideal (resumen)

```
1. Factura emitida o compra aprobada
   -> Se archiva automaticamente con key fiscal estandar
   -> fiscal/2026/T1/ventas/F-2026-001_ClienteABC.pdf

2. Cierre de mes
   -> Se genera resumen mensual de nominas (Excel)
   -> Se archiva en fiscal/2026/T1/nominas/_resumen_nominas_enero_2026.xlsx

3. Cierre de trimestre
   -> Se generan todos los Excel de resumen (IVA, retenciones, nominas, etc.)
   -> Se genera PDF "portada trimestral" con indice y totales
   -> Se archiva todo en fiscal/2026/T1/resumenes/

4. Presentacion de modelos en AEAT
   -> Se sube manualmente el PDF del modelo + justificante de pago
   -> fiscal/2026/T1/modelos/303_IVA_T1_2026.pdf

5. Entrega al gestor
   -> Boton "Descargar ZIP T1" -> paquete completo listo
```

---

## 4. Que es MinIO

MinIO es un servidor de almacenamiento de objetos **100% compatible con la API de Amazon S3**:

- **Self-hosted**: Los datos se quedan en nuestro servidor, no en la nube
- **API S3 estandar**: Cualquier SDK de AWS funciona directamente (ya lo usamos en `storage-health`)
- **Presigned URLs**: URLs temporales para subir/bajar ficheros sin exponer credenciales
- **Consola web**: UI de gestion visual en el puerto 9001
- **Ligero**: ~200MB de RAM, perfecto para ALB357
- **Docker nativo**: Un solo contenedor

---

## 5. Infraestructura existente

### Ya tenemos preparado

| Recurso | Estado | Ubicacion |
|---------|--------|-----------|
| Tabla `minio_files` | Creada, con RLS e indices | Supabase (public schema) |
| Edge Function `storage-health` | Activa, conecta con S3 SDK | Supabase |
| Types TypeScript `minio_files` | Generados | `src/integrations/supabase/types.ts` |
| Cierres mensuales | Operativo | `accounting.period_closures` |
| Informes mensuales auto | Operativo | `accounting.monthly_reports` + Edge Function `monthly-report-worker` |
| Pagos de impuestos | Operativo | TaxPaymentDialog (303, 111, IS, AEAT) |
| Generacion PDF facturas | Operativo | `InvoicePDFDocument.tsx` (react-pdf) |
| Generacion PDF presupuestos | Operativo | `QuotePDFDocument.tsx` (react-pdf) |

### Estado del servidor ALB357

| Recurso | Valor |
|---------|-------|
| Disco actual | 28.3 GB (LVM), 13 GB libres |
| RAM | ~8 GB |
| Docker containers | nexo-event-engine, nexo-orchestrator |
| MinIO instalado | **No (pendiente)** |
| SSD 1TB | **No conectado (pendiente)** |

### Plan de disco

- **Fase 1** (ahora): Montar MinIO sobre `/opt/minio-data` en disco actual (13 GB libres, suficiente para empezar)
- **Fase 2** (cuando se conecte SSD): Montar SSD en `/mnt/ssd`, migrar datos con `mc mirror`

---

## 6. Despliegue de MinIO

### Docker Compose

```yaml
# /opt/nexo-minio/docker-compose.yml
version: "3.9"
services:
  minio:
    image: minio/minio:latest
    container_name: nexo-minio
    restart: unless-stopped
    ports:
      - "9000:9000"   # API S3
      - "9001:9001"   # Consola Web
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - /opt/minio-data:/data          # Fase 1: disco local
      # - /mnt/ssd/minio-data:/data    # Fase 2: SSD 1TB
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
```

> **Nota sobre healthcheck**: Se usa `curl` contra el endpoint de salud nativo de MinIO.
> La opcion `mc ready local` NO funciona porque el contenedor `minio/minio` no incluye
> el cliente `mc` por defecto. Si se quiere usar `mc`, hay que anadir un sidecar `minio/mc`.

### Fichero `.env` para MinIO

Crear `/opt/nexo-minio/.env` junto al `docker-compose.yml`:

```env
# /opt/nexo-minio/.env
MINIO_ROOT_USER=nexo-admin
MINIO_ROOT_PASSWORD=<password-seguro-generado>
```

> **Importante**: Generar la password con `openssl rand -base64 32` o similar.
> Este fichero NO se commitea a ningun repositorio. Solo existe en ALB357.
> Estos mismos valores se configuran en las variables de entorno de:
> - `nexo-file-worker` (como `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`)
> - Edge Function `minio-proxy` (como secretos de Supabase)
> - Edge Function `storage-health` (ya configurada)

### Acceso

- **API S3**: `http://100.117.250.115:9000` (solo via Tailscale)
- **Consola Web**: `http://100.117.250.115:9001` (solo via Tailscale)
- **NUNCA se expone a internet** — acceso exclusivo por VPN Tailscale

### Bucket unico

Un solo bucket `nexo-prod`, privado, con estructura de keys jerarquica.

---

## 7. Estructura de Keys — Organizacion Fiscal por Trimestre

```
nexo-prod/
|
+-- fiscal/
|   +-- 2026/
|   |   +-- T1/                                       PRIMER TRIMESTRE (Ene-Mar)
|   |   |   +-- ventas/                               Libro registro facturas emitidas
|   |   |   |   +-- F-2026-001_ClienteABC.pdf
|   |   |   |   +-- F-2026-002_EventoXYZ.pdf
|   |   |   |   +-- ...
|   |   |   |
|   |   |   +-- compras/                              Libro registro facturas recibidas
|   |   |   |   +-- FC-2026-001_ProveedorA.pdf
|   |   |   |   +-- FC-2026-002_ProveedorB.pdf
|   |   |   |   +-- ...
|   |   |   |
|   |   |   +-- gastos/                               Tickets y gastos menores
|   |   |   |   +-- TK-2026-001_gasolina.pdf
|   |   |   |   +-- TK-2026-002_parking.pdf
|   |   |   |   +-- ...
|   |   |   |
|   |   |   +-- nominas/                              Nominas y retribuciones mensuales
|   |   |   |   +-- socios/                           Retribuciones socios/administradores
|   |   |   |   |   +-- RET-202601-0001_AlexBurgues.pdf
|   |   |   |   |   +-- RET-202602-0001_AlexBurgues.pdf
|   |   |   |   |   +-- RET-202603-0001_AlexBurgues.pdf
|   |   |   |   |
|   |   |   |   +-- trabajadores/                     Nominas empleados
|   |   |   |   |   +-- NOM-202601-0001_JuanPerez.pdf
|   |   |   |   |   +-- NOM-202602-0001_JuanPerez.pdf
|   |   |   |   |   +-- NOM-202603-0001_JuanPerez.pdf
|   |   |   |   |
|   |   |   |   +-- _resumen_nominas_enero_2026.xlsx   Resumen mensual auto-generado
|   |   |   |   +-- _resumen_nominas_febrero_2026.xlsx
|   |   |   |   +-- _resumen_nominas_marzo_2026.xlsx
|   |   |   |
|   |   |   +-- bancos/                               Extractos bancarios del trimestre
|   |   |   |   +-- CaixaBank_2026-01.pdf
|   |   |   |   +-- CaixaBank_2026-02.pdf
|   |   |   |   +-- Revolut_2026-01.pdf
|   |   |   |   +-- ...
|   |   |   |
|   |   |   +-- modelos/                              Modelos de Hacienda presentados
|   |   |   |   +-- 303_IVA_T1_2026.pdf
|   |   |   |   +-- 111_IRPF_T1_2026.pdf
|   |   |   |   +-- 115_alquileres_T1_2026.pdf        (si aplica)
|   |   |   |   +-- justificantes_pago/
|   |   |   |       +-- 303_justificante_pago.pdf
|   |   |   |       +-- 111_justificante_pago.pdf
|   |   |   |
|   |   |   +-- informes/                             Informes de cierre mensual + portada
|   |   |   |   +-- _portada_trimestral_T1_2026.pdf    PORTADA: indice, totales, fecha gen.
|   |   |   |   +-- informe_cierre_enero_2026.pdf
|   |   |   |   +-- informe_cierre_febrero_2026.pdf
|   |   |   |   +-- informe_cierre_marzo_2026.pdf
|   |   |   |
|   |   |   +-- resumenes/                            EXCEL PRE-GENERADOS DEL TRIMESTRE
|   |   |       +-- registro_ventas_T1_2026.xlsx
|   |   |       +-- registro_compras_T1_2026.xlsx
|   |   |       +-- registro_gastos_T1_2026.xlsx
|   |   |       +-- resumen_IVA_T1_2026.xlsx
|   |   |       +-- resumen_nominas_T1_2026.xlsx
|   |   |       +-- resumen_retenciones_T1_2026.xlsx
|   |   |       +-- conciliacion_bancaria_T1_2026.xlsx
|   |   |
|   |   +-- T2/                                       SEGUNDO TRIMESTRE (Abr-Jun)
|   |   |   +-- ... (misma estructura)
|   |   +-- T3/                                       TERCER TRIMESTRE (Jul-Sep)
|   |   |   +-- ... (misma estructura)
|   |   +-- T4/                                       CUARTO TRIMESTRE (Oct-Dic)
|   |   |   +-- ... (misma estructura)
|   |   |
|   |   +-- anual/                                    DOCUMENTOS ANUALES
|   |       +-- modelos/
|   |       |   +-- 390_resumen_anual_IVA_2026.pdf
|   |       |   +-- 347_operaciones_terceros_2026.pdf
|   |       |   +-- 190_resumen_retenciones_2026.pdf
|   |       |   +-- 200_impuesto_sociedades_2026.pdf
|   |       +-- cuentas_anuales/
|   |       |   +-- balance_situacion_2026.pdf
|   |       |   +-- cuenta_PyG_2026.pdf
|   |       |   +-- memoria_abreviada_2026.pdf
|   |       +-- resumenes/                            EXCEL PRE-GENERADOS ANUALES
|   |           +-- libro_facturas_emitidas_2026.xlsx
|   |           +-- libro_facturas_recibidas_2026.xlsx
|   |           +-- libro_bienes_inversion_2026.xlsx
|   |           +-- libro_diario_2026.xlsx
|   |           +-- resumen_IVA_anual_2026.xlsx
|   |           +-- resumen_retenciones_anual_2026.xlsx
|   |           +-- resumen_gastos_por_categoria_2026.xlsx
|   |           +-- resumen_clientes_facturacion_2026.xlsx
|   |           +-- resumen_proveedores_facturacion_2026.xlsx
|   |
|   +-- 2025/
|       +-- ... (ejercicio anterior, misma estructura)
|
+-- presupuestos/                                      Fuera de fiscal (no se presentan)
|   +-- 2026/
|       +-- Q-2026-001_ClienteABC.pdf
|       +-- Q-2026-002_EventoXYZ.pdf
|
+-- proyectos/                                         Documentacion operativa
    +-- {project_id}/
        +-- rider_tecnico.pdf
        +-- plano_montaje.pdf
```

> **Nota tecnica**: S3 soporta keys de hasta 1024 bytes, pero nombres muy largos se vuelven
> incomodos en exploradores de ficheros y en el ZIP del gestor. Recomendacion: limitar el sufijo
> descriptivo (nombre cliente/proveedor) a **30 caracteres** y truncar si es necesario.
> Esto no bloquea la implementacion, pero el worker debe aplicar `slug(nombre).substring(0, 30)`.

---

## 8. Convencion de nombres estricta

Todos los ficheros archivados siguen una convencion de nombres con **prefijo + secuencia** que permite buscar e identificar cualquier documento de forma inmediata, incluso fuera del ERP (en un explorador de ficheros, en un ZIP enviado al gestor, etc.).

### Prefijos por tipo de documento

| Prefijo | Tipo | Ejemplo completo | Origen |
|---------|------|-----------------|--------|
| `F-` | Factura de venta | `F-2026-001_ClienteABC.pdf` | `sales.invoices.invoice_number` |
| `FC-` | Factura de compra | `FC-2026-001_ProveedorA.pdf` | `sales.purchase_invoices` (numero proveedor o interno) |
| `TK-` | Ticket/Gasto | `TK-2026-001_gasolina.pdf` | Tabla de gastos |
| `RET-` | Retribucion socio | `RET-202601-0001_AlexBurgues.pdf` | `accounting.partner_compensation_runs.compensation_number` |
| `NOM-` | Nomina trabajador | `NOM-202601-0001_JuanPerez.pdf` | `accounting.payroll_runs.payroll_number` |
| `Q-` | Presupuesto | `Q-2026-001_ClienteABC.pdf` | `sales.quotes.quote_number` |

### Reglas de formato

- **Prefijo**: Siempre en mayusculas, seguido de guion
- **Secuencia**: Usa el numero del documento del ERP tal cual (F-2026-001, RET-202601-0001)
- **Sufijo descriptivo**: Nombre del cliente/proveedor/persona, sin espacios (usar guion bajo `_`), sin caracteres especiales, sin acentos
- **Extension**: `.pdf` para documentos, `.xlsx` para resumenes
- **Resumenes con prefijo `_`**: Los ficheros auto-generados de resumen empiezan con `_` para que aparezcan primero al ordenar (ej: `_resumen_nominas_enero_2026.xlsx`)

### Ejemplos completos de keys

```
fiscal/2026/T1/ventas/F-2026-001_EventosABC_SL.pdf
fiscal/2026/T1/compras/FC-2026-003_SonidosPro.pdf
fiscal/2026/T1/gastos/TK-2026-012_parking_ifema.pdf
fiscal/2026/T1/nominas/socios/RET-202601-0001_AlexBurgues.pdf
fiscal/2026/T1/nominas/trabajadores/NOM-202602-0001_JuanPerez.pdf
fiscal/2026/T1/informes/_portada_trimestral_T1_2026.pdf
fiscal/2026/T1/resumenes/registro_ventas_T1_2026.xlsx
presupuestos/2026/Q-2026-015_HotelMeridien.pdf
```

Esta convencion hace que buscar sea inmediato: si alguien dice "la factura 2026-003", solo hay que buscar `F-2026-003` en el archivo.

> **Pendiente de implementacion (Fase 3 — worker):**
> El `nexo-file-worker` necesita una funcion `buildStorageKey(document)` que aplique estas reglas
> de forma determinista: eliminar acentos (`normalizeNFD`), sustituir espacios por `_`, recortar
> caracteres especiales, respetar prefijos y limites de longitud. Esta funcion es la unica fuente
> de verdad para generar keys — ni el frontend ni las migraciones deben generar keys por su cuenta.

---

## 9. Documento definitivo: de plantilla a archivo inmutable

### El problema actual

Actualmente, las paginas de detalle de facturas y presupuestos muestran un PDF generado en tiempo real desde una **plantilla React** (`InvoicePDFDocument`, `QuotePDFDocument`) que se re-renderiza cada vez que se abre la pagina. Esto significa que:

- Si alguien modifica los datos de la empresa (logo, direccion, CIF) el PDF de una factura antigua cambia visualmente
- Si hay un bug en la plantilla y se corrige, facturas ya emitidas se veran diferentes
- No existe una copia inmutable del documento tal como se emitio
- El PDF que descarga el usuario se genera al vuelo, no es "el mismo" que se envio al cliente

Para las facturas de compra, el sistema ya funciona correctamente: se sube un PDF escaneado/recibido y se muestra desde Supabase Storage via `FilePreview` con signed URL.

### La solucion: dos modos del visor PDF

El visor de documentos (`DocumentPDFViewer`) debe operar en **dos modos** segun el estado del documento:

**Modo Plantilla (documento en DRAFT):**
- El PDF se genera en tiempo real desde la plantilla React
- El usuario puede editar datos y ver los cambios reflejados al instante
- El boton "Descargar" genera el PDF al vuelo
- Es el comportamiento actual, se mantiene solo para borradores

**Modo Archivo (documento EMITIDO/APROBADO/ENVIADO):**
- El PDF se carga desde MinIO via presigned URL
- Es exactamente el documento que se genero en el momento de la emision
- No se puede modificar, no se re-renderiza, no depende de la plantilla
- El boton "Descargar" descarga el archivo almacenado (no lo re-genera)
- Se muestra un indicador visual de "Documento archivado" con fecha y hora

### Que dispara el cambio de modo

| Documento | Estado que activa Modo Archivo | Que se genera y archiva |
|-----------|-------------------------------|------------------------|
| Factura de venta | `ISSUED` (Emitida) | PDF definitivo con numero final, datos del cliente, lineas, IVA, totales |
| Presupuesto | `SENT` (Enviado) | PDF definitivo con numero, datos del cliente, lineas, condiciones |
| Factura de compra | `APPROVED` (Aprobada) | Ya es un PDF subido/escaneado — no se genera, solo se mueve a MinIO |
| Ticket/Gasto | `APPROVED` | PDF del justificante escaneado/subido |

### Flujo detallado: emision de una factura de venta

```
1. Usuario trabaja en factura DRAFT
   -> Pagina de detalle muestra PDF via plantilla (InvoicePDFDocument)
   -> Puede editar conceptos, precios, cliente, etc.
   -> El PDF se re-renderiza en vivo

2. Usuario pulsa "Emitir" (DRAFT -> ISSUED)
   -> Frontend llama al RPC de emision (asigna numero definitivo, bloquea)
   -> nexo-file-worker detecta el cambio de status
   -> Genera el PDF DEFINITIVO con react-pdf (server-side) o jsPDF
   -> Sube el PDF a MinIO: fiscal/2026/T1/ventas/F-2026-001_ClienteABC.pdf
   -> Registra en minio_files (con checksum SHA-256)
   -> Actualiza sales.invoices SET storage_key = 'fiscal/2026/T1/ventas/F-2026-001_ClienteABC.pdf'

3. La pagina de detalle recarga
   -> Detecta que invoice.storage_key NO es null
   -> Cambia a Modo Archivo: carga el PDF desde MinIO via presigned URL
   -> Muestra badge: "Documento archivado el 2026-03-15 a las 14:32"
   -> El boton "Descargar" descarga el archivo de MinIO
   -> NO se puede volver a DRAFT (estado irreversible)
```

### Flujo detallado: presupuesto enviado

```
1. Usuario trabaja en presupuesto DRAFT
   -> Vista previa con QuotePDFDocument (plantilla en vivo)

2. Usuario pulsa "Enviar" (DRAFT -> SENT)
   -> Se genera PDF definitivo y se archiva en MinIO
   -> presupuestos/2026/Q-2026-015_HotelMeridien.pdf
   -> quote.storage_key se actualiza

3. La pagina de detalle muestra el PDF archivado
   -> Si el presupuesto pasa a APPROVED o INVOICED, sigue mostrando el mismo PDF
   -> Si se CANCELA (REJECTED), el PDF archivado se mantiene (evidencia)
```

### Flujo detallado: factura de compra

```
1. Usuario sube PDF de factura de compra (escaneado o recibido)
   -> Se guarda en Supabase Storage (purchase-documents) — comportamiento actual
   -> Status: PENDING_VALIDATION

2. Usuario pulsa "Aprobar" (PENDING_VALIDATION -> APPROVED)
   -> nexo-file-worker copia el PDF de Supabase Storage a MinIO
   -> fiscal/2026/T1/compras/FC-2026-003_ProveedorA.pdf
   -> Registra en minio_files
   -> purchase_invoice.storage_key se actualiza

3. La pagina de detalle cambia:
   -> Antes: cargaba de Supabase Storage (purchase-documents bucket)
   -> Ahora: carga de MinIO via presigned URL (mismo que facturas de venta)
```

### Campos necesarios en las tablas de documentos

Cada tabla de documento necesita un campo `storage_key` para referenciar el archivo en MinIO:

```sql
-- Facturas de venta
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS
  storage_key TEXT;  -- ej: fiscal/2026/T1/ventas/F-2026-001_ClienteABC.pdf

-- Presupuestos
ALTER TABLE sales.quotes ADD COLUMN IF NOT EXISTS
  storage_key TEXT;  -- ej: presupuestos/2026/Q-2026-015_HotelMeridien.pdf

-- Facturas de compra (ya tienen file_path, se anade storage_key para MinIO)
ALTER TABLE sales.purchase_invoices ADD COLUMN IF NOT EXISTS
  storage_key TEXT;  -- ej: fiscal/2026/T1/compras/FC-2026-003_ProveedorA.pdf

-- Nominas trabajadores
ALTER TABLE accounting.payroll_runs ADD COLUMN IF NOT EXISTS
  storage_key TEXT;

-- Retribuciones socios
ALTER TABLE accounting.partner_compensation_runs ADD COLUMN IF NOT EXISTS
  storage_key TEXT;
```

### Logica del componente DocumentPDFViewer (pseudo-codigo)

```typescript
// Logica de decision en la pagina de detalle:

if (document.storage_key) {
  // MODO ARCHIVO: el documento esta emitido y archivado
  // -> Cargar PDF desde MinIO via presigned URL
  // -> Mostrar badge "Documento archivado"
  // -> Boton "Descargar" descarga de MinIO
  <ArchivedPDFViewer
    storageKey={document.storage_key}
    archivedAt={document.updated_at}
  />
} else {
  // MODO PLANTILLA: el documento esta en borrador
  // -> Renderizar PDF desde plantilla React
  // -> Boton "Descargar" genera PDF al vuelo
  <DocumentPDFViewer
    document={<InvoicePDFDocument ... />}
    fileName={pdfFileName}
  />
}
```

### Componente ArchivedPDFViewer (nuevo)

Este componente sustituye al `DocumentPDFViewer` cuando el documento esta archivado:

```
+================================================================+
|  [Documento archivado]  15/03/2026 14:32    [Descargar PDF]    |
+================================================================+
|                                                                 |
|                                                                 |
|            <iframe src="{presigned_url}" />                     |
|                                                                 |
|            (PDF cargado directamente de MinIO)                  |
|                                                                 |
|                                                                 |
+================================================================+
```

Caracteristicas:
- Muestra el PDF en un `<iframe>` con la presigned URL (no react-pdf)
- Badge verde "Documento archivado" con fecha y hora
- Boton "Descargar PDF" que abre la presigned URL en nueva pestana
- Sin boton de "Ocultar/Ver" (el PDF siempre se muestra, es el documento oficial)
- Sin posibilidad de editar: la pagina entera esta en modo lectura

### Garantia de inmutabilidad — Flujo completo

```
DRAFT (editable)
  |
  v  [Usuario emite/aprueba/envia]
  |
  v
GENERA PDF DEFINITIVO (una unica vez)
  |
  +-- PDF se sube a MinIO con checksum SHA-256
  +-- Se registra en minio_files (checksum, fecha, key)
  +-- Se escribe storage_key en la tabla del documento
  +-- El documento queda BLOQUEADO en base de datos (triggers existentes)
  |
  v
ARCHIVADO (inmutable para siempre)
  |
  +-- El PDF en MinIO NUNCA se sobrescribe
  +-- Si se anula (CANCELLED), el PDF original permanece
  +-- Si hay rectificacion, se crea un NUEVO documento con su propio PDF
  +-- El checksum permite verificar integridad en cualquier momento
```

### Documentos afectados y estado actual vs futuro

| Documento | Estado actual (preview) | Estado futuro (con MinIO) |
|-----------|----------------------|--------------------------|
| Factura venta DRAFT | Plantilla React en vivo | Plantilla React en vivo (sin cambio) |
| Factura venta ISSUED | Plantilla React en vivo (MAL) | **PDF de MinIO** (inmutable) |
| Presupuesto DRAFT | Plantilla React en vivo | Plantilla React en vivo (sin cambio) |
| Presupuesto SENT/APPROVED | Plantilla React en vivo (MAL) | **PDF de MinIO** (inmutable) |
| Factura compra PENDING | PDF desde Supabase Storage | PDF desde Supabase Storage (sin cambio) |
| Factura compra APPROVED | PDF desde Supabase Storage | **PDF copiado a MinIO** (fiscal) |
| Ticket/Gasto APPROVED | Varia | **PDF en MinIO** (fiscal) |
| Nomina POSTED | No tiene preview | **PDF de MinIO** (nuevo) |

### Regla de oro

> **Si `storage_key` tiene valor, el PDF de MinIO es la UNICA fuente de verdad.**
> La plantilla React deja de existir para ese documento.
> Cualquier discrepancia entre la plantilla y el archivo almacenado
> se resuelve a favor del archivo almacenado (es el documento legal).

---

## 10. Archivado automatico — Triggers por cambio de estado

### Cuando se archiva cada documento

| Documento | Evento trigger | Campo que cambia | Key generado |
|-----------|---------------|------------------|--------------|
| Factura de venta | `doc_status` -> `ISSUED` | `sales.invoices.status` | `fiscal/{year}/T{q}/ventas/{invoice_number}_{client}.pdf` |
| Factura de compra | `doc_status` -> `APPROVED` | `sales.purchase_invoices.status` | `fiscal/{year}/T{q}/compras/{number}_{supplier}.pdf` |
| Ticket/Gasto | `status` -> `APPROVED` | tabla de gastos | `fiscal/{year}/T{q}/gastos/{ticket_number}_{concepto}.pdf` |
| Retribucion socio | `status` -> `POSTED` | `accounting.partner_compensation_runs.status` | `fiscal/{year}/T{q}/nominas/socios/RET-{YYYYMM}-{seq}_{nombre}.pdf` |
| Nomina trabajador | `status` -> `POSTED` | `accounting.payroll_runs.status` | `fiscal/{year}/T{q}/nominas/trabajadores/NOM-{YYYYMM}-{seq}_{nombre}.pdf` |
| Informe mensual | `status` -> `READY` | `accounting.monthly_reports.status` | `fiscal/{year}/T{q}/informes/informe_cierre_{mes}_{year}.pdf` |
| Presupuesto | `status` -> `SENT` | `sales.quotes.status` | `presupuestos/{year}/{quote_number}_{client}.pdf` |
| Modelo Hacienda | Upload manual (gestor) | — | `fiscal/{year}/T{q}/modelos/{modelo}_{periodo}.pdf` |
| Extracto bancario | Upload manual o auto | — | `fiscal/{year}/T{q}/bancos/{banco}_{year}-{month}.pdf` |

### Calculo del trimestre

```
funcion trimestre(fecha_documento):
  mes = fecha_documento.mes
  si mes <= 3  -> T1
  si mes <= 6  -> T2
  si mes <= 9  -> T3
  si mes <= 12 -> T4
```

Se usa la **fecha del documento** (invoice_date, expense_date), NO la fecha de subida.

> **Pendiente de implementacion (Fase 3):**
> El mecanismo de escucha real (como el worker detecta los cambios de estado) tiene dos opciones:
> 1. **Database webhook** (Supabase) → llama a un endpoint del worker cuando cambia `status`
> 2. **Supabase Realtime** → el worker se suscribe a cambios en las tablas relevantes (patron similar al `nexo-event-engine`)
>
> Opcion recomendada: **Realtime**, porque el worker ya corre en ALB357 con acceso directo a Supabase,
> y el patron de polling/suscripcion ya existe en `nexo-event-engine`. Los webhooks requieren que
> el worker tenga un endpoint HTTP expuesto, lo que complica la seguridad en una red VPN.

---

## 11. Nominas — Archivado mensual y resumenes

### Estructura de datos en el ERP

El sistema de nominas tiene dos tablas independientes:

| Tabla | Prefijo | Destinatario | Campos clave |
|-------|---------|-------------|--------------|
| `accounting.partner_compensation_runs` | RET-YYYYMM-XXXX | Socios/Administradores | gross_amount, irpf_rate, irpf_amount, net_amount |
| `accounting.payroll_runs` | NOM-YYYYMM-XXXX | Empleados (tecnicos, etc.) | gross_amount, irpf_rate, irpf_amount, ss_employee, ss_company, net_amount |

Ambas comparten el ciclo de estados: `DRAFT` -> `POSTED` -> `PAID` (o `CANCELLED`).

### Cuando se archivan

Las nominas se archivan **cada mes** cuando pasan a `POSTED` (contabilizadas):

| Evento | Que se archiva |
|--------|---------------|
| `partner_compensation_runs.status` -> `POSTED` | PDF de retribucion del socio |
| `payroll_runs.status` -> `POSTED` | PDF de nomina del trabajador |
| Cierre mensual (`period_closures`) | Excel resumen de nominas del mes |

### PDF individual de cada nomina

Cada nomina/retribucion archivada contiene:

- **Socios**: Nombre, NIF, periodo, bruto, % IRPF, retencion IRPF, neto a percibir
- **Trabajadores**: Nombre, NIF, periodo, bruto, % IRPF, retencion IRPF, SS empleado, SS empresa, neto a percibir

### Excel resumen mensual de nominas

Al cerrar cada mes se genera automaticamente `_resumen_nominas_{mes}_{year}.xlsx` con:

**Hoja "Socios":**

| Socio | NIF | Num. compensacion | Bruto | % IRPF | Retencion | Neto | Estado pago |
|-------|-----|-------------------|-------|--------|-----------|------|-------------|
| Alex Burgues | 12345678A | RET-202601-0001 | 2.500,00 | 19% | 475,00 | 2.025,00 | PAID |

**Hoja "Trabajadores":**

| Trabajador | NIF | Num. nomina | Bruto | % IRPF | Ret. IRPF | SS Empleado | SS Empresa | Neto | Estado pago |
|------------|-----|-------------|-------|--------|-----------|-------------|------------|------|-------------|
| Juan Perez | 87654321B | NOM-202601-0001 | 1.800,00 | 15% | 270,00 | 114,30 | 540,00 | 1.415,70 | PAID |

**Hoja "Totales":**

| Concepto | Importe |
|----------|---------|
| Total bruto socios | 2.500,00 |
| Total bruto trabajadores | 1.800,00 |
| Total IRPF retenido (socios) | 475,00 |
| Total IRPF retenido (trabajadores) | 270,00 |
| Total SS empleado | 114,30 |
| Total SS empresa | 540,00 |
| **Total IRPF retenido (Modelo 111)** | **745,00** |
| Total neto pagado | 3.440,70 |

### Excel trimestral de nominas (para Modelo 111)

Ademas del resumen mensual, al cerrar el trimestre se genera `resumen_retenciones_T{q}_{year}.xlsx` que incluye:

**Hoja "Detalle por persona":**
- Todas las nominas/retribuciones del trimestre agrupadas por persona
- Total acumulado por persona (bruto, retencion, neto)
- Tipo: EMPLEADO o SOCIO/ADMINISTRADOR

**Hoja "Modelo 111":**
- Casilla 01: Numero de perceptores (trabajadores)
- Casilla 02: Base retenciones (bruto trabajadores)
- Casilla 03: Retenciones (IRPF trabajadores)
- Casilla 04: Numero de perceptores (profesionales/socios)
- Casilla 05: Base retenciones (bruto socios)
- Casilla 06: Retenciones (IRPF socios)
- Casilla 28: Total a ingresar

Estos datos salen directamente de la RPC existente `accounting.get_irpf_model_111_summary`.

### Excel anual de nominas (para Modelo 190)

Al cerrar diciembre se genera adicionalmente `resumen_retenciones_anual_{year}.xlsx`:
- Todas las retenciones del anyo agrupadas por persona y trimestre
- Claves y subclaves del Modelo 190 segun tipo de perceptor
- Datos para la RPC existente `accounting.get_irpf_by_person`

### Ubicacion de los ficheros

```
fiscal/2026/T1/nominas/
  +-- socios/
  |   +-- RET-202601-0001_AlexBurgues.pdf         <- Archivado al POSTED
  |   +-- RET-202602-0001_AlexBurgues.pdf
  |   +-- RET-202603-0001_AlexBurgues.pdf
  +-- trabajadores/
  |   +-- NOM-202601-0001_JuanPerez.pdf            <- Archivado al POSTED
  |   +-- NOM-202602-0001_JuanPerez.pdf
  |   +-- NOM-202603-0001_JuanPerez.pdf
  +-- _resumen_nominas_enero_2026.xlsx             <- Al cierre del mes
  +-- _resumen_nominas_febrero_2026.xlsx
  +-- _resumen_nominas_marzo_2026.xlsx

fiscal/2026/T1/resumenes/
  +-- resumen_retenciones_T1_2026.xlsx             <- Al cierre del trimestre (Modelo 111)
```

---

## 12. Ficheros Excel pre-generados (NO bajo demanda)

### Principio general

Los Excel de resumen se **generan y almacenan fisicamente** en MinIO en el momento del cierre trimestral. No se generan bajo demanda. Esto garantiza:

- El gestor siempre tiene los ficheros disponibles sin esperas
- Los datos quedan congelados tal como estaban al cierre
- Se pueden descargar offline, enviar por email, etc.
- Inmutabilidad: una vez generado, el Excel del trimestre no cambia

### Excel trimestrales (por trimestre)

| Fichero | Contenido | Datos de origen (RPCs existentes) |
|---------|-----------|-----------------------------------|
| `registro_ventas_T{q}_{year}.xlsx` | Todas las facturas emitidas del trimestre: numero, fecha, cliente, NIF, base imponible, tipo IVA, cuota IVA, retencion IRPF, total | `sales.invoices` WHERE status=ISSUED AND fecha en trimestre |
| `registro_compras_T{q}_{year}.xlsx` | Todas las facturas recibidas: numero proveedor, fecha, proveedor, NIF, base, IVA soportado, retencion, total, categoria contable | `sales.purchase_invoices` WHERE status=APPROVED AND fecha en trimestre |
| `registro_gastos_T{q}_{year}.xlsx` | Todos los tickets/gastos: fecha, concepto, categoria, base, IVA, cuenta contable (segun `purchaseInvoiceCategories`) | Tabla de gastos del trimestre |
| `resumen_IVA_T{q}_{year}.xlsx` | Liquidacion IVA del trimestre: IVA repercutido (por tipo: 21%, 10%, 4%), IVA soportado (por tipo), diferencia, resultado a ingresar/compensar. **Datos para rellenar el Modelo 303** | Calculado de ventas + compras |
| `resumen_nominas_T{q}_{year}.xlsx` | Todas las nominas y retribuciones del trimestre: socios (bruto, IRPF, neto) + trabajadores (bruto, IRPF, SS, neto), totales, desglose por persona y mes | `accounting.payroll_runs` + `accounting.partner_compensation_runs` del trimestre |
| `resumen_retenciones_T{q}_{year}.xlsx` | Retenciones practicadas: a trabajadores (nominas) + a socios (retribuciones) + a profesionales (facturas compra con IRPF). **Datos para rellenar el Modelo 111** | `accounting.get_irpf_model_111_summary` + compras con retencion |
| `conciliacion_bancaria_T{q}_{year}.xlsx` | Movimientos bancarios del trimestre por cuenta, saldo inicial, movimientos, saldo final | `accounting.list_bank_account_movements` |

> **Pendiente de validacion (durante Fase 6):**
> Las columnas "Datos de origen" referencian RPCs y tablas existentes, pero hay que verificar durante
> la implementacion que cada RPC devuelve **exactamente** los campos que necesita cada Excel.
> En particular:
> - `get_irpf_model_111_summary`: confirmar que incluye retenciones de facturas de compra (profesionales)
> - `list_bank_account_movements`: confirmar que soporta filtro por rango de fechas
> - Tablas de gastos/tickets: confirmar que existe una tabla unificada o si hay que consultar varias
> - Si falta algun campo, crear RPCs nuevas o ampliar las existentes antes de generar los Excel

### Excel anuales (al cerrar diciembre o bajo demanda)

| Fichero | Contenido |
|---------|-----------|
| `libro_facturas_emitidas_{year}.xlsx` | Libro registro oficial: todas las facturas emitidas del ejercicio |
| `libro_facturas_recibidas_{year}.xlsx` | Libro registro oficial: todas las facturas recibidas del ejercicio |
| `libro_bienes_inversion_{year}.xlsx` | Bienes de inversion adquiridos (si aplica) |
| `libro_diario_{year}.xlsx` | Todos los asientos contables del ejercicio (`accounting.journal_entries` + `journal_entry_lines`) |
| `resumen_IVA_anual_{year}.xlsx` | Suma de los 4 trimestres, datos para el **Modelo 390** |
| `resumen_retenciones_anual_{year}.xlsx` | Suma de los 4 trimestres, datos para el **Modelo 190** |
| `resumen_gastos_por_categoria_{year}.xlsx` | Gastos agrupados por categoria contable (cuenta PGC) |
| `resumen_clientes_facturacion_{year}.xlsx` | Facturacion por cliente, datos para el **Modelo 347** (operaciones >3.005,06 EUR) |
| `resumen_proveedores_facturacion_{year}.xlsx` | Facturacion por proveedor, datos para el **Modelo 347** |

### Cuando se generan

| Evento | Que se genera |
|--------|--------------|
| Cierre de CUALQUIER mes | `_resumen_nominas_{mes}_{year}.xlsx` en la carpeta `nominas/` del trimestre correspondiente |
| Cierre del mes 3 (marzo) | Todos los Excel trimestrales de T1 + **portada trimestral PDF** (ver seccion 11.1) |
| Cierre del mes 6 (junio) | Todos los Excel trimestrales de T2 + **portada trimestral PDF** |
| Cierre del mes 9 (septiembre) | Todos los Excel trimestrales de T3 + **portada trimestral PDF** |
| Cierre del mes 12 (diciembre) | Todos los Excel trimestrales de T4 + **portada trimestral PDF** + todos los Excel anuales |
| Re-apertura y re-cierre de un mes | Se regenera el resumen de nominas del mes + Excel del trimestre afectado |

### Formato de los Excel

Cada fichero Excel incluye:

- **Hoja "Datos"**: Tabla con todos los registros, filtrable
- **Hoja "Resumen"**: Totales agrupados (por tipo IVA, por categoria, etc.)
- **Cabecera**: Nombre empresa, CIF, periodo, fecha de generacion
- **Pie**: "Generado automaticamente por Nexo AV — Archivo fiscal digital"

### 11.1 Portada trimestral (PDF "cierre fiscal")

Al cerrar el ultimo mes de cada trimestre se genera automaticamente un PDF **portada trimestral** que se archiva en `fiscal/{year}/T{q}/informes/_portada_trimestral_T{q}_{year}.pdf`. Este documento:

- **No sustituye** ningun informe ni Excel: es un indice/resumen del paquete
- Va al principio del ZIP cuando se descarga todo el trimestre
- Sirve para que el gestor vea de un vistazo que contiene el paquete

**Contenido de la portada:**

```
AV TECH ESDEVENIMENTS SL — CIF: BXXXXXXXX
CIERRE FISCAL TRIMESTRE T1 / 2026 (Enero - Marzo)
Generado el: 2026-04-02 a las 10:15

CONTENIDO DEL PAQUETE
=====================

FACTURAS EMITIDAS .................. 12 documentos
  Base imponible total:         45.230,00 EUR
  IVA repercutido:               9.498,30 EUR
  Total facturado:              54.728,30 EUR

FACTURAS RECIBIDAS ................  8 documentos
  Base imponible total:         12.450,00 EUR
  IVA soportado:                 2.614,50 EUR
  Total compras:                15.064,50 EUR

GASTOS Y TICKETS ..................  15 documentos
  Total gastos:                  1.230,50 EUR

NOMINAS SOCIOS ....................  3 documentos
  Bruto total:                   7.500,00 EUR
  IRPF retenido:                 1.425,00 EUR

NOMINAS TRABAJADORES ..............  3 documentos
  Bruto total:                   5.400,00 EUR
  IRPF retenido:                   810,00 EUR

DATOS PARA MODELOS AEAT
=======================
Modelo 303 (IVA): A ingresar     6.883,80 EUR
Modelo 111 (IRPF): A ingresar    2.235,00 EUR

RESUMENES EXCEL INCLUIDOS: 7 ficheros
INFORMES DE CIERRE MENSUAL: 3 ficheros
```

Esta portada se genera con los mismos datos que ya estan en los Excel de resumen, consolidados en una sola pagina.

---

## 13. Modelos de Hacienda — Mapeo con datos del ERP (incluye nominas)

| Modelo | Periodicidad | Datos necesarios | Excel de referencia | Carpeta destino |
|--------|-------------|------------------|---------------------|-----------------|
| **303** (IVA) | Trimestral | IVA repercutido (facturas emitidas) + IVA soportado (compras + gastos) | `resumen_IVA_T{q}.xlsx` | `fiscal/{year}/T{q}/modelos/` |
| **111** (IRPF retenciones) | Trimestral | Retenciones a trabajadores (nominas `payroll_runs`) + retenciones a socios (retribuciones `partner_compensation_runs`) + retenciones a profesionales (facturas compra con IRPF) | `resumen_retenciones_T{q}.xlsx` + `resumen_nominas_T{q}.xlsx` | `fiscal/{year}/T{q}/modelos/` |
| **115** (Alquileres) | Trimestral | Retenciones por alquileres (si aplica) | — | `fiscal/{year}/T{q}/modelos/` |
| **200** (Impuesto Sociedades) | Anual | Beneficio neto, base imponible, provisiones IS | `resumen_IVA_anual.xlsx` + PyG | `fiscal/{year}/anual/modelos/` |
| **390** (Resumen anual IVA) | Anual | Suma de las 4 liquidaciones trimestrales 303 | `resumen_IVA_anual.xlsx` | `fiscal/{year}/anual/modelos/` |
| **347** (Op. terceros >3.005 EUR) | Anual | Facturacion acumulada por cliente/proveedor | `resumen_clientes.xlsx` + `resumen_proveedores.xlsx` | `fiscal/{year}/anual/modelos/` |
| **190** (Resumen retenciones) | Anual | Suma de las 4 liquidaciones trimestrales 111. Detalle por persona: claves A (trabajo), B02 (admin/socio), G (profesionales) | `resumen_retenciones_anual.xlsx` | `fiscal/{year}/anual/modelos/` |

**Nota sobre el Modelo 111 y nominas:** El dato mas importante para el 111 es el total de IRPF retenido en el trimestre, desglosado entre perceptores de rendimientos del trabajo (empleados) y perceptores de actividades profesionales/administradores (socios). El Excel `resumen_nominas_T{q}.xlsx` contiene este desglose ya calculado.

Los PDFs de los modelos presentados y sus justificantes de pago se suben manualmente (o desde el escaner) una vez presentados en la sede electronica de la AEAT.

---

## 14. Tabla `minio_files` — Campos adicionales

La tabla `public.minio_files` ya existe con esta estructura base:

```
id, bucket, key, original_name, mime_type, size_bytes, checksum,
owner_type, owner_id, document_type, status, created_by,
created_at, updated_at, deleted_at
```

Se necesitan estos campos adicionales para la organizacion fiscal:

```sql
fiscal_year       INTEGER,                  -- 2026
fiscal_quarter    SMALLINT,                 -- 1, 2, 3, 4
fiscal_month      SMALLINT,                 -- 1-12 (para ubicacion exacta)
document_date     DATE,                     -- Fecha del documento (no de subida)
tax_model         TEXT,                     -- '303', '111', '200', null
auto_generated    BOOLEAN DEFAULT false,    -- true = generado por el sistema
archived_from_status TEXT,                  -- 'ISSUED', 'APPROVED', 'POSTED'
```

### Indices adicionales

```sql
CREATE INDEX minio_files_fiscal_idx ON public.minio_files(fiscal_year, fiscal_quarter);
CREATE INDEX minio_files_document_date_idx ON public.minio_files(document_date);
CREATE INDEX minio_files_tax_model_idx ON public.minio_files(tax_model) WHERE tax_model IS NOT NULL;
```

> **Fase 2 — Ejecucion:**
> Esta migracion es rapida (ALTER TABLE + CREATE INDEX) y se puede ejecutar junto con la adicion
> de `storage_key` en las tablas de documentos (seccion 9). Ambas migraciones van en un solo archivo:
> `YYYYMMDDHHMMSS_add_fiscal_fields_and_storage_keys.sql`
> Estimacion: 1 hora incluyendo tests.

---

## 15. Arquitectura tecnica — Flujo de archivado

### Flujo automatico (factura emitida/aprobada)

```
Frontend (usuario emite factura)
  |
  v
Supabase DB (status -> ISSUED)
  |
  v  (Database webhook o Realtime listener)
nexo-file-worker (ALB357, Docker)
  |
  +-- 1. Detecta cambio de status
  +-- 2. Genera PDF (server-side, jsPDF o similar)
  +-- 3. Calcula key: fiscal/{year}/T{q}/ventas/{numero}_{cliente}.pdf
  +-- 4. Sube a MinIO local (localhost:9000)
  +-- 5. Registra en minio_files (con campos fiscales)
  +-- 6. Actualiza campo storage_key en la factura
```

### Flujo de descarga (frontend)

```
Frontend (usuario quiere descargar PDF)
  |
  v
Edge Function "minio-proxy" (Supabase)
  |
  +-- 1. Valida JWT del usuario
  +-- 2. Verifica permisos (RLS de minio_files)
  +-- 3. Genera presigned GET URL (via S3 SDK -> MinIO en ALB357)
  +-- 4. Devuelve URL temporal al frontend
  |
  v
Frontend redirige al presigned URL -> descarga directa desde MinIO
```

### Flujo de generacion de Excel trimestrales

```
Cierre de periodo (accounting.period_closures)
  |
  v  (si es fin de trimestre: mes 3, 6, 9 o 12)
nexo-file-worker
  |
  +-- 1. Ejecuta RPCs para obtener datos del trimestre
  +-- 2. Genera cada Excel con ExcelJS o similar
  +-- 3. Sube a MinIO: fiscal/{year}/T{q}/resumenes/{nombre}.xlsx
  +-- 4. Registra en minio_files (auto_generated = true)
  |
  v  (si es mes 12, ademas genera los anuales)
  +-- 5. Genera Excel anuales
  +-- 6. Sube a MinIO: fiscal/{year}/anual/resumenes/{nombre}.xlsx
```

---

## 16. Componentes nuevos a construir

### Backend (ALB357)

| Componente | Tipo | Descripcion |
|------------|------|-------------|
| `nexo-minio` | Docker container | Servidor MinIO S3 |
| `nexo-file-worker` | Docker container (Node.js) | Escucha cambios de status, genera PDFs, genera Excel, sube a MinIO |

### Supabase

| Componente | Tipo | Descripcion |
|------------|------|-------------|
| Migracion campos fiscales | SQL | Anadir campos a `minio_files` |
| Edge Function `minio-proxy` | Edge Function | Presigned URLs + listados + gestion ficheros |

### Frontend

| Componente | Tipo | Descripcion |
|------------|------|-------------|
| `ArchivedPDFViewer` | Componente React | Visor de PDF archivado via presigned URL (sustituye plantilla en docs emitidos). Ver seccion 9 |
| Logica dual en Detail Pages | Refactor | `InvoiceDetailPage`, `QuoteDetailPage`, etc. eligen entre plantilla (DRAFT) y archivo (EMITIDO) segun `storage_key` |
| Pagina "Archivo Fiscal" | Nueva pagina React | Explorador por anyo/trimestre/tipo con descarga individual y ZIP |
| Upload de modelos Hacienda | Componente | Upload manual de PDFs de modelos presentados |
| Indicador de archivado | Badge en detalle | Muestra fecha/hora de archivado y checksum en documentos ya emitidos |

---

## 17. Pagina "Archivo Fiscal" — Diseno de la UI

```
+================================================================+
|  ARCHIVO FISCAL                                    [2026 v]     |
+================================================================+
|                                                                 |
|  +-- T1 (Enero - Marzo)                   [Descargar ZIP T1]   |
|  |   +-- PORTADA TRIMESTRAL T1                 [Ver PDF]        |
|  |   +-- Facturas emitidas (12)                [Descargar]      |
|  |   +-- Facturas recibidas (8)                [Descargar]      |
|  |   +-- Gastos y tickets (15)                 [Descargar]      |
|  |   +-- Nominas socios (3)                    [Descargar]      |
|  |   +-- Nominas trabajadores (3)              [Descargar]      |
|  |   +-- Resumenes nominas mensuales (3)       [Descargar]      |
|  |   +-- Extractos bancarios (6)               [Descargar]      |
|  |   +-- Informes de cierre (3)                [Descargar]      |
|  |   +-- Modelos Hacienda (2)                  [Descargar]      |
|  |   +-- RESUMENES EXCEL TRIMESTRALES                           |
|  |       +-- registro_ventas_T1_2026.xlsx      [Descargar]      |
|  |       +-- registro_compras_T1_2026.xlsx     [Descargar]      |
|  |       +-- registro_gastos_T1_2026.xlsx      [Descargar]      |
|  |       +-- resumen_IVA_T1_2026.xlsx          [Descargar]      |
|  |       +-- resumen_nominas_T1_2026.xlsx      [Descargar]      |
|  |       +-- resumen_retenciones_T1_2026.xlsx  [Descargar]      |
|  |       +-- conciliacion_bancaria_T1_2026.xlsx[Descargar]      |
|  |                                                              |
|  +-- T2 (Abril - Junio)                   [Descargar ZIP T2]   |
|  |   +-- ...                                                    |
|  |                                                              |
|  +-- T3 (Julio - Septiembre)              [Descargar ZIP T3]   |
|  |   +-- ...                                                    |
|  |                                                              |
|  +-- T4 (Octubre - Diciembre)             [Descargar ZIP T4]   |
|  |   +-- ...                                                    |
|  |                                                              |
|  +-- ANUAL                                [Descargar ZIP Anual] |
|      +-- Modelos anuales (4)                   [Descargar]      |
|      +-- Cuentas anuales (3)                   [Descargar]      |
|      +-- RESUMENES EXCEL ANUALES                                |
|          +-- libro_facturas_emitidas_2026.xlsx  [Descargar]     |
|          +-- libro_facturas_recibidas_2026.xlsx [Descargar]     |
|          +-- libro_diario_2026.xlsx             [Descargar]     |
|          +-- resumen_IVA_anual_2026.xlsx        [Descargar]     |
|          +-- resumen_retenciones_anual_2026.xlsx[Descargar]     |
|          +-- resumen_clientes_2026.xlsx         [Descargar]     |
|          +-- resumen_proveedores_2026.xlsx      [Descargar]     |
|          +-- ...                                                |
|                                                                 |
+================================================================+
```

El boton "Descargar ZIP" genera un archivo comprimido con toda la documentacion del trimestre, listo para enviar al gestor.

---

## 18. Seguridad

- MinIO **NUNCA** se expone a internet. Solo accesible via Tailscale o desde contenedores locales en ALB357
- Las presigned URLs tienen expiracion corta (5-15 minutos)
- La tabla `minio_files` tiene RLS:
  - Admin/Manager: acceso completo a todos los ficheros
  - Usuario normal: solo ve sus propios ficheros (los que ha creado)
- El bucket `nexo-prod` es **privado**, nunca publico
- Los PDF archivados son **inmutables**: una vez subidos no se modifican (soft delete para "eliminar")

---

## 19. Calendario fiscal de referencia (Espana - SL)

### Modelos trimestrales

| Trimestre | Periodo | Plazo presentacion | Modelos |
|-----------|---------|-------------------|---------|
| T1 | Enero - Marzo | 1-20 Abril | 303, 111, 115 |
| T2 | Abril - Junio | 1-20 Julio | 303, 111, 115 |
| T3 | Julio - Septiembre | 1-20 Octubre | 303, 111, 115 |
| T4 | Octubre - Diciembre | 1-30 Enero (siguiente) | 303, 111, 115 |

### Modelos anuales

| Modelo | Plazo | Descripcion |
|--------|-------|-------------|
| 390 | 1-30 Enero | Resumen anual IVA |
| 190 | 1-31 Enero | Resumen anual retenciones |
| 347 | 1-28 Febrero | Operaciones con terceros >3.005,06 EUR |
| 200 | 1-25 Julio | Impuesto de Sociedades |
| Cuentas anuales | 6 meses desde cierre ejercicio | Deposito en Registro Mercantil |

---

## 20. Plan de implementacion por fases

| Fase | Que | Prioridad | Dificultad |
|------|-----|-----------|------------|
| **1** | Instalar MinIO en Docker en ALB357 (disco actual) | ALTA | Baja |
| **2** | Migracion DB: campos fiscales en `minio_files` + campo `storage_key` en tablas de documentos | ALTA | Baja |
| **3** | Crear `nexo-file-worker`: archivado automatico de PDFs al cambiar status | ALTA | Media |
| **4** | Crear Edge Function `minio-proxy`: presigned URLs para descarga | ALTA | Media |
| **5** | **Migrar visor PDF: `ArchivedPDFViewer` + logica dual en Detail Pages** (seccion 9) | **ALTA** | Media |
| **6** | Generacion de Excel trimestrales al cierre de periodo | ALTA | Media-Alta |
| **7** | Pagina "Archivo Fiscal" en frontend | MEDIA | Media |
| **8** | Upload manual de modelos Hacienda y extractos bancarios | MEDIA | Baja |
| **9** | Descarga en ZIP de trimestre completo | MEDIA | Media |
| **10** | Generacion de Excel anuales al cerrar diciembre | MEDIA | Media |
| **11** | Conectar SSD 1TB al servidor ALB357 | BAJA (cuando llegue) | Baja |
| **12** | Migracion de datos: almacenamiento interno → SSD 1TB (ver seccion 22) | BAJA (tras Fase 11) | Media |

---

## 21. Dependencias tecnicas

### Servidor ALB357

- `minio/minio:latest` — Servidor S3
- `exceljs` (npm) — Generacion de Excel en Node.js
- `jspdf` (npm) — Generacion de PDF server-side (alternativa a react-pdf)
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` — SDK S3 para presigned URLs
- `archiver` (npm) — Generacion de ZIP para descargas por trimestre

### Frontend

- Pagina nueva en `src/pages/nexo_av/desktop/pages/FiscalArchivePage.tsx`
- Componente de upload para modelos Hacienda
- Integracion de badge "Archivado" en paginas de facturas

---

## 22. Migracion de almacenamiento interno a SSD 1TB

### Contexto

El servidor ALB357 actualmente usa su disco interno (28 GB total, ~13 GB libres). Esto es suficiente
para arrancar con MinIO (Fase 1) y operar durante los primeros meses, pero no es viable a largo plazo:
los PDFs, Excel y documentos escaneados crecen rapidamente.

Cuando la estructura de MinIO ya este funcional (Fases 1–5 completadas) y se disponga del SSD de 1TB,
hay que migrar todos los datos sin perder disponibilidad.

### Prerequisitos

- [ ] SSD 1TB conectado fisicamente a ALB357 (USB 3.0 o SATA segun modelo)
- [ ] SSD formateado en ext4 (Linux) o NTFS si es Windows Server
- [ ] Punto de montaje creado: `/mnt/ssd` (Linux) o `D:\minio-data` (Windows)
- [ ] Fases 1–5 completadas (MinIO funcional con archivado automatico operando)
- [ ] Verificar espacio libre en SSD: al menos 10x el tamano actual de `/opt/minio-data`

### Procedimiento de migracion

```
PASO 1: Preparar el SSD
  - Conectar fisicamente
  - Crear particion y formatear
  - Montar en /mnt/ssd (Linux): sudo mount /dev/sdX1 /mnt/ssd
  - Anadir al /etc/fstab para montaje automatico al reiniciar
  - Crear directorio: mkdir -p /mnt/ssd/minio-data

PASO 2: Copiar datos existentes (con MinIO funcionando)
  - Parar MinIO temporalmente:
    cd /opt/nexo-minio && docker compose stop minio
  - Copiar con rsync (preserva permisos y timestamps):
    rsync -avhP /opt/minio-data/ /mnt/ssd/minio-data/
  - Verificar integridad:
    diff -r /opt/minio-data /mnt/ssd/minio-data (o comparar checksums)

PASO 3: Cambiar docker-compose para apuntar al SSD
  - En /opt/nexo-minio/docker-compose.yml:
    Comentar:   - /opt/minio-data:/data
    Descomentar: - /mnt/ssd/minio-data:/data

PASO 4: Reiniciar MinIO con el nuevo volumen
  - docker compose up -d minio
  - Verificar: docker logs nexo-minio (debe arrancar sin errores)
  - Verificar desde storage-health Edge Function
  - Verificar desde la consola web (http://100.117.250.115:9001)

PASO 5: Validacion funcional
  - Comprobar que el frontend carga PDFs archivados (presigned URLs)
  - Comprobar que el listado del Archivo Fiscal muestra los mismos ficheros
  - Emitir un documento de prueba y verificar que se archiva en el SSD
  - Verificar checksums de un sample aleatorio contra minio_files

PASO 6: Limpieza
  - Solo cuando todo funcione correctamente (esperar al menos 1 semana):
    rm -rf /opt/minio-data (liberar espacio en disco interno)
  - Actualizar documentacion y backups
```

### Estimacion de capacidad tras migracion

| Concepto | Tamano estimado por unidad | Volumen anual estimado | Tamano anual |
|----------|---------------------------|----------------------|-------------|
| Facturas venta (PDF) | ~100 KB | ~200 docs | ~20 MB |
| Facturas compra (PDF) | ~200 KB | ~150 docs | ~30 MB |
| Tickets/Gastos (PDF) | ~150 KB | ~300 docs | ~45 MB |
| Nominas (PDF) | ~80 KB | ~120 docs | ~10 MB |
| Excel trimestrales | ~50 KB | ~28 ficheros | ~1.5 MB |
| Excel anuales | ~100 KB | ~10 ficheros | ~1 MB |
| Informes cierre + portadas | ~200 KB | ~16 ficheros | ~3 MB |
| **Total anual estimado** | | | **~110 MB** |
| **Capacidad SSD 1TB** | | | **+9.000 anyos** |

> El cuello de botella real no es el espacio, sino la organizacion y el acceso rapido.
> Con 1TB el almacenamiento deja de ser un problema para siempre.

### Rollback

Si algo falla tras la migracion:
1. Parar MinIO: `docker compose stop minio`
2. Revertir `docker-compose.yml` al volumen original (`/opt/minio-data:/data`)
3. Reiniciar: `docker compose up -d minio`
4. Investigar el problema antes de reintentar

---

## 23. Notas finales

- **REGLA CRITICA — Documento definitivo**: una vez un documento se emite/aprueba/envia, el PDF almacenado en MinIO es la UNICA fuente de verdad. La plantilla React ya no participa. El visor de la pagina de detalle carga el PDF archivado, no lo re-genera. Ver seccion 9 para detalles completos
- Los Excel pre-generados son la pieza clave: el gestor necesita datos tabulados, no solo PDFs
- La estructura `fiscal/{year}/T{q}/` es la unidad minima que se entrega al gestor
- Todo documento que afecta fiscalmente debe estar archivado ANTES del plazo de presentacion
- El sistema es retrocompatible: se pueden importar documentos de ejercicios anteriores manteniendo la misma estructura
- Cuando se conecte el SSD de 1TB, se estima capacidad para +10 anyos de documentacion completa
- **Las nominas son mensuales**: cada mes, al contabilizar (POSTED) nominas de socios y trabajadores, se archivan los PDFs individuales y se genera el resumen mensual del mes en Excel. El resumen trimestral y anual se generan al cierre del trimestre/anyo respectivamente
- Las dos tablas de nominas (`payroll_runs` para trabajadores y `partner_compensation_runs` para socios) se tratan como fuentes independientes pero se consolidan en los resumenes para el Modelo 111 y 190
- Los campos `ss_employee` y `ss_company` en `payroll_runs` estan preparados para cuando se contraten empleados con Seguridad Social; los socios/administradores actualmente solo tienen retencion IRPF
- **Componentes frontend afectados**: `InvoiceDetailPage`, `QuoteDetailPage`, `PurchaseInvoiceDetailPage` — todos deben implementar la logica dual (plantilla vs archivo) basada en el campo `storage_key`
