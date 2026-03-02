# Organizacion del Repositorio

## Objetivo

Mantener este repositorio preparado para convivir con varios productos sin mezclar:

- web publica corporativa
- plataforma interna NEXO AV
- futuras plataformas de la empresa

## Estructura actual recomendada

```text
src/
  app/
    routes/                 # Composicion del router por producto
  marketing/               # Dominio de la web publica
    components/
    pages/
  shared/                  # Capa comun preparada para reutilizacion
    ui/
    hooks/
    lib/
    integrations/
  components/
    ui/                    # UI compartida de bajo nivel
  pages/
    nexo_av/               # Plataforma NEXO AV
    presentations/         # Presentaciones publicas puntuales
  assets/
  hooks/
  integrations/
  lib/
```

## Reglas de organizacion

### 1. Organizar por producto antes que por tipo de archivo

Correcto:

- `src/marketing/...`
- `src/pages/nexo_av/...`

Evitar:

- mezclar componentes de marketing y ERP dentro de `src/components/`

### 2. `src/components/ui` es solo capa base

Esta carpeta debe contener unicamente:

- primitives de shadcn/Radix
- wrappers UI reutilizables
- piezas sin logica de dominio

No debe contener:

- secciones de la landing
- componentes de negocio de NEXO AV

### 3. Rutas separadas por dominio

`src/App.tsx` no debe crecer con listas largas de rutas.

Las rutas deben componerse desde:

- `src/app/routes/MarketingRoutes.tsx`
- `src/app/routes/NexoRoutes.tsx`

### 4. `docs/` debe clasificarse por finalidad

Convencion recomendada:

- `docs/architecture/`
- `docs/security/`
- `docs/sharepoint/`
- `docs/important/` solo para canon funcional vigente

### 5. `scripts/` debe clasificarse por dominio operativo

Convencion recomendada:

- `scripts/sharepoint/`
- `scripts/marketing/`
- `scripts/nexo/`
- `scripts/shared/`

## Backlog de organizacion pendiente

Pendiente de una fase posterior y con validacion funcional:

- mover fisicamente el codigo publico legacy desde `src/components/` a `src/marketing/`
- reducir archivos residuales `*-DESKTOP-*`
- limpiar migraciones temporales `temp_*.sql`
- separar mejor documentacion operativa frente a documentacion canonica

## Criterio para nuevas plataformas

Si entra una nueva plataforma de empresa, debe nacer ya como dominio propio:

```text
src/
  nueva-plataforma/
    components/
    pages/
    features/
```

No debe añadirse como mezcla ad hoc dentro de `src/components/` o `src/pages/` generales.
