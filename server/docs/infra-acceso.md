# Arquitectura de acceso seguro – AV TECH (sin Cloudflare)

## Objetivo
Definir y documentar una arquitectura de acceso seguro a la infraestructura de AV TECH
sin exponer servicios públicos, utilizando **Tailscale** como red privada (Zero Trust simple).

Esta documentación parte de **cero**, asumiendo que:
- No hay nada configurado en Tailscale
- No se usa Cloudflare
- El acceso se controla por identidad, no por IP pública

---

## 1. Estado actual del proyecto

### 1.1 Servidor
- Sistema: Ubuntu Server
- Rol:
  - Backend / storage interno
  - Servicios privados (no expuestos a internet)
- Acceso actual:
  - SSH local
  - Sin túneles públicos
  - Sin proxy inverso externo

---

### 1.2 Frontend
- Hosting: Firebase Hosting
- Dominio público:
  - `www.avtechesdeveniments.com`
- Rutas públicas:
  - Landing web corporativa
- Rutas privadas (objetivo):
  - `/nexo-av`
  - `/admin`
- El frontend **no debe** acceder directamente al servidor por IP pública

---

## 2. Decisión arquitectónica

### ❌ Qué descartamos
- Cloudflare Zero Trust
- DNS complejos
- Proxy inverso externo
- Exposición de puertos públicos

### ✅ Qué usamos
- **Tailscale**
- Red privada tipo VPN mesh
- Acceso por usuario / dispositivo
- Seguridad por identidad

---

## 3. Concepto clave: cómo funcionará el acceso

### Principio base
> Ningún servicio crítico está expuesto a internet  
> Todo acceso pasa por Tailscale

---

### Flujo general

```text
Usuario autorizado
        ↓
Tailscale (login por cuenta AV TECH)
        ↓
Red privada 100.x.x.x
        ↓
Servidor Ubuntu
        ↓
Servicios internos (API, storage, admin)
```

---

## 4. Diseño de la red Tailscale

### 4.1 Tailnet

| Atributo | Valor |
|----------|-------|
| Organización | avtechesdeveniments.com |
| Tipo | empresa |
| Autenticación | Cuenta corporativa / Acceso por usuario |

### 4.2 Dispositivos esperados

| Tipo | Nombre ejemplo | Rol |
|------|----------------|-----|
| Servidor | nexo-storage | Backend / Storage |
| Portátil | alex-laptop | Desarrollo / Admin |
| Móvil | alex-phone | Acceso puntual |
| VM | nexo-dev | Testing |

---

## 5. Instalación de Tailscale (desde cero)

### 5.1 En el servidor Ubuntu

```bash
curl -fsSL https://tailscale.com/install.sh | sh

sudo tailscale up
```

- Se abre un enlace de login
- Se autoriza el servidor en el tailnet correcto

### 5.2 En equipos de trabajo

1. Instalar Tailscale (Windows / macOS / iOS / Android)
2. Login con la misma cuenta
3. El dispositivo aparece automáticamente en la red privada

---

## 6. Direccionamiento interno

Cada dispositivo obtiene una IP privada:

- **Rango:** `100.x.x.x`
- **Ejemplo:**
  - Servidor: `100.101.233.19`
  - Portátil: `100.89.11.61`

Estas IPs:
- Son estables
- No son públicas
- Solo accesibles dentro del tailnet

---

## 7. Acceso al servidor

### 7.1 SSH seguro (recomendado)

```bash
ssh usuario@100.xxx.xxx.xxx
```

O directamente:

```bash
tailscale ssh usuario@hostname
```

> Sin abrir puerto 22 en internet

### 7.2 Servicios internos

Ejemplos:

| Servicio | URL interna |
|----------|-------------|
| API backend | `http://100.101.233.19:3000` |
| Storage (MinIO) | `http://100.101.233.19:9000` |
| Admin panel | `http://100.101.233.19:8080` |

Solo accesibles:
- Si estás conectado a Tailscale
- Si tu usuario está autorizado

---

## 8. Relación con el frontend (Firebase)

### ⚠️ Importante

> El frontend público **NO** accede directamente al servidor.

### Opciones correctas

- El frontend solo muestra UI
- Las acciones sensibles:
  - Se ejecutan desde backend interno
  - O desde un panel accesible solo por Tailscale

### Ejemplo correcto

| Ruta | Comportamiento |
|------|----------------|
| `/nexo-av` | Requiere estar en Tailscale, accede a backend por IP `100.x` |
| Usuario externo | Nunca toca el servidor directamente |

---

## 9. Seguridad

### ✅ Qué ganamos

- Sin IP pública
- Sin firewall complejo
- Sin ataques de fuerza bruta
- Acceso revocable por usuario
- Logs por dispositivo

### ❌ Qué NO hace falta

- VPN tradicional
- Port forwarding
- Certificados manuales
- Proxy inverso externo

---

## 10. Próximos pasos (no implementados aún)

- [ ] ACLs de Tailscale (roles)
- [ ] Separación prod / dev
- [ ] Integración con auth del backend
- [ ] Panel interno solo accesible por tailnet

---

## 11. Regla de oro

> **Si no estás en Tailscale, no existes para la infraestructura.**

---

**Última actualización:** Febrero 2026
