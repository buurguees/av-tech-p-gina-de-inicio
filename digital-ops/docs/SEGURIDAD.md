# Guía de Seguridad — OpenClaw / Digital Ops

> **Versión:** 1.0  
> **Fecha:** 2026-02-12  
> **Responsable:** CEO (humano)  
> **Aplica a:** Instalación local (desarrollo) y futura migración a servidor empresa (producción).

---

## 1. Vulnerabilidades conocidas (estado: Feb 2026)

### 1.1 CVE-2026-25253 — Cross-Site WebSocket Hijacking (CRÍTICA)

| Campo | Detalle |
|-------|---------|
| **Severidad** | CVSS 8.8 — Alta |
| **Tipo** | Ejecución remota de código (RCE) vía WebSocket |
| **Mecanismo** | La Control UI confía en `gatewayUrl` del query string sin validación. Un atacante puede robar el token de autenticación y ejecutar comandos arbitrarios. |
| **Versiones afectadas** | Todas las anteriores a **2026.1.29** |
| **Fix** | Actualizar a >= **2026.1.29** |
| **Referencia** | [NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-25253) |

### 1.2 Amenazas activas en el ecosistema

- **341 skills maliciosos** detectados en ClawHub.
- **17,500+ gateways** expuestos a internet antes del parche.
- **1,800+ instalaciones** públicamente accesibles sin autenticación.

> **Regla interna:** NUNCA instalar skills sin auditoría previa. Ver sección 7.

---

## 2. Requisitos mínimos de versión

| Componente | Versión mínima | Notas |
|------------|---------------|-------|
| OpenClaw | >= 2026.1.29 | Fix CVE-2026-25253 |
| Node.js | >= 22.12.0 | Versiones anteriores tienen CVE-2025-59466 y CVE-2026-21636 |
| Docker | >= 20.10 | Soporte de security_opt y tmpfs |
| Docker Compose | v2+ | Sintaxis moderna |

---

## 3. Hardening Docker (obligatorio)

### 3.1 Binding de puertos — NUNCA exponer públicamente

```yaml
# CORRECTO — Solo accesible desde la máquina local
ports:
  - "127.0.0.1:18789:18789"
  - "127.0.0.1:18790:18790"

# INCORRECTO — Expuesto a toda la red
ports:
  - "0.0.0.0:18789:18789"   # PROHIBIDO
  - "18789:18789"            # PROHIBIDO (equivale a 0.0.0.0)
```

### 3.2 Seguridad del contenedor

```yaml
services:
  openclaw-gateway:
    image: openclaw:local
    container_name: openclaw-gateway
    restart: unless-stopped
    ports:
      - "127.0.0.1:18789:18789"
      - "127.0.0.1:18790:18790"
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    environment:
      - OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
      - CLAUDE_AI_SESSION_KEY=${CLAUDE_AI_SESSION_KEY}
      - OPENCLAW_GATEWAY_BIND=lan
      - NODE_ENV=production
    volumes:
      - ./config:/home/node/.openclaw
      - ./workspace:/home/node/.openclaw/workspace
```

### 3.3 Principios de contenedor seguro

- Ejecutar como **usuario no-root** (la imagen oficial usa `node`).
- **Filesystem read-only** (`read_only: true`) con `tmpfs` para `/tmp`.
- **Drop de capabilities** innecesarias de Linux.
- **Limitar volúmenes** a lo estrictamente necesario (`config/` y `workspace/`).
- **Restringir tráfico saliente** a los dominios necesarios (APIs de IA, GitHub).
- Activar `no-new-privileges` para prevenir escalada de privilegios.

---

## 4. Gestión de credenciales

### 4.1 Archivo `.env`

Todas las credenciales se almacenan en `.env` en la raíz de `digital-ops/`. **NUNCA** se commitea a Git.

```bash
# digital-ops/.env (NO COMMITEAR)
OPENCLAW_GATEWAY_TOKEN=<token-aleatorio-256-bits>
CLAUDE_AI_SESSION_KEY=<tu-session-key>
CLAUDE_WEB_SESSION_KEY=<tu-web-session-key>
CLAUDE_WEB_COOKIE=<tu-cookie>
# Opcional — otros proveedores
# OPENAI_API_KEY=<tu-api-key>
```

### 4.2 Plantilla `.env.example`

Se commitea como referencia (sin valores reales):

```bash
# digital-ops/.env.example
OPENCLAW_GATEWAY_TOKEN=
CLAUDE_AI_SESSION_KEY=
CLAUDE_WEB_SESSION_KEY=
CLAUDE_WEB_COOKIE=
```

### 4.3 Reglas de credenciales

| Regla | Detalle |
|-------|---------|
| **Almacenamiento** | Solo en `.env` o gestor de secretos. NUNCA en código. |
| **Rotación** | Gateway token cada **30 días** mínimo. |
| **Generación** | Tokens de 256 bits aleatorios (`openssl rand -hex 32`). |
| **Post-incidente** | Rotar TODAS las credenciales inmediatamente. |

### 4.4 Seguridad del Agent Token (ai-agent-bridge)

Los agentes OpenClaw se autentican contra el ERP mediante un **token propio**, totalmente separado del auth de usuarios humanos.

| Regla | Detalle |
|-------|---------|
| **Nombre** | `AI_AGENT_TOKEN` |
| **Generación** | `openssl rand -hex 32` (256 bits) |
| **Almacenamiento (OpenClaw)** | En `.env` del directorio `digital-ops/` |
| **Almacenamiento (Supabase)** | Como secret de la Edge Function `ai-agent-bridge` |
| **Rotación** | Cada **30 días** mínimo. Rotar en ambos lados simultáneamente. |
| **Validación** | La Edge Function compara el header `Authorization: Bearer <token>` contra el secret |
| **Scope** | Solo permite llamar las 5 RPCs whitelisted (`ai_agent_create_project`, `ai_agent_create_task`, `ai_agent_submit_deliverable`, `ai_agent_create_insight`, `ai_agent_log_run`) |
| **Compromiso** | Si se filtra: rotar inmediatamente + auditar `ai_runs` de las últimas 24h |

**Este token NO es:**
- Un JWT de Supabase Auth
- La anon key del frontend
- La service_role key (nunca exponer)
- Una API key de un proveedor de IA

### 4.5 Permisos Supabase y bypass RLS

| Actor | Clave Supabase usada | RLS activo | Qué puede hacer |
|-------|---------------------|-----------|----------------|
| **Frontend humano** | `anon` key + JWT de auth | **Sí** | SELECT en tablas `ai_*` + INSERT en `ai_approvals` (según rol) |
| **Edge Function ai-agent-bridge** | `service_role` key | **No** (bypass) | INSERT/UPDATE en tablas `ai_*` (solo acciones whitelisted) |

**Reglas críticas:**

1. La `service_role` key **NUNCA** se expone al frontend.
2. La `service_role` key **NUNCA** se pasa a los agentes OpenClaw.
3. Solo la Edge Function usa `service_role`, internamente.
4. El frontend **siempre** usa `supabase.rpc()` con auth de usuario + RLS.
5. Si alguien intenta usar `service_role` desde el frontend → **incidente de seguridad**.

### 4.6 `.gitignore` obligatorio

```gitignore
# Credenciales
.env
*.key
*.pem

# Config con datos sensibles
config/
workspace/

# Logs
*.log
```

---

## 5. Seguridad de red

### 5.1 Desarrollo local (fase actual)

- Gateway bind a `127.0.0.1` exclusivamente.
- Desactivar **mDNS broadcasting** en la configuración.
- No se necesita reverse proxy ni VPN.

### 5.2 Servidor empresa (producción futura)

| Componente | Configuración |
|------------|--------------|
| **VPN** | Tailscale (recomendado) o WireGuard. Acceso SOLO vía VPN. |
| **SSH** | Solo con llaves. Desactivar acceso por contraseña. Hardening básico (`fail2ban`, puerto no estándar). |
| **Reverse proxy** | Nginx o Caddy con TLS (Let's Encrypt). |
| **Firewall** | Solo puertos necesarios (SSH, HTTPS). |
| **Gateway** | NUNCA exponer directamente a internet. |
| **Allowed Origins** | Configurar `gateway.controlUi.allowedOrigins` explícitamente. |

> Esto se alinea con lo definido en el README principal, sección 5.1 (Infraestructura base VPS).

---

## 6. Autenticación del Gateway

### 6.1 Token (recomendado)

```bash
# Generar token seguro
openssl rand -hex 32
```

- Usar tokens aleatorios de **256 bits**.
- Configurar en `OPENCLAW_GATEWAY_TOKEN`.
- Rotar cada 30 días.

### 6.2 Modos de autenticación

| Modo | Seguridad | Uso |
|------|-----------|-----|
| Token (256-bit) | Alta | **Recomendado** |
| Password (Argon2id) | Media-Alta | Alternativa |
| `auth: "none"` | Ninguna | **PROHIBIDO** |

> El modo `auth: "none"` está desactivado en versiones recientes. Si aparece en config antigua, eliminarlo inmediatamente.

---

## 7. Skills y plugins — Política de confianza

### 7.1 Reglas

- **SOLO** instalar skills con trust level `verified-only`.
- **NUNCA** instalar skills de ClawHub sin revisión manual previa.
- Auditar skills antes de cada instalación.

### 7.2 Auditoría

```bash
# Auditoría profunda de seguridad
openclaw security audit --deep

# Verificar skills instalados
openclaw skills list --verbose
```

### 7.3 Skills personalizados

Los skills propios del proyecto se almacenan en `digital-ops/skills/` y se montan como volumen. No dependen de ClawHub.

---

## 8. Permisos de archivos

```bash
# Archivos de configuración — solo lectura por owner
chmod 600 ~/.openclaw/openclaw.json
chmod 600 ~/.openclaw/.env

# Directorios — solo acceso por owner
chmod 700 ~/.openclaw/
chmod 700 ./config/
chmod 700 ./workspace/
```

- Desactivar **symlink following** en la configuración de OpenClaw.
- En Docker, los volúmenes heredan permisos del host.

---

## 9. Human-in-the-Loop y Seguridad ERP

### 9.1 Integración ERP — Seguridad Adicional

El ERP es el **centro operativo (Control Tower)** y debe protegerse de:

- Escrituras directas automáticas en tablas core
- Ejecuciones sin aprobación humana
- Alteraciones estructurales no auditadas

**Reglas de acceso ERP para agentes:**

| Regla | Detalle |
|-------|---------|
| **1. Sin acceso write a tablas core** | Los agentes NO tienen permisos de escritura en tablas de producción del ERP. |
| **2. Solo escritura en `ai_*`** | Los agentes solo pueden escribir en tablas del módulo IA: `ai_projects`, `ai_tasks`, `ai_insights`, `ai_deliverables`, `ai_approvals`, `ai_runs`. |
| **3. Cambios estructurales** | Requieren: documento de propuesta + registro en `ai_deliverables` + aprobación humana + registro de ejecución en `ai_runs`. |
| **4. Datos sensibles** | Datos financieros, clientes y sueldos SOLO se procesan en modelos locales (Ollama). NUNCA en APIs externas. |

**Toda acción aplicada al ERP debe generar:**
- Log de acción con detalle del cambio
- Identificación del agente que generó la propuesta
- Usuario humano aprobador
- Timestamp de aprobación y ejecución
- Estado del rollback disponible

**Configuración de permisos en base de datos:**

```sql
-- Rol para agentes IA: solo lectura en core + escritura en ai_*
CREATE ROLE ai_agent_role;

-- Lectura en todas las tablas core
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_agent_role;

-- Escritura SOLO en tablas ai_*
GRANT SELECT, INSERT, UPDATE ON ai_projects TO ai_agent_role;
GRANT SELECT, INSERT, UPDATE ON ai_tasks TO ai_agent_role;
GRANT SELECT, INSERT, UPDATE ON ai_insights TO ai_agent_role;
GRANT SELECT, INSERT, UPDATE ON ai_deliverables TO ai_agent_role;
GRANT SELECT, INSERT ON ai_approvals TO ai_agent_role;
GRANT SELECT, INSERT ON ai_runs TO ai_agent_role;

-- NUNCA dar permisos de escritura en tablas core
-- NUNCA dar permisos de DELETE en ninguna tabla
-- NUNCA dar permisos de ALTER/DROP
```

### 9.2 Human-in-the-Loop (alineado con README §2.2)

OpenClaw permite configurar **approval workflows** para operaciones de alto riesgo. Esto es **obligatorio** según nuestro diseño operativo.

### Operaciones que requieren aprobación humana

| Operación | Nivel de riesgo | Aprobador |
|-----------|----------------|-----------|
| Cambios en ERP | Alto | CEO |
| Merge en `main` | Alto | CEO |
| Despliegues | Alto | CEO |
| Publicación de campañas | Medio-Alto | CEO |
| Acciones financieras/sueldos | Crítico | CEO |
| Instalación de skills | Medio | CEO / JEFE |
| Cambios en configuración de agentes | Medio | JEFE |

### Configuración

Activar en `openclaw.json`:

```json
{
  "approvals": {
    "enabled": true,
    "highRiskActions": ["exec", "write", "deploy", "git-push"],
    "notifyChannel": "telegram"
  }
}
```

---

## 10. Monitorización y logs

### 10.1 Health check

```bash
# Verificar estado del gateway
curl http://localhost:18789/health
```

Configurar en `docker-compose.yml`:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:18789/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

### 10.2 Logs

- Rotación de logs obligatoria (prevenir llenado de disco).
- Centralizar logs de agentes para auditoría (alineado con README §10.3).
- Retención mínima: 30 días.

### 10.3 Auditoría periódica

```bash
# Ejecutar semanalmente como mínimo
openclaw security audit --deep
```

### 10.4 Auditoría ERP

Toda interacción de agentes con el ERP queda registrada. Se auditará:

| Dato registrado | Tabla | Retención |
|----------------|-------|-----------|
| Qué agente generó la propuesta | `ai_deliverables.agent_id` | 90 días mín. |
| Qué usuario humano aprobó | `ai_approvals.approved_by` | 90 días mín. |
| Qué tabla fue afectada | `ai_runs.target_table` | 90 días mín. |
| Qué cambio se aplicó | `ai_runs.change_payload` | 90 días mín. |
| Estado del rollback | `ai_runs.rollback_status` | 90 días mín. |
| Timestamp de cada acción | Todas las tablas `ai_*` | 90 días mín. |

**Retención mínima:** 90 días para datos ERP (superior a los 30 días de logs generales).

**Revisión obligatoria:**
- Semanal: revisar `ai_approvals` y `ai_runs` en busca de anomalías.
- Mensual: informe de todas las propuestas generadas vs. aprobadas vs. rechazadas.
- Trimestral: auditoría completa de accesos y cambios aplicados.

**Alertas automáticas:**
- Agente intenta escribir fuera de tablas `ai_*` → alerta inmediata + bloqueo.
- Más de 10 propuestas rechazadas consecutivas por un agente → revisión de configuración.
- Ejecución sin aprobación previa → incidente de seguridad (ver §13).

---

## 11. Backups

| Qué | Frecuencia | Destino |
|-----|-----------|---------|
| `config/` (configuración OpenClaw) | Diario | Almacenamiento externo |
| `workspace/` (memoria de agentes) | Diario | Almacenamiento externo |
| PostgreSQL (si se usa) | Diario | Almacenamiento externo |
| `.env` | Cada cambio | Gestor de secretos o copia offline |

- Plan de **rollback documentado** para cada componente.
- Verificar integridad de backups mensualmente.

---

## 12. Checklist pre-despliegue

Ejecutar antes de cada despliegue (desarrollo o producción).

### Versiones

- [ ] OpenClaw >= 2026.1.29
- [ ] Node.js >= 22.12.0
- [ ] Docker >= 20.10

### Credenciales

- [ ] `.env` creado con tokens seguros
- [ ] `.env` incluido en `.gitignore`
- [ ] `.env.example` commiteado (sin valores)
- [ ] Token gateway generado con `openssl rand -hex 32`
- [ ] Credenciales rotadas (si no es primera instalación)

### Docker

- [ ] Ports bind a `127.0.0.1`
- [ ] `security_opt: no-new-privileges:true`
- [ ] `read_only: true` con `tmpfs: /tmp`
- [ ] Ejecutando como usuario no-root
- [ ] Health check configurado

### Red

- [ ] mDNS desactivado
- [ ] Gateway NO expuesto a internet
- [ ] (Producción) VPN/Tailscale configurado
- [ ] (Producción) Reverse proxy con TLS
- [ ] `gateway.controlUi.allowedOrigins` configurado

### Skills y plugins

- [ ] Solo skills verificados instalados
- [ ] `openclaw security audit --deep` sin errores críticos

### Operativo

- [ ] Human-in-the-Loop activado para operaciones críticas
- [ ] Logs con rotación configurada
- [ ] Backup automatizado

---

## 13. Procedimiento ante incidente de seguridad

1. **Contener:** Detener el contenedor (`docker compose down`).
2. **Rotar:** Cambiar TODOS los tokens y API keys inmediatamente.
3. **Auditar:** Revisar logs de agentes y accesos.
4. **Parchear:** Actualizar a la última versión.
5. **Verificar:** `openclaw security audit --deep`.
6. **Documentar:** Registrar el incidente, causa raíz y acciones tomadas.
7. **Restaurar:** Levantar desde backup limpio si es necesario.

---

> **Nota:** Este documento debe revisarse y actualizarse con cada nueva versión de OpenClaw o ante nuevas CVEs publicadas. Consultar periódicamente [NVD](https://nvd.nist.gov/) y los canales oficiales de seguridad del proyecto.
