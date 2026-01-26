# 📚 DOCUMENTACIÓN FRONTEND - NEXO AV

**Versión:** 2.0  
**Última actualización:** 2026-01-25  
**Mantenedores:** Equipo Frontend + AI Agents

---

## 📁 ESTRUCTURA DE LA DOCUMENTACIÓN

```
docs/frontend/
├── README.md                          ← Estás aquí (índice principal)
├── guias/                             ← Guías de desarrollo
│   ├── DESARROLLO_FRONTEND.md         ← 📘 Guía principal (LEER PRIMERO)
│   ├── EVITAR_CODIGO_HARDCODEADO.md   ← Anti-patterns y soluciones
│   └── INICIO_RAPIDO.txt              ← Quick start (5 min)
├── analisis/                          ← Análisis técnico del código
│   ├── INFORME_ERRORES_CSS.md         ← Análisis profundo de problemas
│   └── RESUMEN_ANALISIS.md            ← Resumen ejecutivo
└── referencia/                        ← Material de referencia
    ├── CORRECCIONES_APLICADAS.md      ← Historial de correcciones
    ├── TABLA_COMPARATIVA.md           ← Antes/después con ejemplos
    └── RESUMEN_CORRECCIONES.txt       ← Resumen visual ASCII
```

---

## 🚀 INICIO RÁPIDO

### Para Desarrolladores Nuevos

**1. Lee en este orden (30 min total):**
```
1️⃣ guias/INICIO_RAPIDO.txt              (5 min)  ← Reglas básicas
2️⃣ guias/DESARROLLO_FRONTEND.md         (20 min) ← Guía completa
3️⃣ guias/EVITAR_CODIGO_HARDCODEADO.md   (5 min)  ← Anti-patterns
```

**2. Ten a mano para referencia:**
```
📌 referencia/TABLA_COMPARATIVA.md      ← Ejemplos prácticos
📌 analisis/INFORME_ERRORES_CSS.md      ← Problemas comunes
```

### Para Tech Leads/Managers

**Lee:**
```
📊 analisis/RESUMEN_ANALISIS.md          ← Resumen ejecutivo
📊 analisis/INFORME_ERRORES_CSS.md       ← Análisis técnico completo
```

### Para AI Agents

**Referencias obligatorias en prompts:**
```
"Sigue las guías en docs/frontend/guias/DESARROLLO_FRONTEND.md"
"NO hagas lo documentado en docs/frontend/guias/EVITAR_CODIGO_HARDCODEADO.md"
```

---

## 📘 GUÍAS DE DESARROLLO

### 1. [DESARROLLO_FRONTEND.md](./guias/DESARROLLO_FRONTEND.md) ⭐ PRINCIPAL

**~1,200 líneas** - La guía definitiva del proyecto

**Contenido:**
- ✅ Arquitectura del proyecto
- ✅ Estándares de código (TypeScript, React, CSS)
- ✅ Sistema de estilos CSS
  - Variables CSS y design tokens
  - Clases semánticas vs selectores frágiles
  - Escalado responsivo con clamp()
- ✅ Componentes React
  - Anatomía de un componente ideal
  - Custom hooks
  - Props y tipado
- ✅ Estado y datos (fetching, loading states)
- ✅ Mejores prácticas (DO's y DON'Ts)
- ✅ Errores comunes a evitar
- ✅ Plan de refactorización (5 fases)
- ✅ Debugging y testing
- ✅ Checklist para Pull Requests

**Cuándo leer:** Antes de escribir cualquier código nuevo

---

### 2. [EVITAR_CODIGO_HARDCODEADO.md](./guias/EVITAR_CODIGO_HARDCODEADO.md)

**~180 líneas** - Anti-patterns y cómo evitarlos

**Contenido:**
- ❌ Qué NO hacer (con ejemplos)
- ✅ Soluciones correctas
- 🔧 Patrones de refactorización

**Cuándo leer:** Cuando vas a crear estilos CSS o componentes

---

### 3. [INICIO_RAPIDO.txt](./guias/INICIO_RAPIDO.txt)

**ASCII Art** - Resumen visual de reglas

**Contenido:**
- 🚫 Reglas de oro (nunca hacer)
- ✅ Reglas a seguir (siempre)
- 📋 Checklist rápido

**Cuándo leer:** Como recordatorio rápido (5 min)

---

## 🔍 ANÁLISIS TÉCNICO

### 1. [INFORME_ERRORES_CSS.md](./analisis/INFORME_ERRORES_CSS.md)

**~600 líneas** - Análisis profundo del código

**Contenido:**
- 📊 Métricas del código actual
  - 1,040 selectores frágiles
  - 2,178 usos de !important
  - 6 selectores [style*="..."]
- 🔴 7 errores críticos identificados
- 💡 Soluciones detalladas para cada error
- 📈 Plan de acción (3 fases)
- 🎯 Top 10 problemas más graves

**Cuándo leer:** 
- Para entender el estado del código
- Antes de planificar refactorización
- Para justificar cambios técnicos

---

### 2. [RESUMEN_ANALISIS.md](./analisis/RESUMEN_ANALISIS.md)

**~440 líneas** - Resumen ejecutivo

**Contenido:**
- 🎯 Trabajo realizado
- 📊 Métricas antes/después
- ✅ Correcciones implementadas
- 📋 Próximos pasos (Fase 2)
- 📚 Índice de documentos

**Cuándo leer:**
- Para status update rápido
- Para presentaciones a management
- Para planning de sprints

---

## 📖 MATERIAL DE REFERENCIA

### 1. [CORRECCIONES_APLICADAS.md](./referencia/CORRECCIONES_APLICADAS.md)

**Historial completo de correcciones implementadas**

**Contenido:**
- Sistema z-index
- Layout desktop
- Dropdowns position: fixed
- Tamaños responsivos
- Listeners scroll/resize
- Código antes/después

**Cuándo consultar:** Para ver qué ya está corregido

---

### 2. [TABLA_COMPARATIVA.md](./referencia/TABLA_COMPARATIVA.md)

**Ejemplos visuales de antes/después**

**Contenido:**
- 5 cambios principales con ejemplos
- Comparación lado a lado
- Explicación de beneficios
- Casos de uso corregidos

**Cuándo consultar:** Para ver ejemplos prácticos

---

### 3. [RESUMEN_CORRECCIONES.txt](./referencia/RESUMEN_CORRECCIONES.txt)

**ASCII Art** - Resumen visual

**Contenido:**
- Checklist de problemas resueltos
- Archivos modificados
- Código clave agregado

**Cuándo consultar:** Para referencia rápida

---

## 🎯 CASOS DE USO

### 📝 "Voy a crear un componente nuevo"

**Lee:**
1. `guias/DESARROLLO_FRONTEND.md` - Sección "Componentes React"
2. `guias/EVITAR_CODIGO_HARDCODEADO.md` - Todo

**Checklist:**
- [ ] Componente < 300 líneas
- [ ] Props bien tipadas con TypeScript
- [ ] Usa clases semánticas (NO [class*="..."])
- [ ] Usa variables CSS (NO valores hardcodeados)
- [ ] NO usa !important
- [ ] Sigue patrón de la guía

---

### 🎨 "Voy a escribir CSS"

**Lee:**
1. `guias/DESARROLLO_FRONTEND.md` - Sección "Sistema de Estilos CSS"
2. `referencia/TABLA_COMPARATIVA.md` - Ver ejemplos

**Checklist:**
- [ ] Usa clases semánticas (.component-name)
- [ ] Usa variables CSS (var(--variable))
- [ ] Usa clamp() para responsividad
- [ ] NO usa selectores frágiles [class*="..."]
- [ ] NO usa [style*="..."]
- [ ] Evita !important

---

### 🔧 "Voy a refactorizar código existente"

**Lee:**
1. `analisis/INFORME_ERRORES_CSS.md` - Identificar problemas
2. `referencia/TABLA_COMPARATIVA.md` - Ver cómo corregir
3. `guias/DESARROLLO_FRONTEND.md` - Sección "Plan de Refactorización"

**Checklist:**
- [ ] Identifica el tipo de problema
- [ ] Revisa solución en la guía
- [ ] Aplica el patrón correcto
- [ ] Testea en desktop y mobile
- [ ] Documenta el cambio

---

### 🤖 "Soy un AI Agent"

**Referencias obligatorias:**
```
"Crea [componente] siguiendo docs/frontend/guias/DESARROLLO_FRONTEND.md.
Importante:
- NO uses selectores [class*='...'] o [style*='...']
- Usa clases semánticas
- Usa variables CSS
- Evita !important
- Sigue ejemplos en docs/frontend/referencia/TABLA_COMPARATIVA.md"
```

---

### 👨‍💼 "Soy Tech Lead y necesito planificar"

**Lee:**
1. `analisis/RESUMEN_ANALISIS.md` - Estado actual
2. `analisis/INFORME_ERRORES_CSS.md` - Detalles técnicos

**Uso:**
- Ver métricas de calidad del código
- Priorizar tareas de refactorización
- Estimar esfuerzo (3 fases definidas)
- Justificar decisiones técnicas

---

## 🚫 REGLAS DE ORO (RESUMEN)

### ❌ NUNCA HACER

```css
/* ❌ Selectores frágiles */
body.theme [class*="flex-1"] { }
body.theme [style*="width"] { }

/* ❌ !important innecesario */
color: red !important;

/* ❌ Valores hardcodeados */
font-size: 14px;
z-index: 9999;
```

```tsx
/* ❌ Inline styles complejos */
<div style={{ width: '60%', height: 500 }}>
```

### ✅ SIEMPRE HACER

```css
/* ✅ Clases semánticas */
.component-name { }
.lead-map-container { }

/* ✅ Variables CSS */
color: hsl(var(--primary));
z-index: var(--z-dropdown);

/* ✅ clamp() para responsividad */
font-size: clamp(0.875rem, 1rem, 1.125rem);
```

```tsx
/* ✅ Clases CSS */
<div className="lead-map-view">
```

---

## 📊 ESTADO DEL PROYECTO

### Métricas Actuales (2026-01-25)

```
Índice de Calidad:  28/100 🔴 → Target: 80/100 🟢

Problemas:
  ❌ 1,040 selectores [class*="..."]  → Target: 50 (-95%)
  ❌ 2,178 usos de !important         → Target: 200 (-91%)
  ✅ 0 selectores [style*="..."]      → Target: 0 (RESUELTO)
```

### Progreso

```
┌──────────────────────────────────────────┐
│ PROGRESO GENERAL: 35% ████░░░░░░        │
├──────────────────────────────────────────┤
│ Fase 1 (Crítico):       100% ██████████ │
│ Corrección urgente:     100% ██████████ │
│ Documentación:          100% ██████████ │
│ Fase 2 (Alto):            0% ░░░░░░░░░░ │
│ Fase 3 (Refactoring):     0% ░░░░░░░░░░ │
└──────────────────────────────────────────┘
```

---

## 🔄 PRÓXIMOS PASOS

### Fase 2 (3-5 días)
- [ ] Refactorizar top 5 selectores frágiles
- [ ] Reducir !important en typography
- [ ] Reorganizar global.css

### Fase 3 (1-2 semanas)
- [ ] Eliminar todos los selectores frágiles
- [ ] Biblioteca de componentes
- [ ] Storybook + Tests

---

## 📞 AYUDA Y SOPORTE

### ¿Tienes dudas?

| Pregunta | Documento |
|----------|-----------|
| ¿Cómo creo un componente? | `guias/DESARROLLO_FRONTEND.md` |
| ¿Qué NO debo hacer? | `guias/EVITAR_CODIGO_HARDCODEADO.md` |
| ¿Cómo se hace correctamente? | `referencia/TABLA_COMPARATIVA.md` |
| ¿Qué problemas hay? | `analisis/INFORME_ERRORES_CSS.md` |
| ¿Qué se ha corregido? | `referencia/CORRECCIONES_APLICADAS.md` |

### Workflow recomendado

```
1. Lee guias/INICIO_RAPIDO.txt (5 min)
2. Lee guias/DESARROLLO_FRONTEND.md (20 min)
3. Comienza a codear siguiendo las guías
4. Consulta referencia/ cuando tengas dudas
5. Antes de PR, revisa checklist en guias/
```

---

## 🔗 RECURSOS EXTERNOS

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [BEM Methodology](https://getbem.com/)

---

## 📝 CHANGELOG

### 2026-01-25 (v2.0)
- ✅ Creada estructura de documentación
- ✅ Guía completa de desarrollo frontend
- ✅ Análisis profundo de errores CSS
- ✅ Plan de refactorización definido
- ✅ Eliminados selectores [style*="..."]
- ✅ Documentación organizada en carpetas

### 2026-01-24 (v1.0)
- ✅ Sistema z-index
- ✅ Layout desktop corregido
- ✅ Dropdowns position: fixed
- ✅ Tamaños responsivos

---

## 🎉 CONCLUSIÓN

Esta documentación es un **recurso vivo** que debe:
- ✅ Consultarse antes de escribir código
- ✅ Seguirse estrictamente
- ✅ Actualizarse con nuevos aprendizajes
- ✅ Compartirse con todo el equipo

**Objetivo:** Código mantenible, escalable y de alta calidad.

**¡Feliz coding! 🚀**

---

**Última actualización:** 2026-01-25  
**Versión:** 2.0  
**Mantenedores:** Equipo Frontend + AI Agents
