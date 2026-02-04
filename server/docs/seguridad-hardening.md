# 🔐 NEXO AV — Hardening de seguridad (nexo-storage / Ubuntu Server 22.04)

> Documento de seguridad base aplicado al servidor `nexo-storage` (Ubuntu 22.04.x LTS) accesible por Tailscale.  
> Objetivo: **minimizar superficie de ataque**, asegurar acceso administrativo y dejar el servidor listo para operar servicios (MinIO, Docker, etc.) con una base sólida.

---

## 0) Contexto y criterios

### Principios aplicados
- **Acceso administrativo solo por VPN (Tailscale)**.
- **Root NO se usa para login remoto** (ni por SSH).
- **Puertos mínimos** abiertos (solo los necesarios).
- **Parches automáticos de seguridad** habilitados.
- **Defensa activa** frente a fuerza bruta (Fail2ban).

### Servicios y puertos involucrados

| Servicio | Puerto | Uso |
|---|---:|---|
| SSH | 22/tcp | administración remota |
| MinIO API | 9000/tcp | API S3 (backend NEXO AV) |
| MinIO Console | 9001/tcp | consola web MinIO (admin, recomendado temporal / restringido) |

> Nota: en este servidor, **los puertos quedan accesibles únicamente desde Tailscale** (`tailscale0`).

---

## 1) Usuarios y permisos

### 1.1 Usuario operativo

- Usuario operativo confirmado: **`lab`**
- Comprobación de grupos:

```bash
groups lab
```

Salida esperada/observada:

```
lab : lab adm cdrom sudo dip plugdev users
```

Confirmación de escalado:

```bash
whoami
sudo whoami
```

Resultado:
- `whoami` → `lab`
- `sudo whoami` → `root`

### 1.2 Política de acceso

- Se trabaja siempre con `lab`.
- Root se reserva a:
  - consola local (si fuera necesario)
  - escalado puntual con `sudo`

---

## 2) SSH Hardening (bloquear root por SSH)

### 2.1 Archivo principal de SSH

Ruta:

```
/etc/ssh/sshd_config
```

En Ubuntu moderno, sshd_config incluye "drop-ins":

```
Include /etc/ssh/sshd_config.d/*.conf
```

### 2.2 Problema detectado: cloud-init sobrescribe opciones

Se detectó el archivo:

```
/etc/ssh/sshd_config.d/50-cloud-init.conf
```

Contenido observado:

```
PasswordAuthentication yes
```

**Conclusión:** se decidió aplicar hardening con override propio usando un archivo `99-*` para máxima prioridad y compatibilidad.

### 2.3 Override definitivo (recomendado)

Archivo creado:

```
/etc/ssh/sshd_config.d/99-nexo-hardening.conf
```

Contenido aplicado:

```
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
```

Aplicación/reinicio:

```bash
sudo systemctl restart ssh
```

### 2.4 Verificación de configuración efectiva (la buena)

Comprobación directa del runtime de sshd:

```bash
sudo sshd -T | grep permitrootlogin
```

Resultado esperado/observado:

```
permitrootlogin no
```

### 2.5 Pruebas desde Windows (PowerShell)

En Windows ya existe OpenSSH:

```powershell
ssh -V
```

Prueba root (debe fallar):

```powershell
ssh root@<IP_TAILSCALE>
```

Resultado esperado/observado:

```
Permission denied, please try again.
```

Prueba usuario operativo (debe entrar):

```powershell
ssh lab@<IP_TAILSCALE>
```

> **Nota:** en la primera conexión Windows muestra fingerprint y hay que aceptar con `yes`.

---

## 3) Tailscale SSH vs OpenSSH (aclaración importante)

### 3.1 Qué se detectó

En algún momento se pudo entrar como root usando `ssh root@100.x.x.x` (IP Tailscale).

**Diagnóstico:** Tailscale SSH puede interceptar la sesión según configuración/ACLs, sin respetar `sshd_config`.

### 3.2 Decisión operativa

El hardening se valida con:
- `sshd -T` (config efectiva de OpenSSH)
- pruebas reales desde Windows

**Recomendación:** si se usa Tailscale solo como red privada (VPN), mantener el control de accesos en OpenSSH + UFW.

(Opcional) Desactivar Tailscale SSH si no se necesita:

```bash
sudo tailscale set --ssh=false
```

---

## 4) Actualizaciones automáticas de seguridad (Unattended upgrades)

### 4.1 Estado del servicio

Comprobación:

```bash
systemctl status unattended-upgrades
```

Resultado observado:

```
Active: active (running)
```

### 4.2 Configuración de orígenes permitidos

Archivo:

```
/etc/apt/apt.conf.d/50unattended-upgrades
```

Se verificó que incluye al menos seguridad:

```
"${distro_id}:${distro_codename}-security";
```

**Conclusión:** updates automáticos de seguridad activos y correctos.

---

## 5) Firewall (UFW) — puertos mínimos y solo Tailscale

### 5.1 Instalación

Se detectó inicialmente que UFW no estaba instalado:

```
sudo: ufw: command not found
```

Instalación:

```bash
sudo apt update
sudo apt install ufw
ufw --version
```

### 5.2 Política base

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### 5.3 Reglas iniciales (temporales) y activación

Se añadieron reglas y se activó firewall:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 9000/tcp
sudo ufw allow 9001/tcp

sudo ufw enable
sudo ufw status verbose
```

### 5.4 Endurecimiento final: solo interfaz tailscale0

Comprobación interfaz:

```bash
ip a | grep tailscale
```

Salida observada:

```
tailscale0 ... inet 100.101.233.19/32 ... tailscale0
```

Se eliminaron reglas abiertas a "Anywhere":

```bash
sudo ufw delete allow 22/tcp
sudo ufw delete allow 9000/tcp
sudo ufw delete allow 9001/tcp
```

Se añadieron reglas restringidas a Tailscale:

```bash
sudo ufw allow in on tailscale0 to any port 22 proto tcp
sudo ufw allow in on tailscale0 to any port 9000 proto tcp
sudo ufw allow in on tailscale0 to any port 9001 proto tcp
```

Verificación final:

```bash
sudo ufw status verbose
```

Salida esperada/observada (equivalente):

```
Status: active
Default: deny (incoming), allow (outgoing), deny (routed)

22/tcp   on tailscale0   ALLOW IN   Anywhere
9000/tcp on tailscale0   ALLOW IN   Anywhere
9001/tcp on tailscale0   ALLOW IN   Anywhere
(… y sus reglas v6 equivalentes)
```

✅ **Resultado:** SSH y MinIO solo accesibles desde Tailscale.  
🚫 **Desde internet/red pública:** cerrado.

---

## 6) Fail2ban (defensa activa para SSH)

### 6.1 Instalación

```bash
sudo apt install fail2ban
fail2ban-client --version
```

Versión observada:

```
Fail2Ban v0.11.2
```

### 6.2 Configuración (override limpio)

Se evita modificar `jail.conf`.

Archivo creado:

```
/etc/fail2ban/jail.d/sshd.conf
```

Contenido recomendado/aplicado:

```ini
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
```

### 6.3 Activación

```bash
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
```

### 6.4 Verificación

```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

Salida observada (equivalente):
- 1 jail activo: `sshd`
- 0 baneados (normal)
- 1 fallo detectado (correspondiente al intento de login fallido a root):

```
Currently failed: 1
Currently banned: 0
```

---

## 7) Checklist final (estado de seguridad)

| Estado | Elemento | Detalle |
|:------:|----------|---------|
| ✅ | **Root bloqueado por SSH** | `/etc/ssh/sshd_config.d/99-nexo-hardening.conf`<br>`sshd -T` confirma `permitrootlogin no` |
| ✅ | **Acceso operativo por usuario lab** | `lab` en grupo `sudo` |
| ✅ | **Firewall activo y restringido** | UFW activo<br>Default deny incoming<br>Puertos 22,9000,9001 solo por `tailscale0` |
| ✅ | **Actualizaciones automáticas de seguridad activas** | `unattended-upgrades` active (running)<br>`-security` habilitado |
| ✅ | **Fail2ban activo protegiendo SSH** | jail `sshd` activo<br>baneos automáticos ante repetición |

---

## 8) Comandos útiles de mantenimiento

### Ver configuración efectiva de SSH

```bash
sudo sshd -T | egrep "permitrootlogin|passwordauthentication|pubkeyauthentication"
```

### Ver reglas UFW

```bash
sudo ufw status verbose
sudo ufw status numbered
```

### Ver estado fail2ban

```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### Ver logs SSH

```bash
sudo tail -n 200 /var/log/auth.log
```

### Ver logs fail2ban

```bash
sudo tail -n 200 /var/log/fail2ban.log
```

---

## 9) Próximos pasos recomendados (opcional)

| Prioridad | Mejora | Descripción |
|:---------:|--------|-------------|
| 🔑 | **Migrar SSH a solo claves** | `PasswordAuthentication no`<br>`AuthenticationMethods publickey` |
| 📌 | **AllowUsers lab** | Limitar usuarios SSH explícitamente |
| 📦 | **Hardening Docker** | Cuando se instale: redes internas, user namespaces |
| 🧾 | **Auditoría básica** | `sudo apt install auditd` (si se quiere más control) |
| 🚨 | **Alertas** | Notificaciones ante baneos fail2ban (correo/webhook) |

---

**Última actualización:** Febrero 2026  
**Servidor:** nexo-storage  
**VPN:** Tailscale (interfaz `tailscale0`, IP ejemplo `100.101.233.19/32`)
