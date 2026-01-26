# ============================================
# BACKUP CSS FILES
# Crea un backup completo de todos los archivos CSS
# antes de iniciar la migración
# ============================================

$projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
$stylesPath = Join-Path $projectRoot "src\pages\nexo_av\desktop\styles"
$backupDir = Join-Path $projectRoot "src\pages\nexo_av\desktop\styles_BACKUP_$(Get-Date -Format 'yyyy-MM-dd_HHmmss')"

Write-Host "🔄 Iniciando backup de archivos CSS..." -ForegroundColor Cyan
Write-Host "Origen: $stylesPath"
Write-Host "Destino: $backupDir"

if (Test-Path $stylesPath) {
  try {
    Copy-Item -Path $stylesPath -Destination $backupDir -Recurse -ErrorAction Stop
    Write-Host "✅ Backup creado exitosamente en:" -ForegroundColor Green
    Write-Host "   $backupDir" -ForegroundColor Green
    
    # Contar archivos CSS respaldados
    $cssCount = (Get-ChildItem -Path $backupDir -Filter "*.css" -Recurse).Count
    Write-Host "`n📊 Total de archivos CSS respaldados: $cssCount" -ForegroundColor Yellow
    
  } catch {
    Write-Host "❌ Error al crear backup: $_" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "❌ No se encontró la carpeta de estilos: $stylesPath" -ForegroundColor Red
  exit 1
}

Write-Host "`n💡 Para restaurar el backup:" -ForegroundColor Cyan
Write-Host "   Remove-Item '$stylesPath' -Recurse -Force"
Write-Host "   Copy-Item '$backupDir' '$stylesPath' -Recurse"
