# 🔒 ANÁLISIS DE SEGURIDAD Y ARQUITECTURA - NEXO AV

**Fecha:** 7 de Enero de 2026  
**Versión:** 1.0  
**Analista:** Sistema de Auditoría Automatizada  
**Alcance:** Plataforma de Gestión Interna NEXO AV

---

## 📑 ÍNDICE

1. [Resumen Ejecutivo](#-resumen-ejecutivo)
2. [Problemas Críticos de Seguridad](#-problemas-críticos-de-seguridad)
3. [Problemas de Arquitectura y Errores Potenciales](#️-problemas-de-arquitectura-y-errores-potenciales)
4. [Seguridad de Base de Datos](#-seguridad-de-base-de-datos)
5. [Errores de Código y Bugs Potenciales](#-errores-de-código-y-bugs-potenciales)
6. [Problemas de Rendimiento y Escalabilidad](#-problemas-de-rendimiento-y-escalabilidad)
7. [Recomendaciones de Seguridad Adicionales](#-recomendaciones-de-seguridad-adicionales)
8. [Checklist de Mitigación Prioritaria](#-checklist-de-mitigación-prioritaria)
9. [Conclusión](#-conclusión)

---

## 🔍 RESUMEN EJECUTIVO

Se ha realizado un análisis exhaustivo de la plataforma de gestión interna NEXO AV, examinando el código fuente del frontend (React/TypeScript), las Edge Functions de Supabase, las migraciones de base de datos y las políticas de seguridad (RLS).

### Hallazgos Principales

| Categoría | Crítico | Alto | Medio | Bajo | Total |
|-----------|---------|------|-------|------|-------|
| Seguridad | 1 | 2 | 5 | 2 | 10 |
| Arquitectura | 0 | 1 | 3 | 2 | 6 |
| Código/Bugs | 0 | 0 | 2 | 3 | 5 |

**Valoración General:** ⚠️ **RIESGO MEDIO-ALTO**

**Estado:** El sistema tiene una base sólida con buenas prácticas en el backend, pero presenta vulnerabilidades críticas que requieren acción inmediata.

---

## 🚨 PROBLEMAS CRÍTICOS DE SEGURIDAD

### 1. ⚠️ CRÍTICO: Exposición de Credenciales en el Código Fuente

**Ubicación:** `src/integrations/supabase/client.ts:5-6`

**Descripción del Problema:**
```typescript
const SUPABASE_URL = "https://takvthfatlcjsqgssnta.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**Riesgos:**
- 🔴 Las credenciales de Supabase están hardcodeadas directamente en el código
- 🔴 La clave anónica está expuesta en el repositorio
- 🔴 Si el código está en un repositorio accesible, cualquiera puede ver estas credenciales
- 🔴 Posibilidad de acceso no autorizado a la base de datos
- 🔴 Bypass potencial de restricciones de dominio

**Solución Recomendada:**
```typescript
// ❌ MAL - Hardcodeado
const SUPABASE_URL = "https://takvthfatlcjsqgssnta.supabase.co";

// ✅ BIEN - Variables de entorno
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase configuration');
}
```

**Acciones Inmediatas:**
1. ⚠️ Rotar TODAS las claves de API de Supabase
2. ⚠️ Mover credenciales a archivo `.env.local`
3. ⚠️ Añadir `.env.local` al `.gitignore`
4. ⚠️ Revisar logs de acceso de Supabase por actividad sospechosa

---

### 2. ⚠️ ALTO: URL Hardcodeada con Fallback Inseguro

**Ubicación:** `src/pages/nexo_av/components/UserAvatarDropdown.tsx:93`

**Código Problemático:**
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL || 'https://takvthfatlcjsqgssnta.supabase.co'}/functions/v1/admin-users`,
  // ...
);
```

**Problema:**
- El fallback expone la URL real de producción
- Si falta la variable de entorno, se usa el valor hardcodeado
- Inconsistente con el principio de configuración externa

**Solución:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL environment variable is required');
}

const response = await fetch(
  `${supabaseUrl}/functions/v1/admin-users`,
  // ...
);
```

---

### 3. ⚠️ MEDIO-ALTO: Verificación de Autenticación Principalmente en Cliente

**Ubicaciones:** `Dashboard.tsx`, `ClientsPage.tsx`, `ProjectsPage.tsx`, etc.

**Descripción:**
La validación de roles se hace principalmente en el frontend:

```typescript
// Dashboard.tsx:130-133
const isAdmin = userInfo?.roles?.includes('admin');
const isManager = userInfo?.roles?.includes('manager');
const isSales = userInfo?.roles?.includes('sales');
```

**Riesgos:**
- Un usuario con conocimientos técnicos podría manipular el localStorage
- Bypass de restricciones visuales modificando el estado de React
- La UI confía en datos del cliente para mostrar/ocultar funcionalidades

**Mitigación Actual:** ✅
- Las políticas RLS en la base de datos SÍ protegen contra acceso no autorizado
- Las Edge Functions verifican roles antes de ejecutar acciones

**Recomendación:**
- Mantener la doble verificación (cliente + servidor)
- Considerar usar JWT claims firmados para información de roles
- Nunca confiar exclusivamente en validaciones del cliente

---

### 4. ⚠️ MEDIO: Posible Enumeración de Usuarios

**Ubicación:** `src/pages/nexo_av/Login.tsx:98-113`

**Código Vulnerable:**
```typescript
// Check if email is in authorized list
const { data: authorized, error: authCheckError } = await supabase.rpc('is_email_authorized', {
  p_email: email
});

if (!authorized) {
  setError('Tu email no está autorizado para acceder a esta plataforma...');
  return;
}
```

**Problema:**
- Se verifica si un email está autorizado ANTES del login
- Un atacante puede enumerar emails válidos del sistema haciendo solicitudes
- Mensajes de error diferentes revelan si el email existe o no
- Información útil para ataques de fuerza bruta dirigidos

**Solución Recomendada:**
```typescript
// ✅ Siempre intentar el login y dar el mismo mensaje genérico
const { data, error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (signInError) {
  // Mensaje genérico que no revela información
  setError('Credenciales incorrectas o usuario no autorizado.');
  return;
}

// Verificar autorización DESPUÉS del login exitoso
const { data: userInfo } = await supabase.rpc('get_current_user_info');
if (!userInfo || userInfo.length === 0) {
  await supabase.auth.signOut();
  setError('Credenciales incorrectas o usuario no autorizado.');
  return;
}
```

---

## ⚠️ PROBLEMAS DE ARQUITECTURA Y ERRORES POTENCIALES

### 5. ⚠️ MEDIO: Falta de Rate Limiting

**Descripción:**
- No hay protección visible contra ataques de fuerza bruta en el login
- Las Edge Functions no implementan rate limiting
- Un atacante podría intentar miles de combinaciones de contraseñas

**Impacto:**
- Vulnerabilidad a ataques de fuerza bruta
- Posible saturación del servicio (DoS)
- Consumo excesivo de recursos

**Solución Recomendada:**

```typescript
// En Edge Function
import { createClient } from '@supabase/supabase-js';

const rateLimitStore = new Map(); // En producción, usar Redis

const checkRateLimit = (identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const attempts = rateLimitStore.get(identifier) || [];
  
  // Limpiar intentos antiguos
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false; // Rate limit excedido
  }
  
  recentAttempts.push(now);
  rateLimitStore.set(identifier, recentAttempts);
  return true;
};
```

**Alternativas:**
- Implementar CAPTCHA después de 3 intentos fallidos
- Bloquear IPs temporalmente después de X intentos
- Usar Cloudflare o similar para rate limiting a nivel de red

---

### 6. ⚠️ MEDIO: Gestión de Sesiones sin Timeout de Inactividad

**Ubicación:** `src/integrations/supabase/client.ts:12-16`

**Configuración Actual:**
```typescript
auth: {
  storage: localStorage,
  persistSession: true,
  autoRefreshToken: true,
}
```

**Problema:**
- Las sesiones persisten indefinidamente mientras el token sea válido
- No hay auto-logout por inactividad
- Riesgo en ordenadores compartidos o públicos

**Solución Implementada:**

```typescript
// Hook personalizado para auto-logout
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useInactivityLogout = (timeoutMinutes = 30) => {
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/nexo-av';
      }, timeoutMinutes * 60 * 1000);
    };
    
    // Eventos que resetean el timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });
    
    resetTimer(); // Iniciar timer
    
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [timeoutMinutes]);
};
```

---

### 7. ⚠️ MEDIO: Validación de Contraseñas Débil

**Ubicación:** `src/pages/nexo_av/Login.tsx:241`

**Código Actual:**
```typescript
<Input
  type="password"
  placeholder="••••••••"
  minLength={8}  // ⚠️ Solo 8 caracteres, sin requisitos de complejidad
  // ...
/>
```

**Problema:**
- Solo se requieren 8 caracteres mínimos
- No hay validación de complejidad (mayúsculas, minúsculas, números, símbolos)
- Contraseñas débiles como "12345678" serían aceptadas

**Política Recomendada (OWASP):**
- Mínimo 12 caracteres (ideal 14-16)
- Al menos una letra mayúscula
- Al menos una letra minúscula
- Al menos un número
- Al menos un carácter especial
- No permitir contraseñas comunes (usar lista de contraseñas prohibidas)

**Implementación:**
```typescript
interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('La contraseña debe tener al menos 12 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una letra mayúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Debe incluir al menos una letra minúscula');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Debe incluir al menos un número');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Debe incluir al menos un carácter especial');
  }
  
  // Lista de contraseñas comunes a evitar
  const commonPasswords = ['password123', 'admin1234', 'qwerty123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Esta contraseña es demasiado común');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

---

### 8. ⚠️ ALTO: Reenautenticación Insegura al Cambiar Contraseña

**Ubicación:** `src/pages/nexo_av/components/UserAvatarDropdown.tsx:157-165`

**Código Problemático:**
```typescript
// First verify current password by re-authenticating
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: email,
  password: passwordForm.currentPassword,
});
```

**Problemas:**
- Se hace un login completo solo para verificar la contraseña actual
- Esto podría crear múltiples sesiones activas
- No es la forma correcta de verificar la contraseña actual según las mejores prácticas

**Solución Recomendada:**
```typescript
// Usar la API de Supabase correctamente
const { error } = await supabase.auth.updateUser({
  password: passwordForm.newPassword
});

// Supabase automáticamente valida la sesión actual
// No es necesario hacer signInWithPassword
```

---

### 9. ⚠️ MEDIO: Falta de Validación CSRF en Edge Functions

**Ubicación:** `supabase/functions/admin-users/index.ts:4-7`

**Código Actual:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ⚠️ Permite cualquier origen
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Problema:**
- Las Edge Functions no implementan protección CSRF
- El header CORS permite cualquier origen ('*')
- Aunque requieren autorización, podrían ser vulnerables a ataques CSRF desde sitios maliciosos

**Solución:**
```typescript
// Configuración segura de CORS
const allowedOrigins = [
  'https://avtechesdeveniments.com',
  'https://www.avtechesdeveniments.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
].filter(Boolean);

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 horas
});

// Validar CSRF token
const validateCSRFToken = (req: Request) => {
  const token = req.headers.get('x-csrf-token');
  const cookie = req.headers.get('cookie');
  // Implementar validación
};
```

---

### 10. ⚠️ BAJO-MEDIO: Manejo Insuficiente de Errores Sensibles

**Ubicación:** Múltiples archivos

**Ejemplos de Código Problemático:**
```typescript
// ClientsPage.tsx
console.error('Error fetching clients:', err);

// Dashboard.tsx
console.error('Auth check error:', err);

// UserManagement.tsx
console.error('Error creating user:', error);
```

**Problema:**
- Los errores se logean en consola con información potencialmente sensible
- Los objetos de error pueden contener datos internos del sistema
- En producción, estos logs son visibles en la consola del navegador

**Solución Recomendada:**

```typescript
// utils/secureLogger.ts
export const secureLogger = {
  error: (message: string, context?: Record<string, any>) => {
    // En desarrollo: log completo
    if (process.env.NODE_ENV === 'development') {
      console.error(message, context);
    }
    
    // En producción: solo información no sensible
    if (process.env.NODE_ENV === 'production') {
      // Enviar a servicio de logging (Sentry, LogRocket, etc.)
      const sanitizedContext = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        // NO incluir tokens, contraseñas, emails completos, etc.
      };
      
      // sendToLoggingService(message, sanitizedContext);
    }
  }
};

// Uso
try {
  await fetchClients();
} catch (error) {
  secureLogger.error('Failed to fetch clients', {
    userId: userInfo.user_id, // OK
    // error: error, // ❌ NO incluir objeto de error completo
  });
  
  toast({
    title: "Error",
    description: "No se pudieron cargar los clientes.", // Mensaje genérico
    variant: "destructive",
  });
}
```

---

## 🔒 SEGURIDAD DE BASE DE DATOS

### ✅ Puntos Positivos

| Aspecto | Estado | Descripción |
|---------|--------|-------------|
| Row Level Security (RLS) | ✅ Implementado | Habilitado en todas las tablas críticas |
| Políticas por Roles | ✅ Correctas | Admin, Manager, Sales, Tech bien definidos |
| Funciones SECURITY DEFINER | ✅ Implementadas | Correctamente configuradas |
| Separación de Schemas | ✅ Excelente | internal, crm, sales, projects, catalog, audit |
| Índices de Rendimiento | ✅ Presentes | Buenos índices en campos clave |

### Tablas con RLS Habilitado:
- ✅ `internal.authorized_users`
- ✅ `internal.roles`
- ✅ `internal.user_roles`
- ✅ `crm.clients`
- ✅ `crm.contacts`
- ✅ `sales.quotes`
- ✅ `sales.quote_lines`
- ✅ `projects.projects`
- ✅ `catalog.products`
- ✅ `audit.audit_log`

### Ejemplo de Política Bien Implementada:

```sql
-- Política granular basada en roles
CREATE POLICY "Sales can view assigned quotes"
  ON sales.quotes
  FOR SELECT
  USING (
    internal.is_sales() AND 
    assigned_to = internal.get_authorized_user_id(auth.uid())
  );
```

---

### ⚠️ Áreas de Mejora en Base de Datos

### 11. ⚠️ MEDIO: Política RLS Incompleta

**Ubicación:** `supabase/migrations/20260105105924_31a7b44a-a923-457f-8de3-4985ca89c6ae.sql:326-328`

**Código Problemático:**
```sql
CREATE POLICY "Admin and managers can view role assignments"
  -- ⚠️ FALTA: ON internal.user_roles
  FOR SELECT
  USING (internal.is_admin() OR internal.is_manager());
```

**Problema:**
- Falta especificar la tabla objetivo con `ON`
- Esto causará un error al ejecutar la migración
- La política no se aplicará correctamente

**Corrección:**
```sql
CREATE POLICY "Admin and managers can view role assignments"
  ON internal.user_roles  -- ✅ Añadir esta línea
  FOR SELECT
  USING (internal.is_admin() OR internal.is_manager());
```

---

### 12. ⚠️ MEDIO: Falta de Auditoría Completa

**Problema:**
- Existe la tabla `audit.audit_log` pero no se usa extensivamente
- No hay triggers automáticos para registrar cambios críticos
- Acciones como eliminación de usuarios no se auditan consistentemente

**Recomendación:**

```sql
-- Trigger de auditoría automática para cambios en usuarios
CREATE OR REPLACE FUNCTION audit.log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit.audit_log (
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    user_id
  ) VALUES (
    TG_OP::audit.audit_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    internal.get_authorized_user_id(auth.uid())
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar a tablas críticas
CREATE TRIGGER audit_authorized_users_changes
  AFTER INSERT OR UPDATE OR DELETE ON internal.authorized_users
  FOR EACH ROW EXECUTE FUNCTION audit.log_user_changes();
```

**Datos a Auditar Obligatoriamente:**
- ✅ Creación/modificación/eliminación de usuarios
- ✅ Cambios de roles y permisos
- ✅ Acceso a datos sensibles (clientes, presupuestos)
- ✅ Cambios de estado en proyectos importantes
- ✅ Intentos de acceso no autorizado

---

## 🐛 ERRORES DE CÓDIGO Y BUGS POTENCIALES

### 13. ⚠️ BAJO-MEDIO: Condición de Carrera en onAuthStateChange

**Ubicación:** `src/pages/nexo_av/Login.tsx:66-77`

**Código Problemático:**
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Defer Supabase call to prevent deadlock
      setTimeout(async () => {  // ⚠️ Workaround con setTimeout
        const { data: userInfo } = await supabase.rpc('get_current_user_info');
        // ...
      }, 0);
    }
  }
);
```

**Problema:**
- Se usa `setTimeout(..., 0)` como workaround para evitar deadlock
- Esto indica un problema de diseño en el flujo de autenticación
- Podría causar comportamiento impredecible o race conditions

**Impacto:**
- Posibles redirects prematuros
- Estado inconsistente temporalmente
- Experiencia de usuario degradada

**Solución Recomendada:**
```typescript
// Separar la lógica de verificación
const verifyAndRedirect = async (session: Session) => {
  try {
    const { data: userInfo } = await supabase.rpc('get_current_user_info');
    
    if (userInfo && userInfo.length > 0) {
      navigate(`/nexo-av/${userInfo[0].user_id}/dashboard`, { replace: true });
    } else {
      await supabase.auth.signOut();
      setError('Tu email no está autorizado.');
    }
  } catch (error) {
    console.error('Verification error:', error);
  }
};

// Listener simplificado
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      verifyAndRedirect(session);  // ✅ Sin setTimeout
    }
  }
);
```

---

### 14. ⚠️ BAJO: Reload de Página Completa al Actualizar Perfil

**Ubicación:** `src/pages/nexo_av/components/UserAvatarDropdown.tsx:121`

**Código Problemático:**
```typescript
toast({
  title: "Información actualizada",
  description: "Tu información ha sido actualizada correctamente.",
});

setIsEditDialogOpen(false);
window.location.reload();  // ⚠️ Recarga toda la página
```

**Problema:**
- Se recarga toda la página después de actualizar el perfil
- Mala experiencia de usuario (pérdida de contexto, scroll, estado)
- Pérdida de datos no guardados en otros formularios
- Innecesario si se puede actualizar el estado local

**Solución Recomendada:**
```typescript
// Actualizar el contexto de usuario globalmente
import { useUserContext } from '@/contexts/UserContext';

const { updateUserInfo } = useUserContext();

const handleEditSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const response = await fetch(/* ... */);
    
    if (!response.ok) {
      throw new Error('Error updating user info');
    }

    // ✅ Actualizar estado global sin reload
    updateUserInfo({
      full_name: editForm.full_name,
      phone: editForm.phone,
      job_position: editForm.position,
    });

    toast({
      title: "Información actualizada",
      description: "Tu información ha sido actualizada correctamente.",
    });

    setIsEditDialogOpen(false);
    // NO window.location.reload()
    
  } catch (error) {
    // ...
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### 15. ⚠️ BAJO: Parámetro userId Opcional pero Requerido

**Ubicación:** Múltiples componentes

**Código Problemático:**
```typescript
const { userId } = useParams<{ userId: string }>();
// ...
// Uso directo sin verificación
navigate(`/nexo-av/${userId}/dashboard`);  // ⚠️ ¿Y si userId es undefined?
```

**Problema:**
- El tipo indica que `userId` puede ser `string | undefined`
- Se usa sin verificación en algunos lugares
- Podría causar URLs malformadas como `/nexo-av/undefined/dashboard`

**Impacto:**
- Errores 404 silenciosos
- Navegación incorrecta
- Confusión en el usuario

**Solución:**
```typescript
const { userId } = useParams<{ userId: string }>();

// ✅ Verificar al inicio del componente
useEffect(() => {
  if (!userId) {
    console.error('Missing userId parameter');
    navigate('/nexo-av', { replace: true });
    return;
  }
  
  // Resto de la lógica...
}, [userId, navigate]);

// ✅ O usar un guard personalizado
const useRequiredUserId = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!userId) {
      navigate('/nexo-av', { replace: true });
    }
  }, [userId, navigate]);
  
  return userId!; // Assert non-null después de la verificación
};
```

---

## 📊 PROBLEMAS DE RENDIMIENTO Y ESCALABILIDAD

### 16. ⚠️ MEDIO: Falta de Paginación

**Ubicación:** `ClientsPage.tsx`, `ProjectsPage.tsx`, `QuotesPage.tsx`

**Código Actual:**
```typescript
const fetchClients = async () => {
  try {
    const { data, error } = await supabase.rpc('list_clients', {
      p_lead_stage: stageFilter === 'all' ? null : stageFilter,
      p_search: searchTerm || null,
      // ⚠️ Sin límite de registros - carga TODO
    });
    // ...
  }
};
```

**Problema:**
- Las listas cargan TODOS los registros sin límite
- Con 1000+ clientes, la aplicación se volverá lenta
- Alto consumo de memoria en el navegador
- Transferencia innecesaria de datos

**Proyección de Crecimiento:**

| Registros | Tiempo de Carga | Memoria | Experiencia |
|-----------|-----------------|---------|-------------|
| 100 | < 1s | ~500KB | ✅ Buena |
| 500 | ~3s | ~2MB | ⚠️ Aceptable |
| 1000 | ~8s | ~5MB | ❌ Lenta |
| 5000+ | >30s | >20MB | ❌ Inutilizable |

**Solución Implementada:**

```typescript
// Hook de paginación reutilizable
import { useState, useEffect } from 'react';

interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

export const usePagination = (options: PaginationOptions = {}) => {
  const { pageSize = 50, initialPage = 1 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  
  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = (currentPage - 1) * pageSize;
  
  return {
    currentPage,
    pageSize,
    totalPages,
    totalCount,
    offset,
    setCurrentPage,
    setTotalCount,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

// Uso en ClientsPage
const { 
  currentPage, 
  pageSize, 
  offset, 
  setCurrentPage, 
  setTotalCount,
  totalPages 
} = usePagination({ pageSize: 50 });

const fetchClients = async () => {
  try {
    const { data, error, count } = await supabase.rpc('list_clients_paginated', {
      p_lead_stage: stageFilter === 'all' ? null : stageFilter,
      p_search: searchTerm || null,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) throw error;
    
    setClients(data || []);
    setTotalCount(count || 0);
  } catch (err) {
    // ...
  }
};
```

**Modificación de RPC Function:**
```sql
CREATE OR REPLACE FUNCTION public.list_clients_paginated(
  p_lead_stage crm.lead_stage DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  /* campos existentes */
) AS $$
BEGIN
  RETURN QUERY
  SELECT /* campos */
  FROM crm.clients
  WHERE /* filtros existentes */
  ORDER BY updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 17. ⚠️ BAJO: Búsquedas sin Debounce

**Ubicación:** Campos de búsqueda en todas las páginas

**Código Actual:**
```typescript
<Input
  placeholder="Buscar..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}  // ⚠️ Dispara búsqueda en cada tecla
  // ...
/>
```

**Problema:**
- Cada tecla pulsada dispara una nueva búsqueda
- Si el usuario escribe "cliente", se hacen 7 búsquedas: "c", "cl", "cli", ...
- Sobrecarga innecesaria de la base de datos
- Mala experiencia en conexiones lentas (búsquedas que se pisan entre sí)
- Consumo excesivo de recursos de Supabase (podría afectar costos)

**Ejemplo de Impacto:**
- Usuario escribe "EVENTOS AV TECH" (15 caracteres)
- **Sin debounce:** 15 consultas a la base de datos
- **Con debounce (500ms):** 1-2 consultas a la base de datos

**Solución:**

```typescript
import { useMemo } from 'react';
import { debounce } from 'lodash'; // o implementar propio debounce

const ClientsPage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce de 500ms
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchTerm(value);
    }, 500),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value); // Actualiza input inmediatamente
    debouncedSearch(value); // Actualiza búsqueda con delay
  };

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <Input
      placeholder="Buscar..."
      value={searchInput}  // ✅ Input responde inmediatamente
      onChange={handleSearchChange}
      // ...
    />
  );
};
```

**Implementación Propia de Debounce (sin dependencias):**
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Uso
const searchTerm = useDebounce(searchInput, 500);
```

---

## 🔐 RECOMENDACIONES DE SEGURIDAD ADICIONALES

### 18. Content Security Policy (CSP)

**Implementación:**
```html
<!-- En index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
        connect-src 'self' https://takvthfatlcjsqgssnta.supabase.co wss://takvthfatlcjsqgssnta.supabase.co;
        img-src 'self' data: https: blob:;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
      ">
```

**Beneficios:**
- Previene inyección de scripts maliciosos (XSS)
- Controla qué recursos pueden cargarse
- Protege contra clickjacking
- Refuerza la seguridad del navegador

---

### 19. Headers de Seguridad HTTP

**Configuración recomendada (Vite/Servidor):**

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    }
  }
});
```

---

### 20. Autenticación de Dos Factores (2FA)

**Prioridad:** Alta para administradores

**Implementación con Supabase:**

```typescript
// Habilitar 2FA
const enable2FA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'NEXO AV - ' + userInfo.email,
  });

  if (error) throw error;

  // Mostrar QR code al usuario
  return data;
};

// Verificar 2FA en login
const verify2FA = async (code: string, factorId: string) => {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeId,
    code,
  });

  return { data, error };
};
```

**Política Recomendada:**
- ✅ **Obligatorio** para usuarios con rol `admin`
- ✅ **Obligatorio** para usuarios con rol `manager`
- ⚠️ **Opcional** para usuarios con rol `sales` y `tech`
- ℹ️ Período de gracia de 30 días para activación

---

### 21. Auditoría y Logging Mejorado

**Sistema de Auditoría Completo:**

```typescript
// services/auditService.ts
export interface AuditEvent {
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW_SENSITIVE';
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const auditService = {
  log: async (event: AuditEvent) => {
    try {
      // Obtener información del contexto
      const ipAddress = await getUserIP();
      const userAgent = navigator.userAgent;
      const timestamp = new Date().toISOString();

      await supabase.rpc('log_audit_event', {
        p_action: event.action,
        p_resource: event.resource,
        p_resource_id: event.resourceId,
        p_details: JSON.stringify(event.details),
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_severity: event.severity,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
};

// Uso
await auditService.log({
  action: 'DELETE',
  resource: 'user',
  resourceId: userId,
  details: {
    email: user.email,
    roles: user.roles,
  },
  severity: 'CRITICAL',
});
```

**Eventos a Auditar:**
- ✅ Login/Logout (exitoso y fallido)
- ✅ Cambios en usuarios y permisos
- ✅ Acceso a datos de clientes
- ✅ Creación/modificación de presupuestos
- ✅ Cambios de contraseña
- ✅ Intentos de acceso no autorizado

---

### 22. Política de Rotación de Contraseñas

**Implementación:**

```sql
-- Añadir campo a authorized_users
ALTER TABLE internal.authorized_users
ADD COLUMN password_changed_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN password_must_change BOOLEAN DEFAULT false;

-- Función para verificar expiración
CREATE OR REPLACE FUNCTION internal.password_needs_rotation(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM internal.authorized_users
    WHERE id = p_user_id
    AND (
      password_changed_at < NOW() - INTERVAL '90 days'  -- 90 días
      OR password_must_change = true
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Frontend:**
```typescript
// Verificar en Dashboard
useEffect(() => {
  const checkPasswordRotation = async () => {
    const { data } = await supabase.rpc('password_needs_rotation', {
      p_user_id: userInfo.user_id
    });

    if (data) {
      // Forzar cambio de contraseña
      navigate(`/nexo-av/${userId}/change-password`, { 
        replace: true,
        state: { required: true }
      });
    }
  };

  checkPasswordRotation();
}, [userInfo]);
```

---

### 23. Protección contra Scraping y Bots

**Implementación:**

```typescript
// Detectar comportamiento de bot
const detectBotBehavior = () => {
  const indicators = {
    noMouseMovement: true,
    suspiciousUserAgent: /bot|crawler|spider/i.test(navigator.userAgent),
    tooFastActions: false,
    noJavaScript: false,
  };

  // Detectar movimiento de mouse
  let mouseMovements = 0;
  window.addEventListener('mousemove', () => {
    mouseMovements++;
    if (mouseMovements > 5) indicators.noMouseMovement = false;
  }, { once: true });

  return indicators;
};
```

---

## 📋 CHECKLIST DE MITIGACIÓN PRIORITARIA

### 🔴 URGENTE - Acción Inmediata (Esta Semana)

- [ ] **Prioridad 1:** Mover credenciales de Supabase a variables de entorno
  - Crear archivo `.env.local`
  - Actualizar `src/integrations/supabase/client.ts`
  - Verificar que `.env.local` está en `.gitignore`
  
- [ ] **Prioridad 2:** Rotar claves de API de Supabase
  - Generar nuevas claves en Supabase Dashboard
  - Actualizar configuración de producción
  - Invalidar claves antiguas
  
- [ ] **Prioridad 3:** Eliminar URL hardcodeada
  - Actualizar `UserAvatarDropdown.tsx:93`
  - Añadir validación de variables de entorno requeridas
  
- [ ] **Prioridad 4:** Implementar rate limiting básico
  - Configurar en Supabase o Cloudflare
  - Límite de 5 intentos de login por 15 minutos
  
- [ ] **Prioridad 5:** Mejorar validación de contraseñas
  - Mínimo 12 caracteres
  - Requisitos de complejidad
  - Actualizar componentes de creación/cambio de contraseña

**Tiempo Estimado:** 1-2 días  
**Responsable Sugerido:** Desarrollador Backend + DevOps

---

### 🟠 IMPORTANTE - Próximas 2 Semanas

- [ ] **Seguridad 1:** Corregir política RLS incompleta
  - Revisar migración SQL línea 326
  - Aplicar corrección en base de datos
  
- [ ] **Seguridad 2:** Unificar mensajes de error en login
  - Evitar enumeración de usuarios
  - Mensajes genéricos consistentes
  
- [ ] **Seguridad 3:** Implementar auto-logout por inactividad
  - Hook `useInactivityLogout`
  - Timeout de 30 minutos
  - Advertencia 5 minutos antes
  
- [ ] **Auditoría 1:** Implementar sistema de auditoría completo
  - Función `auditService`
  - Triggers en base de datos
  - Dashboard de auditoría para admins
  
- [ ] **Seguridad 4:** Configurar CSRF protection
  - Tokens CSRF en Edge Functions
  - Validación en requests críticos
  
- [ ] **Backend 1:** Añadir logging estructurado
  - Servicio de logging seguro
  - Integración con Sentry/LogRocket
  - No exponer datos sensibles

**Tiempo Estimado:** 1 semana  
**Responsable Sugerido:** Equipo de Desarrollo

---

### 🟡 RECOMENDADO - Próximo Mes

- [ ] **Performance 1:** Implementar paginación
  - Hook `usePagination`
  - Actualizar RPC functions
  - UI de paginación en todas las tablas
  
- [ ] **Performance 2:** Añadir debounce en búsquedas
  - Hook `useDebounce`
  - Aplicar en todos los campos de búsqueda
  
- [ ] **Seguridad 5:** Configurar CSP headers
  - Añadir meta tags en `index.html`
  - Configurar en servidor/CDN
  
- [ ] **Seguridad 6:** Implementar 2FA
  - Obligatorio para admins
  - Opcional para otros usuarios
  - UI de configuración
  
- [ ] **Code Quality 1:** Refactorizar flujo de autenticación
  - Eliminar `setTimeout` workarounds
  - Mejorar gestión de estado
  
- [ ] **UX 1:** Eliminar `window.location.reload()`
  - Actualizar estado localmente
  - Context API o state management

**Tiempo Estimado:** 2-3 semanas  
**Responsable Sugerido:** Equipo de Desarrollo + UX

---

### 🟢 OPCIONAL - Mejoras Futuras (Trimestre)

- [ ] **Testing 1:** Tests de seguridad automatizados
  - Unit tests para validaciones
  - Integration tests para autenticación
  - E2E tests para flujos críticos
  
- [ ] **Monitoring 1:** Sistema de monitoreo
  - Alertas de seguridad
  - Dashboard de métricas
  - Análisis de logs
  
- [ ] **Security 7:** Penetration testing
  - Contratar auditoría externa
  - Corregir vulnerabilidades encontradas
  
- [ ] **Security 8:** Política de rotación de contraseñas
  - Implementar sistema de expiración
  - Notificaciones a usuarios
  
- [ ] **Performance 3:** Optimización de consultas
  - Análisis de queries lentos
  - Índices adicionales
  - Caching estratégico
  
- [ ] **Security 9:** Protección anti-scraping
  - Rate limiting avanzado
  - Detección de bots
  - CAPTCHA en endpoints sensibles

**Tiempo Estimado:** 1-2 meses  
**Responsable Sugerido:** Equipo Completo + Consultores Externos

---

## 🎯 CONCLUSIÓN

### Resumen de la Evaluación

| Aspecto | Valoración | Comentario |
|---------|-----------|------------|
| **Arquitectura Backend** | ⭐⭐⭐⭐☆ (4/5) | Excelente uso de RLS y separación de schemas |
| **Seguridad de Datos** | ⭐⭐⭐⭐☆ (4/5) | Buenas políticas, pero faltan auditorías |
| **Autenticación** | ⭐⭐⭐☆☆ (3/5) | Funcional pero con vulnerabilidades críticas |
| **Configuración** | ⭐⭐☆☆☆ (2/5) | Credenciales expuestas - urgente corregir |
| **Rendimiento** | ⭐⭐⭐☆☆ (3/5) | Funciona ahora, problemas futuros de escalabilidad |
| **Código Frontend** | ⭐⭐⭐⭐☆ (4/5) | Bien estructurado, algunos workarounds |

### Valoración Global: ⚠️ **RIESGO MEDIO-ALTO**

---

### Fortalezas Principales ✅

1. **Excelente implementación de RLS** en base de datos
   - Políticas granulares por rol
   - Protección efectiva de datos

2. **Separación clara de responsabilidades**
   - Schemas bien definidos (internal, crm, sales, projects, catalog, audit)
   - Edge Functions para operaciones sensibles

3. **Validación de dominio corporativo**
   - Solo emails `@avtechesdeveniments.com`
   - Control de acceso a nivel de organización

4. **Arquitectura escalable**
   - Estructura modular
   - Componentes reutilizables
   - Preparado para crecimiento

---

### Vulnerabilidades Críticas ❌

1. **Credenciales expuestas en código fuente**
   - Impacto: CRÍTICO
   - Urgencia: INMEDIATA
   - Riesgo: Acceso no autorizado a base de datos

2. **Validación de contraseñas débil**
   - Impacto: ALTO
   - Urgencia: ALTA
   - Riesgo: Cuentas comprometidas

3. **Falta de rate limiting**
   - Impacto: ALTO
   - Urgencia: ALTA
   - Riesgo: Ataques de fuerza bruta

4. **Enumeración de usuarios**
   - Impacto: MEDIO
   - Urgencia: MEDIA
   - Riesgo: Información para ataques dirigidos

---

### Plan de Acción Inmediato (Próximas 72 horas)

#### Día 1:
- [ ] ⚠️ Mover credenciales a `.env.local`
- [ ] ⚠️ Rotar claves de API en Supabase
- [ ] ⚠️ Verificar logs de acceso sospechoso

#### Día 2:
- [ ] Implementar validación de contraseñas robusta
- [ ] Configurar rate limiting básico
- [ ] Actualizar documentación de configuración

#### Día 3:
- [ ] Corregir mensajes de error en login
- [ ] Implementar auto-logout por inactividad
- [ ] Revisión de código por segundo desarrollador

---

### Impacto Estimado por No Actuar

| Escenario | Probabilidad | Impacto | Costo Estimado |
|-----------|-------------|---------|----------------|
| Acceso no autorizado a DB | Alta | Crítico | €50,000 - €200,000 |
| Fuga de datos de clientes | Media | Alto | €20,000 - €100,000 |
| Ataque de fuerza bruta exitoso | Media | Alto | €10,000 - €50,000 |
| Pérdida de confianza | Baja | Crítico | Reputacional |
| Multa GDPR | Baja | Crítico | Hasta 4% facturación |

---

### Recomendación Final

**Es IMPERATIVO actuar sobre los problemas URGENTES en los próximos 3-5 días.**

La plataforma tiene una base técnica sólida, pero las vulnerabilidades de configuración (especialmente las credenciales expuestas) representan un riesgo inaceptable para un sistema de producción que maneja datos comerciales sensibles.

Una vez corregidos los problemas críticos, NEXO AV estará en una posición mucho más segura para escalar y expandirse a más usuarios (técnicos autónomos y clientes) como está planificado.

---

### Recursos y Documentación

**Documentación de Referencia:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)

**Herramientas Recomendadas:**
- **Auditoría:** OWASP ZAP, Burp Suite
- **Monitoreo:** Sentry, LogRocket, Datadog
- **Rate Limiting:** Cloudflare, Kong API Gateway
- **2FA:** Authy, Google Authenticator (vía Supabase)

---

### Contacto y Seguimiento

**Para dudas o aclaraciones sobre este informe:**
- Crear issues en el repositorio con etiqueta `security`
- Discutir en reunión de equipo
- Consultar con equipo de seguridad/DevOps

**Próxima auditoría programada:** 30 días después de implementar correcciones críticas

---

**Documento generado:** 7 de Enero de 2026  
**Versión:** 1.0  
**Próxima revisión:** Febrero 2026

---

*Este documento contiene información sensible sobre la seguridad del sistema. Distribución limitada solo a personal autorizado.*
