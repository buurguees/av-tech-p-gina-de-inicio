# Componentes Eliminados - Limpieza de Código

**Fecha:** 24 de enero de 2026  
**Razón:** Componentes no usados identificados durante la limpieza de código

---

## Componentes Eliminados de `src/pages/nexo_av/desktop/components`

### 1. `Header.tsx`
**Ubicación:** `src/pages/nexo_av/desktop/components/Header.tsx`  
**Razón:** Duplicado no usado. Existe un componente `Header` definido directamente en `NexoAvLayout.tsx` (líneas 49-87) que es el que realmente se usa.

### 2. `UserAvatarDropdown.tsx`
**Ubicación:** `src/pages/nexo_av/desktop/components/UserAvatarDropdown.tsx`  
**Razón:** No se importa ni se usa en ningún archivo del proyecto. La funcionalidad está implementada en `UserAvatar.tsx` que se usa en el layout.

### 3. `leadmap/LeadMapSidebar.tsx`
**Ubicación:** `src/pages/nexo_av/desktop/components/leadmap/LeadMapSidebar.tsx`  
**Razón:** Componente temporalmente deshabilitado (según comentario en el código). No se usa en `LeadMapPage.tsx`, que utiliza `CanvassingMapSidebar` en su lugar.

### 4. `leadmap/LeadDetailPanel.tsx`
**Ubicación:** `src/pages/nexo_av/desktop/components/leadmap/LeadDetailPanel.tsx`  
**Razón:** Componente temporalmente deshabilitado (según comentario en el código). No se usa en `LeadMapPage.tsx`, que utiliza `CanvassingDetailPanel` en su lugar.

### 5. `leadmap/LeadDetailMobileSheet.tsx`
**Ubicación:** `src/pages/nexo_av/desktop/components/leadmap/LeadDetailMobileSheet.tsx`  
**Razón:** Componente temporalmente deshabilitado (según comentario en el código). No se usa en ninguna página.

---

## Componentes Eliminados de `src/components`

### 6. `Services.tsx`
**Ubicación:** `src/components/Services.tsx`  
**Razón:** No se importa ni se usa en ningún archivo del proyecto.

### 7. `HowItWorks.tsx`
**Ubicación:** `src/components/HowItWorks.tsx`  
**Razón:** No se importa ni se usa en ningún archivo del proyecto.

### 8. `AddressAutocomplete.tsx`
**Ubicación:** `src/components/AddressAutocomplete.tsx`  
**Razón:** No se importa ni se usa en ningún archivo del proyecto.

### 9. `NavLink.tsx`
**Ubicación:** `src/components/NavLink.tsx`  
**Razón:** No se importa ni se usa en ningún archivo del proyecto. Se usa directamente `NavLink` de `react-router-dom`.

---

## Componentes que SÍ se usan (NO eliminados)

Los siguientes componentes de `src/components` **SÍ se usan** y **NO deben eliminarse**:

- `Header.tsx` - Usado en `src/pages/Index.tsx`
- `Footer.tsx` - Usado en `src/pages/Index.tsx`, `PrivacyPolicy.tsx`, `TermsAndConditions.tsx`
- `Hero.tsx` - Usado en `src/pages/Index.tsx`
- `LoadingScreen.tsx` - Usado en `src/pages/Index.tsx`
- `CookieConsent.tsx` - Usado en `src/pages/Index.tsx`
- `ContactFormDialog.tsx` - Usado en `src/components/sections/Productos.tsx`
- Componentes en `sections/` - Todos se usan en `src/pages/Index.tsx`

---

## Verificación Post-Eliminación

- ✅ Build compila correctamente sin errores
- ✅ No hay importaciones rotas
- ✅ Todos los componentes eliminados estaban realmente no usados

---

**Total de componentes eliminados:** 9
