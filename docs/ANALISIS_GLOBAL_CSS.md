# Análisis Detallado de global.css
## Nexo AV - Professional Dashboard Theme

**Archivo:** `src/pages/nexo_av/desktop/styles/global.css`  
**Total de líneas:** 5487  
**Fecha de análisis:** 22 Enero 2026

---

## 📋 RESUMEN EJECUTIVO

El archivo `global.css` contiene **31 secciones principales** con una mezcla de:
- ✅ **CSS GENERAL** (10 secciones) - Variables, tipografías, colores, estados
- ⚠️ **CSS DE COMPONENTE** (21 secciones) - Estilos específicos de UI que deberían estar separados

### Objetivo de refactorización
Separar el archivo para que `global.css` contenga SOLO estilos generales y crear archivos CSS específicos por componente.

---

## 📊 DISTRIBUCIÓN DE SECCIONES

| # | Sección | Líneas | Tipo | Destino |
|---|---------|--------|------|---------|
| 1 | NEXO AV - Light Theme Base | 1-159 | GENERAL | ✅ global.css |
| 2 | NEXO AV - Dark Theme Base | 160-319 | GENERAL | ✅ global.css |
| 3 | BASE COLORS (Light) | 8-55 | GENERAL | ✅ global.css |
| 4 | TEXT HIERARCHY | 56-62 | GENERAL | ✅ global.css |
| 5 | SHADOWS | 63-68 | GENERAL | ✅ global.css |
| 6 | SIDEBAR (Variables) | 69-77 | GENERAL | ✅ global.css |
| 7 | STATUS COLORS | 78-111 | GENERAL | ✅ global.css |
| 8 | Dark Theme Colors | 160-296 | GENERAL | ✅ global.css |
| 9 | SHARED STYLES (Typography) | 320-392 | GENERAL | ✅ global.css |
| 10 | BASE STYLES | 393-408 | GENERAL | ✅ global.css |
| 11 | TYPOGRAPHY - Compact | 409-448 | GENERAL | ✅ global.css |
| 12 | STATUS BADGE SYSTEM | 449-507 | GENERAL (con estilos) | 📦 badge-system.css |
| 13 | CARDS | 508-520 | COMPONENTE | 📦 card.css |
| 14 | TABLES | 521-548 | COMPONENTE | 📦 table.css |
| 15 | BUTTONS | 549-565 | COMPONENTE | 📦 button.css |
| 16 | INPUTS | 566-585 | COMPONENTE | 📦 input.css |
| 17 | HEADER & SIDEBAR | 586-817 | COMPONENTE | 📦 header.css + 📦 sidebar.css |
| 18 | ICONS | 818-839 | COMPONENTE | 📦 icon.css |
| 19 | HEADER (Compact) | 840-847 | COMPONENTE | 📦 header.css |
| 20 | DASHBOARD SPECIFIC | 848-866 | COMPONENTE | 📦 dashboard-kpi.css |
| 21 | OVERRIDE DARK THEME CLASSES | 867-945 | COMPONENTE | 📦 dark-theme-overrides.css |
| 22 | STAT CARD ICON BACKGROUNDS | 946-988 | COMPONENTE | 📦 dashboard-kpi.css |
| 23 | MAIN CONTENT AREA | 989-1011 | COMPONENTE | 📦 layout.css |
| 24 | MAP LAYOUTS | 1012-1070 | COMPONENTE | 📦 layout.css |
| 25 | LEAD MAP SIDEBAR | 1071-1085 | COMPONENTE | 📦 lead-map.css |
| 26 | SPACING (space-y, gap, padding, margin) | 1086-1481 | GENERAL | ✅ global.css |
| 27 | PAGE LAYOUT CONTROL | 1482-1510 | COMPONENTE | 📦 layout.css |
| 28 | RESPONSIVE - Desktop Scaling | 1511-2747 | GENERAL (responsive) | ✅ global.css |
| 29 | LIST PAGES | 2748-2777 | COMPONENTE | 📦 list-pages.css |
| 30 | KPI CARDS | 2778-2932 | COMPONENTE | 📦 dashboard-kpi.css |
| 31 | LIST HEADER | 2933-2972 | COMPONENTE | 📦 list-pages.css |
| 32 | LIST TABLE | 2973-3111 | COMPONENTE | 📦 table.css |
| 33 | EMPTY STATE | 3112-3119 | COMPONENTE | 📦 list-pages.css |
| 34 | DETAIL PAGES | 3120-3500+ | COMPONENTE | 📦 detail-pages.css |
| 35 | INVOICE DETAIL PAGE | 3500+ | COMPONENTE | 📦 detail-pages.css |
| 36 | DASHBOARD KPI BLOCKS | 3900+ | COMPONENTE | 📦 dashboard-kpi.css |
| 37 | DASHBOARD WIDGET | 4200+ | COMPONENTE | 📦 dashboard-widget.css |
| 38 | DASHBOARD KPI BLOCKS SCALING | 5400+ | COMPONENTE | 📦 dashboard-kpi.css |

---

## 🎯 SECCIONES A MANTENER EN global.css (GENERAL)

### ✅ 1. NEXO AV Theme Configuration (Líneas 1-319)
**Tipo:** CSS GENERAL - Variables de tema  
**Descripción:** Define todas las variables CSS (colores HSL, tipografías, sombras) para ambos temas (light/dark)  
**Contenido:**
- BASE COLORS (background, foreground, cards, buttons, etc.)
- TEXT HIERARCHY (text-primary, text-secondary, text-muted)
- SHADOWS (shadow-xs, shadow-sm, shadow-md)
- SIDEBAR colors
- STATUS COLORS (success, warning, error, info, neutral, special)

**Decisión:** ✅ **MANTENER EN global.css** - Son definiciones fundamentales del tema

---

### ✅ 2. TYPOGRAPHY (Líneas 320-448)
**Tipo:** CSS GENERAL - Tipografías base  
**Descripción:** Define estilos de h1, h2, h3, h4, p con tamaños y pesos  
**Contenido:**
- h1: 1.375rem, font-weight 600
- h2: 1.0625rem, font-weight 600
- h3: 0.9375rem, font-weight 600
- h4: 0.8125rem, font-weight 500
- p: 0.8125rem, line-height 1.55

**Decisión:** ✅ **MANTENER EN global.css** - Son estilos base de tipografía

---

### ✅ 3. SPACING SYSTEM (Líneas 1086-1481)
**Tipo:** CSS GENERAL - Sistema de espaciado centralizado  
**Descripción:** Define todos los values de spacing (space-y, gap, padding, margin)  
**Contenido:**
- space-y-1 a space-y-8 (vertical spacing)
- gap-1 a gap-8 (flex/grid gaps)
- p-1 a p-8 (padding)
- px-1 a px-8 (padding horizontal)
- py-1 a py-8 (padding vertical)
- mt, mb, ml, mr (margins)

**Decisión:** ✅ **MANTENER EN global.css** - Sistema centralizado reusable

---

### ✅ 4. RESPONSIVE SCALING (Líneas 1511-2747)
**Tipo:** CSS GENERAL - Escalado responsive  
**Descripción:** Define breakpoints y reducciones de tamaños para desktop narrow/compact  
**Breakpoints:**
- DESKTOP NARROW (1024px-1439px): Reducción 10-15%
- DESKTOP COMPACT (1024px-1279px): Reducción 20-25%

**Decisión:** ✅ **MANTENER EN global.css** - Escalado global responsive

---

### ✅ 5. STATUS BADGE SYSTEM (Líneas 449-507)
**Tipo:** CSS GENERAL con estilos específicos  
**Descripción:** Define colores y estilos de badges de estado  
**Contenido:**
- .status-success, .status-warning, .status-error, .status-info, .status-neutral, .status-special
- Background, border, color específicos para cada estado
- .status-dot y colores de dots

**Decisión:** ⚠️ **SEPARAR A badge-system.css** - Es un componente bien definido

---

## ⚠️ SECCIONES A SEPARAR EN ARCHIVOS ESPECÍFICOS

### 📦 1. components/layout/header.css (del 586-817, 840-847)
**Secciones originales:** HEADER & SIDEBAR (parte header), HEADER (Compact)

**Contenido a mover:**
- header background-color: #000000
- header border, height, sizing
- header h1, p styling
- Logo text reduction
- Avatar border-radius override
- header buttons styling

**Líneas aproximadas:** 150-200 líneas

---

### 📦 2. components/layout/sidebar.css (del 586-817)
**Secciones originales:** HEADER & SIDEBAR (parte sidebar)

**Contenido a mover:**
- aside background, borders, positioning
- Sidebar nav buttons/links styling
- Sidebar active states
- Sidebar icon sizes
- Sidebar spacing

**Líneas aproximadas:** 200-250 líneas

---

### 📦 3. components/common/card.css
**Secciones originales:** CARDS (508-520)

**Contenido a mover:**
- .card styling (background, border, radius, shadow)
- .card:hover effects
- .card-content padding
- Card spacing and effects

**Líneas aproximadas:** 30-50 líneas

---

### 📦 4. components/common/table.css
**Secciones originales:** TABLES (521-548), LIST TABLE (2973-3111)

**Contenido a mover:**
- table, th, td styling
- Table header colors
- Table row hover effects
- Checkbox, icon sizes en tabla
- Badge styling en tabla
- thead styling
- tbody row spacing

**Líneas aproximadas:** 200-250 líneas

---

### 📦 5. components/common/button.css
**Secciones originales:** BUTTONS (549-565)

**Contenido a mover:**
- button base styles
- .btn-primary, .btn-secondary
- Button hover/focus states
- Button variants

**Líneas aproximadas:** 50-80 líneas

---

### 📦 6. components/common/input.css
**Secciones originales:** INPUTS (566-585)

**Contenido a mover:**
- input, textarea, select styling
- Input focus states
- Input placeholder colors
- label styling
- Input padding, border, border-radius

**Líneas aproximadas:** 40-60 líneas

---

### 📦 7. components/common/icon.css
**Secciones originales:** ICONS (818-839)

**Contenido a mover:**
- SVG sizing (h-8/w-8, h-6/w-6, h-5/w-5, h-4/w-4)
- Icon colors
- Icon container sizing

**Líneas aproximadas:** 30-50 líneas

---

### 📦 8. components/KPIs/badge-system.css
**Secciones originales:** STATUS BADGE SYSTEM (449-507)

**Contenido a mover:**
- Status badge colors (success, warning, error, info, neutral, special)
- Background colors, border colors, text colors
- Status dots styling
- Status dot colors

**Líneas aproximadas:** 80-120 líneas

---

### 📦 9. components/KPIs/kpi-cards.css
**Secciones originales:** KPI CARDS (2778-2932), DASHBOARD SPECIFIC (848-866), STAT CARD ICON BACKGROUNDS (946-988)

**Contenido a mover:**
- KPI Cards de todos los tamaños (small, medium, large)
- Icon backgrounds colors
- Icon colors (green, blue, purple, red, orange, etc.)
- KPI Card Grid styling
- KPI valores y etiquetas

**Líneas aproximadas:** 300-400 líneas

---

### 📦 10. components/KPIs/dashboard-widget.css
**Secciones originales:** DASHBOARD SUMMARY CARDS (líneas ~4000+), DASHBOARD WIDGET

**Contenido a mover:**
- DashboardWidget base styling
- DashboardWidget header/content
- Progress bar en widgets
- Circular charts (ProfitMarginWidget)
- Grid interno en widgets
- Variant solid styling

**Líneas aproximadas:** 400-500 líneas

---

### 📦 11. components/charts/chart-blocks.css
**Secciones originales:** CHART BLOCK SQUARE, CHART BLOCK HORIZONTAL

**Contenido a mover:**
- .chart-block-square styling
- .chart-block-horizontal styling
- Chart container sizes
- Responsive container styling
- Chart titles/subtitles

**Líneas aproximadas:** 150-200 líneas

---

### 📦 12. pages/list/list-pages.css
**Secciones originales:** LIST PAGES (2748-2777), LIST HEADER (2933-2972), EMPTY STATE (3112-3119)

**Contenido a mover:**
- List page header styling
- Action buttons en lista
- Search input styling
- List styling base
- Empty state messages

**Líneas aproximadas:** 150-200 líneas

---

### 📦 13. pages/detail/detail-pages.css
**Secciones originales:** DETAIL PAGES (3120+), INVOICE DETAIL PAGE (3500+)

**Contenido a mover:**
- Detail page header styling
- Detail page cards
- Detail page info sections
- Detail page status badges
- Detail page hero section
- Total sections styling
- Detail page grids
- Select/Dropdown styling
- Alert Dialog styling

**Líneas aproximadas:** 400-500 líneas

---

### 📦 14. layout/layout.css
**Secciones originales:** MAIN CONTENT AREA (989-1011), MAP LAYOUTS (1012-1070), PAGE LAYOUT CONTROL (1482-1510)

**Contenido a mover:**
- Main content area sizing
- Map container styling
- LeadMapPage layout
- Leaflet container styling
- Page padding/margins

**Líneas aproximadas:** 150-200 líneas

---

### 📦 15. pages/maps/lead-map.css
**Secciones originales:** LEAD MAP SIDEBAR (1071-1085)

**Contenido a mover:**
- LeadMapSidebar card styling
- Remove shadows from lead map cards
- LeadMapSidebar buttons

**Líneas aproximadas:** 20-40 líneas

---

### 📦 16. theme/dark-theme-overrides.css
**Secciones originales:** OVERRIDE DARK THEME CLASSES (867-945)

**Contenido a mover:**
- Dark mode color overrides para classes Tailwind
- bg-black, bg-zinc-900, bg-zinc-800
- Text color overrides (text-white, text-white/XX)
- Border overrides
- Background opacity overrides
- Blur disable

**Líneas aproximadas:** 100-150 líneas

---

## 📈 ESTRUCTURA PROPUESTA

```
src/pages/nexo_av/desktop/styles/
├── global.css (REFACTORIZADO - solo variables, tipografías, spacing, responsive)
│
├── components/
│   ├── layout/
│   │   ├── header.css
│   │   └── sidebar.css
│   ├── common/
│   │   ├── card.css
│   │   ├── table.css
│   │   ├── button.css
│   │   ├── input.css
│   │   └── icon.css
│   ├── KPIs/
│   │   ├── kpi-cards.css
│   │   └── dashboard-widget.css
│   └── charts/
│       └── chart-blocks.css
│
├── pages/
│   ├── list/
│   │   └── list-pages.css
│   ├── detail/
│   │   └── detail-pages.css
│   └── maps/
│       └── lead-map.css
│
├── layout/
│   └── layout.css
│
├── badge/
│   └── badge-system.css
│
└── theme/
    └── dark-theme-overrides.css
```

---

## 🎯 TAMAÑO ESTIMADO DESPUÉS DE REFACTORIZACIÓN

| Archivo | Líneas | Reducción |
|---------|--------|-----------|
| **ANTES:** global.css | 5487 | — |
| **DESPUÉS:** global.css | ~1500 | ✅ 73% más pequeño |
| header.css | ~200 | Nuevo |
| sidebar.css | ~250 | Nuevo |
| card.css | ~50 | Nuevo |
| table.css | ~250 | Nuevo |
| button.css | ~80 | Nuevo |
| input.css | ~60 | Nuevo |
| icon.css | ~50 | Nuevo |
| kpi-cards.css | ~350 | Nuevo |
| dashboard-widget.css | ~500 | Nuevo |
| chart-blocks.css | ~200 | Nuevo |
| list-pages.css | ~200 | Nuevo |
| detail-pages.css | ~500 | Nuevo |
| layout.css | ~200 | Nuevo |
| lead-map.css | ~40 | Nuevo |
| badge-system.css | ~120 | Nuevo |
| dark-theme-overrides.css | ~150 | Nuevo |
| **TOTAL:** | ~5390 | ≈ Mismo total, pero organizado |

---

## ✅ BENEFICIOS DE LA REFACTORIZACIÓN

1. **Mantenibilidad:** Cada componente en su archivo
2. **Reutilización:** CSS genérico claramente separado
3. **Carga:** Los navegadores pueden cachear mejor archivos específicos
4. **Escalabilidad:** Fácil agregar nuevos componentes
5. **Debugging:** Más fácil encontrar estilos problemáticos
6. **Modularidad:** Cada desarrollador puede trabajar en su componente sin conflictos

---

## 📝 RECOMENDACIÓN FINAL

**Prioridad Alta:** 
- ✅ Mantener global.css (solo variables, tipografía, spacing, responsive)
- 📦 Crear header.css, sidebar.css, card.css, table.css (componentes más usados)

**Prioridad Media:**
- 📦 Crear kpi-cards.css, dashboard-widget.css, detail-pages.css
- 📦 Crear list-pages.css, layout.css

**Prioridad Baja:**
- 📦 Crear los archivos complementarios (badge-system.css, icon.css, etc.)

---

**Autor:** AI Analysis
**Fecha:** 22 Enero 2026
**Estado:** Recomendación para refactorización
