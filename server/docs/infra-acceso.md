# Arquitectura de acceso AV TECH – conexión plataforma ↔ server

## Objetivo

Documentar el modelo final de conexión entre la plataforma NEXO y el servidor, priorizando:

- Seguridad real (sin brechas típicas)
- Simplicidad operativa
- Escalabilidad futura (IA local, CSM, storage)

Este modelo **NO usa Cloudflare** y **NO requiere VPN para usuarios finales**.

---

## 1. Principios base (decisión final)

- El frontend **nunca** entra en la red privada.
- El servidor **no confía** en el frontend, solo en JWT válidos.
- Supabase es la **autoridad de identidad** (OTP + JWT).
- El servidor es el único que **autoriza acceso** a recursos críticos.
- Tailscale se usa **solo para administración interna**, no para usuarios.

---

## 2. Arquitectura general

```text
Usuario (web)
        ↓
Login plataforma (OTP + Supabase Auth)
        ↓
Frontend (Firebase Hosting)
        ↓  HTTPS + Authorization: Bearer <JWT>
Servidor AV TECH (API privada)
        ↓
├── Storage (MinIO / disco)
├── IA local
└── CSM / gestión de dispositivos
```

```text
(Admin / Dev)
        ↓
Tailscale
        ↓
Red privada 100.x.x.x
        ↓
Servidor Ubuntu
```

---

## 3. Rol de cada componente

### 3.1 Frontend (Firebase)

- UI y experiencia de usuario
- Nunca almacena secretos
- Nunca accede a IPs privadas
- Siempre envía JWT en peticiones privadas

### 3.2 Supabase

- Autenticación (email + OTP)
- Emisión de JWT de sesión
- Base de datos
- RLS para metadatos

### 3.3 Servidor AV TECH

- Autoridad de acceso a:
  - Documentos
  - IA local
  - CSM
- Valida JWT en cada request
- Aplica reglas de autorización (rol, empresa, proyecto)
- Genera URLs firmadas para storage

### 3.4 Tailscale (solo admins)

- SSH
- Consolas internas
- Debug / mantenimiento
- **Nunca** en el flujo del usuario final

---

## 4. Conexión plataforma ↔ servidor

### 4.1 Autenticación

1. El usuario se autentica mediante OTP
2. Supabase emite JWT
3. El frontend adjunta el JWT en cada request:

```http
Authorization: Bearer <access_token>
```

### 4.2 Validación en el servidor

En todos los endpoints privados, el servidor:

1. Verifica la firma del JWT
2. Extrae:
   - `user_id`
   - `role`
   - `company_id` / `tenant_id`
3. Verifica permisos
4. Ejecuta la acción

> ⚠️ El servidor **nunca** acepta IDs críticos desde el body del cliente.

---

## 5. Gestión de documentos (modelo seguro)

### 5.1 Subida de archivos

1. Frontend → `POST /files/presign-upload`
2. Servidor valida JWT y permisos
3. Servidor crea registro en DB (`minio_files`)
4. Servidor devuelve URL firmada (PUT)
5. Frontend sube el archivo

### 5.2 Descarga de archivos

1. Frontend → `POST /files/presign-download`
2. Servidor valida JWT y permisos
3. Servidor devuelve URL firmada (GET)

**Reglas clave:**

- URLs con expiración corta
- Rutas generadas solo por el servidor
- Buckets privados

---

## 6. IA local

- Endpoint protegido: `/ai/*`
- Requiere JWT
- Permisos por rol
- Auditoría de uso (quién, cuándo, para qué)

---

## 7. CSM / gestión de dispositivos

- Dispositivos se registran con token propio
- Comunicación device → server (pull)
- El frontend solo gestiona:
  - Assets
  - Playlists
  - Asignaciones

---

## 8. Seguridad (resumen)

### ✅ Protecciones clave

| Capa | Protección |
|------|------------|
| Autenticación | OTP con expiración + rate limit |
| Sesión | JWT obligatorio |
| Backend | Autorización en servidor |
| Storage | URLs firmadas, buckets privados |
| Admin | Consolas solo por Tailscale |

### ❌ Qué NO se usa

- VPN para usuarios
- Acceso directo a IP privada
- Tokens permanentes en URLs
- Confianza en el frontend

---

## 9. Regla de oro

> **La plataforma identifica. El servidor autoriza.**

---

**Estado:** arquitectura final aprobada  
**Última actualización:** Febrero 2026
