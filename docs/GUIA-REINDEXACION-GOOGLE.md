# 🔄 Guía: Cómo Actualizar tu Sitio en Google

## 🎯 Problema Actual

Google está mostrando **contenido antiguo** de tu web:
- ❌ Título: "Landing Page Corporativa AV TECH"
- ❌ Descripción: "Descubre cómo transformamos tu espacio —Corporate"
- ❌ Sin logo
- ❌ Sin rich snippets
- ❌ Sin información adicional

**Razón**: Google tiene tu sitio en **caché** con una versión anterior. Todavía no ha rastreado los cambios nuevos.

---

## ✅ Solución en 3 Pasos

### 📍 PASO 1: Desplegar los Cambios a Producción (AHORA)

#### Opción A: Si usas Firebase (según tu package.json)

```bash
# Desplegar a producción
npm run deploy
```

Esto ejecutará:
1. `npm run build` (ya hecho ✅)
2. `firebase deploy`

#### Opción B: Despliegue Manual

Si usas otro servicio (Netlify, Vercel, etc.), sube la carpeta `build/` a tu hosting.

**IMPORTANTE**: ¡Verifica que se haya desplegado correctamente visitando `https://avtechesdeveniments.com`!

---

### 📍 PASO 2: Configurar Google Search Console (15 minutos)

#### 2.1 Acceder a Google Search Console

1. Ve a: **https://search.google.com/search-console**
2. Inicia sesión con tu cuenta de Google
3. Clic en **"Añadir propiedad"**

#### 2.2 Verificar Propiedad (Elige UNA opción)

**OPCIÓN 1 - Prefijo de URL** (Recomendado):
```
1. Selecciona "Prefijo de URL"
2. Introduce: https://avtechesdeveniments.com
3. Clic en "Continuar"
```

**OPCIÓN 2 - Dominio** (Requiere acceso DNS):
```
1. Selecciona "Dominio"
2. Introduce: avtechesdeveniments.com
3. Copia el registro TXT que te dan
4. Añádelo a tu DNS
5. Clic en "Verificar"
```

#### 2.3 Métodos de Verificación

Google te ofrecerá varios métodos. El más fácil:

**A) Archivo HTML** (Más rápido):
```
1. Descarga el archivo HTML que te da Google
   Ejemplo: google1234567890abcdef.html

2. Súbelo a la carpeta public/ de tu proyecto

3. Reconstruye y despliega:
   npm run build
   npm run deploy

4. Verifica que funciona:
   https://avtechesdeveniments.com/google1234567890abcdef.html

5. Vuelve a Google Search Console y clic en "Verificar"
```

**B) Meta Tag HTML** (Si no puedes subir archivos):
```
1. Google te dará un código como:
   <meta name="google-site-verification" content="ABC123..." />

2. Añádelo a index.html en la sección <head>
   (Ya está preparado, solo quita el comentario y añade tu código)

3. Guarda, reconstruye y despliega

4. Vuelve a Google Search Console y clic en "Verificar"
```

---

### 📍 PASO 3: Solicitar Indexación Inmediata

Una vez verificado en Google Search Console:

#### 3.1 Enviar Sitemap

```
1. En el menú lateral → "Sitemaps"

2. En "Añadir un nuevo sitemap" escribe:
   sitemap.xml

3. Clic en "Enviar"

4. Estado debería cambiar a "Correcto" ✅
```

#### 3.2 Solicitar Indexación de la Página Principal

```
1. En el menú lateral → "Inspección de URLs"

2. Introduce:
   https://avtechesdeveniments.com

3. Espera 10-20 segundos mientras analiza

4. Verás uno de estos mensajes:
   - "La URL está en Google" (bien)
   - "La URL no está en Google" (hay que indexar)

5. Clic en "SOLICITAR INDEXACIÓN"

6. Espera 1-2 minutos (no cierres la ventana)

7. Aparecerá: "Se ha solicitado la indexación"
```

#### 3.3 Repetir para Páginas Importantes

Repite el proceso para:
- `https://avtechesdeveniments.com/#productos`
- `https://avtechesdeveniments.com/#proyectos`
- `https://avtechesdeveniments.com/#contacto`
- `https://avtechesdeveniments.com/privacidad`
- `https://avtechesdeveniments.com/terminos`

---

## ⏰ ¿Cuánto tarda en actualizarse?

### Tiempos esperados:

```
Solicitar indexación:       Inmediato (1-2 min)
Primera rastreada:          24-48 horas
Actualización en SERP:      2-7 días
Rich snippets visibles:     1-2 semanas
Posicionamiento mejorado:   2-4 semanas
```

### Seguimiento

**Día 1-2**: Google rastrea la nueva versión
**Día 3-7**: Nuevo título y descripción aparecen
**Día 7-14**: Rich snippets (estrellas, FAQ) empiezan a mostrarse
**Día 14-30**: Mejora de posiciones en búsquedas

---

## 🔍 Cómo Verificar que Funcionó

### Test 1: Ver versión en caché de Google (Después de 24-48h)

```
1. Busca en Google: site:avtechesdeveniments.com

2. Clic en los 3 puntos junto al resultado

3. Clic en "En caché"

4. Deberías ver el nuevo título y contenido
```

### Test 2: Herramienta de Inspección de URLs

```
1. Google Search Console → Inspección de URLs

2. Introduce: https://avtechesdeveniments.com

3. Debería mostrar:
   - Última rastreada: [Fecha reciente]
   - Indexación: Permitida
   - Cobertura: Válida
```

### Test 3: Búsqueda Manual

Busca en Google (modo incógnito):
```
av tech barcelona
pantallas led barcelona
avtechesdeveniments
```

Deberías ver:
- ✅ Nuevo título con "Barcelona"
- ✅ Nueva descripción con "500 proyectos"
- ✅ Estrellas ⭐⭐⭐⭐⭐ 4.9
- ✅ Preguntas frecuentes expandibles

---

## 🚨 Solución de Problemas

### Problema 1: "Verificación fallida"

**Solución**:
- Verifica que el archivo/meta tag esté realmente en producción
- Espera 5 minutos y vuelve a intentar
- Usa el método alternativo (si usaste archivo, prueba con meta tag)

### Problema 2: "Sitemap no se puede leer"

**Solución**:
```
1. Verifica que sitemap.xml está en:
   https://avtechesdeveniments.com/sitemap.xml

2. Abre la URL en tu navegador
   Deberías ver el XML

3. Si da error 404:
   - Revisa que está en la carpeta public/
   - Reconstruye: npm run build
   - Redespliega: npm run deploy
```

### Problema 3: "Indexación solicitada pero no aparece en Google"

**Solución**:
- Es normal, puede tardar 2-7 días
- Verifica en Google Search Console → Cobertura
- Si pasados 7 días no aparece, revisa el robots.txt
- Verifica que no haya errores en "Cobertura"

### Problema 4: "Aparece pero con el contenido antiguo"

**Solución**:
- Espera 48-72 horas más
- Solicita indexación de nuevo
- Verifica que la versión desplegada tiene los cambios
- Limpia caché del sitio en Google (usar herramienta de eliminación de URLs)

---

## 📊 Monitoreo Post-Indexación

### En Google Search Console (Revisar semanalmente):

**1. Rendimiento**
```
Menú → Rendimiento
  - Clics: ¿está aumentando?
  - Impresiones: ¿está creciendo?
  - CTR: ¿es >3%?
  - Posición: ¿está mejorando?
```

**2. Cobertura**
```
Menú → Cobertura
  - Válidas: ¿todas las páginas?
  - Errores: ¿0?
  - Excluidas: ¿ninguna importante?
```

**3. Mejoras**
```
Menú → Mejoras
  - Datos estructurados: ¿detectados?
  - FAQ: ¿visible?
  - Organización: ¿reconocida?
```

**4. Enlaces**
```
Menú → Enlaces
  - Enlaces externos: ¿aumentando?
  - Enlaces internos: ¿distribución correcta?
```

---

## 🎯 Qué Esperar en los Próximos Días

### Día 1 (HOY):
```
✅ Desplegar cambios a producción
✅ Configurar Google Search Console
✅ Solicitar indexación homepage
⏰ Tiempo: 30-45 minutos
```

### Día 2-3:
```
🔍 Google rastrea tu sitio
📊 Aparece en "Páginas indexadas"
⏰ Verificar en GSC: Cobertura → Válidas
```

### Día 3-7:
```
✨ Nuevo título aparece en búsquedas
📝 Nueva descripción visible
⏰ Buscar: "av tech barcelona" en incógnito
```

### Día 7-14:
```
⭐ Rich snippets empiezan a mostrarse
❓ FAQ visible en algunos resultados
📈 CTR aumenta (check en GSC)
```

### Día 14-30:
```
🚀 Posicionamiento mejora
📊 Tráfico orgánico +50-100%
💼 Primeros leads desde Google
```

---

## ✅ Checklist Rápido

Usa esto como guía:

```
[ ] 1. Desplegar cambios (npm run deploy)
[ ] 2. Verificar en navegador que los cambios están en producción
[ ] 3. Crear cuenta Google Search Console
[ ] 4. Verificar propiedad del sitio
[ ] 5. Enviar sitemap.xml
[ ] 6. Solicitar indexación de homepage
[ ] 7. Solicitar indexación de páginas principales
[ ] 8. Esperar 24-48 horas
[ ] 9. Verificar en "Inspección de URLs"
[ ] 10. Buscar en Google (incógnito) para ver cambios
```

---

## 🔗 Enlaces Útiles

**Google Search Console**
https://search.google.com/search-console

**Herramienta de Prueba de Resultados Enriquecidos**
https://search.google.com/test/rich-results

**PageSpeed Insights**
https://pagespeed.web.dev/

**Facebook Sharing Debugger**
https://developers.facebook.com/tools/debug/

**Twitter Card Validator**
https://cards-dev.twitter.com/validator

**Structured Data Testing Tool**
https://validator.schema.org/

---

## 💡 Tips Pro

### 1. Acelerar Indexación
```
- Comparte tu web en redes sociales (genera señales)
- Añade enlaces internos entre páginas
- Consigue 2-3 backlinks de sitios conocidos
- Envía URL a Google vía formulario público
```

### 2. Maximizar Rich Snippets
```
- Asegúrate que el Schema.org está sin errores
- Usa la herramienta de prueba de resultados enriquecidos
- Verifica FAQ, Rating y Organization schemas
- Puede tardar 2 semanas en aparecer, es normal
```

### 3. Monitoreo Efectivo
```
- Configura alertas en Google Search Console
- Revisa "Rendimiento" cada lunes
- Anota mejoras semanales
- Ajusta estrategia según datos
```

---

## 🎁 Bonus: Forzar Actualización de Caché

Si después de 7 días Google sigue mostrando contenido antiguo:

### Opción 1: Herramienta de Eliminación de URLs
```
1. Google Search Console → Herramientas y informes antiguos
2. Clic en "Eliminación de URLs"
3. Clic en "Nueva solicitud"
4. Selecciona "Borrar URL en caché"
5. Introduce: https://avtechesdeveniments.com
6. Clic en "Enviar"
```

### Opción 2: Actualización Forzada
```
1. Cambia algo menor en index.html (un espacio)
2. Reconstruye y despliega
3. Solicita indexación de nuevo en GSC
4. Google lo detectará como "contenido actualizado"
```

---

## 📞 Próximos Pasos INMEDIATOS

**AHORA MISMO (30 minutos)**:
1. Despliega los cambios: `npm run deploy`
2. Verifica en: `https://avtechesdeveniments.com`
3. Configura Google Search Console
4. Solicita indexación

**MAÑANA**:
5. Verifica estado en Google Search Console
6. Configura Google Business Profile

**EN 7 DÍAS**:
7. Busca "av tech barcelona" en Google
8. Verifica que aparecen los cambios
9. Celebra 🎉

---

## ❓ FAQ

**P: ¿Perderé mi posicionamiento actual al reindexar?**
R: No, mejorará. Los cambios son positivos (mejor SEO).

**P: ¿Puedo acelerar el proceso?**
R: Sí, solicitando indexación en GSC y compartiendo en redes.

**P: ¿Google cobra por usar Search Console?**
R: No, es 100% gratuito.

**P: ¿Necesito hacer esto cada vez que hago cambios?**
R: No, solo al principio. Luego Google rastrea automáticamente cada 7-30 días.

**P: ¿Los rich snippets aparecerán inmediatamente?**
R: No, pueden tardar 1-2 semanas. Es normal.

---

## 🏆 Resultado Final Esperado

**En Google (después de 7-14 días)**:

```
┌─────────────────────────────────────────────────────┐
│ AV TECH | Pantallas LED Barcelona, Cartelería      │
│ Digital y Soluciones Audiovisuales Profesionales   │
│ https://avtechesdeveniments.com                     │
│ ⭐⭐⭐⭐⭐ 4.9 - 127 reseñas                         │
│                                                     │
│ Especialistas en soluciones audiovisuales en        │
│ Barcelona y toda España: instalación de pantallas   │
│ LED, cartelería digital, publicidad digital...      │
│                                                     │
│ ▼ Preguntas frecuentes                             │
│   • ¿Qué servicios audiovisuales ofrece AV TECH?   │
│   • ¿En qué zonas opera AV TECH?                   │
│   • ¿Cuánto cuesta instalar una pantalla LED?      │
│                                                     │
│ 📍 Barcelona, Cataluña · ⏰ Lun-Vie: 09:00-18:00   │
│ 📞 +34-XXX-XXX-XXX                                  │
└─────────────────────────────────────────────────────┘
```

**¡Eso es lo que vas a lograr! 🚀**

---

*Última actualización: 30 de Diciembre de 2025*
*Cualquier duda, consulta los documentos SEO-STRATEGY.md y PROXIMOS-PASOS.md*

