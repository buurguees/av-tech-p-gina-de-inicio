---
name: nexo-mobile-ui-standards
description: Estándar de UI/UX mobile para NEXO AV en React + Tailwind, con reglas de consistencia visual, navegación, accesibilidad, rendimiento y paridad con desktop.
---

# NEXO Mobile UI Standards

## Guía para agentes

| | |
|---|---|
| **Cuándo cargar** | Crear o refactorizar pantallas mobile; convertir vista desktop a mobile; revisar navegación, legibilidad o interacciones táctiles; mejorar consistencia entre módulos. |
| **Cuándo NO cargar** | Cambios puramente de backend/DB sin impacto de interfaz; ajustes menores de texto sin impacto en layout o UX. |
| **Integración .codex** | Si se desbloquea patrón UI mobile reutilizable, registrar en `.codex/avances.md`. |

---

## Objetivo

Elevar la calidad de la interfaz mobile de NEXO AV con criterios profesionales de diseño, consistencia y usabilidad, adaptados al stack real del proyecto (React + TypeScript + Tailwind + shadcn/ui).

## Contexto técnico del proyecto

- Routing/layout responsive basado en `ResponsiveLayout` y `createResponsivePage`
- Versión mobile en `src/pages/nexo_av/mobile/`
- Tema NEXO AV con soporte light/dark y safe areas
- Navegación principal mobile con header superior + bottom navigation

---

## Principios de diseño (obligatorios)

1. **Claridad**: la información principal se entiende en 3 segundos.
2. **Jerarquía**: títulos, KPIs y acciones prioritarias destacan sin ruido visual.
3. **Coherencia**: mismo patrón para acciones, filtros, tablas/cards y formularios.
4. **Tacto primero**: controles cómodos para dedo, no para cursor.
5. **Acción rápida**: completar tareas frecuentes con el mínimo de pasos.

---

## Reglas visuales

### Espaciado y densidad

- Usar ritmo de espaciado constante (4/8/12/16/24).
- Evitar bloques de texto largos; fragmentar por secciones.
- Priorizar tarjetas compactas antes que tablas densas en mobile.

### Tipografía

- Títulos cortos y accionables.
- Cuerpo legible, sin tamaños demasiado pequeños.
- Limitar líneas de texto en listas/cards para evitar scroll excesivo.

### Color y contraste

- Mantener semántica consistente:
  - éxito → verde
  - advertencia → naranja
  - error → rojo
  - acción principal → azul
- Garantizar contraste suficiente en ambos temas (light/dark).

### Iconografía

- Preferir iconos Lucide.
- Mantener estilo minimal y consistente.
- No usar iconos decorativos sin función.

---

## Navegación mobile

- Mantener acciones globales en header/bottom nav.
- Acciones de contexto dentro de cada pantalla (toolbar local, menú overflow).
- Evitar profundidad excesiva de navegación.
- Incluir rutas de retorno claras (back / breadcrumb compacto cuando aplique).

---

## Componentes y patrones

### Listados

- Soportar: loading, vacío, error y contenido.
- Filtros y búsqueda visibles y simples.
- Paginación o carga incremental cuando haya volumen.

### Formularios

- Validación inline y mensajes claros.
- Orden de campos según frecuencia de uso.
- CTA principal siempre visible o fácil de encontrar.

### Diálogos y sheets

- Usar sheets/modales para acciones cortas.
- No mezclar demasiadas decisiones en un mismo diálogo.
- Confirmar acciones destructivas.

### KPI y dashboard

- KPI prioritarios en cards arriba.
- Tendencias/estado en una sola mirada.
- Evitar gráficos complejos sin contexto breve.

---

## Accesibilidad (obligatoria)

- Objetivos táctiles mínimos de **44px**.
- Estados de foco visibles para teclado/lectores.
- Etiquetas accesibles en botones/iconos.
- No depender solo del color para comunicar estado.

---

## Rendimiento mobile

- Evitar renderizados innecesarios en listas extensas.
- Lazy load en vistas pesadas cuando aplique.
- Minimizar re-renders por props/estado mal segmentado.
- No bloquear interacción principal por componentes secundarios.

---

## Paridad desktop-mobile

| Tipo | Descripción |
|------|-------------|
| **Paridad completa** | Misma capacidad de negocio. |
| **Paridad adaptada** | Mismo resultado con UX distinta. |
| **Fallback desktop** | Permitido temporalmente, debe quedar registrado. |

No sacrificar reglas de negocio por simplificar UI mobile.

---

## Checklist de calidad UI mobile

- [ ] La pantalla comunica objetivo principal de forma inmediata.
- [ ] CTA principal es claro y fácil de ejecutar.
- [ ] Hay estados loading/empty/error definidos.
- [ ] Interacciones táctiles cómodas (>=44px).
- [ ] Contraste correcto en light y dark.
- [ ] Navegación coherente con el resto del sistema.
- [ ] Sin texto innecesario ni ruido visual.
- [ ] Rendimiento aceptable en dispositivos medios.

---

## Formato de salida recomendado para revisiones

```markdown
## Mobile UI Review
- Pantalla/módulo: <ruta o nombre>
- Resultado: <OK / mejora recomendada / crítico>
- Hallazgos:
  1. <problema>
  2. <problema>
- Impacto UX: <bajo/medio/alto>
- Cambios propuestos:
  1. <acción concreta>
  2. <acción concreta>
- Verificación:
  - estados UI: <ok/fail>
  - accesibilidad: <ok/fail>
  - rendimiento: <ok/fail>
```

---

## Definition of Done

- La UI mobile queda alineada con estos estándares.
- Se mantiene consistencia con patrones del proyecto.
- No se introduce regresión funcional.
- Se documentan decisiones cuando haya excepciones de paridad.
