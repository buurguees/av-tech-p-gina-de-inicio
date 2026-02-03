# 🐳 Docker Setup – NEXO AV Server

Documentación oficial de la instalación, configuración y operación de **Docker** en el servidor **nexo-storage**.

Este servidor actúa como **nodo base de servicios** para la plataforma **NEXO AV**, proporcionando persistencia en SSD, ejecución de contenedores, automatizaciones, IA local y servicios auxiliares.

---

## 1. Objetivo de esta configuración

* Ejecutar Docker en un **Ubuntu Server minimal**
* Garantizar **persistencia real en SSD (1 TB)**
* Separar claramente:

  * sistema operativo
  * datos Docker
  * datos de servicios
  * backups
  * modelos IA
* Permitir **escalabilidad, mantenimiento y recuperación**

Esta configuración está pensada para **producción**, no para pruebas.

---

## 2. Información del sistema

* **Host**: nexcom / nexo-storage
* **SO**: Ubuntu Server (jammy)
* **Arquitectura**: amd64
* **Docker Engine**: 29.x
* **Docker Compose plugin**: v5
* **Disco principal**: SSD 1 TB montado en `/mnt/storage`

---

## 3. Estructura de discos

### 3.1 Discos montados

```bash
df -h
```

Resultado relevante:

```text
/dev/sdb1   ~916G   mounted on /mnt/storage
```

👉 **Todo lo persistente vive en `/mnt/storage`**

---

## 4. Estructura de directorios

```text
/mnt/storage
├─ docker/        # DATA ROOT de Docker (NO tocar manualmente)
├─ services/      # Volúmenes de servicios (n8n, ollama, etc.)
├─ compose/       # docker-compose.yml organizados por servicio
├─ data/          # Datos operativos de NEXO AV
├─ backups/       # Backups automáticos
├─ models/        # Modelos de IA
├─ logs/          # Logs persistentes (opcional)
└─ lost+found     # Sistema (ext4)
```

⚠️ **IMPORTANTE**: nunca montar volúmenes directamente en `/mnt/storage/docker`.

---

## 5. Instalación de Docker

### 5.1 Instalación desde repositorio oficial

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 5.2 Verificación

```bash
docker --version
docker compose version
```

---

## 6. Configuración CRÍTICA: Docker en SSD

### 6.1 Detener Docker

```bash
sudo systemctl stop docker
sudo systemctl stop docker.socket
```

---

### 6.2 Crear directorio Docker en SSD

```bash
sudo mkdir -p /mnt/storage/docker
```

---

### 6.3 Copiar datos existentes (si aplica)

```bash
sudo apt install -y rsync
sudo rsync -aP /var/lib/docker/ /mnt/storage/docker/
```

---

### 6.4 Configurar `daemon.json`

```bash
sudo nano /etc/docker/daemon.json
```

Contenido:

```json
{
  "data-root": "/mnt/storage/docker"
}
```

---

### 6.5 Reiniciar Docker

```bash
sudo systemctl daemon-reexec
sudo systemctl start docker
```

---

### 6.6 Verificación FINAL

```bash
docker info | grep "Docker Root Dir"
```

Resultado esperado:

```text
Docker Root Dir: /mnt/storage/docker
```

---

### 6.7 Limpieza (opcional)

```bash
sudo rm -rf /var/lib/docker
sudo mkdir /var/lib/docker
```

---

## 7. Uso diario de Docker

### 7.1 Comandos básicos

```bash
docker ps

docker ps -a

docker logs <container>

docker exec -it <container> bash

docker stop <container>

docker start <container>
```

---

### 7.2 Docker Compose

```bash
cd /mnt/storage/compose/<servicio>
docker compose up -d

docker compose down

docker compose logs -f
```

---

## 8. Actualización de Docker

### 8.1 Actualizar paquetes

```bash
sudo apt update
sudo apt upgrade -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 8.2 Reinicio controlado

```bash
sudo systemctl restart docker
```

⚠️ Los contenedores se reinician automáticamente si tienen `restart: unless-stopped`.

---

## 9. Buenas prácticas (OBLIGATORIO)

* ❌ No usar `/var/lib/docker`
* ❌ No montar volúmenes fuera de `/mnt/storage`
* ❌ No editar contenedores en caliente
* ✅ Usar `docker compose`
* ✅ Un servicio = una carpeta
* ✅ Backups periódicos

---

## 10. Rol del servidor en NEXO AV

Este servidor actúa como:

* 🧠 Nodo de IA (Ollama)
* 🔁 Worker de automatizaciones (n8n)
* 💾 Storage auxiliar
* 🔐 Infraestructura privada (Tailscale)

❗ **No sustituye Supabase**, lo complementa.

---

## 11. Estado actual

* Docker: ✅ operativo
* Persistencia SSD: ✅
* Estructura definida: ✅
* Producción-ready: ✅

---

**Última actualización:** Febrero 2026
