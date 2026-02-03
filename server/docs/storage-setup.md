# External SSD Storage Setup (Ubuntu Server)

## 📌 Objetivo

Configurar un **SSD externo de 1TB** como almacenamiento persistente en un servidor **Ubuntu Server**, montado automáticamente en cada arranque, para:

- Datos persistentes
- Contenedores Docker
- Backups
- Modelos de IA / datasets
- Migración sencilla entre equipos

El servidor dispone de **64GB internos**, por lo que el SSD externo actúa como **storage principal**.

---

## 🖥️ Entorno

- SO: Ubuntu Server
- Disco interno: 64GB (`/dev/sda`)
- Disco externo: SSD USB 3.0 1TB (`/dev/sdb`)
- Punto de montaje: `/mnt/storage`
- Sistema de archivos: `ext4`

---

## 🔍 Detección del disco

```bash
lsblk
```

**Resultado esperado (simplificado):**

```
sda      59.6G
├─sda1    1G   /boot/efi
├─sda2    2G   /boot
└─sda3   56.6G  LVM /

sdb     931.5G  (disco externo)
```

---

## ⚠️ Limpieza completa del disco (opcional pero recomendado)

**⚠️ Esto borra TODO el contenido del disco**

```bash
sudo umount /dev/sdb1 2>/dev/null
sudo wipefs -a /dev/sdb
```

---

## 🧱 Crear tabla de particiones GPT + partición EXT4

```bash
sudo parted -s /dev/sdb mklabel gpt
sudo parted -s /dev/sdb mkpart primary ext4 1MiB 100%
sudo partprobe /dev/sdb
sudo udevadm settle
```

**Verificación:**

```bash
lsblk
```

Debe aparecer:

```
sdb
└─sdb1 931.5G part
```

---

## 🧪 Formatear la partición

```bash
sudo mkfs.ext4 -L nexo-storage /dev/sdb1
```

---

## 📁 Crear punto de montaje y montar manualmente

```bash
sudo mkdir -p /mnt/storage
sudo mount /dev/sdb1 /mnt/storage
```

**Verificar:**

```bash
df -h | grep sdb
```

**Resultado esperado:**

```
/dev/sdb1   916G   28K   870G   1%  /mnt/storage
```

---

## 🔐 Obtener UUID del disco

```bash
blkid /dev/sdb1
```

**Ejemplo:**

```
UUID=86b15d7e-4cf5-4f8e-91b6-b010ca20a8d2
```

---

## 🔁 Montaje automático en arranque (fstab)

Editar `/etc/fstab`:

```bash
sudo nano /etc/fstab
```

Añadir al final del archivo:

```
UUID=86b15d7e-4cf5-4f8e-91b6-b010ca20a8d2  /mnt/storage  ext4  defaults,nofail  0  2
```

Guardar y salir.

---

## ✅ Verificación final

```bash
sudo mount -a
df -h | grep storage
```

**Resultado esperado:**

```
/dev/sdb1   916G   28K   870G   1%  /mnt/storage
```

- ✔️ Sin errores
- ✔️ Montaje persistente confirmado

---

## 🧠 Notas técnicas

- Se usa **UUID** para evitar problemas si cambia el nombre del dispositivo (`/dev/sdb`)
- **nofail** permite arrancar el sistema incluso si el disco no está conectado
- **ext4** es estable y óptimo para Docker y workloads de servidor

---

## 🚀 Siguientes pasos recomendados

1. **Mover Docker a `/mnt/storage/docker`**
2. **Crear estructura:**

   ```
   /mnt/storage/
   ├─ docker/
   ├─ backups/
   ├─ data/
   ├─ models/
   ```

3. **Automatizar backups**
4. **Usar este disco como cerebro de la plataforma**
