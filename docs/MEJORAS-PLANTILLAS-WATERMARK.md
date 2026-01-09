# Mejoras Adicionales en Plantillas

## Fecha: 9 de enero de 2026

### Mejoras Implementadas

---

## ✅ 1. Watermark Mejorado con Dos Líneas

### Antes:
```
PRESUPUESTO
(una sola línea, sin número)
```

### Ahora:
```
PRESUPUESTO
P-26-000001
(dos líneas: tipo de documento + número)
```

**Beneficios:**
- ✅ Mayor claridad visual
- ✅ El número del documento es visible en la marca de agua
- ✅ Mejor organización de la información
- ✅ Aspecto más profesional

**Aplicado en:**
- Presupuestos (PRESUPUESTO + P-XX-XXXXXX)
- Facturas (FACTURA + F-XX-XXXXXX)

---

## ✅ 2. Carga de Datos Reales en Vista Previa

### Antes:
Las plantillas de vista previa mostraban **datos de ejemplo fijos**:
- "TU EMPRESA S.L."
- "NIF: B87654321"
- "info@tuempresa.com"
- Logo placeholder

### Ahora:
Las plantillas cargan **datos reales desde la base de datos**:
- ✅ Razón social/nombre comercial real
- ✅ NIF/CIF configurado
- ✅ Dirección fiscal completa
- ✅ Email y teléfono reales
- ✅ Logo real de la empresa (si está subido)
- ✅ Todos los datos de contacto

**Cómo funciona:**
1. Al abrir "Configuración > Plantillas"
2. El sistema carga automáticamente los datos de "Datos de la Empresa"
3. Muestra un loader mientras carga
4. Renderiza las plantillas con tus datos reales

**Beneficios:**
- ✅ Previsualización 100% real
- ✅ Ves exactamente cómo se verán tus documentos
- ✅ Puedes verificar el espacio que ocupa tu logo
- ✅ Compruebas que todos los datos son correctos
- ✅ Detectas errores antes de generar documentos

---

## 🎨 Detalles Técnicos

### Estilos del Watermark

```typescript
watermark: {
  position: "absolute",
  top: "40%",
  left: "10%",
  transform: "rotate(-45deg)",
  opacity: 0.3,
}

watermarkText: {
  fontSize: 70,          // Texto principal grande
  letterSpacing: 15,
  marginBottom: 5,       // Separación entre líneas
}

watermarkNumber: {
  fontSize: 32,          // Número más pequeño
  letterSpacing: 8,
}
```

### Carga de Datos

La función `fetchCompanySettings()` carga:
- `legal_name` → Razón social
- `commercial_name` → Nombre comercial
- `tax_id` → NIF/CIF
- `fiscal_address` → Dirección completa
- `fiscal_postal_code` + `fiscal_city` → CP y población
- `fiscal_province` → Provincia
- `billing_email` → Email de facturación
- `billing_phone` → Teléfono
- `website` → Página web
- `logo_url` → URL del logo subido

---

## 📁 Archivos Modificados

### 1. `QuotePDFViewer.tsx`
**Cambios:**
- Watermark en dos líneas con número dinámico
- Estilos actualizados (watermarkText, watermarkNumber)

### 2. `TemplatesTab.tsx`
**Cambios principales:**
- Importación de Supabase y hooks necesarios
- Estado para almacenar datos de la empresa
- Función `fetchCompanySettings()` para cargar datos
- Loader mientras carga los datos
- Paso de datos reales a las plantillas
- Soporte para mostrar logo real con `<Image>`
- Watermark mejorado en ambas plantillas

**Código agregado:**
```typescript
const [company, setCompany] = useState<CompanySettings | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchCompanySettings();
}, []);
```

---

## 🚀 Cómo Probar las Mejoras

### 1. Verifica tus Datos de Empresa
```
Configuración > Datos de la Empresa
```
- Completa todos los campos
- Sube tu logo (PNG/JPG con fondo transparente recomendado)
- Guarda los cambios

### 2. Ve la Vista Previa Real
```
Configuración > Plantillas
```
- Verás un loader brevemente mientras carga
- La plantilla mostrará TU logo real
- Todos los datos son los tuyos configurados
- El watermark muestra el formato de dos líneas

### 3. Comprueba el Watermark
Fíjate en la marca de agua diagonal:
```
PRESUPUESTO
P-26-000001
```
o
```
FACTURA
F-26-000001
```

---

## 📊 Comparativa Visual

### WATERMARK

**Antes:**
```
┌─────────────────────────────┐
│                             │
│     PRESUPUESTO             │
│   (diagonal, una línea)     │
│                             │
└─────────────────────────────┘
```

**Ahora:**
```
┌─────────────────────────────┐
│                             │
│     PRESUPUESTO             │
│     P-26-000001             │
│   (diagonal, dos líneas)    │
│                             │
└─────────────────────────────┘
```

### DATOS DE EMPRESA

**Antes (vista previa):**
```
┌───────────────────┐
│ LOGO EMPRESA      │  ← Placeholder
│ TU EMPRESA S.L.   │  ← Datos de ejemplo
│ NIF: B87654321    │  ← Datos de ejemplo
└───────────────────┘
```

**Ahora (vista previa):**
```
┌───────────────────┐
│ [TU LOGO REAL]    │  ← Logo subido
│ AV TECH EVENTS SL │  ← Tu nombre real
│ NIF: B75835728    │  ← Tu NIF real
│ C/ Francesc...    │  ← Tu dirección real
└───────────────────┘
```

---

## 💡 Beneficios Clave

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Watermark** | 1 línea | 2 líneas con número |
| **Vista previa** | Datos ficticios | Datos reales desde BD |
| **Logo** | Placeholder texto | Logo real si está subido |
| **Verificación** | Manual | Visual e inmediata |
| **Precisión** | Aproximada | 100% exacta |

---

## 🔄 Flujo de Trabajo Mejorado

### Anterior:
1. Configurar datos de empresa
2. Ver plantilla con datos de ejemplo
3. **Generar presupuesto real para verificar**
4. Ajustar si es necesario
5. Repetir

### Nuevo:
1. Configurar datos de empresa
2. **Ver plantilla con datos reales inmediatamente**
3. Verificar y ajustar en tiempo real
4. ✅ Generar documentos con confianza

---

## 📝 Notas Importantes

### Logo
- **Formato recomendado:** PNG con fondo transparente
- **Tamaño máximo:** 5MB
- **Dimensiones recomendadas:** 600x200px (ratio 3:1)
- **Ubicación:** Se muestra en la esquina superior izquierda

### Watermark
- **Rotación:** 45° diagonal
- **Opacidad:** 30% (no distrae del contenido)
- **Posición:** Centro del documento
- **Siempre visible:** En todas las páginas del documento

### Datos Opcionales
Si no tienes configurados:
- Logo → Se muestra el nombre de la empresa
- Email → No se muestra (sin placeholder)
- Teléfono → No se muestra (sin placeholder)
- Web → No se muestra (sin placeholder)

---

## ✨ Resumen

### Lo que mejoraste:

1. **Watermark profesional** 📄
   - Dos líneas
   - Incluye número de documento
   - Mejor legibilidad

2. **Vista previa realista** 👁️
   - Datos reales desde BD
   - Logo real si está subido
   - Sin datos ficticios

3. **Flujo de trabajo optimizado** ⚡
   - Verificación inmediata
   - Sin necesidad de generar PDFs de prueba
   - Ajustes en tiempo real

---

## 🎯 Próximos Pasos

1. **Completa tus datos:**
   - Ve a Configuración > Datos de la Empresa
   - Completa todos los campos obligatorios
   - Sube tu logo

2. **Verifica la vista previa:**
   - Ve a Configuración > Plantillas
   - Comprueba que todo se ve correcto
   - Verifica el espacio del logo

3. **Genera tu primer documento real:**
   - Crea un presupuesto de prueba
   - Descarga el PDF
   - ¡Listo para enviar a clientes!

---

**Commit:** `026ff0c`  
**Fecha:** 9 de enero de 2026  
**Versión:** 2.0
