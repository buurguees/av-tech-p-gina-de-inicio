# NEXO AV — Arquitectura de Workspaces y Departamento Digital (V1)

---

## 1. Contexto Estratégico

El sistema multiagente que se está construyendo tiene un objetivo claro:

> Trabajar casi exclusivamente en la evolución de **NEXO AV** y sus sub-plataformas (ERP, CSM, Gestión de usuarios, futuros módulos).

- **No** es un laboratorio genérico de agentes.
- **Es** un Departamento Digital orientado a producto interno.

---

## 2. Estructura General del Sistema

### 2.1 Administración Workspace

Administración **no** es un workspace nuevo.

**Administración = el propio ERP actual.**

Incluye:

- Facturación
- Compras
- Proyectos
- Contabilidad
- Rentabilidad
- Escalabilidad
- Alertas financieras

Puede evolucionar, pero no se crea una "cara" nueva separada.

### 2.2 Workspaces Nuevos

Se desarrollarán como nuevas "caras" dentro de NEXO AV:

- **Marketing Workspace**
- **Comercial Workspace**
- (Futuros: CSM, Multi-tenant, etc.)

Cada workspace:

- Vive dentro de NEXO AV.
- Tiene UI propia.
- Tiene lógica propia.
- Está gobernado por el mismo sistema de aprobación humana.

---

## 3. Principio Fundamental: Aprobación Humana Obligatoria

**Regla global del sistema:**

> Ningún cambio crítico o acción externa se ejecuta sin aprobación de un humano con rol `admin` o `manager`.

Esto aplica a:

- Publicaciones en redes sociales
- Envío de emails comerciales
- Cambios de precios
- Creación/emisión de documentos
- Cambios estructurales en ERP
- Migraciones de base de datos
- PRs que afecten producción
- Automatizaciones externas

El flujo siempre será:

```
Propuesta → Revisión → Aprobación → Ejecución
```

---

## 4. Marketing Workspace

### Objetivo

Planificar y producir contenido.
**Nunca** publicar automáticamente sin aprobación.

### Funcionalidades previstas

- Gestión de campañas
- Calendario editorial
- Biblioteca de assets (Higgsfield, ComfyUI, etc.)
- Generación de copies
- Variantes de mensajes
- Bandeja de publicaciones pendientes de aprobación

### Restricciones

- No publica automáticamente.
- No gestiona credenciales de redes sociales en esta fase.
- No ejecuta automatizaciones sin aprobación.

---

## 5. Comercial Workspace

### Objetivo

Preparar acciones comerciales sin ejecutarlas directamente.

### Funcionalidades previstas

- Gestión de leads
- Análisis de potencial de locales/clientes
- Generación de emails comerciales
- Scripts de llamada
- Sugerencias de producto/precio
- Registro de feedback humano
- Bandeja de envíos pendientes de aprobación

### Restricciones

- No envía emails automáticamente (al inicio).
- No modifica precios reales sin aprobación.
- No emite presupuestos definitivos sin revisión.

---

## 6. Núcleo Común: Sistema de Propuestas

Todos los workspaces comparten un núcleo común.

**Entidad central: `Proposal`**

| Campo | Descripción |
|---|---|
| `workspace` | `marketing` \| `commercial` \| `future` |
| `type` | `post` \| `email` \| `campaign` \| `pricing_change` \| `product_change` \| `other` |
| `status` | Ver estados abajo |
| `payload` | JSON estructurado con la propuesta |
| `attachments` | Referencias a storage |
| `created_by` | Usuario creador |
| `reviewed_by` | Usuario revisor |
| `review_notes` | Notas de revisión |
| `timestamps` | Fechas de creación, actualización, etc. |

### Estados de `status`

```
draft → pending_review → changes_requested → approved → implemented
                       ↘ rejected
```

- `draft`
- `pending_review`
- `changes_requested`
- `approved`
- `rejected`
- `implemented`

---

## 7. Sistema de Permisos

### Usuarios Marketing / Comercial

**Pueden:**

- Crear propuestas
- Editar sus propuestas en estado `draft`
- Enviar a revisión

**No pueden:**

- Aprobar
- Implementar
- Ejecutar acciones externas

### Usuarios Admin / Manager

**Pueden:**

- Aprobar
- Rechazar
- Solicitar cambios
- Marcar como implementado
- Habilitar automatizaciones futuras

---

## 8. Arquitectura Multiagente Enfocada a NEXO

```
                     ORQUESTADOR NEXO
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
Programming Head   Database Architect         QA
      │                    │                    │
      └────────────────────┼────────────────────┘
                           │
                      Coding Agent
```

**Especialización real:**

| Agente | Responsabilidad |
|---|---|
| **Orquestador** | Planificación estratégica |
| **Programming Head** | Arquitectura + PR plan |
| **Database Architect** | Tablas + RLS + migraciones |
| **QA Agent** | Seguridad + validación |
| **Coding Agent** | Implementación |

Todos alineados con:

- PR-first
- Documentación obligatoria
- No ejecución sin revisión humana

---

## 9. Reglas de Desarrollo (Departamento Programación)

1. Siempre branch + PR.
2. Nunca push a `main`.
3. Nunca merge automático.
4. Commits con **Conventional Commits**.
5. Cambios grandes documentados en `docs/`.
6. Plan antes de ejecutar.
7. Checklist de seguridad y rollback obligatorio.

> El archivo `/opt/nexo-agents/prompts/programming_head.txt` refleja estas reglas como contrato operativo.

---

## 10. Roadmap Inmediato

Orden recomendado:

| Prioridad | Elemento |
|---|---|
| **MVP-001** | Sistema de Propuestas + Aprobación |
| 2 | Marketing Workspace (sobre ese núcleo) |
| 3 | Comercial Workspace |
| 4 | Evolución CSM |
| 5 | Multi-tenant y gestión avanzada de usuarios |

---

> **Fin del Documento — V1**
