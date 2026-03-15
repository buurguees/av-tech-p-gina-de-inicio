---
name: nexo-brand-guidelines
description: Aplica identidad de marca AV TECH Esdeveniments y NEXO AI oficial a documentos, UI, presentaciones o propuestas generadas dentro del ecosistema ERP.
license: Internal use only - AV TECH Esdeveniments
---

# NEXO AI - Brand & Visual System

## Guía para agentes

| | |
|---|---|
| **Cuándo cargar** | Generar propuestas comerciales, informes financieros, documentación técnica, presentaciones, interfaces ERP, dashboards, material marketing, documentos para clientes, SOPs. |
| **Cuándo NO cargar** | Código backend sin impacto visual; tareas de datos sin salida documental. |
| **Integración .codex** | Si se define nuevo estándar de marca reutilizable, registrar en `.codex/avances.md`. |

---

## Alcance

Usar esta skill cuando se generen:

- Propuestas comerciales
- Informes financieros
- Documentación técnica
- Presentaciones internas
- Interfaces ERP
- Dashboards
- Material marketing
- Documentos para clientes
- Documentación GitHub
- SOPs y manuales

**Keywords:** branding, NEXO AV, AV TECH, ERP, proposal formatting, internal documentation styling, UI consistency, corporate identity.

---

## Brand Identity - AV TECH & NEXO AI

### Brand personality

- Profesional
- Tecnológico
- Minimalista
- Estratégico
- Preciso
- Sin exageraciones de marketing vacías
- Orientado a datos

**Tono:** Professional + direct + intelligent clarity

---

## Color system

### Core colors

| Name | Hex | Usage |
|------|-----|-------|
| Deep Graphite | `#0F1115` | Primary dark background |
| NEXO Black | `#141413` | Text on light surfaces |
| Off White | `#F5F6F8` | Light backgrounds |
| Soft Gray | `#B8BCC5` | Secondary text |
| Neutral Divider | `#E6E8EC` | Lines, separators |

### Accent colors

| Name | Hex | Usage |
|------|-----|-------|
| Electric Blue | `#2D6BFF` | Primary action / links |
| Signal Cyan | `#00B3FF` | Tech highlights |
| Strategic Orange | `#F97316` | Alerts / emphasis |
| Performance Green | `#16A34A` | Financial positive metrics |
| Alert Red | `#DC2626` | Critical alerts |

---

## Typography system

- **Headings:** Inter (bold / semibold); fallback Arial / Helvetica
- **Body:** Inter / system-ui; fallback Arial
- **Technical docs / Code blocks:** JetBrains Mono (fallback monospace)

---

## Visual formatting rules

### Layout principles

- Much white space
- Clear separation of sections
- Strong hierarchy
- No decorative noise
- No gradients unless explicitly requested
- No heavy shadows

### Headings hierarchy

| Level | Style |
|-------|-------|
| H1 | Large, bold, strong spacing |
| H2 | Medium bold |
| H3 | Semibold |
| Body | Clean, 1.5 line spacing |
| Lists | Structured, no emoji unless marketing context |

### Icon usage

- Lucide icons preferred
- Minimal stroke style
- No cartoon icons
- No emoji in technical documents

---

## Financial formatting rules (muy importante)

- **Currency:** EUR
- **Symbol:** `€`
- **Format:** `1.234,56 €`
- **Thousands separator:** `.`
- **Decimal separator:** `,`
- Always show currency on financial outputs
- Never mix USD or other currencies unless explicitly required

---

## Document styling behavior

### En propuestas

- Executive summary first
- Clear pricing breakdown
- No over-marketing
- ROI section
- Visual separation between sections

### En documentación técnica

- Architecture diagram explanation
- Table of contents if > 2 pages
- Clear code blocks
- Version number
- Change log

### En salidas ERP

- Clean tables
- KPI summary cards
- Color-coded metrics
- No excessive text
- Clear decision prompts

### En documentos SharePoint

- Use explicit, human-readable titles
- Prioritize period-based clarity for accounting and admin workflows
- Keep section headers predictable for non-technical readers
- Do not use decorative language in fiscal/legal support documents
- Keep naming and structure aligned with `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`

---

## Smart accent behavior

- Financial gains → Green
- Risks / alerts → Orange or Red
- Technical elements → Blue or Cyan
- Strategic highlights → Blue
- Internal process steps → Neutral tones

---

## Qué evitar

- Overuse of emojis
- Marketing hype language
- Decorative gradients
- Inconsistent spacing
- Random typography
- Unstructured long paragraphs
- Mixing financial formats

---

## Integración con arquitectura NEXO AI

Esta skill debe:

- Respetar role-based output limits (profiles: `management`, `financial`, `technical`, `commercial`, `full`)
- Never override access restrictions
- Never reveal restricted financial data
- Always follow locale rules from base agent config (`base`)
