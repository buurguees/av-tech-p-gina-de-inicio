---
name: nexo-brand-guidelines
description: Applies AV TECH Esdeveniments and NEXO AI official brand identity, visual system, and formatting standards to any document, UI artifact, presentation, or proposal generated inside the ERP ecosystem.
license: Internal use only - AV TECH Esdeveniments
---

# NEXO AI - Brand & Visual System

## 1) Overview
Use this skill whenever generating:
- Propuestas comerciales
- Informes financieros
- Documentacion tecnica
- Presentaciones internas
- Interfaces ERP
- Dashboards
- Material marketing
- Documentos para clientes
- Documentacion GitHub
- SOPs y manuales

Keywords: branding, NEXO AV, AV TECH, ERP, proposal formatting, internal documentation styling, UI consistency, corporate identity.

## 2) Brand Identity - AV TECH & NEXO AI

### 2.1 Brand personality
- Profesional
- Tecnologico
- Minimalista
- Estrategico
- Preciso
- Sin exageraciones de marketing vacias
- Orientado a datos

Tono:
- Professional + direct + intelligent clarity

## 3) Color system

### 3.1 Core colors
| Name | Hex | Usage |
|---|---|---|
| Deep Graphite | `#0F1115` | Primary dark background |
| NEXO Black | `#141413` | Text on light surfaces |
| Off White | `#F5F6F8` | Light backgrounds |
| Soft Gray | `#B8BCC5` | Secondary text |
| Neutral Divider | `#E6E8EC` | Lines, separators |

### 3.2 Accent colors
| Name | Hex | Usage |
|---|---|---|
| Electric Blue | `#2D6BFF` | Primary action / links |
| Signal Cyan | `#00B3FF` | Tech highlights |
| Strategic Orange | `#F97316` | Alerts / emphasis |
| Performance Green | `#16A34A` | Financial positive metrics |
| Alert Red | `#DC2626` | Critical alerts |

## 4) Typography system

### Headings
- Primary: Inter (bold / semibold)
- Fallback: Arial / Helvetica

### Body
- Primary: Inter / system-ui
- Fallback: Arial

### Technical docs
- Code blocks: JetBrains Mono (fallback monospace)

## 5) Visual formatting rules

### 5.1 Layout principles
- Much white space
- Clear separation of sections
- Strong hierarchy
- No decorative noise
- No gradients unless explicitly requested
- No heavy shadows

### 5.2 Headings hierarchy
| Level | Style |
|---|---|
| H1 | Large, bold, strong spacing |
| H2 | Medium bold |
| H3 | Semibold |
| Body | Clean, 1.5 line spacing |
| Lists | Structured, no emoji unless marketing context |

### 5.3 Icon usage
- Lucide icons preferred
- Minimal stroke style
- No cartoon icons
- No emoji in technical documents

## 6) Financial formatting rules (very important)
Aligned with base agent config (`base`):
- Currency: EUR
- Symbol: `€`
- Format: `1.234,56 €`
- Thousands separator: `.`
- Decimal separator: `,`
- Always show currency on financial outputs
- Never mix USD or other currencies unless explicitly required

## 7) Document styling behavior
When this skill is applied:

### 7.1 In proposals
- Executive summary first
- Clear pricing breakdown
- No over-marketing
- ROI section
- Visual separation between sections

### 7.2 In technical docs
- Architecture diagram explanation
- Table of contents if > 2 pages
- Clear code blocks
- Version number
- Change log

### 7.3 In ERP outputs
- Clean tables
- KPI summary cards
- Color-coded metrics
- No excessive text
- Clear decision prompts

### 7.4 In SharePoint documents
- Use explicit, human-readable titles.
- Prioritize period-based clarity for accounting and admin workflows.
- Keep section headers predictable for non-technical readers.
- Do not use decorative language in fiscal/legal support documents.
- Keep naming and structure aligned with `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`.

## 8) Smart accent behavior
- Financial gains -> Green
- Risks / alerts -> Orange or Red
- Technical elements -> Blue or Cyan
- Strategic highlights -> Blue
- Internal process steps -> Neutral tones

## 9) What this skill avoids
- Overuse of emojis
- Marketing hype language
- Decorative gradients
- Inconsistent spacing
- Random typography
- Unstructured long paragraphs
- Mixing financial formats

## 10) Integration with NEXO AI architecture
This skill must:
- Respect role-based output limits (see profiles): `management`, `financial`, `technical`, `commercial`, `full`.
- Never override access restrictions.
- Never reveal restricted financial data.
- Always follow locale rules from base agent config (`base`).

## 11) Optional mode variants
This skill can be extended with internal flags:

```json
{
  "mode": "proposal | internal_doc | dashboard | marketing | financial_report"
}
```

Behavior by mode:
- Proposal -> More structured persuasion
- Internal_doc -> Structured clarity
- Dashboard -> Visual KPI-first layout
- Marketing -> Slightly more dynamic tone
- Financial_report -> Conservative + data-first

## 12) Advanced version (optional roadmap)
- Create `nexo-dark-ui-skin` skill for interfaces.
- Create `nexo-investor-format` for investor material.
- Create `nexo-sop-format` for internal documentation.
- Create `nexo-client-presentation-format` for B2B proposals.
