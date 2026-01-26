# 📘 GUÍA COMPLETA DE DESARROLLO FRONTEND - NEXO AV

**Versión:** 2.0  
**Fecha:** 2026-01-25  
**Mantenedores:** Equipo Frontend + AI Agents  
**Stack:** React + TypeScript + Tailwind CSS + Supabase

---

## 📋 TABLA DE CONTENIDOS

1. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
2. [Estándares de Código](#estándares-de-código)
3. [Sistema de Estilos CSS](#sistema-de-estilos-css)
4. [Componentes React](#componentes-react)
5. [Estado y Datos](#estado-y-datos)
6. [Mejores Prácticas](#mejores-prácticas)
7. [Errores Comunes a Evitar](#errores-comunes-a-evitar)
8. [Plan de Refactorización](#plan-de-refactorización)
9. [Debugging y Testing](#debugging-y-testing)
10. [Checklist para Pull Requests](#checklist-para-pull-requests)

---

## 1. ARQUITECTURA DEL PROYECTO

### 📂 Estructura de Directorios

```
src/pages/nexo_av/desktop/
├── components/              # Componentes reutilizables
│   ├── common/             # Componentes comunes (dropdowns, inputs, etc.)
│   ├── layout/             # Layout components (header, sidebar)
│   ├── projects/           # Componentes específicos de proyectos
│   ├── clients/            # Componentes específicos de clientes
│   ├── leads/              # Componentes específicos de leads
│   └── ...                 # Otros módulos
├── pages/                  # Páginas completas
│   ├── projects/           # Páginas de proyectos
│   ├── clients/            # Páginas de clientes
│   ├── leads/              # Páginas de leads
│   └── ...
├── styles/                 # Estilos CSS organizados
│   ├── global.css          # Estilos globales y variables
│   ├── components/         # Estilos por componente
│   │   ├── common/         # Estilos de componentes comunes
│   │   ├── layout/         # Estilos de layout
│   │   ├── pages/          # Estilos específicos de páginas
│   │   └── ...
│   └── index.css           # Entry point de estilos
├── hooks/                  # Custom React hooks
├── utils/                  # Utilidades y helpers
└── types/                  # TypeScript types
```

### 🏗️ Principios de Arquitectura

#### **Separación de Responsabilidades**
```typescript
// ❌ MAL: Componente hace demasiado
export function ProjectPage() {
  const [data, setData] = useState([]);
  // Fetch data
  // Business logic
  // UI rendering
  // Error handling
  // ...todo en un componente
}

// ✅ BIEN: Separación clara
export function ProjectPage() {
  const { projects, loading, error } = useProjects();
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  return <ProjectList projects={projects} />;
}
```

#### **Composición sobre Herencia**
```typescript
// ✅ Componer componentes pequeños
<DataList
  columns={columns}
  data={data}
  onRowClick={handleRowClick}
  renderActions={(row) => <RowActions row={row} />}
/>
```

---

## 2. ESTÁNDARES DE CÓDIGO

### 🎯 Naming Conventions

#### **Archivos**
```
PascalCase para componentes:
  - ProjectDetailPage.tsx
  - UserAvatarDropdown.tsx
  - SearchableDropdown.tsx

kebab-case para CSS:
  - dropdown.css
  - data-list.css
  - detail-pages.css

camelCase para hooks/utils:
  - useProjects.ts
  - formatCurrency.ts
```

#### **Variables y Funciones**
```typescript
// ✅ BIEN: Nombres descriptivos
const isUserAuthenticated = checkAuth();
const handleProjectSubmit = () => {};
const fetchProjectData = async (id: string) => {};

// ❌ MAL: Nombres crípticos
const x = checkAuth();
const h = () => {};
const f = async (i: string) => {};
```

#### **Componentes**
```typescript
// ✅ BIEN: Nombres descriptivos y específicos
<UserAvatarDropdown />
<ProjectDetailHeader />
<ClientContactForm />

// ❌ MAL: Nombres genéricos o confusos
<Dropdown1 />
<Header2 />
<Form />
```

### 📝 TypeScript Best Practices

#### **Tipado Estricto**
```typescript
// ✅ BIEN: Interfaces claras
interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  client: Client;
  created_at: string;
}

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
}

// ❌ MAL: any o tipos débiles
interface ProjectCardProps {
  project: any;  // ❌ Nunca usar 'any'
  onEdit?: Function;  // ❌ Demasiado genérico
}
```

#### **Tipos de Props**
```typescript
// ✅ BIEN: Props bien tipadas con valores por defecto
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children
}: ButtonProps) {
  // ...
}
```

---

## 3. SISTEMA DE ESTILOS CSS

### 🎨 Variables CSS (Design Tokens)

#### **Sistema de Colores y Temas en Nexo AV**

**⚠️ CRÍTICO:** Nexo AV usa una clase en el `<body>` para controlar el tema:
- `.nexo-av-theme` → Light theme
- `.nexo-av-theme-dark` → Dark theme

**Regla de oro:**
```
El archivo global.css es el ÚNICO lugar donde se definen colores base.
Los componentes SIEMPRE consumen variables CSS, NUNCA colores directos.
```

```css
/* ✅ BIEN: Definir en global.css */
:root {
  /* Colores base - Light theme */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  
  /* Layout */
  --header-height: 3.25rem;
  --sidebar-width: 14rem;
  
  /* Z-index system */
  --z-base: 1;
  --z-sidebar: 50;
  --z-header: 100;
  --z-dropdown: 1000;
  --z-modal: 1001;
  --z-notification: 1002;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

/* Dark theme - Sobrescribe colores */
body.nexo-av-theme-dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  /* ...resto de colores dark */
}

/* ❌ MAL: Valores hardcodeados */
.component {
  background: #ffffff;  /* ❌ */
  z-index: 9999;        /* ❌ */
  padding: 16px;        /* ❌ */
}

/* ✅ BIEN: Usar variables */
.component {
  background: hsl(var(--background));
  z-index: var(--z-dropdown);
  padding: var(--spacing-md);
}
```

### 📐 Clases Semánticas vs Selectores Frágiles

#### **❌ PROBLEMA CRÍTICO EN NEXO AV: Selectores de Atributo [class*="..."]**

**El problema más grave encontrado: 1,040 selectores frágiles**

```css
/* ❌ MUY MAL: Intentando "arreglar" Tailwind desde CSS global */
body.nexo-av-theme [class*="hover:bg-white/10"] {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

body.nexo-av-theme [class*="flex-1"][class*="flex"][class*="gap-4"] {
  width: 100% !important;
}

body.nexo-av-theme [style*="width: '60%'"] {
  width: 60% !important;
}

body.nexo-av-theme [class*="LeadMap"] {
  height: 100% !important;
}
```

**Por qué es catastrófico:**
1. ❌ Si cambias `flex-1` por `flex-auto`, el CSS no aplica
2. ❌ Si cambias `gap-4` por `gap-6`, el CSS no aplica
3. ❌ Si cambias la estructura HTML, todo se rompe
4. ❌ Imposible de mantener (1,040 selectores así en el proyecto)
5. ❌ Rendimiento pésimo (búsqueda de texto en cada clase)
6. ❌ Estás "peleando" contra Tailwind en lugar de usarlo

**⚠️ REGLA DE ORO:**
```
NO intentes "arreglar" clases de Tailwind desde el CSS global.
Si un componente necesita estilos específicos, usa una clase semántica.
```

#### **✅ SOLUCIÓN: Clases Semánticas + CSS Modules (cuando sea necesario)**

**Opción 1: Clases semánticas en CSS global (para layouts compartidos)**
```css
/* ✅ BIEN: Clases semánticas en archivo CSS específico */
/* lead-map.css */
.lead-map-container {
  display: flex;
  gap: 1rem;
  width: 100%;
  height: 100%;
}

.lead-map-view {
  flex: 0 0 60%;
  width: 60%;
  min-height: 500px;
}

.lead-map-sidebar {
  flex: 0 0 40%;
  width: 40%;
  overflow-y: auto;
}

/* Respeta las variables del tema */
body.nexo-av-theme .lead-map-sidebar {
  background: hsl(var(--card));
  border-left: 1px solid hsl(var(--border));
}

body.nexo-av-theme-dark .lead-map-sidebar {
  background: hsl(var(--card));
  border-left: 1px solid hsl(var(--border));
}
```

**Opción 2: CSS Modules (para componentes aislados)**
```css
/* Button.module.css */
.button {
  padding: clamp(0.5rem, 0.625rem, 0.75rem) clamp(0.75rem, 1rem, 1.25rem);
  border-radius: clamp(0.375rem, 0.5rem, 0.625rem);
  font-size: clamp(0.8125rem, 0.9375rem, 1.0625rem);
  background: hsl(var(--primary)); /* ← Usa variable del tema */
  color: hsl(var(--primary-foreground));
}

.button:hover {
  background: hsl(var(--primary) / 0.9); /* ← NO hardcodees el hover */
}
```

**En React:**
```typescript
// ✅ BIEN: Usar clases semánticas
<div className="lead-map-container">
  <div className="lead-map-view">
    <LeafletMap />
  </div>
  <div className="lead-map-sidebar">
    <LeadMapSidebar />
  </div>
</div>

// ✅ BIEN: CSS Module para componente específico
import styles from './Button.module.css';

<button className={styles.button}>
  Click me
</button>

// ❌ MAL: Depender solo de Tailwind para layout complejo
<div className="flex-1 flex gap-4">
  <div style={{ width: '60%' }}>
    <LeafletMap />
  </div>
  <div style={{ width: '40%' }}>
    <LeadMapSidebar />
  </div>
</div>

// ❌ MUY MAL: Intentar "arreglar" Tailwind desde CSS
/* En global.css */
[class*="hover:bg-white/10"] { /* NO HAGAS ESTO */
  background: rgba(255, 255, 255, 0.1) !important;
}
```

**Instrucción específica para Nexo AV:**
```
Sustituye TODOS los selectores [class*="..."] por:
1. Clases semánticas en archivos CSS específicos, O
2. CSS Modules si el componente es autónomo

NO intentes "arreglar" Tailwind desde el CSS global.
Si un componente necesita un hover específico, defínelo en su propio CSS.
```

### 🔴 PROBLEMA CRÍTICO: Dropdowns y Stacking Context

#### **El problema de los Dropdowns cortados en Nexo AV**

**Síntoma:** Los dropdowns no se abren, se cortan, o aparecen detrás de otros elementos.

**Causa raíz:** Contexto de apilamiento (Stacking Context) creado por:
- `overflow: hidden` o `overflow: auto` en contenedor padre
- `position: relative` + `z-index` en padre
- `transform`, `filter`, `opacity` en padre

```css
/* ❌ PROBLEMA: Contenedor con overflow corta el dropdown */
.data-list__body {
  overflow-y: auto; /* ← Crea stacking context */
}

.dropdown__menu {
  position: absolute; /* ← Se corta por el overflow del padre */
  z-index: 9999; /* ← Inútil si el padre tiene overflow */
}
```

**Ejemplo visual del problema:**
```
┌─ Contenedor (overflow: auto) ────┐
│                                   │
│  ┌─ Trigger ─┐                    │
│  └───────────┘                    │
│  ┌─ Dropdown ─┐                   │ ← Se corta aquí
└──┴─────────────┴───────────────────┘
   └─ (invisible)
```

#### **✅ SOLUCIONES para Dropdowns**

**Solución 1: position: fixed (Recomendado)**
```css
/* ✅ BIEN: fixed escapa del stacking context */
.dropdown__menu {
  position: fixed; /* ← Escapa del overflow del padre */
  z-index: var(--z-dropdown, 1000);
  /* top y left se calculan con JavaScript */
}
```

```typescript
// Calcular posición con getBoundingClientRect()
const updatePosition = useCallback(() => {
  if (!triggerRef.current) return;
  const rect = triggerRef.current.getBoundingClientRect();
  setDropdownPosition({
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width,
  });
}, []);
```

**Solución 2: React Portal (Más robusto)**
```typescript
import { createPortal } from 'react-dom';

export function Dropdown({ children, isOpen }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, [isOpen]);
  
  return (
    <>
      <button ref={triggerRef}>
        {children}
      </button>
      
      {isOpen && createPortal(
        <div 
          className="dropdown__menu"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 'var(--z-dropdown)',
          }}
        >
          {/* Contenido del dropdown */}
        </div>,
        document.body // ← Renderiza fuera del árbol DOM
      )}
    </>
  );
}
```

**Solución 3: Listeners para scroll/resize**
```typescript
// Actualizar posición cuando el usuario hace scroll
useEffect(() => {
  if (!isOpen) return;

  const handleScroll = () => updatePosition();
  const handleResize = () => updatePosition();

  // Capture true para capturar scroll en cualquier contenedor
  window.addEventListener('scroll', handleScroll, true);
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('scroll', handleScroll, true);
    window.removeEventListener('resize', handleResize);
  };
}, [isOpen, updatePosition]);
```

#### **⚠️ REGLA ESPECÍFICA PARA NEXO AV:**

```
Para componentes de Dropdown, Popover, Tooltip:

1. Detecta si el padre tiene overflow: hidden/auto
2. Si SÍ → Usa position: fixed + createPortal()
3. Si NO → Puedes usar position: absolute

SIEMPRE agrega listeners de scroll/resize si usas position: fixed.
```

**Checklist para Dropdowns:**
- [ ] ¿Usa `position: fixed` o `createPortal()`?
- [ ] ¿Calcula posición con `getBoundingClientRect()`?
- [ ] ¿Tiene listeners de scroll/resize?
- [ ] ¿Usa `z-index: var(--z-dropdown)`?
- [ ] ¿Se cierra al hacer click fuera?
- [ ] ¿Se cierra con Escape?

---

### 🚫 Evitar !important

#### **Problema: Uso Excesivo de !important**
```
Encontrados en el proyecto: 2,178 usos de !important
```

#### **❌ MAL: !important en Cascada**
```css
.button {
  background: blue !important;
}

.button-primary {
  background: red !important;  /* Tiene que usar !important para sobrescribir */
}

.button-primary-large {
  background: green !important;  /* Más !important... */
}
```

#### **✅ BIEN: Especificidad Natural**
```css
/* Base */
.button {
  background: hsl(var(--secondary));
}

/* Variante */
.button--primary {
  background: hsl(var(--primary));
}

/* Combinación */
.button--primary.button--large {
  background: hsl(var(--primary));
  padding: 1rem 2rem;
}
```

### 📏 Escalado Responsivo con clamp()

#### **✅ BIEN: Usar clamp() para Valores Escalables**
```css
/* Tipografía responsiva */
.heading-1 {
  font-size: clamp(1.5rem, 2vw, 2.5rem);
}

.heading-2 {
  font-size: clamp(1.25rem, 1.5vw, 1.875rem);
}

.body-text {
  font-size: clamp(0.875rem, 1vw, 1rem);
}

/* Spacing responsivo */
.container {
  padding: clamp(1rem, 2vw, 2rem);
  gap: clamp(0.5rem, 1vw, 1.5rem);
}

/* Dimensiones responsivas */
.card {
  width: clamp(280px, 90%, 400px);
  min-height: clamp(200px, 40vh, 400px);
}
```

#### **❌ MAL: Valores Fijos**
```css
.heading-1 {
  font-size: 32px;  /* ❌ No escala */
}

.container {
  padding: 24px;  /* ❌ Fijo */
}
```

---

## 4. COMPONENTES REACT

### 🧩 Anatomía de un Componente Ideal

```typescript
/**
 * ProjectCard - Muestra información resumida de un proyecto
 * 
 * @param project - Datos del proyecto
 * @param onEdit - Callback al editar
 * @param onDelete - Callback al eliminar
 */

import { useState } from 'react';
import { Project } from '@/types/project';
import { Badge } from '@/components/ui/badge';
import { MoreOptionsDropdown } from '@/components/common/MoreOptionsDropdown';

// 1. Interfaces al inicio
interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

// 2. Constantes fuera del componente
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
} as const;

// 3. Componente principal
export function ProjectCard({
  project,
  onEdit,
  onDelete,
  className = ''
}: ProjectCardProps) {
  
  // 4. Hooks al inicio
  const [isLoading, setIsLoading] = useState(false);
  
  // 5. Handlers
  const handleEdit = () => {
    if (onEdit) onEdit(project);
  };
  
  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsLoading(true);
    try {
      await onDelete(project.id);
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 6. Valores derivados
  const statusColor = STATUS_COLORS[project.status];
  
  // 7. Render
  return (
    <div className={`project-card ${className}`}>
      <div className="project-card__header">
        <h3 className="project-card__title">{project.name}</h3>
        <MoreOptionsDropdown
          actions={[
            { label: 'Editar', onClick: handleEdit },
            { label: 'Eliminar', onClick: handleDelete, variant: 'destructive' }
          ]}
        />
      </div>
      
      <div className="project-card__body">
        <Badge className={statusColor}>
          {project.status}
        </Badge>
        <p className="project-card__client">{project.client.name}</p>
      </div>
      
      {isLoading && <LoadingOverlay />}
    </div>
  );
}

// 8. Sub-componentes privados al final (si hay)
function LoadingOverlay() {
  return (
    <div className="project-card__loading">
      <Spinner />
    </div>
  );
}
```

### 🎣 Custom Hooks

#### **Estructura de un Hook**
```typescript
/**
 * useProjects - Hook para gestionar proyectos
 * 
 * @param filters - Filtros opcionales
 * @returns Estado y funciones de proyectos
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/project';

interface UseProjectsFilters {
  status?: string;
  clientId?: string;
}

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export function useProjects(filters?: UseProjectsFilters): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('projects')
        .select('*, client:clients(*)');
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setProjects(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const createProject = async (data: Partial<Project>): Promise<Project> => {
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert([data])
      .select()
      .single();
    
    if (error) throw error;
    
    await fetchProjects();
    return newProject;
  };
  
  const updateProject = async (id: string, data: Partial<Project>) => {
    const { error } = await supabase
      .from('projects')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    
    await fetchProjects();
  };
  
  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    await fetchProjects();
  };
  
  useEffect(() => {
    fetchProjects();
  }, [filters?.status, filters?.clientId]);
  
  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject
  };
}
```

#### **Uso del Hook**
```typescript
function ProjectListPage() {
  const { projects, loading, error, deleteProject } = useProjects({ 
    status: 'active' 
  });
  
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  
  return (
    <ProjectList 
      projects={projects}
      onDelete={deleteProject}
    />
  );
}
```

---

## 5. ESTADO Y DATOS

### 📊 Gestión de Estado

#### **Estado Local vs Global**
```typescript
// ✅ Estado local para UI
function SearchBar() {
  const [query, setQuery] = useState('');  // ✅ Local
  const [isFocused, setIsFocused] = useState(false);  // ✅ Local
  
  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}

// ✅ Estado global para datos compartidos
// Usar Context API o Zustand para:
// - Usuario autenticado
// - Configuración de tema
// - Datos compartidos entre páginas
```

### 🔄 Fetching de Datos

#### **Patrón de Loading/Error/Success**
```typescript
// ✅ BIEN: Manejo completo de estados
function ProjectList() {
  const { projects, loading, error } = useProjects();
  
  if (loading) {
    return (
      <div className="loading-state">
        <Spinner />
        <p>Cargando proyectos...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <ErrorState 
        error={error}
        onRetry={() => refetch()}
      />
    );
  }
  
  if (projects.length === 0) {
    return (
      <EmptyState 
        message="No hay proyectos"
        action={<CreateProjectButton />}
      />
    );
  }
  
  return (
    <div className="project-grid">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

---

## 6. MEJORES PRÁCTICAS

### ✅ DO's (Hacer)

#### **1. Componentes Pequeños y Enfocados**
```typescript
// ✅ Un componente, una responsabilidad
function UserAvatar({ user }) {
  return (
    <img 
      src={user.avatar_url} 
      alt={user.name}
      className="user-avatar"
    />
  );
}

function UserName({ user }) {
  return <span className="user-name">{user.name}</span>;
}

function UserProfile({ user }) {
  return (
    <div className="user-profile">
      <UserAvatar user={user} />
      <UserName user={user} />
    </div>
  );
}
```

#### **2. Props Descriptivas**
```typescript
// ✅ Props claras y específicas
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'destructive';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

#### **3. Composición**
```typescript
// ✅ Componentes componibles
<Dialog>
  <DialogTrigger>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
    </DialogHeader>
    <DialogBody>
      Contenido
    </DialogBody>
  </DialogContent>
</Dialog>
```

#### **4. Memoización Inteligente**
```typescript
// ✅ Memoizar callbacks costosos
const handleSubmit = useCallback(async (data) => {
  await saveData(data);
}, []);

// ✅ Memoizar valores derivados pesados
const filteredProjects = useMemo(() => {
  return projects.filter(p => p.status === 'active');
}, [projects]);
```

#### **5. Error Boundaries**
```typescript
// ✅ Capturar errores de componentes
<ErrorBoundary fallback={<ErrorScreen />}>
  <ProjectDetailPage />
</ErrorBoundary>
```

### ❌ DON'Ts (No Hacer)

#### **1. No Inline Styles con Lógica Compleja**
```typescript
// ❌ MAL
<div style={{ 
  width: isSmall ? '40%' : isMedium ? '60%' : '80%',
  height: isSmall ? 300 : isMedium ? 500 : 700 
}}>

// ✅ BIEN: Usar clases o CSS
<div className={cn(
  'responsive-container',
  isSmall && 'responsive-container--sm',
  isMedium && 'responsive-container--md'
)}>
```

#### **2. No Selectores CSS Frágiles**
```css
/* ❌ MAL */
div[class*="flex"] > div[class*="gap"] {
  width: 100%;
}

/* ✅ BIEN */
.container {
  width: 100%;
}
```

#### **3. No Prop Drilling Excesivo**
```typescript
// ❌ MAL: Prop drilling
<App>
  <Layout user={user}>
    <Page user={user}>
      <Component user={user}>
        <Child user={user} />

// ✅ BIEN: Context API
const UserContext = createContext();

<UserProvider value={user}>
  <App>
    <Layout>
      <Page>
        <Component>
          <Child />  {/* useContext(UserContext) */}
```

#### **4. No Lógica en Render**
```typescript
// ❌ MAL
function Component() {
  return (
    <div>
      {projects.filter(p => p.status === 'active')
               .map(p => <Card key={p.id} project={p} />)}
    </div>
  );
}

// ✅ BIEN
function Component() {
  const activeProjects = useMemo(() => 
    projects.filter(p => p.status === 'active'),
    [projects]
  );
  
  return (
    <div>
      {activeProjects.map(p => <Card key={p.id} project={p} />)}
    </div>
  );
}
```

---

## 7. ERRORES COMUNES A EVITAR

### 🐛 Errores Identificados en el Proyecto Actual

#### **ERROR #1: Selectores [class*="..."]**
```
❌ Encontrados: 1,040 selectores
📄 Archivos afectados: 9
🔥 Criticidad: ALTA
```

**Problema:**
```css
body.nexo-av-theme [class*="flex-1"][class*="flex"][class*="gap-4"] {
  width: 100% !important;
}
```

**Solución:**
```css
/* Crear clase semántica */
.layout-container {
  display: flex;
  gap: 1rem;
  flex: 1;
  width: 100%;
}
```

```tsx
// En React
<div className="layout-container">
```

#### **ERROR #2: Uso Excesivo de !important**
```
❌ Encontrados: 2,178 usos
📄 Archivos afectados: 29
🔥 Criticidad: ALTA
```

**Problema:**
```css
.button {
  background: blue !important;
  color: white !important;
  padding: 10px !important;
}
```

**Solución:**
```css
/* Usar especificidad natural */
body.nexo-av-theme .button {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  padding: clamp(0.5rem, 0.625rem, 0.75rem);
}
```

#### **ERROR #3: Selectores con [style*="..."]**
```
❌ Encontrados: 6 selectores
📄 Archivo: detail-pages.css
🔥 Criticidad: CRÍTICA
```

**Problema:**
```css
body.nexo-av-theme [style*="width: '60%'"] {
  width: 60% !important;
}
```

**Solución:**
```tsx
// Eliminar inline styles y usar clases
// ANTES
<div style={{ width: '60%' }}>

// DESPUÉS
<div className="lead-map-view">

// CSS
.lead-map-view {
  flex: 0 0 60%;
  width: 60%;
}
```

#### **ERROR #4: Hardcoding de Valores**
```
❌ Muchos valores hardcodeados
🔥 Criticidad: MEDIA
```

**Problema:**
```css
.component {
  font-size: 11px;
  padding: 16px;
  z-index: 9999;
}
```

**Solución:**
```css
.component {
  font-size: clamp(0.625rem, 0.6875rem, 0.75rem);
  padding: var(--spacing-md);
  z-index: var(--z-dropdown);
}
```

---

## 8. PLAN DE REFACTORIZACIÓN

### 📋 Fases de Mejora

#### **FASE 1: Emergencias (Completado ✅)**
- ✅ Sistema de z-index
- ✅ Layout desktop
- ✅ Dropdowns position: fixed
- ✅ clamp() en data-list
- ✅ Listeners scroll/resize

#### **FASE 2: Crítico (Próxima)**
- [ ] Eliminar selectores [style*="..."]
- [ ] Crear clases semánticas para detail-pages
- [ ] Refactorizar LeadMapPage a clases semánticas

#### **FASE 3: Alto**
- [ ] Reducir !important en global.css
- [ ] Refactorizar selectores [class*="..."] más usados
- [ ] Estandarizar sistema de spacing

#### **FASE 4: Medio**
- [ ] Migrar todos los componentes a clases semánticas
- [ ] Crear biblioteca de componentes documentada
- [ ] Unificar sistema de colores

#### **FASE 5: Mejoras**
- [ ] Implementar Storybook
- [ ] Tests unitarios para componentes críticos
- [ ] Performance optimization

### 🎯 Template de Refactorización

```markdown
## Refactoring: [Nombre del Componente/Página]

### Estado Actual
- **Problemas identificados:**
  - [ ] Selectores frágiles
  - [ ] Uso excesivo de !important
  - [ ] Valores hardcodeados

### Cambios Propuestos
1. Crear clases semánticas en [archivo.css]
2. Actualizar componente React para usar nuevas clases
3. Remover selectores frágiles

### Testing
- [ ] Verificar layout en desktop
- [ ] Verificar layout en mobile
- [ ] Verificar interacciones
- [ ] Verificar en ambos temas (light/dark)

### Documentación
- [ ] Actualizar documentación de componente
- [ ] Agregar ejemplos de uso
- [ ] Actualizar esta guía si es necesario
```

---

## 9. DEBUGGING Y TESTING

### 🔍 Debugging CSS

#### **Herramientas**
```css
/* Agregar temporalmente para debuggear layout */
* {
  outline: 1px solid red !important;
}

.container > * {
  outline: 1px solid blue !important;
}
```

#### **Chrome DevTools**
```
1. Inspector de elementos
2. Computed tab → Ver estilos aplicados
3. Layout tab → Ver box model
4. Debugger de CSS Grid/Flexbox
```

### 🧪 Testing de Componentes

#### **Checklist de Testing Manual**
```markdown
## Componente: [Nombre]

### Funcionalidad
- [ ] Renderiza correctamente
- [ ] Props funcionan como esperado
- [ ] Interacciones funcionan (clicks, hover, etc.)
- [ ] Estados loading/error/success funcionan

### Responsive
- [ ] Desktop (>= 1024px)
- [ ] Tablet (768px - 1023px)
- [ ] Mobile (< 768px)

### Temas
- [ ] Light theme
- [ ] Dark theme

### Accesibilidad
- [ ] Navegación con teclado
- [ ] Screen reader friendly
- [ ] Contraste suficiente

### Performance
- [ ] No re-renders innecesarios
- [ ] Carga rápida
- [ ] No memory leaks
```

---

## 10. CHECKLIST PARA PULL REQUESTS

### ✅ Antes de Crear un PR

#### **Código**
- [ ] El código sigue los estándares de esta guía
- [ ] No hay errores de linter
- [ ] No hay warnings de TypeScript
- [ ] No hay console.logs olvidados
- [ ] Las funciones tienen JSDoc comments

#### **CSS**
- [ ] No se agregaron nuevos selectores [class*="..."]
- [ ] No se agregaron nuevos [style*="..."]
- [ ] Se minimizó el uso de !important
- [ ] Se usaron variables CSS cuando es posible
- [ ] Se usó clamp() para valores escalables

#### **Componentes**
- [ ] Props están bien tipadas
- [ ] Nombres descriptivos
- [ ] Componentes pequeños y enfocados
- [ ] No hay prop drilling excesivo

#### **Testing**
- [ ] Probado en Chrome
- [ ] Probado en Firefox
- [ ] Probado en Safari (si es posible)
- [ ] Probado en desktop y mobile
- [ ] Probado en ambos temas

#### **Documentación**
- [ ] Actualizada documentación si es necesario
- [ ] Agregados comentarios donde es necesario
- [ ] README actualizado si hay cambios en setup

### 📝 Template de PR

```markdown
## Descripción
[Descripción clara de los cambios]

## Tipo de Cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Refactorización
- [ ] Actualización de documentación

## Cambios Realizados
- [Cambio 1]
- [Cambio 2]

## Screenshots (si aplica)
[Agregar screenshots]

## Testing
- [ ] Probado en desktop
- [ ] Probado en mobile
- [ ] Probado en ambos temas

## Checklist
- [ ] Código sigue la guía de estilos
- [ ] No hay errores de linter
- [ ] Documentación actualizada
```

---

## 📚 RECURSOS ADICIONALES

### 🔗 Links Útiles
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)

### 📖 Documentos del Proyecto
- `GUIA_EVITAR_CODIGO_HARDCODEADO.md` - Guía anti-hardcoding
- `CORRECCIONES_CSS_APLICADAS.md` - Últimas correcciones CSS
- `TABLA_COMPARATIVA_CAMBIOS.md` - Antes/después de cambios

### 🎓 Convenciones Específicas del Proyecto
- Usar `clamp()` para valores responsivos
- Usar variables CSS para colores y espaciado
- Crear clases semánticas en lugar de selectores frágiles
- Evitar !important a toda costa
- Componentes deben ser < 300 líneas

---

## 🆘 AYUDA Y SOPORTE

### ❓ ¿Dónde Preguntar?
1. Revisa esta guía primero
2. Busca en documentos existentes
3. Pregunta al equipo frontend
4. Crea un issue en el repositorio

### 🤖 Trabajando con AI Agents

#### **Prompts Efectivos**
```
✅ BIEN: "Crea un componente ProjectCard que siga la guía de 
desarrollo frontend (docs/frontend/guias/DESARROLLO_FRONTEND.md). 
Debe aceptar un proyecto como prop y tener acciones de editar/eliminar."

❌ MAL: "Haz un componente de proyecto"
```

#### **Referencias en Prompts**
```
Siempre mencionar:
- "Sigue docs/frontend/guias/DESARROLLO_FRONTEND.md"
- "No uses selectores [class*='...']"
- "Usa clases semánticas"
- "Evita !important"
- "Usa clamp() para valores escalables"
```

---

## 🎯 INSTRUCCIONES ESPECÍFICAS PARA AI AGENTS (SONNET 4.5)

### **Contexto del Proyecto Nexo AV**

Este proyecto tiene **problemas críticos identificados** que deben resolverse:

1. **1,040 selectores frágiles** `[class*="..."]` en 9 archivos
2. **2,178 usos de !important** en 29 archivos
3. **Dropdowns que no funcionan** por problemas de stacking context
4. **Archivo global.css masivo** (5,150 líneas) con código mezclado

### **🔴 REGLAS CRÍTICAS (NUNCA VIOLAR)**

#### **1. Selectores de Atributo [class*="..."]**

**❌ NUNCA hagas esto:**
```css
/* ❌ Intentando "arreglar" Tailwind desde CSS global */
body.nexo-av-theme [class*="hover:bg-white/10"] {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

body.nexo-av-theme [class*="flex-1"][class*="flex"] {
  width: 100% !important;
}
```

**✅ SIEMPRE haz esto:**
```css
/* ✅ Clase semántica en archivo CSS específico */
.component-name {
  background-color: rgba(255, 255, 255, 0.1);
}

.layout-container {
  display: flex;
  flex: 1;
  width: 100%;
}
```

**Instrucción:**
```
Sustituye TODOS los selectores [class*="..."] por clases semánticas 
en archivos CSS específicos o CSS Modules.

NO intentes "arreglar" clases de Tailwind desde el CSS global.
Si un componente necesita un hover específico, defínelo en su .module.css.
```

---

#### **2. Sincronización con el Theme (Dark/Light)**

Nexo AV usa `.nexo-av-theme` y `.nexo-av-theme-dark` en el `<body>`.

**❌ NUNCA hagas esto:**
```css
/* ❌ Colores hardcoded */
.button {
  background: #3b82f6; /* ← NO */
  color: #ffffff;
}

.button:hover {
  background: #2563eb; /* ← NO */
}
```

**✅ SIEMPRE haz esto:**
```css
/* ✅ Variables CSS del tema */
.button {
  background: hsl(var(--primary)); /* ← SÍ */
  color: hsl(var(--primary-foreground));
}

.button:hover {
  background: hsl(var(--primary) / 0.9); /* ← SÍ */
}
```

**Instrucción:**
```
Asegúrate de que los CSS Modules y componentes SIEMPRE usen variables CSS.

El archivo global.css es el ÚNICO lugar donde se definen colores base 
en :root y body.nexo-av-theme-dark.

Los componentes CONSUMEN esas variables, NUNCA definen colores directos.
```

---

#### **3. Dropdowns y Stacking Context**

**Problema:** Dropdowns cortados por `overflow: hidden/auto` en padres.

**❌ NUNCA hagas esto:**
```css
/* ❌ position: absolute con z-index alto */
.dropdown__menu {
  position: absolute;
  z-index: 9999; /* ← Inútil si el padre tiene overflow */
}
```

**✅ SIEMPRE haz esto:**
```typescript
// ✅ position: fixed + createPortal()
import { createPortal } from 'react-dom';

export function Dropdown({ isOpen }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: rect.left });
  }, [isOpen]);
  
  return (
    <>
      <button ref={triggerRef}>Toggle</button>
      {isOpen && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 'var(--z-dropdown)',
          }}
        >
          {/* Contenido */}
        </div>,
        document.body
      )}
    </>
  );
}
```

**Instrucción:**
```
Para componentes de Dropdown, Popover, Tooltip:

1. Detecta si el componente padre tiene overflow: hidden/auto
2. Si SÍ → Usa position: fixed + createPortal()
3. Agrega listeners de scroll/resize para actualizar posición
4. Usa z-index: var(--z-dropdown) (NO 9999)

Esto es lo que está causando que los menús se corten en desktop.
```

---

### **📋 CHECKLIST PARA AI AGENTS**

Antes de generar código, verifica:

#### **CSS**
- [ ] ¿Usas selectores `[class*="..."]`? → ❌ Reemplaza con clases semánticas
- [ ] ¿Usas selectores `[style*="..."]`? → ❌ Reemplaza con clases semánticas
- [ ] ¿Usas colores hardcoded? → ❌ Usa `hsl(var(--variable))`
- [ ] ¿Usas `!important`? → ❌ Usa especificidad natural
- [ ] ¿Usas valores fijos? → ❌ Usa `clamp()` para responsividad
- [ ] ¿Defines colores en componentes? → ❌ Solo en `global.css`

#### **Dropdowns/Popovers**
- [ ] ¿Usa `position: fixed` o `createPortal()`?
- [ ] ¿Calcula posición con `getBoundingClientRect()`?
- [ ] ¿Tiene listeners de scroll/resize?
- [ ] ¿Usa `z-index: var(--z-dropdown)`?

#### **Componentes React**
- [ ] ¿Props tipadas con TypeScript?
- [ ] ¿Componente < 300 líneas?
- [ ] ¿Usa custom hooks para lógica compleja?
- [ ] ¿Maneja estados loading/error/success?

---

### **🎯 PROMPT TEMPLATE PARA REFACTORIZACIÓN**

Usa este template cuando refactorices código de Nexo AV:

```
Refactoriza [componente/archivo] siguiendo estas reglas CRÍTICAS:

1. ELIMINA todos los selectores [class*="..."] y [style*="..."]
   → Reemplaza con clases semánticas en archivos CSS específicos

2. ASEGURA que todos los colores usen variables CSS
   → hsl(var(--primary)) en lugar de #3b82f6
   → El archivo global.css es el ÚNICO que define colores base

3. Para Dropdowns/Popovers:
   → Usa position: fixed + createPortal() si el padre tiene overflow
   → Agrega listeners de scroll/resize
   → Usa z-index: var(--z-dropdown)

4. EVITA !important
   → Usa especificidad natural (body.nexo-av-theme .component)

5. USA clamp() para valores escalables
   → font-size: clamp(0.875rem, 1rem, 1.125rem)
   → NO font-size: 14px

Referencia: docs/frontend/guias/DESARROLLO_FRONTEND.md
```

---

### **📊 MÉTRICAS DE ÉXITO**

Tu refactorización es exitosa si:

✅ **Selectores frágiles:** 1,040 → < 50 (-95%)  
✅ **!important:** 2,178 → < 200 (-91%)  
✅ **Dropdowns:** Funcionan en todos los contextos  
✅ **Temas:** Light/Dark funcionan sin colores hardcoded  
✅ **Responsividad:** Usa clamp() en lugar de valores fijos  

---

### **⚠️ ERRORES COMUNES A EVITAR**

1. ❌ **"Voy a usar [class*='hover'] para capturar todos los hovers"**
   - NO. Crea una clase `.component:hover` específica.

2. ❌ **"Voy a poner z-index: 99999 para que esté encima"**
   - NO. Usa `var(--z-dropdown)` y entiende el stacking context.

3. ❌ **"Voy a definir este color aquí porque solo se usa una vez"**
   - NO. Todos los colores en `global.css`, componentes los consumen.

4. ❌ **"Voy a usar position: absolute porque es más simple"**
   - NO si el padre tiene overflow. Usa `position: fixed` + portal.

5. ❌ **"Voy a usar !important para sobrescribir rápido"**
   - NO. Aumenta la especificidad del selector correctamente.

---

**¡Estas instrucciones son CRÍTICAS para el éxito del proyecto Nexo AV!**

---

## 📄 CHANGELOG DE ESTA GUÍA

### Version 2.0 (2026-01-25)
- Guía completa creada
- Secciones de arquitectura agregadas
- Mejores prácticas documentadas
- Errores comunes identificados
- Plan de refactorización definido

---

**Última actualización:** 2026-01-25  
**Versión:** 2.0  
**Mantenedores:** Equipo Frontend + AI Agents  

---

## 🎉 CONCLUSIÓN

Esta guía es un **documento vivo** que debe actualizarse conforme el proyecto evoluciona.

**Principios clave:**
1. 🎯 **Código claro sobre código clevér**
2. 🔧 **Mantenibilidad sobre rapidez**
3. 📦 **Componentes pequeños y reutilizables**
4. 🎨 **CSS semántico sobre selectores frágiles**
5. 📚 **Documentar mientras desarrollas**

**¡Código feliz, equipo feliz! 🚀**
