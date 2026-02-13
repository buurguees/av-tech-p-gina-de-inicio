# Departamento Digital de Agentes IA — Diseño y Operación (V1)

> **Objetivo:** Crear un departamento digital de agentes de IA (coste ≈ 0€ salvo VPS) capaz de **analizar y mejorar el ERP**, **desarrollar software interno**, **planificar marketing/comercial**, y **generar insights financieros**, siempre con **control jerárquico** y **aprobación humana antes de cambios críticos**.

---

## 1. Visión y alcance

### 1.1 Qué es
Un "departamento digital" compuesto por agentes especializados, organizados como una empresa real:

- **CEO (humano)**: visión y decisiones estratégicas.
- **JEFE (operativo)**: convierte ideas en proyectos ejecutables, asigna recursos, valida entregables.
- **Jefes de departamento**: Programación, Marketing, Comercial, Administración.
- **Agentes ejecutores**: tareas concretas por especialidad.

### 1.2 Qué hará (capabilidades)
- **ERP**: consultas, análisis, detección de errores, propuestas de mejora, automatizaciones.
- **GitHub/Repos**: desarrollo de proyectos completos y apps internas, documentación, PRs.
- **Marketing**: planificación semanal/mensual, copies, campañas, assets (con revisión humana).
- **Comercial**: propuestas, scripts, análisis de leads/oportunidades, captación.
- **Administración**: métricas, rentabilidad, cashflow, propuesta de sueldos, alertas €€€.

### 1.3 Qué NO hará (límites)
- No hará cambios directos en producción sin aprobación.
- No hará push directo a ramas protegidas.
- No publicará campañas sin validación humana.
- No ejecutará escrituras en ERP por defecto (solo lectura, salvo confirmación explícita).

### 1.4 ERP como Centro de Control (Control Tower)

El ERP de la empresa es la **interfaz principal de interacción humana** con el Departamento Digital IA.

**No se desarrollará un tablero externo.**
El módulo de agentes vivirá **dentro del ERP actual**.

**Funciones del módulo IA en el ERP:**

- Bandeja de propuestas generadas por agentes
- Aprobación / rechazo de cambios
- Visualización de proyectos IA
- Visualización de tareas IA
- Historial de ejecuciones (runs)
- Logs y auditoría

**El ERP actúa como:**
- Interfaz humana
- Sistema de aprobación
- Registro permanente
- Fuente de verdad empresarial

> Ver documento detallado: `docs/ERP_MODULE_v1.md`

---

## 2. Principios operativos (reglas del juego)

### 2.1 Coste mínimo
- Infraestructura: **VPS** (Hostinger u otro).
- IA: modelos gratuitos/locales (Qwen3, etc.) y/o APIs solo si imprescindible.
- Herramientas: Clawdbot/Moltbot + software open-source siempre que sea posible.

### 2.2 Control humano obligatorio (Human-in-the-Loop)
- **Todo cambio crítico requiere "OK humano"**:
  - cambios en ERP
  - merges en main
  - despliegues
  - publicación de campañas
  - acciones financieras/sueldos

### 2.3 Trazabilidad
- Todo trabajo debe dejar:
  - un **output** (archivo, PR, doc, informe)
  - un **log de decisión**
  - una **referencia a proyecto/tarea**

### 2.4 Calidad antes que velocidad
- "Hecho" = cumple criterios de aceptación + checklist QA.
- Se prioriza la reducción de errores y la repetibilidad.

---

## 3. Estructura jerárquica (4 escalones)

### 3.1 CEO (humano)
**Responsabilidades**
- Estrategia y dirección del departamento IA.
- Priorización macro y expansión.
- Aprobación de proyectos estratégicos y cambios críticos.

### 3.2 JEFE (Director Operativo IA)
**Responsabilidades**
- Intake → Triage → Scoping → Plan → Ejecución → QA → Delivery → Cierre.
- Asignación de departamento líder y soportes.
- Validación final de entregables antes de presentar a humano.

### 3.3 Jefes de Departamento
**Responsabilidades**
- Convertir objetivos en tareas.
- Coordinar agentes ejecutores.
- Documentar avances y evidencias.
- Coordinar dependencias con otros departamentos.

Departamentos:
- Programación
- Marketing
- Comercial
- Administración

### 3.4 Agentes ejecutores
**Responsabilidades**
- Ejecutar tareas definidas.
- Entregar outputs claros y reutilizables.
- Reportar bloqueos y riesgos.

---

## 4. Flujo Operativo de Proyectos (SOP-001)

### 4.1 Estados del proyecto
1. **INTAKE (Entrada)**
2. **TRIAGE (Clasificación y prioridad)**
3. **SCOPING (Alcance + entregables)**
4. **PLAN (Plan + asignaciones)**
5. **EXECUTION (Ejecución)**
6. **QA (Control de calidad)**
7. **DELIVERY (Entrega)**
8. **CLOSE (Cierre + aprendizajes)**

> Regla: no se avanza de fase sin checklist OK.

---

### 4.2 INTAKE — Plantilla mínima de entrada
Todo entra en una ficha:

- Nombre del proyecto
- Solicitante (humano)
- Objetivo (1 frase)
- Contexto (2–5 líneas)
- Entregables esperados
- Deadline
- Prioridad (Alta/Media/Baja)
- Restricciones (stack, presupuesto, tono, herramientas)
- Materiales adjuntos (links, docs, assets)

**Owner:** ORQUESTADOR/JEFE

---

### 4.3 TRIAGE — Clasificación
Se define:

**A) Tipo**
- Desarrollo/Producto (Programación)
- Marketing/Contenido
- Ventas/Captación
- Administración/Finanzas
- Mixto

**B) Complejidad**
- S (<2h), M (2–8h), L (>1 día), XL (iterativo)

**C) Riesgo**
- Bajo / Medio / Alto (dinero, reputación, legal, seguridad)

**Salida del TRIAGE**
- Departamento líder
- Departamentos soporte
- Owner (JEFE)
- Fechas realistas
- Riesgos y dependencias

---

### 4.4 SCOPING — Alcance (1 página)
Documento de alcance:
- Qué SÍ incluye
- Qué NO incluye
- Entregables concretos
- Criterios de aceptación
- Dependencias
- Suposiciones
- Riesgos + mitigación

> Si no hay criterios de aceptación, no se programa / no se ejecuta.

---

### 4.5 PLAN — WBS + dependencias + handoffs
Cada tarea debe incluir:
- ID
- Responsable (agente)
- Inputs
- Output esperado
- Tiempo estimado
- Dependencias
- Definition of Done (DoD)

**Handoffs entre departamentos**
- Output empaquetado (archivo/link)
- Resumen de cambios
- Versión
- Notas para el siguiente equipo

---

### 4.6 EXECUTION — Ejecución + reporting
- Los agentes ejecutan y generan outputs.
- Cada jefe de departamento envía **reporte async diario** al JEFE:

**Formato reporte**
- Hecho hoy
- Bloqueos
- Próximo
- Riesgos
- Necesito de otro depto

---

### 4.7 QA — Control de calidad (obligatorio)
Tipos:
- QA Técnico (tests/lint/review)
- QA Brand/Contenido (tono/coherencia/CTA)
- QA Comercial (claridad/objeciones)
- QA Administrativo (números/consistencia)

Todo QA se valida contra los **criterios de aceptación** del SCOPING.

---

### 4.8 DELIVERY — Entrega estandarizada
Debe incluir:
- Qué se entrega (lista)
- Dónde está (ruta/link)
- Cómo usarlo (mini guía)
- Versionado
- Próximos pasos recomendados

---

### 4.9 CLOSE — Cierre + aprendizaje
Se registra:
- Tiempo real vs estimado
- Qué funcionó / qué falló
- Plantillas creadas/reutilizables
- Cambios propuestos en SOPs

---

## 5. Arquitectura técnica (V1)

### 5.1 Infraestructura base (VPS)
Servicios recomendados:
- Docker (obligatorio)
- Reverse proxy (Nginx/Caddy)
- PostgreSQL (memoria persistente)
- Redis (colas / jobs)
- Logs centralizados (mínimo: rotación + storage)
- Backups (DB + repos + config)

Acceso:
- VPN (ej. Tailscale) para administración privada
- SSH con llaves y hardening básico

---

## 6. Capa de Memoria y Registro (núcleo del sistema)

### 6.1 Qué debe guardar
- Proyectos (estado, prioridad, owner)
- Tareas (WBS, dependencias, DoD)
- Decisiones (quién, cuándo, por qué)
- Entregables (rutas, versiones)
- Métricas (por departamento y global)

### 6.2 Reglas
- Nada "vive" solo en chats: todo termina en un artefacto (doc/PR/informe).
- Los jefes alimentan la memoria mediante outputs.

### 6.3 Modelo de Datos ERP — Módulo IA

Se crearán **tablas internas en el ERP** para soportar el módulo IA:

| Tabla | Propósito |
|-------|----------|
| `ai_projects` | Proyectos gestionados por agentes |
| `ai_tasks` | Tareas asignadas dentro de cada proyecto |
| `ai_insights` | Observaciones y análisis generados |
| `ai_deliverables` | Entregables y propuestas de cambio |
| `ai_approvals` | Registro de aprobaciones/rechazos humanos |
| `ai_runs` | Historial de ejecuciones de agentes |

**Ningún agente escribirá directamente en tablas core del ERP.**

Todos los cambios reales pasarán por:
1. Propuesta registrada en `ai_deliverables`
2. Aprobación humana registrada en `ai_approvals`
3. Aplicación controlada del cambio

> Ver esquema SQL completo en: `docs/SUPABASE_AI_SCHEMA_V1.md`

### 6.4 Implementación en nuestro ERP (React + Vite + Supabase RPC)

El módulo IA se implementa **dentro del ERP existente (nexo_av)**, sin frameworks ni backends nuevos:

| Aspecto | Implementación |
|---------|---------------|
| **Frontend** | Páginas React bajo `/nexo-av/:userId/ai/*` usando componentes existentes (`DataList`, `DetailNavigationBar`, etc.) |
| **Backend** | Funciones PostgreSQL (RPCs) expuestas vía `supabase.rpc()` — mismo patrón que el resto del ERP |
| **Auth humano** | Supabase Auth existente. Solo `admin` y `manager` acceden al módulo IA |
| **Auth agentes** | Edge Function `ai-agent-bridge` con token propio (aislado del auth humano) |
| **Realtime** | Badge en Sidebar con `supabase.channel()` para propuestas pendientes |
| **Tablas** | `ai_*` en el mismo PostgreSQL de Supabase. RLS para humanos, `service_role` para agentes |

**No se crea:**
- Ningún backend adicional (Node, Python, etc.)
- Ninguna API REST externa
- Ningún tablero fuera del ERP

> Detalle completo: `docs/ERP_MODULE_v1.md` (secciones 10-15)  
> SQL definitivo: `docs/SUPABASE_AI_SCHEMA_V1.md`

---

## 7. Integraciones

### 7.1 ERP (Centro operativo — Control Tower)

**Modo por defecto:**
- **Lectura total** de tablas core del ERP
- **Escritura SOLO en tablas `ai_*`** (módulo IA)

**Lectura (sin restricción):**
- Consultas y análisis de cualquier dato
- Detección de errores y anomalías
- Generación de insights y métricas

**Escritura en tablas `ai_*` (automática):**
- Registro de propuestas en `ai_deliverables`
- Creación de proyectos en `ai_projects`
- Creación de tareas en `ai_tasks`
- Registro de ejecuciones en `ai_runs`

**Cambios en tablas core de producción:**
- Requieren registro previo en `ai_deliverables`
- Requieren aprobación humana en `ai_approvals`
- Requieren plan de rollback documentado
- NUNCA se ejecutan sin los 3 pasos anteriores

### 7.2 GitHub (repos controlado)
- Token/credenciales seguras
- Rama principal protegida
- PR obligatorio
- Revisión humana obligatoria
- CI básico si aplica (lint/tests)

---

## 8. Herramientas creativas (con revisión humana)

Herramientas objetivo:
- Blender (assets, renders)
- Figma (diseño UI/brand)
- Higgsfield (video/creativo)
- Otras (según pipeline)

**Regla:** siempre "propuesta → preview → revisión humana → aprobación → publicación".

---

## 9. Departamentos y responsabilidades (detalle)

### 9.1 Programación
**Objetivos**
1) Desarrollar ideas end-to-end:
- Idea → Documentación → Requisitos → Arquitectura → MVP → QA → Lanzamiento

2) Crear software interno con UI humana:
- Notas por departamento
- Trello/Kanban por departamento
- Herramienta de planificación de campañas (Marketing)
- Dashboards (Admin)
- Panel de aprobación/feedback (humano)

3) Mejorar el ERP:
- Auditoría de UX/flujo
- Automatizaciones
- Refactors propuestos
- Cambios siempre bajo aprobación

**Política de cambios**
- Sin cambios directos en prod
- Propuesta escrita + PR + aprobación

---

### 9.2 Marketing
**Objetivos**
- Investigación competencia
- Calendario semanal/mensual
- Copies/Creatividades
- Planificación campañas a semanas vista
- Generación de assets (con revisión)

**Entregables típicos**
- Calendario de contenido
- Brief creativo
- Copies + CTAs
- Paquetes de assets (rutas + nombres + versiones)
- Informe de resultados (si hay datos)

---

### 9.3 Comercial
**Objetivos**
- Detección de oportunidades
- Priorización leads/clientes
- Scripts de venta
- Propuestas de captación
- Seguimiento tasa de cierre

**Entregables típicos**
- Lista priorizada + razones
- Pitch deck outline (si aplica)
- Script / argumentario
- Propuesta comercial por segmento

---

### 9.4 Administración
**Objetivos**
- Analizar métricas del ERP
- Rentabilidad por proyecto/cliente
- Cashflow / alertas
- Propuestas salariales (por socio, mensual)
- Comunicación de performance a otros departamentos (€€€)

**Entregables típicos**
- Informe mensual/trimestral
- Propuesta de sueldos + justificación
- Alertas de desviación (gastos, margen, etc.)
- Recomendaciones para escalar

---

## 10. Gobernanza y seguridad (mínimo viable)

### 10.1 Accesos
- Roles: CEO / JEFE / JefeDept / Agente / ObservadorHumano
- Principio de mínimo privilegio

### 10.2 Cambios críticos
Requieren:
- documento de cambio
- plan de pruebas
- plan de rollback
- aprobación humana

### 10.3 Auditoría
- logs de acciones de agentes
- historial de PRs
- historial de decisiones

---

## 11. Roadmap por fases

### Fase 1 — Infraestructura
- VPS + Docker
- DB + Redis
- Reverse proxy
- Acceso privado + backups

### Fase 2 — Orquestación + Programación
- Agente orquestador
- Flujo SOP implementado
- Docs + PR workflow

### Fase 3 — ERP Integration
- Conector lectura
- Informes y auditorías
- Panel de revisión humana para propuestas

### Fase 4 — Marketing + Comercial
- Planner campañas con UI
- Sistema de aprobación humano
- Generación de assets

### Fase 5 — Administración avanzada
- Informes recurrentes
- Propuestas salariales
- Alertas y recomendaciones

---

## 12. Estructura sugerida de documentación en repo

```
/docs
  SEGURIDAD.md
  AGENTES_Y_MODELOS.md
  ERP_MODULE_v1.md
  SUPABASE_AI_SCHEMA_V1.md
  SOP-001_flujo_proyectos.md
  SOP-002_plantillas.md
  SOP-003_handoffs.md
  SOP-004_checklists_QA.md
  SOP-005_priorizacion_y_slas.md
```

---

## 13. Próximo paso (a partir de este documento)

1) Crear **SOP-002 Plantillas**:
   - INTAKE
   - SCOPING
   - PLAN/WBS
   - DELIVERY
   - CLOSE

2) Crear **SOP-004 QA Checklists** por departamento.

3) Definir **modelo de datos mínimo** (proyectos, tareas, decisiones, entregables).

4) Definir **reglas GitHub** (ramas, PR, reviewers, CI).

---

## Apéndice A — Checklists mínimas

### A.1 Checklist para pasar de SCOPING → PLAN
- [ ] Entregables definidos
- [ ] Criterios de aceptación claros
- [ ] Dependencias identificadas
- [ ] Riesgos listados
- [ ] Owner y fechas asignadas

### A.2 Checklist para pasar de QA → DELIVERY
- [ ] QA completado y registrado
- [ ] Cambios revisados por jefe depto
- [ ] Evidencias guardadas (links/rutas)
- [ ] Formato de entrega preparado
- [ ] Aprobación humana (si aplica)
