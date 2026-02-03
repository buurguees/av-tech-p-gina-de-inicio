# NEXO Server – Infrastructure Overview

## 🧠 Descripción general

Este repositorio documenta la **infraestructura del servidor NEXO**, que actúa como:

- 🔧 **Backend técnico** de la plataforma
- 🗄️ **Cerebro de datos** (storage, modelos, backups)
- 🤖 **Nodo de IA** (modelos open-source, automatizaciones)
- 🐳 **Host de contenedores Docker**
- 🔐 **Servidor privado** accesible solo por red segura

El objetivo es disponer de una **infraestructura controlada, reproducible y escalable**, sin depender exclusivamente de servicios cloud externos.

---

## 🖥️ Entorno del servidor

- **Sistema operativo:** Ubuntu Server
- **Equipo:** Nexcom industrial
- **RAM:** 8 GB
- **CPU:** Arquitectura x86_64
- **Red:** Acceso privado (VPN / Tailscale)
- **Uso:** Producción / pruebas internas

---

## 💾 Almacenamiento

### Disco interno
- Tamaño: ~64 GB
- Uso:
  - Sistema operativo
  - Boot
  - Servicios críticos

### Disco externo (principal)
- Tipo: SSD USB 3.0
- Tamaño: ~1 TB
- Punto de montaje: `/mnt/storage`
- Sistema de archivos: `ext4`
- Montaje persistente mediante `/etc/fstab`

📄 **Documentación completa del setup:**  
[server/docs/storage-setup.md](docs/storage-setup.md)

---

## 📁 Estructura de carpetas

```text
server/
├─ README.md              # Este documento
├─ docs/                  # Documentación técnica
│  └─ storage-setup.md    # Configuración del SSD externo
├─ docker/                # Stacks y servicios Docker
├─ data/                  # Datos persistentes
├─ models/                # Modelos IA (LLMs, embeddings, etc.)
├─ backups/               # Backups locales / snapshots
├─ scripts/               # Scripts de automatización
└─ config/                # Configuraciones del sistema
```

> ⚠️ **Todo el contenido pesado debe ir siempre en `/mnt/storage`**  
> Nunca en el disco interno.

---

## 🐳 Docker (filosofía)

Docker se usa como capa de ejecución estándar:

- **Servicios desacoplados**
- **Fácil migración** a otro servidor
- **Persistencia** montada en `/mnt/storage/docker`

**Ejemplo esperado:**

```text
/mnt/storage/docker/
├─ postgres/
├─ redis/
├─ ollama/
├─ n8n/
└─ apps/
```

---

## 🤖 Inteligencia Artificial

Este servidor está preparado para:

- Ejecutar **modelos open-source** (LLMs)
- Procesar datos internos
- Automatizar cálculos, análisis y notificaciones
- Servir como **asistente interno** de la empresa

Los modelos y datos se almacenan en:

- `/mnt/storage/models`

---

## 🔐 Seguridad y acceso

- **Acceso solo por red privada**
- Sin exposición directa a internet
- Usuarios limitados
- Infraestructura pensada para **uso interno y controlado**

---

## 🔁 Persistencia y recuperación

**Principios clave:**

- Todo lo importante vive en `/mnt/storage`
- El sistema puede **reinstalarse sin perder datos**
- El servidor es **reproducible**
- **Migración sencilla** a otro hardware

---

## 📌 Buenas prácticas

- No guardar datos críticos en `/home`
- Documentar cualquier cambio relevante
- Versionar scripts y configuraciones
- Mantener `docs/` actualizado
- Pensar siempre en **escalabilidad y migración**

---

## 🚀 Roadmap técnico (alto nivel)

- [ ] Centralizar Docker completamente en SSD
- [ ] Backups automáticos
- [ ] Monitoring básico
- [ ] Gestión remota de servicios
- [ ] Integración con plataforma NEXO
- [ ] IA como asistente del sistema
