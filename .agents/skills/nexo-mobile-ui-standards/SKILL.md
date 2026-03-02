---
name: nexo-mobile-ui-standards
description: Estandar de UI/UX mobile para NEXO AV en React + Tailwind, con reglas de consistencia visual, navegacion, accesibilidad, rendimiento y paridad con desktop.
---

# NEXO Mobile UI Standards

## Objetivo
Elevar la calidad de la interfaz mobile de NEXO AV con criterios profesionales de diseno, consistencia y usabilidad, adaptados al stack real del proyecto (React + TypeScript + Tailwind + shadcn/ui).

## Cuando usar esta skill
- Al crear o refactorizar pantallas mobile.
- Al convertir una vista desktop a version mobile.
- Al revisar navegacion, legibilidad o interacciones tactiles.
- Al mejorar consistencia visual entre modulos.

## Cuando NO usar esta skill
- Cambios puramente de backend/DB sin impacto de interfaz.
- Ajustes menores de texto sin impacto en layout o UX.

## Contexto tecnico del proyecto
- Routing/layout responsive basado en `ResponsiveLayout` y `createResponsivePage`.
- Version mobile en `src/pages/nexo_av/mobile/`.
- Tema NEXO AV con soporte light/dark y safe areas.
- Navegacion principal mobile con header superior + bottom navigation.

## Principios de diseno (obligatorios)
1. **Claridad**: la informacion principal se entiende en 3 segundos.
2. **Jerarquia**: titulos, KPIs y acciones prioritarias destacan sin ruido visual.
3. **Coherencia**: mismo patron para acciones, filtros, tablas/cards y formularios.
4. **Tacto primero**: controles comodos para dedo, no para cursor.
5. **Accion rapida**: completar tareas frecuentes con el minimo de pasos.

## Reglas visuales

### Espaciado y densidad
- Usar ritmo de espaciado constante (4/8/12/16/24).
- Evitar bloques de texto largos; fragmentar por secciones.
- Priorizar tarjetas compactas antes que tablas densas en mobile.

### Tipografia
- Titulos cortos y accionables.
- Cuerpo legible, sin tamanos demasiado pequenos.
- Limitar lineas de texto en listas/cards para evitar scroll excesivo.

### Color y contraste
- Mantener semantica consistente:
  - exito -> verde
  - advertencia -> naranja
  - error -> rojo
  - accion principal -> azul
- Garantizar contraste suficiente en ambos temas (light/dark).

### Iconografia
- Preferir iconos Lucide.
- Mantener estilo minimal y consistente.
- No usar iconos decorativos sin funcion.

## Navegacion mobile
- Mantener acciones globales en header/bottom nav.
- Acciones de contexto dentro de cada pantalla (toolbar local, menu overflow).
- Evitar profundidad excesiva de navegacion.
- Incluir rutas de retorno claras (back / breadcrumb compacto cuando aplique).

## Componentes y patrones

### Listados
- Soportar: loading, vacio, error y contenido.
- Filtros y busqueda visibles y simples.
- Paginacion o carga incremental cuando haya volumen.

### Formularios
- Validacion inline y mensajes claros.
- Orden de campos segun frecuencia de uso.
- CTA principal siempre visible o facil de encontrar.

### Dialogos y sheets
- Usar sheets/modales para acciones cortas.
- No mezclar demasiadas decisiones en un mismo dialogo.
- Confirmar acciones destructivas.

### KPI y dashboard
- KPI prioritarios en cards arriba.
- Tendencias/estado en una sola mirada.
- Evitar graficos complejos sin contexto breve.

## Accesibilidad (obligatoria)
- Objetivos tactiles minimos de 44px.
- Estados de foco visibles para teclado/lectores.
- Etiquetas accesibles en botones/iconos.
- No depender solo del color para comunicar estado.

## Rendimiento mobile
- Evitar renderizados innecesarios en listas extensas.
- Lazy load en vistas pesadas cuando aplique.
- Minimizar re-renders por props/estado mal segmentado.
- No bloquear interaccion principal por componentes secundarios.

## Paridad desktop-mobile
- Definir por funcionalidad:
  - **Paridad completa**: misma capacidad de negocio.
  - **Paridad adaptada**: mismo resultado con UX distinta.
  - **Fallback desktop**: permitido temporalmente, debe quedar registrado.
- No sacrificar reglas de negocio por simplificar UI mobile.

## Checklist de calidad UI mobile
- [ ] La pantalla comunica objetivo principal de forma inmediata.
- [ ] CTA principal es claro y facil de ejecutar.
- [ ] Hay estados loading/empty/error definidos.
- [ ] Interacciones tactiles comodas (>=44px).
- [ ] Contraste correcto en light y dark.
- [ ] Navegacion coherente con el resto del sistema.
- [ ] Sin texto innecesario ni ruido visual.
- [ ] Rendimiento aceptable en dispositivos medios.

## Formato de salida recomendado para revisiones
```markdown
## Mobile UI Review
- Pantalla/modulo: <ruta o nombre>
- Resultado: <OK / mejora recomendada / critico>
- Hallazgos:
  1. <problema>
  2. <problema>
- Impacto UX: <bajo/medio/alto>
- Cambios propuestos:
  1. <accion concreta>
  2. <accion concreta>
- Verificacion:
  - estados UI: <ok/fail>
  - accesibilidad: <ok/fail>
  - rendimiento: <ok/fail>
```

## Definition of Done
- La UI mobile queda alineada con estos estandares.
- Se mantiene consistencia con patrones del proyecto.
- No se introduce regresion funcional.
- Se documentan decisiones cuando haya excepciones de paridad.
