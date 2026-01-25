# 🔍 Análisis de Conflictos CSS - Inputs y Dropdowns

## 📋 Problema Identificado

Hay múltiples archivos CSS que están aplicando estilos a inputs y dropdowns, causando conflictos y problemas de ancho/expansión.

## 🎯 Archivos CSS que Afectan Inputs/Dropdowns

### 1. **global.css** (Líneas 690-712)
```css
body.nexo-av-theme input,
body.nexo-av-theme textarea,
body.nexo-av-theme select {
  background-color: hsl(var(--card)) !important;
  border: 1px solid hsl(var(--border)) !important;
  color: hsl(var(--foreground)) !important;
  font-size: 0.8125rem !important;
  border-radius: 6px !important;
  padding: 0.5rem 0.75rem !important;
}
```
**Problema:** Estilos globales con `!important` que sobrescriben estilos de componentes.

### 2. **search-bar.css** (Líneas 58-80)
```css
.search-bar__input {
  width: 100%;
  height: 32px !important;
  padding-left: 16px !important;
  padding-right: 16px !important;
  border-radius: 16px !important;
  /* ... muchos más !important */
}
```
**Problema:** Muchos `!important` que pueden afectar otros inputs si se aplican clases similares.

### 3. **document-editor.css** (Líneas 144-180)
```css
.document-lines-editor .line-row td.col-concept input,
.document-lines-editor .line-row td.col-description input {
  width: 100% !important;
  min-width: 0;
  box-sizing: border-box;
}
```
**Problema:** Estilos específicos con `!important` que pueden interferir.

### 4. **status-selector.css**
- Estilos para botones de selector que pueden afectar otros dropdowns
- `width: auto` y `min-width` fijos que pueden causar problemas

### 5. **DropDown.module.css**
- Estilos para dropdowns que pueden entrar en conflicto con SearchableDropdown

## 🔧 Soluciones Aplicadas

### ✅ Solución Implementada: Especificidad CSS Mejorada
Se han modificado los estilos globales en `global.css` para que sean más específicos y NO afecten a componentes de shadcn/ui ni componentes custom.

**Cambios realizados:**
- Estilos globales ahora usan `:not([class*="..."])` para excluir componentes con clases específicas
- Se agregaron `width: 100%`, `min-width: 0`, `max-width: 100%`, `box-sizing: border-box` a los estilos globales
- Se aplicó la misma lógica a los estilos responsive

**Archivos modificados:**
- ✅ `src/pages/nexo_av/desktop/styles/global.css` (líneas 690-712, 1452-1459, 2067-2074)

### Soluciones Adicionales Propuestas

### Solución 2: Refactorizar Estilos Globales (Futuro)
Eliminar o reducir el uso de `!important` en estilos globales y hacerlos más específicos usando clases específicas.

### Solución 3: Usar CSS Modules o Scoped Styles (Futuro)
Asegurar que los estilos de componentes estén encapsulados y no interfieran entre sí.

## 📝 Archivos a Revisar/Corregir

1. ✅ `src/pages/nexo_av/desktop/styles/global.css` - Estilos globales de inputs
2. ✅ `src/pages/nexo_av/desktop/styles/components/common/search-bar.css` - Reducir !important
3. ✅ `src/pages/nexo_av/desktop/styles/components/common/status-selector.css` - Ajustar width
4. ✅ `src/pages/nexo_av/desktop/styles/components/common/dropdown.css` - Verificar si existe
5. ✅ `src/pages/nexo_av/desktop/styles/components/documents/document-editor.css` - Especificar mejor

## 🎨 Componentes Afectados

- `Input` (shadcn/ui)
- `TextInput` (componente custom)
- `SearchableDropdown` (componente custom)
- `SearchBar` (componente custom)
- `StatusSelector` (componente custom)
- `InlineSelector` (en EditQuotePage)

## ⚠️ Nota Importante

Los archivos `SearchableDropdown.tsx` y `TextInput.tsx` aparecen como eliminados. Si fueron eliminados por Lovable, necesitamos verificar si hay componentes alternativos o si necesitamos restaurarlos.
