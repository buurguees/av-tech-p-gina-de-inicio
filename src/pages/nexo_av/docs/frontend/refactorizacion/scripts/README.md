# Scripts de Migración CSS → CSS Modules

## 📁 Contenido

Este directorio contiene scripts PowerShell automatizados para facilitar la refactorización de la arquitectura CSS de Nexo AV.

---

## 🛠️ Scripts Disponibles

### 1. `backup-css-files.ps1`
**Propósito**: Crear un backup completo de todos los archivos CSS antes de iniciar la migración.

**Uso**:
```powershell
.\backup-css-files.ps1
```

**Salida**:
- Crea carpeta `styles_BACKUP_[fecha]` con copia de todos los CSS
- Muestra estadísticas de archivos respaldados
- Proporciona instrucciones para restaurar si es necesario

**Cuándo usarlo**: ⚠️ **ANTES de cualquier migración**

---

### 2. `check-orphan-css.ps1`
**Propósito**: Detectar archivos CSS que no se importan en ningún componente TypeScript.

**Uso**:
```powershell
.\check-orphan-css.ps1
```

**Salida**:
- Lista de archivos CSS huérfanos (candidatos a eliminación)
- Lista de archivos CSS en uso con número de referencias
- Estadísticas resumidas

**Cuándo usarlo**: 
- Antes de la migración para identificar código muerto
- Después de la migración para validar limpieza

---

### 3. `count-fragile-selectors.ps1`
**Propósito**: Contar selectores frágiles `[class*="..."]` y usos de `!important`.

**Uso**:
```powershell
.\count-fragile-selectors.ps1
```

**Salida**:
- Número total de selectores `[class*="..."]` por archivo
- Número total de `!important` por archivo
- Top 10 archivos con más problemas

**Cuándo usarlo**: 
- Antes de la migración (baseline)
- Durante la migración (progreso)
- Después de la migración (validar que se eliminaron)

---

### 4. `migrate-component.ps1`
**Propósito**: Automatizar la creación del CSS Module para un componente específico.

**Uso básico**:
```powershell
.\migrate-component.ps1 -ComponentName "DropDown"
```

**Uso con subfolder personalizado**:
```powershell
.\migrate-component.ps1 -ComponentName "TabNav" -ComponentSubfolder "navigation"
```

**Parámetros**:
- `ComponentName` (obligatorio): Nombre del componente en PascalCase
- `ComponentSubfolder` (opcional): Subcarpeta dentro de `components/` (default: "common")

**Lo que hace**:
1. ✅ Valida que existe el componente TSX
2. ✅ Busca el archivo CSS correspondiente (prueba múltiples formatos)
3. ✅ Crea el CSS Module (`.module.css`)
4. ✅ Analiza el CSS para detectar patrones
5. ✅ Genera instrucciones paso a paso para completar la migración

**Lo que NO hace (requiere intervención manual)**:
- ❌ Adaptar selectores en el CSS Module
- ❌ Actualizar imports en el TSX
- ❌ Reemplazar clases con `styles.className`
- ❌ Agregar Portal si es necesario
- ❌ Eliminar el archivo CSS antiguo

**Cuándo usarlo**: Para cada componente que se va a migrar

---

## 📊 Flujo de Trabajo Recomendado

### Antes de Empezar
```powershell
# 1. Crear backup
.\backup-css-files.ps1

# 2. Identificar archivos huérfanos
.\check-orphan-css.ps1

# 3. Establecer baseline de selectores frágiles
.\count-fragile-selectors.ps1
```

### Para Cada Componente
```powershell
# 4. Migrar componente
.\migrate-component.ps1 -ComponentName "NombreComponente"

# 5. Seguir instrucciones manuales generadas
# 6. Validar visualmente
# 7. Eliminar CSS antiguo
```

### Después de Completar
```powershell
# 8. Validar eliminación de selectores frágiles
.\count-fragile-selectors.ps1

# 9. Verificar que no quedan huérfanos
.\check-orphan-css.ps1
```

---

## 🎯 Objetivos de la Migración

### Métricas a Alcanzar
- ✅ **Selectores `[class*="..."]`**: 841 → 0
- ✅ **Usos de `!important`**: 1,423 → < 50
- ✅ **global.css**: 5,150 líneas → < 200 líneas
- ✅ **Archivos huérfanos**: 0 detectados → 0 después

---

## ⚠️ Advertencias

1. **Siempre crear backup antes de modificar**: Usa `backup-css-files.ps1`
2. **Validar visualmente después de cada componente**: No migrar todos a la vez
3. **No eliminar CSS antiguo hasta confirmar que funciona**: Espera a validar
4. **Los scripts NO ejecutan cambios destructivos**: Todo es manual después de `migrate-component.ps1`

---

## 💡 Tips

### Si algo sale mal
```powershell
# Restaurar backup (reemplaza FECHA con la fecha del backup)
$backupDir = "..\..\..\..\src\pages\nexo_av\desktop\styles_BACKUP_[FECHA]"
$currentStyles = "..\..\..\..\src\pages\nexo_av\desktop\styles"

Remove-Item $currentStyles -Recurse -Force
Copy-Item $backupDir $currentStyles -Recurse
```

### Para ver ayuda de un script
```powershell
Get-Help .\migrate-component.ps1 -Detailed
```

### Para migrar múltiples componentes del mismo subfolder
```powershell
$components = @("TabNav", "DetailActionButton", "DetailNavigationBar")
foreach ($comp in $components) {
  .\migrate-component.ps1 -ComponentName $comp -ComponentSubfolder "navigation"
}
```

---

## 📚 Referencias

- **Análisis completo**: `../ANALISIS_NEXO_AV_REFACTORIZACION_CSS.md`
- **Reporte final**: `../REPORTE_FINAL_REFACTORIZACION.md`
- **Ejemplo de migración**: `../MIGRACION_DropDown.md`
- **Nuevo global.css**: `../global.css.NUEVO`

---

**Última actualización**: 2026-01-25
**Autor**: AI Frontend Architect
