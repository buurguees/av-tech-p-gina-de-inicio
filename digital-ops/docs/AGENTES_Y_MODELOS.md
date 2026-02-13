# Agentes y Modelos IA — Análisis de Hardware y Plan 100% Gratuito

> **Versión:** 2.0  
> **Fecha:** 2026-02-12  
> **Restricción principal:** Coste = 0 €/mes. Esto es una prueba. No se gasta dinero.  
> **Contexto:** Análisis del hardware disponible y selección de modelos/agentes **100% gratuitos** para OpenClaw, alineados con la estructura de departamentos definida en `README.md`.

---

## 1. Análisis del hardware disponible

### 1.1 Especificaciones del equipo

| Componente | Detalle |
|------------|---------|
| **CPU** | AMD Ryzen 5 1600 — 6 núcleos / 12 hilos @ 3.2 GHz |
| **RAM** | 16 GB DDR4 @ 2666 MHz (2x 8 GB, dual channel) |
| **GPU** | NVIDIA GeForce GTX 1050 Ti — **4 GB VRAM** |
| **SSD** | Intel SSDPEKNW512G8 — 512 GB (NVMe) |
| **HDD** | Seagate ST1000DM010 — 1 TB |
| **OS** | Windows 10 (x64) |

### 1.2 Limitaciones clave

| Limitación | Impacto |
|------------|---------|
| **4 GB VRAM** | Solo modelos de **3-7B parámetros** en GPU con quantización Q4. |
| **16 GB RAM** | Modelos de hasta **7-9B en CPU** (~5-12 tok/s). 14B posible pero muy lento. |
| **Ryzen 5 1600** | CPU de 2017, inferencia ~5-10 tok/s en modo CPU. |

### 1.3 Capacidad real

| Modo | Modelos viables | Velocidad | Utilidad |
|------|----------------|-----------|----------|
| **GPU (4GB)** | 3B-7B (Q4) | 15-24 tok/s | Tareas diarias, copies, resúmenes |
| **CPU (16GB)** | 7B-9B (Q4) | 5-12 tok/s | Análisis, código simple |
| **CPU forzado** | 14B (Q4) | 2-5 tok/s | Solo puntual, muy lento |

---

## 2. Fuentes de modelos 100% gratuitas

Existen **tres fuentes** que combinadas dan cobertura completa sin gastar un céntimo:

### 2.1 Ollama (modelos locales) — $0 absoluto

| Dato | Valor |
|------|-------|
| **Coste** | $0 (solo electricidad del PC) |
| **Límite** | Sin límite, depende de tu hardware |
| **Tarjeta de crédito** | No necesaria |
| **Privacidad** | Total — nada sale de tu máquina |
| **Internet** | No necesario |
| **Calidad** | Limitada por hardware (modelos 7B) |

**Web:** https://ollama.com

### 2.2 Google Gemini API (Free Tier) — $0

| Dato | Valor |
|------|-------|
| **Coste** | $0 |
| **Tarjeta de crédito** | **No necesaria** |
| **Modelos gratis** | Gemini 2.0 Flash, Flash-Lite, Flash Thinking |
| **Límite Flash** | 1,500 requests/día, 1M tokens de contexto |
| **Límite Flash-Lite** | 1,500 requests/día |
| **Privacidad** | Google puede usar datos para mejorar modelos (free tier) |

**Cómo obtener API key (2 minutos):**
1. Ir a https://aistudio.google.com
2. Iniciar sesión con Gmail (cualquier cuenta)
3. Click en "Get API Key" → "Create API Key"
4. Copiar la key (formato: `AIza...`)

### 2.3 OpenRouter (modelos gratuitos) — $0

| Dato | Valor |
|------|-------|
| **Coste** | $0 (modelos con sufijo `:free`) |
| **Tarjeta de crédito** | **No necesaria** |
| **Límite** | 50 requests/día (sin comprar créditos), 20 req/minuto |
| **Modelos gratis** | 18+ modelos, incluyendo Llama 3.3 70B, DeepSeek R1, Gemini Flash |
| **Privacidad** | Datos pasan por servidores de OpenRouter |

**Modelos gratis destacados en OpenRouter:**

| Modelo | Parámetros | Contexto | Mejor para |
|--------|-----------|----------|------------|
| Llama 3.3 70B `:free` | 70B | 131K | Tareas generales, razonamiento |
| Devstral 2 `:free` | — | 262K | Código, agentes |
| DeepSeek R1 `:free` | 671B MoE | — | Razonamiento profundo |
| Gemini 2.0 Flash `:free` | — | 1M | Documentos largos, análisis |
| Qwen3-Coder 480B `:free` | 480B MoE | — | Generación de código |
| Nemotron 3 Nano 30B `:free` | 30B | — | Agentes IA |

**Cómo obtener API key:**
1. Ir a https://openrouter.ai
2. Crear cuenta (sin tarjeta)
3. Ir a Settings → Keys → Create Key
4. Formato: `sk-or-v1-...`

### 2.4 Groq (inferencia ultra-rápida) — $0

| Dato | Valor |
|------|-------|
| **Coste** | $0 (free tier) |
| **Tarjeta de crédito** | **No necesaria** |
| **Velocidad** | Extremadamente rápida (inferencia por hardware LPU) |
| **Modelos gratis** | Llama 3.3 70B, Llama 3.1 8B, Mistral y más |
| **Límite Llama 70B** | 30 req/min, 1,000 req/día |
| **Límite Llama 8B** | 30 req/min, 14,400 req/día |

**Web:** https://console.groq.com

---

## 3. Estrategia de coste cero: Arquitectura por capas

```
┌─────────────────────────────────────────────────────────┐
│  CAPA 3 — Razonamiento complejo (15% del trabajo)       │
│  OpenRouter: Llama 3.3 70B :free / DeepSeek R1 :free    │
│  O Gemini 2.0 Flash (API gratis)                        │
│  Coste: $0                                              │
├─────────────────────────────────────────────────────────┤
│  CAPA 2 — Trabajo diario (60% del trabajo)              │
│  Ollama local: Qwen 2.5 Coder 7B / Mistral 7B          │
│  O Groq: Llama 3.1 8B (rápido, 14,400 req/día)         │
│  Coste: $0                                              │
├─────────────────────────────────────────────────────────┤
│  CAPA 1 — Rutinas y heartbeats (25% del trabajo)        │
│  Ollama local: Qwen3 4B / Gemma 3 3B                   │
│  Coste: $0                                              │
└─────────────────────────────────────────────────────────┘

                COSTE TOTAL: 0 €/mes
```

### 3.1 Lógica de routing

| Complejidad de tarea | Fuente | Modelo | Coste |
|---------------------|--------|--------|-------|
| Simple (heartbeats, formato, checks) | Ollama local | Qwen3 4B | $0 |
| Media (copies, código, análisis) | Ollama local | Mistral 7B / Qwen Coder 7B | $0 |
| Media-alta (si local es lento/insuficiente) | Groq API | Llama 3.1 8B | $0 |
| Alta (estrategia, revisión, decisiones) | Gemini API | Gemini 2.0 Flash | $0 |
| Muy alta (razonamiento profundo) | OpenRouter | Llama 3.3 70B:free / DeepSeek R1:free | $0 |

**Regla ERP obligatoria:**

- Tareas que impliquen **datos sensibles del ERP** (financieros, clientes, sueldos, márgenes) → **SOLO modelos locales (Ollama)**. Nunca APIs externas.
- Tareas que impliquen **modificación estructural del ERP** → Se generan en local y se registran como deliverables pendientes de aprobación en `ai_deliverables`.

### 3.2 Límites diarios combinados (sin pagar nada)

| Fuente | Requests/día gratis |
|--------|-------------------|
| Ollama (local) | **Ilimitado** |
| Gemini Flash | **1,500** |
| Groq Llama 8B | **14,400** |
| Groq Llama 70B | **1,000** |
| OpenRouter (modelos :free) | **50** (sin comprar créditos) |
| **TOTAL disponible/día** | **~17,000+ requests** |

> Esto es más que suficiente para una prueba de concepto con múltiples agentes.

---

## 4. Modelos locales a instalar (Ollama)

### 4.1 Instalación de Ollama

```bash
# Windows — descargar desde https://ollama.com/download
# O via winget:
winget install Ollama.Ollama
```

### 4.2 Modelos recomendados

#### Tier 1 — Rutinas y heartbeats (ligeros, rápidos)

| Modelo | Tamaño | Velocidad est. | Comando |
|--------|--------|---------------|---------|
| **Qwen3 4B** | ~2.5 GB | ~20 tok/s | `ollama pull qwen3:4b` |
| **Gemma 3 3B** | ~2.0 GB | ~24 tok/s | `ollama pull gemma3:4b` |

#### Tier 2 — Trabajo diario por departamento

| Modelo | Tamaño | Especialidad | Comando |
|--------|--------|-------------|---------|
| **Qwen 2.5 Coder 7B** | ~4.4 GB | Código (88.4% HumanEval) | `ollama pull qwen2.5-coder:7b` |
| **Mistral 7B v0.3** | ~4.1 GB | Texto, marketing, ventas | `ollama pull mistral:7b` |
| **Llama 3.3 8B** | ~4.7 GB | General, análisis, razonamiento | `ollama pull llama3.3:8b` |

**Espacio total en disco:** ~16 GB (cabe en tu SSD de 512 GB).

### 4.3 Comandos de instalación (copiar y pegar)

```bash
# Instalar todos los modelos de una vez
ollama pull qwen3:4b && ollama pull qwen2.5-coder:7b && ollama pull mistral:7b && ollama pull llama3.3:8b
```

---

## 5. Asignación de modelos por departamento — Todo gratis

### 5.1 JEFE / Director Operativo IA

| Tarea | Modelo | Fuente | Coste |
|-------|--------|--------|-------|
| Triage y clasificación | Gemini 2.0 Flash | Google API gratis | $0 |
| Asignación de recursos | Llama 3.3 70B :free | OpenRouter gratis | $0 |
| Validación de entregables | Gemini 2.0 Flash | Google API gratis | $0 |
| Reporting diario | Mistral 7B | Ollama local | $0 |
| Status checks | Qwen3 4B | Ollama local | $0 |

---

### 5.2 Departamento de Programación

| Tarea | Modelo | Fuente | Coste |
|-------|--------|--------|-------|
| Generación de código | **Qwen 2.5 Coder 7B** | Ollama local | $0 |
| Código complejo / PRs | Devstral 2 :free | OpenRouter gratis | $0 |
| Code review | Gemini 2.0 Flash | Google API gratis | $0 |
| Debugging complejo | DeepSeek R1 :free | OpenRouter gratis | $0 |
| Documentación técnica | Mistral 7B | Ollama local | $0 |
| Scripts rápidos | Llama 3.1 8B | Groq gratis (ultra-rápido) | $0 |

---

### 5.3 Departamento de Marketing

| Tarea | Modelo | Fuente | Coste |
|-------|--------|--------|-------|
| Copies y CTAs | **Mistral 7B** | Ollama local | $0 |
| Calendario de contenido | Llama 3.3 8B | Ollama local | $0 |
| Briefs creativos | Gemini 2.0 Flash | Google API gratis | $0 |
| Investigación competencia | Gemini 2.0 Flash | Google API gratis | $0 |
| Planificación campañas | Llama 3.3 70B :free | OpenRouter gratis | $0 |
| Resúmenes | Qwen3 4B | Ollama local | $0 |

---

### 5.4 Departamento Comercial

| Tarea | Modelo | Fuente | Coste |
|-------|--------|--------|-------|
| Scripts de venta | **Mistral 7B** | Ollama local | $0 |
| Priorización de leads | Llama 3.3 8B | Ollama local | $0 |
| Propuestas comerciales | Gemini 2.0 Flash | Google API gratis | $0 |
| Análisis de objeciones | Llama 3.3 70B :free | OpenRouter gratis | $0 |
| Pitch deck outlines | Mistral 7B | Ollama local | $0 |
| Seguimiento métricas | Qwen3 4B | Ollama local | $0 |

---

### 5.5 Departamento de Administración

| Tarea | Modelo | Fuente | Coste |
|-------|--------|--------|-------|
| Análisis métricas ERP | **Llama 3.3 8B** | Ollama local | $0 |
| Rentabilidad por proyecto | Gemini 2.0 Flash | Google API gratis | $0 |
| Cashflow / alertas | Llama 3.3 8B | Ollama local | $0 |
| Propuestas salariales | Llama 3.3 70B :free | OpenRouter gratis | $0 |
| Informes mensuales | Mistral 7B | Ollama local | $0 |
| Alertas de desviación | Qwen3 4B | Ollama local | $0 |

---

## 6. Mapa visual completo

```
                         ┌───────────────────────────┐
                         │    OpenRouter (50 req/día) │
                         │  Llama 70B / DeepSeek R1   │
                         │  Devstral 2 / Qwen3-Coder  │
                         │  → Decisiones complejas     │
                         └─────────────┬─────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │  Gemini Flash (1500/día)   │
                         │  → Análisis, revisión,     │
                         │    razonamiento medio      │
                         └─────────────┬─────────────┘
                                       │
              ┌────────────┬───────────┴───────┬──────────────┐
              │            │                   │              │
        ┌─────┴─────┐ ┌───┴────┐ ┌───────────┴┐ ┌──────────┴──┐
        │Qwen2.5    │ │Mistral │ │  Mistral   │ │  Llama      │
        │Coder 7B   │ │  7B    │ │    7B      │ │  3.3 8B     │
        │ LOCAL     │ │ LOCAL  │ │  LOCAL     │ │  LOCAL      │
        │           │ │        │ │            │ │             │
        │PROGRAMAC. │ │MARKET. │ │ COMERCIAL  │ │  ADMIN.     │
        └───────────┘ └────────┘ └────────────┘ └─────────────┘
              │            │           │              │
              └────────────┴─────┬─────┴──────────────┘
                                 │
                      ┌──────────┴──────────┐
                      │ Groq (14,400/día)   │
                      │ Llama 8B ultra-rápido│
                      │ → Backup si local    │
                      │   es lento           │
                      └─────────────────────┘
                                 │
                      ┌──────────┴──────────┐
                      │    Qwen3 4B LOCAL   │
                      │  → Heartbeats,      │
                      │    rutinas, checks   │
                      └─────────────────────┘

                   COSTE TOTAL = 0 €/mes
```

---

## 7. Configuración OpenClaw — Todo gratis

### 7.1 Variables de entorno (`.env`)

```bash
# digital-ops/.env — NO COMMITEAR
# Todas las APIs son gratuitas, no se cobra nada

# OpenClaw Gateway
OPENCLAW_GATEWAY_TOKEN=<generado con: openssl rand -hex 32>

# Google Gemini (gratis, sin tarjeta)
GEMINI_API_KEY=AIza...

# OpenRouter (gratis, sin tarjeta)
OPENROUTER_API_KEY=sk-or-v1-...

# Groq (gratis, sin tarjeta)
GROQ_API_KEY=gsk_...
```

### 7.2 Configuración de proveedores

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://host.docker.internal:11434/v1",
      "api": "openai-responses"
    },
    "google": {
      "apiKey": "${GEMINI_API_KEY}"
    },
    "openrouter": {
      "apiKey": "${OPENROUTER_API_KEY}"
    },
    "groq": {
      "apiKey": "${GROQ_API_KEY}"
    }
  }
}
```

### 7.3 Configuración de agentes multi-departamento

```json
{
  "agents": {
    "jefe": {
      "model": "google/gemini-2.0-flash",
      "fallback": "ollama/llama3.3:8b",
      "workspace": "./workspace/jefe"
    },
    "programacion": {
      "model": "ollama/qwen2.5-coder:7b",
      "fallback": "groq/llama-3.1-8b-instant",
      "workspace": "./workspace/programacion"
    },
    "marketing": {
      "model": "ollama/mistral:7b",
      "fallback": "google/gemini-2.0-flash",
      "workspace": "./workspace/marketing"
    },
    "comercial": {
      "model": "ollama/mistral:7b",
      "fallback": "google/gemini-2.0-flash",
      "workspace": "./workspace/comercial"
    },
    "administracion": {
      "model": "ollama/llama3.3:8b",
      "fallback": "google/gemini-2.0-flash",
      "workspace": "./workspace/administracion"
    }
  },
  "optimization": {
    "heartbeatModel": "ollama/qwen3:4b",
    "temperature": 0.1,
    "compactionThreshold": 50000
  }
}
```

### 7.4 Parámetros de rendimiento

| Parámetro | Valor | Razón |
|-----------|-------|-------|
| **temperature** | 0.0 - 0.2 | Evitar alucinaciones |
| **compactionThreshold** | 50,000 tokens | Prevenir overflow de contexto |
| **heartbeatModel** | qwen3:4b (local) | El más ligero, $0 |

---

## 8. Orden de prioridad (si una fuente se agota)

Si se agotan los límites diarios de una fuente, saltar a la siguiente:

```
1. Ollama local        → Siempre disponible, sin límite
2. Groq free           → 14,400 req/día (Llama 8B)
3. Gemini free         → 1,500 req/día (Flash)
4. OpenRouter :free    → 50 req/día (Llama 70B, DeepSeek R1)
```

> **Regla:** Si TODAS las APIs se agotan, seguir trabajando solo con Ollama local. La prueba nunca se detiene.

---

## 9. Limitaciones de la estrategia $0

### 9.1 Lo que SÍ puedes hacer

- Probar todo el flujo de agentes multi-departamento.
- Generar copies, código, análisis, informes.
- Validar la arquitectura OpenClaw.
- Probar tool-calling y workflows.
- Demostrar el concepto antes de invertir.

### 9.2 Lo que será más lento o limitado

| Limitación | Causa | Mitigación |
|-----------|-------|-----------|
| Modelos locales 7B no son fiables para cadenas largas de tool-calling | Hardware limitado | Escalar a Gemini Flash (gratis) |
| OpenRouter solo 50 req/día sin pagar | Free tier restrictivo | Usar Gemini/Groq primero |
| Respuestas lentas en CPU (~5-10 tok/s) | Ryzen 5 1600 + 4GB VRAM | Usar Groq como backup (ultra-rápido y gratis) |
| Privacidad parcial en APIs cloud gratuitas | Condiciones de uso | Datos sensibles SOLO en Ollama local |

### 9.3 Recomendación de datos sensibles

| Tipo de dato | ¿Dónde procesarlo? |
|-------------|-------------------|
| Datos de ERP (financieros, clientes) | **SOLO Ollama local** |
| Código interno | Ollama local preferido, Gemini/Groq aceptable |
| Copies de marketing (público) | Cualquier fuente |
| Análisis de competencia | Cualquier fuente |
| Propuestas salariales | **SOLO Ollama local** |

### 9.4 Política ERP y Datos Sensibles

**Regla obligatoria:** Ningún dato financiero, contable o de clientes del ERP saldrá a APIs externas.

**Datos que SOLO se procesan en Ollama local:**
- Rentabilidad por proyecto/cliente
- Cashflow y alertas financieras
- Propuestas salariales y sueldos
- Márgenes y desviaciones
- Datos de clientes (nombres, contactos, historial)
- Cualquier dato extraído de tablas core del ERP

**Routing obligatorio:**

```
if (data_source == "ERP_sensitive") {
    provider = "ollama_local";
    // NUNCA Gemini, OpenRouter, Groq ni ninguna API externa
}
```

**Modelos autorizados para datos ERP sensibles:**

| Modelo | Uso ERP |
|--------|---------|
| Qwen3 4B (local) | Tareas ligeras, formateo, alertas |
| Llama 3.3 8B (local) | Análisis financiero, métricas, informes |
| Qwen 2.5 Coder 7B (local) | Automatizaciones y scripts ERP |

**Regla de modificación:**
- Las propuestas de modificación del ERP se generan **siempre** en modelos locales.
- Se registran como deliverables pendientes de aprobación en `ai_deliverables`.
- Nunca se aplican automáticamente.

> Esta política se alinea con README §1.4 (ERP como Control Tower) y SEGURIDAD.md §9.1.

### 9.5 Integración con ERP vía ai-agent-bridge

Los agentes OpenClaw **no llaman directamente a Supabase** con auth humano. Existe una capa intermedia que los aísla:

```
┌─────────────────┐     POST + AI_AGENT_TOKEN     ┌──────────────────────┐
│  Agente OpenClaw │ ─────────────────────────────→│ Edge Function        │
│  (local/cloud)   │                               │ ai-agent-bridge      │
│                  │     { action, params }         │                      │
│  Usa: Ollama,    │                               │ Valida token         │
│  Gemini, Groq,   │                               │ Verifica whitelist   │
│  OpenRouter      │     ← { success, data }       │ Llama supabase.rpc() │
└─────────────────┘                               │ con service_role      │
                                                   └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │ Tablas ai_* en       │
                                                   │ Supabase PostgreSQL  │
                                                   │                      │
                                                   │ → ai_projects        │
                                                   │ → ai_tasks           │
                                                   │ → ai_deliverables    │
                                                   │ → ai_insights        │
                                                   │ → ai_runs            │
                                                   └──────────────────────┘
```

**Reglas clave:**

1. Los agentes **nunca** tienen cuenta de usuario Supabase.
2. Los agentes **nunca** usan la anon key del frontend.
3. Los agentes **solo** pueden ejecutar 5 acciones whitelisted vía el bridge.
4. El token `AI_AGENT_TOKEN` es independiente de los tokens de IA (Gemini, Groq, etc.).
5. Si un modelo genera una propuesta, se envía al bridge → se registra en `ai_deliverables` → el humano la ve en el Inbox del ERP.

**Esto conecta el mundo de agentes/modelos (este documento) con el mundo del ERP UI (ERP_MODULE_v1.md).**

> Detalle completo del bridge: `docs/ERP_MODULE_v1.md` §11  
> Seguridad del token: `docs/SEGURIDAD.md` §4.4

---

## 10. Cuentas a crear (todas gratuitas)

| Servicio | URL | Tarjeta requerida | Tiempo |
|----------|-----|-------------------|--------|
| **Ollama** | https://ollama.com/download | No (instalación local) | 5 min |
| **Google AI Studio** | https://aistudio.google.com | **No** | 2 min |
| **OpenRouter** | https://openrouter.ai | **No** | 2 min |
| **Groq** | https://console.groq.com | **No** | 2 min |

**Tiempo total de setup de cuentas: ~11 minutos. Coste: 0€.**

---

## 11. Checklist de instalación

### Ollama (local)
- [ ] Instalar Ollama (`winget install Ollama.Ollama`)
- [ ] `ollama pull qwen3:4b`
- [ ] `ollama pull qwen2.5-coder:7b`
- [ ] `ollama pull mistral:7b`
- [ ] `ollama pull llama3.3:8b`
- [ ] Verificar: `curl http://localhost:11434`

### APIs gratuitas
- [ ] Google AI Studio → Copiar `GEMINI_API_KEY`
- [ ] OpenRouter → Copiar `OPENROUTER_API_KEY`
- [ ] Groq → Copiar `GROQ_API_KEY`
- [ ] Guardar las 3 keys en `digital-ops/.env`

### OpenClaw
- [ ] Docker Compose up
- [ ] Configurar proveedores en `openclaw.json`
- [ ] Configurar agentes por departamento
- [ ] Test JEFE: tarea de triage → Gemini Flash
- [ ] Test Programación: generar código → Qwen Coder 7B local
- [ ] Test Marketing: escribir copy → Mistral 7B local
- [ ] Test Comercial: script de venta → Mistral 7B local
- [ ] Test Administración: análisis → Llama 3.3 8B local

---

## 12. Resumen ejecutivo

| Concepto | Valor |
|----------|-------|
| **Coste mensual** | **0 €** |
| **Modelos locales** | 4 (Qwen3 4B, Qwen Coder 7B, Mistral 7B, Llama 8B) |
| **APIs cloud gratis** | 3 (Gemini, OpenRouter, Groq) |
| **Requests/día totales** | ~17,000+ |
| **Departamentos cubiertos** | 5 (JEFE + 4 departamentos) |
| **Espacio disco necesario** | ~16 GB |
| **Cuentas con tarjeta** | 0 |
| **Tiempo de setup** | ~30-45 minutos |

---

> **Nota:** Si la prueba sale bien y se decide invertir, una GPU de 8-12 GB VRAM (~200-350€) y/o un VPS (~15-40€/mes) multiplicarían la capacidad. Pero primero: demostrar que funciona con 0€.
