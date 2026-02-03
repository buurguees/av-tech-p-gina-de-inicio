
# Plan: Sistema de Email-to-Scanner con Resend Inbound

## Resumen

Implementaremos un sistema donde los emails enviados a una dirección específica (como `scanner@avtechesdeveniments.com`) carguen automáticamente los PDF adjuntos en la bandeja del Escáner.

---

## Problema con facturacion@avtechesdeveniments.com

Este email ya existe como grupo de Microsoft 365/Sharepoint. Resend Inbound requiere un registro **MX** propio, lo que entraría en conflicto con los registros MX de Microsoft.

### Soluciones disponibles

| Opción | Email | Pros | Contras |
|--------|-------|------|---------|
| **A (Recomendada)** | `scanner@avtechesdeveniments.com` | Sin conflictos, dedicado al sistema | Nuevo subdominio no necesario |
| **B** | `facturas.avtechesdeveniments.com` | Subdominio separado | Requiere registro DNS adicional |
| **C** | Reenvío desde facturacion@ | Usa el email existente | Configuración manual en Microsoft 365 |

**Recomendación**: Usar un subdominio como `inbound.avtechesdeveniments.com` y el email sería `facturas@inbound.avtechesdeveniments.com`. Esto evita cualquier conflicto con los registros MX existentes de Microsoft.

---

## Arquitectura del Sistema

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO COMPLETO                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Técnico/Proveedor                                                       │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────┐                                                        │
│  │  Email + PDF    │  ───────────────────────────────────────┐              │
│  │  adjunto        │                                         │              │
│  └─────────────────┘                                         │              │
│         │                                                    │              │
│         ▼                                                    │              │
│  ┌─────────────────┐                                         ▼              │
│  │  Resend Inbound │                                 ┌───────────────┐      │
│  │  MX Record      │                                 │  Dashboard    │      │
│  └─────────────────┘                                 │  Resend       │      │
│         │                                            └───────────────┘      │
│         │ Webhook POST                                                      │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │           Supabase Edge Function                         │               │
│  │           "receive-invoice-email"                        │               │
│  ├─────────────────────────────────────────────────────────┤               │
│  │  1. Verificar firma webhook (svix)                      │               │
│  │  2. Obtener adjuntos PDF vía API Resend                 │               │
│  │  3. Subir PDFs a Storage bucket                         │               │
│  │  4. Crear registro en scanned_documents                 │               │
│  │  5. (Opcional) Enviar notificación                      │               │
│  └─────────────────────────────────────────────────────────┘               │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────┐    ┌─────────────────┐                                │
│  │  Supabase       │    │  scanned_       │                                │
│  │  Storage        │    │  documents      │                                │
│  │  (PDFs)         │    │  (DB)           │                                │
│  └─────────────────┘    └─────────────────┘                                │
│         │                      │                                            │
│         └──────────┬───────────┘                                            │
│                    ▼                                                        │
│           ┌─────────────────┐                                              │
│           │   NexoAV UI     │                                              │
│           │   Escáner Tab   │                                              │
│           └─────────────────┘                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pasos de Implementación

### PASO 1: Configuración en Resend (Manual - Tú)

1. **Ir a Resend Dashboard** → Domains
2. **Añadir subdominio** `inbound.avtechesdeveniments.com` (o similar)
3. **Habilitar "Receiving"** para ese dominio
4. **Copiar el registro MX** que proporciona Resend
5. **Añadir registro MX en tu DNS** (Microsoft 365 Admin o proveedor DNS):
   ```
   inbound.avtechesdeveniments.com  MX  10  inbound-smtp.us-east-1.amazonaws.com
   ```
6. **Crear Webhook** en Resend → Webhooks:
   - URL: `https://takvthfatlcjsqgssnta.supabase.co/functions/v1/receive-invoice-email`
   - Evento: `email.received`
   - Copiar el **Webhook Secret** para añadirlo como secret

### PASO 2: Añadir Secrets en Supabase

Necesitaremos añadir un nuevo secret:

| Secret | Descripción |
|--------|-------------|
| `RESEND_WEBHOOK_SECRET` | Secret para verificar webhooks de Resend |

(Usaremos el `RESEND_API_KEY` existente para llamar a la API de Resend)

### PASO 3: Crear Edge Function "receive-invoice-email"

Nueva Edge Function que:

1. **Verifica la firma del webhook** usando `svix` para seguridad
2. **Procesa eventos `email.received`**
3. **Obtiene los adjuntos** via `resend.emails.receiving.attachments.list()`
4. **Filtra solo PDFs** e imágenes (jpg, png)
5. **Descarga cada adjunto** desde la URL proporcionada
6. **Sube a Supabase Storage** en el bucket `scanned-documents`
7. **Crea registro** en `scanned_documents` con status `UNASSIGNED`
8. **Opcional**: Añade metadatos del email (remitente, asunto) en el campo `notes`

### PASO 4: Actualizar UI del Escáner (Opcional)

- Mostrar origen del documento (manual vs email)
- Mostrar remitente del email si aplica
- Icono diferente para documentos recibidos por email

---

## Detalle Técnico de la Edge Function

```text
receive-invoice-email/index.ts
├── Importaciones
│   ├── Resend SDK
│   ├── Supabase client (service role)
│   └── Verificación webhook (svix pattern)
├── Handler POST
│   ├── Verificar headers svix (id, timestamp, signature)
│   ├── Parsear evento JSON
│   ├── Guardar payload si event.type === 'email.received'
│   ├── Llamar resend.emails.receiving.attachments.list()
│   ├── Para cada adjunto PDF/imagen:
│   │   ├── Descargar desde download_url
│   │   ├── Subir a storage bucket
│   │   └── Insertar en scanned_documents
│   └── Responder 200 OK
└── Handler OPTIONS (CORS)
```

### Campos que se guardarán

| Campo | Valor |
|-------|-------|
| `file_path` | `email-inbox/{email_id}/{filename}` |
| `file_name` | Nombre original del adjunto |
| `file_size` | Tamaño en bytes |
| `file_type` | MIME type (application/pdf, image/jpeg, etc.) |
| `status` | `UNASSIGNED` |
| `notes` | `De: {from} | Asunto: {subject}` |
| `created_by` | NULL (sistema automático) |

---

## Consideraciones de Seguridad

1. **Verificación de Webhook**: Validamos la firma svix para asegurar que los requests vienen de Resend
2. **Sin JWT**: El endpoint debe ser público (`verify_jwt = false`) porque Resend no envía auth tokens
3. **Límite de tamaño**: Resend tiene un límite de ~25MB por email, alineado con nuestro límite de 50MB
4. **Tipos permitidos**: Solo procesamos PDF, JPG, PNG para evitar archivos maliciosos

---

## Resumen de Cambios

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `supabase/functions/receive-invoice-email/index.ts` | Edge function para procesar webhooks |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/config.toml` | Añadir configuración de la nueva function |

### Secrets a añadir

| Secret | Fuente |
|--------|--------|
| `RESEND_WEBHOOK_SECRET` | Dashboard Resend → Webhooks |

### Configuración DNS (Manual)

| Tipo | Host | Valor | Prioridad |
|------|------|-------|-----------|
| MX | `inbound.avtechesdeveniments.com` | `inbound-smtp.us-east-1.amazonaws.com` | 10 |

---

## Email Final de Recepción

Una vez configurado, podrás recibir facturas en:

```
facturas@inbound.avtechesdeveniments.com
```

O si prefieres sin subdominio adicional y puedes configurar reenvío en Microsoft 365:

```
facturacion@avtechesdeveniments.com → reenvío → facturas@inbound.avtechesdeveniments.com
```

---

## Próximos Pasos Después de Aprobar

1. Añadir el secret `RESEND_WEBHOOK_SECRET`
2. Crear la Edge Function
3. Actualizar config.toml
4. Probar enviando un email con PDF adjunto
5. Verificar que aparece en la bandeja del Escáner
