# MinIO – Instalación, Arquitectura y Operación en NEXO AV

## 1. Objetivo

Este documento describe **cómo se ha instalado, configurado y cómo funciona MinIO** dentro de la infraestructura de **NEXO AV**, actuando como **sistema de almacenamiento de archivos (Object Storage)** para la plataforma.

MinIO es el sistema encargado de **almacenar todos los archivos binarios** de la empresa:

* Facturas
* Presupuestos
* Compras
* Documentación
* Imágenes
* Productos
* Backups

Mientras que la base de datos (Supabase / DB principal) almacena **solo metadatos**, nunca archivos.

---

## 2. Principios de diseño

* MinIO = archivos (binarios)
* Base de datos = información (metadatos)
* Separación total entre:

  * Infraestructura (admin)
  * Aplicación (backend)
* Seguridad por **mínimo privilegio**
* Sistema reproducible y documentado
* Preparado para explorador tipo Windows en la plataforma

---

## 3. Infraestructura del servidor

### 3.1 Disco y estructura base

Todo MinIO vive en el SSD montado en:

```
/mnt/storage
```

Estructura relevante:

```
/mnt/storage
├── compose/
│   └── minio/
│       └── docker-compose.yml
├── services/
│   └── minio/
│       ├── data/
│       └── config/
└── docker/   (root de Docker)
```

* `services/minio/data` → archivos reales
* `services/minio/config` → configuración interna de MinIO
* `compose/minio` → definición del servicio (versionable)

---

## 4. Instalación de Docker (resumen)

Docker está instalado y configurado para usar el SSD:

```
Docker Root Dir: /mnt/storage/docker
```

Esto garantiza:

* rendimiento
* persistencia
* separación del sistema operativo

---

## 5. Despliegue de MinIO

### 5.1 Docker Compose

Archivo:

```
/mnt/storage/compose/minio/docker-compose.yml
```

Contenido:

```yaml
services:
  minio:
    image: minio/minio:latest
    container_name: minio
    restart: unless-stopped

    command: server /data --console-address ":9001"

    ports:
      - "9000:9000"   # API S3
      - "9001:9001"   # Consola web

    environment:
      MINIO_ROOT_USER: nexo_admin
      MINIO_ROOT_PASSWORD: ********

    volumes:
      - /mnt/storage/services/minio/data:/data
      - /mnt/storage/services/minio/config:/root/.minio
```

### 5.2 Puertos

* `9000` → API S3 (usada por la plataforma)
* `9001` → Consola web (administración)

Acceso vía red privada (Tailscale).

---

## 6. Acceso y administración

### 6.1 Consola web

Acceso:

```
http://IP_TAILSCALE:9001
```

Usuario administrador:

* Usuario: `nexo_admin`
* Uso exclusivo para infraestructura

---

## 7. Cliente CLI de MinIO (mc)

### 7.1 Instalación

```bash
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/
```

### 7.2 Alias

```bash
mc alias set nexo http://127.0.0.1:9000 nexo_admin ******
```

---

## 8. Bucket de producción

Bucket principal:

```
nexo-prod
```

Este bucket representa el **disco lógico principal** de NEXO AV.

---

## 9. Estructura lógica (filesystem)

Estructura creada por consola:

```
nexo-prod/
├── clientes/
├── proyectos/
├── facturacion/
├── compras/
├── documentos/
├── productos/
├── imagenes/
└── backups/
```

Estas carpetas son **prefijos S3**, interpretados como carpetas por la UI.

---

## 10. Seguridad

### 10.1 Policy de aplicación

Archivo:

```
/root/nexo-app-policy.json
```

Permisos:

* Listar bucket
* Leer / escribir / borrar objetos
* Solo sobre `nexo-prod`

---

### 10.2 Usuario de aplicación

Usuario:

```
nexo_app
```

* No admin
* Acceso solo al bucket `nexo-prod`
* Credenciales usadas exclusivamente por el backend

---

## 11. Conexión desde la plataforma

Variables de entorno requeridas:

```env
MINIO_ENDPOINT=IP_TAILSCALE
MINIO_PORT=9000
MINIO_USE_SSL=false

MINIO_ACCESS_KEY=nexo_app
MINIO_SECRET_KEY=********

MINIO_BUCKET=nexo-prod
```

---

## 12. Responsabilidades

### MinIO

* Almacenar archivos
* Gestionar estructura de carpetas
* Seguridad de acceso a objetos

### Plataforma NEXO AV

* Decidir rutas
* Gestionar permisos por rol
* Guardar metadatos en base de datos
* Construir explorador tipo Windows

---

## 13. Estado actual

* MinIO operativo
* Bucket creado
* Estructura base creada
* Usuario seguro configurado
* Listo para integración con backend

---

## 14. Próximos pasos

* Integración backend
* Diseño de explorador tipo Windows
* Automatización de backups
* Proxy inverso + HTTPS
