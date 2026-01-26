# ============================================
# MIGRATE COMPONENT TO CSS MODULE
# Plantilla automatizada para migrar un componente
# desde CSS global a CSS Module
# ============================================

param(
  [Parameter(Mandatory=$true)]
  [string]$ComponentName,
  
  [Parameter(Mandatory=$false)]
  [string]$ComponentSubfolder = "common"
)

$projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
$componentPath = Join-Path $projectRoot "src\pages\nexo_av\desktop\components\$ComponentSubfolder"
$cssPath = Join-Path $projectRoot "src\pages\nexo_av\desktop\styles\components\$ComponentSubfolder"

Write-Host "🚀 Iniciando migración de componente: $ComponentName" -ForegroundColor Cyan
Write-Host "Carpeta: $ComponentSubfolder"
Write-Host ""

# Validar que existe el componente TSX
$tsxPath = Join-Path $componentPath "$ComponentName.tsx"
if (-not (Test-Path $tsxPath)) {
  Write-Host "❌ No se encontró el componente: $tsxPath" -ForegroundColor Red
  Write-Host "💡 Asegúrate de que el nombre sea correcto y esté en la carpeta correcta" -ForegroundColor Yellow
  Write-Host "   Usa el parámetro -ComponentSubfolder si no está en 'common'" -ForegroundColor Yellow
  exit 1
}
Write-Host "✅ Componente encontrado: $ComponentName.tsx" -ForegroundColor Green

# Buscar archivo CSS (puede estar en minúsculas o kebab-case)
$possibleCssNames = @(
  "$($ComponentName.ToLower()).css",
  "$($ComponentName -creplace '([A-Z])', '-$1').css".TrimStart('-').ToLower()
)

$oldCssPath = $null
foreach ($cssName in $possibleCssNames) {
  $testPath = Join-Path $cssPath $cssName
  if (Test-Path $testPath) {
    $oldCssPath = $testPath
    break
  }
}

if ($null -eq $oldCssPath) {
  Write-Host "⚠️  No se encontró archivo CSS existente para $ComponentName" -ForegroundColor Yellow
  Write-Host "   Buscado en: $cssPath" -ForegroundColor Yellow
  Write-Host "   Nombres probados: $($possibleCssNames -join ', ')" -ForegroundColor Yellow
  Write-Host "`n💡 Si el componente ya usa Tailwind directo, no necesita migración CSS" -ForegroundColor Cyan
  exit 0
}

Write-Host "✅ CSS encontrado: $([System.IO.Path]::GetFileName($oldCssPath))" -ForegroundColor Green

# Paso 1: Crear CSS Module
$moduleCssPath = Join-Path $componentPath "$ComponentName.module.css"
if (Test-Path $moduleCssPath) {
  Write-Host "⚠️  Ya existe un CSS Module: $moduleCssPath" -ForegroundColor Yellow
  $overwrite = Read-Host "¿Deseas sobrescribirlo? (s/n)"
  if ($overwrite -ne "s") {
    Write-Host "❌ Operación cancelada" -ForegroundColor Red
    exit 0
  }
}

try {
  Copy-Item $oldCssPath $moduleCssPath -Force
  Write-Host "✅ CSS Module creado: $ComponentName.module.css" -ForegroundColor Green
} catch {
  Write-Host "❌ Error al crear CSS Module: $_" -ForegroundColor Red
  exit 1
}

# Analizar el CSS original para detectar patrones
$cssContent = Get-Content $oldCssPath -Raw
$classPattern = '\.' + $ComponentName.ToLower() + '[_-]'
$classMatches = [regex]::Matches($cssContent, $classPattern + '\w+')

Write-Host "`n📊 Análisis del CSS:" -ForegroundColor Cyan
Write-Host "   Líneas de código: $((Get-Content $oldCssPath).Count)" -ForegroundColor White
Write-Host "   Clases detectadas: $($classMatches.Count)" -ForegroundColor White

if ($classMatches.Count -gt 0) {
  Write-Host "   Ejemplos:" -ForegroundColor White
  $classMatches | Select-Object -First 5 -ExpandProperty Value | ForEach-Object {
    Write-Host "     - $_" -ForegroundColor Gray
  }
}

# Verificar si el componente TSX importa el CSS
$tsxContent = Get-Content $tsxPath -Raw
$hasImport = $tsxContent -match "import.*$([System.IO.Path]::GetFileName($oldCssPath))"

if ($hasImport) {
  Write-Host "✅ El componente SÍ importa el CSS (requiere actualización)" -ForegroundColor Green
} else {
  Write-Host "⚠️  El componente NO importa el CSS (puede ser huérfano)" -ForegroundColor Yellow
}

# Instrucciones finales
Write-Host "`n" + ("=" * 60)
Write-Host "📝 PRÓXIMOS PASOS MANUALES" -ForegroundColor Cyan
Write-Host ("=" * 60)
Write-Host ""
Write-Host "1️⃣  Adaptar selectores en el CSS Module:" -ForegroundColor Yellow
Write-Host "    Archivo: $moduleCssPath" -ForegroundColor White
Write-Host "    • Cambiar .$($ComponentName.ToLower())__element → .element" -ForegroundColor Gray
Write-Host "    • Cambiar .$($ComponentName.ToLower())--modifier → .modifier" -ForegroundColor Gray
Write-Host "    • Mantener variables CSS (var(--...))" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Actualizar el componente TSX:" -ForegroundColor Yellow
Write-Host "    Archivo: $tsxPath" -ForegroundColor White
Write-Host "    • Reemplazar:" -ForegroundColor Gray
Write-Host "      import '.../$([System.IO.Path]::GetFileName($oldCssPath))'" -ForegroundColor DarkGray
Write-Host "      con:" -ForegroundColor Gray
Write-Host "      import styles from './$ComponentName.module.css'" -ForegroundColor DarkGray
Write-Host ""
Write-Host "    • Reemplazar clases:" -ForegroundColor Gray
Write-Host "      className=`"$($ComponentName.ToLower())-container`"" -ForegroundColor DarkGray
Write-Host "      con:" -ForegroundColor Gray
Write-Host "      className={styles.container}" -ForegroundColor DarkGray
Write-Host ""

Write-Host "3️⃣  Si el componente necesita Portal (dropdowns, modals):" -ForegroundColor Yellow
Write-Host "    • Agregar: import { createPortal } from 'react-dom'" -ForegroundColor Gray
Write-Host "    • Envolver el elemento en createPortal(..., document.body)" -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  Validar:" -ForegroundColor Yellow
Write-Host "    • Ejecutar linter" -ForegroundColor Gray
Write-Host "    • Verificar que no hay errores TypeScript" -ForegroundColor Gray
Write-Host "    • Validar visualmente en el navegador" -ForegroundColor Gray
Write-Host ""

Write-Host "5️⃣  Eliminar archivo CSS antiguo:" -ForegroundColor Yellow
Write-Host "    Remove-Item '$oldCssPath'" -ForegroundColor White
Write-Host ""

Write-Host "💡 Referencia: docs/frontend/refactorizacion/MIGRACION_DropDown.md" -ForegroundColor Cyan
