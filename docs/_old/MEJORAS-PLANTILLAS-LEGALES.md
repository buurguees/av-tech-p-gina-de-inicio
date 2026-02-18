# Mejoras en Plantillas de Presupuestos y Facturas

## Fecha: 9 de enero de 2026

### Objetivo

Mejorar las plantillas de presupuestos y facturas para cumplir con los requisitos legales y fiscales españoles, presentando toda la información necesaria de forma profesional y estructurada.

---

## ✅ Mejoras Implementadas

### 1. Bloque de Datos de la Empresa Emisora

**Antes:** Solo aparecía el logo o nombre de la empresa en el encabezado.

**Ahora:** Bloque completo con todos los datos legales necesarios:

- ✅ Razón social / Nombre comercial
- ✅ NIF/CIF
- ✅ Dirección fiscal completa
- ✅ Código postal y población
- ✅ Provincia
- ✅ Email de facturación
- ✅ Teléfono de contacto

**Ubicación:** Panel izquierdo en la fila de información principal.

**Beneficios:**
- Cumplimiento legal: incluye todos los datos obligatorios
- Profesionalidad: imagen corporativa completa
- Transparencia: el cliente tiene toda la información de contacto

---

### 2. Bloque de Datos del Cliente Mejorado

**Antes:** Información básica del cliente en un solo bloque.

**Ahora:** Bloque estructurado y completo con:

- ✅ Razón social / Nombre comercial
- ✅ NIF/CIF del cliente
- ✅ Dirección de facturación completa
- ✅ Código postal y población
- ✅ Provincia
- ✅ Email de contacto
- ✅ Teléfono de contacto

**Ubicación:** Panel derecho en la fila de información principal.

**Beneficios:**
- Identificación clara del destinatario
- Datos completos para facturación
- Cumple con requisitos legales de identificación

---

### 3. Bloque de Datos del Proyecto Mejorado

**Antes:** Información básica del proyecto (si existía).

**Ahora:** Bloque detallado con:

- ✅ Título: "Datos del Proyecto" (más profesional)
- ✅ Nombre del proyecto destacado
- ✅ Número de proyecto
- ✅ Nombre del local/espacio
- ✅ Dirección del proyecto (con icono 📍)
- ✅ Ciudad del proyecto

**Ubicación:** Después de los datos de empresa y cliente.

**Beneficios:**
- Contexto claro del trabajo a realizar
- Facilita la identificación del proyecto
- Útil cuando un cliente tiene múltiples proyectos

---

### 4. Layout de Dos Columnas

**Novedad:** Disposición lado a lado de Empresa y Cliente.

**Ventajas:**
- Uso eficiente del espacio
- Comparación visual clara
- Diseño más profesional y moderno
- Distinguir claramente emisor vs. receptor

---

### 5. Footer Informativo Mejorado

**Antes:** Solo una nota de validez del presupuesto.

**Ahora:** Footer completo con tres columnas:

1. **Columna Empresa:**
   - Razón social
   - NIF/CIF

2. **Columna Contacto:**
   - Email
   - Teléfono
   - Web (si existe)

3. **Columna Dirección Fiscal:**
   - Dirección completa
   - CP y población

**Beneficios:**
- Refuerzo de la identidad corporativa
- Información de contacto siempre visible
- Cumplimiento con normativa de documentos fiscales

---

### 6. Iconos Visuales

Se han agregado iconos para mejorar la legibilidad:
- 📧 Email
- 📞 Teléfono
- 📍 Dirección/ubicación

**Beneficios:**
- Mejora la escaneabilidad del documento
- Aspecto más moderno
- Facilita encontrar información específica

---

## 📄 Archivos Modificados

### 1. `QuotePDFViewer.tsx`
Componente que genera los PDFs reales de presupuestos descargables.

**Cambios principales:**
- Añadido bloque `companyBox` con datos del emisor
- Mejorado bloque `clientBox` con datos completos
- Actualizado bloque `projectBox` con más detalles
- Agregado layout de dos columnas con `infoRow`
- Footer informativo con tres columnas
- Estilos unificados (boxTitle, boxName, boxDetail)

### 2. `TemplatesTab.tsx`
Componente de vista previa de plantillas en Configuración.

**Cambios principales:**
- Plantilla de presupuesto actualizada con nueva estructura
- Plantilla de factura actualizada con nueva estructura
- Datos de ejemplo más realistas
- Footer informativo en ambas plantillas

---

## 🎨 Diseño Visual

### Colores y Diferenciación

- **Bloque Empresa:** Fondo gris claro (`#f5f5f5`)
- **Bloque Cliente:** Fondo gris medio (`#e8e8e8`)
- **Bloque Proyecto:** Fondo gris muy claro (`#fafafa`)

Esta diferenciación visual ayuda a identificar rápidamente cada sección.

### Tipografía

- **Títulos de sección:** Mayúsculas, 8pt, negrita, espaciado de letras
- **Nombres principales:** 12pt, negrita
- **Detalles:** 9pt, color gris medio

---

## ✓ Cumplimiento Legal

Las plantillas ahora incluyen **todos los datos obligatorios** según la normativa española para documentos fiscales:

### Para Presupuestos:
- ✅ Identificación completa del emisor (empresa)
- ✅ Identificación completa del receptor (cliente)
- ✅ Número de documento
- ✅ Fecha de emisión
- ✅ Fecha de validez
- ✅ Desglose de conceptos con precios e IVA
- ✅ Base imponible
- ✅ IVA desglosado por tipos (21%, 10%, etc.)
- ✅ Total

### Para Facturas (misma estructura):
- ✅ Todos los requisitos anteriores
- ✅ Número de factura
- ✅ Fecha de vencimiento

---

## 🚀 Próximos Pasos Recomendados

1. **Probar las plantillas:**
   - Ir a Configuración > Plantillas
   - Ver la vista previa de presupuesto y factura
   - Descargar un PDF de prueba

2. **Verificar datos de empresa:**
   - Ir a Configuración > Datos de la Empresa
   - Completar TODOS los campos obligatorios
   - Subir el logo de la empresa

3. **Generar presupuesto real:**
   - Crear un presupuesto de prueba
   - Verificar que todos los datos se muestran correctamente
   - Comprobar el PDF generado

4. **Feedback:**
   - Si falta algún dato o hay algún ajuste necesario, reportarlo

---

## 📝 Notas Técnicas

### Estilos Unificados

Se han consolidado los estilos para evitar duplicación:
- `boxTitle` → Títulos de todas las secciones
- `boxName` → Nombres principales (empresa, cliente, proyecto)
- `boxDetail` → Líneas de detalle (dirección, teléfono, etc.)

### Responsividad

Las plantillas mantienen un diseño fijo optimizado para A4, asegurando:
- Impresión profesional
- Exportación a PDF consistente
- Legibilidad en todos los formatos

### Datos Opcionales

Los campos opcionales (como email, teléfono, web) solo se muestran si están configurados, evitando espacios vacíos innecesarios.

---

## ✨ Resumen de Beneficios

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Datos de empresa** | Solo nombre/logo | Completo (NIF, dirección, contacto) |
| **Datos de cliente** | Básicos | Completos y estructurados |
| **Datos de proyecto** | Mínimos | Detallados con ubicación |
| **Layout** | Una columna | Dos columnas eficientes |
| **Footer** | Simple | Informativo con 3 columnas |
| **Cumplimiento legal** | Parcial | ✅ Total |
| **Profesionalidad** | Básica | ⭐⭐⭐⭐⭐ Alta |

---

## 🎯 Impacto

Las mejoras garantizan que tus presupuestos y facturas:
- ✅ Cumplen con la normativa fiscal española
- ✅ Proyectan una imagen profesional
- ✅ Incluyen toda la información necesaria
- ✅ Son fáciles de leer y entender
- ✅ Facilitan la comunicación con clientes
- ✅ Reducen consultas sobre datos de contacto

---

**Documentación creada por:** Sistema NexoAV  
**Fecha:** 9 de enero de 2026  
**Versión:** 1.0
