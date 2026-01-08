# 🔐 INSTRUCCIONES PARA CONFIGURAR VARIABLES DE ENTORNO

**Fecha:** 7 de Enero de 2026  
**Urgencia:** 🔴 CRÍTICA  
**Tiempo requerido:** 10 minutos

---

## ⚠️ IMPORTANTE - ACCIÓN INMEDIATA REQUERIDA

El análisis de seguridad ha detectado que las credenciales están hardcodeadas en el código. **Esto debe corregirse INMEDIATAMENTE** antes del próximo commit.

---

## 📋 PASOS A SEGUIR

### Paso 1: Crear archivo `.env.local`

Crea un archivo llamado `.env.local` en la **raíz del proyecto** (mismo nivel que `package.json`):

```bash
# En Windows (PowerShell)
New-Item -Path ".env.local" -ItemType File

# En Linux/Mac
touch .env.local
```

### Paso 2: Copiar las credenciales actuales

Abre `.env.local` y añade tus credenciales de Supabase:

```env
# ===================================
# CONFIGURACIÓN DE SUPABASE
# ===================================
VITE_SUPABASE_URL=https://takvthfatlcjsqgssnta.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_aqui

# ===================================
# CONFIGURACIÓN DE ENTORNO
# ===================================
VITE_APP_ENV=development
VITE_APP_URL=http://localhost:5173
```

**NOTA:** Copia la clave anónima actual de `src/integrations/supabase/client.ts` (línea 6)

### Paso 3: Actualizar `src/integrations/supabase/client.ts`

**ANTES (INSEGURO):**
```typescript
const SUPABASE_URL = "https://takvthfatlcjsqgssnta.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**DESPUÉS (SEGURO):**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase configuration. Please check your .env.local file.');
}
```

### Paso 4: Actualizar `src/pages/nexo_av/components/UserAvatarDropdown.tsx`

**Buscar (línea 95):**
```typescript
const supabaseUrl = 'https://takvthfatlcjsqgssnta.supabase.co';
```

**Reemplazar por:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL environment variable is required');
}
```

### Paso 5: Verificar que funciona

Reinicia el servidor de desarrollo:

```bash
# Detener el servidor (Ctrl+C)
# Iniciar de nuevo
npm run dev
```

Verifica que la aplicación carga correctamente y puedes hacer login.

### Paso 6: Rotar las claves de API

**⚠️ CRÍTICO:** Las claves actuales están comprometidas (están en el código). Debes rotarlas:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Haz clic en **Regenerate** en la clave anónima
5. Copia la nueva clave
6. Actualiza `.env.local` con la nueva clave
7. Actualiza las variables de entorno en Firebase Hosting/tu servidor de producción

### Paso 7: Verificar que las credenciales NO están en el código

Ejecuta esta búsqueda:

```bash
# Buscar claves hardcodeadas
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" src/

# No debe mostrar resultados
```

Si aún aparecen resultados, elimínalas del código.

---

## 🚀 CONFIGURACIÓN PARA PRODUCCIÓN

### Firebase Hosting

Si usas Firebase Hosting, configura las variables de entorno:

```bash
firebase functions:config:set supabase.url="https://takvthfatlcjsqgssnta.supabase.co"
firebase functions:config:set supabase.anon_key="tu_nueva_clave"
```

Para el frontend en Firebase Hosting, añade las variables en tu build:

**En `.firebaserc`:**
```json
{
  "projects": {
    "default": "avtech-305e7"
  },
  "envs": {
    "production": {
      "VITE_SUPABASE_URL": "https://takvthfatlcjsqgssnta.supabase.co",
      "VITE_SUPABASE_ANON_KEY": "tu_nueva_clave"
    }
  }
}
```

O en GitHub Actions (si usas CI/CD):

```yaml
- name: Build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  run: npm run build
```

---

## ✅ VERIFICACIÓN FINAL

Antes de hacer commit, verifica:

- [ ] Archivo `.env.local` creado y con credenciales
- [ ] `client.ts` usa variables de entorno
- [ ] `UserAvatarDropdown.tsx` usa variables de entorno
- [ ] Aplicación funciona correctamente
- [ ] `.env.local` está en `.gitignore` ✅ (ya configurado)
- [ ] NO hay credenciales hardcodeadas en el código
- [ ] Claves de API rotadas en Supabase
- [ ] Variables configuradas en producción

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "Missing Supabase configuration"

**Causa:** El archivo `.env.local` no existe o está mal nombrado.

**Solución:**
1. Verifica que el archivo se llama exactamente `.env.local` (con el punto al inicio)
2. Verifica que está en la raíz del proyecto
3. Reinicia el servidor de desarrollo

### Error: "import.meta.env.VITE_SUPABASE_URL is undefined"

**Causa:** Las variables deben empezar con `VITE_` para que Vite las exponga.

**Solución:**
Asegúrate que en `.env.local` las variables empiezan con `VITE_`:
```env
VITE_SUPABASE_URL=...  # ✅ Correcto
SUPABASE_URL=...       # ❌ Incorrecto
```

### La aplicación no carga después de los cambios

**Solución:**
1. Detén el servidor (Ctrl+C)
2. Borra la carpeta `.cache` si existe
3. Ejecuta `npm run dev` de nuevo

---

## 📞 AYUDA

Si encuentras problemas, contacta con:
- **Desarrollador Backend:** Para rotación de claves
- **DevOps:** Para configuración en producción

---

**🔴 RECORDATORIO FINAL:** Este cambio es **CRÍTICO** y debe hacerse **HOY**. Las credenciales expuestas son una vulnerabilidad de seguridad grave.
