# ============================================
# CHECK ORPHAN CSS FILES
# Detecta archivos CSS que no se importan
# en ningún componente TypeScript
# ============================================

$projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
$stylesPath = Join-Path $projectRoot "src\pages\nexo_av\desktop\styles\components"
$componentsPath = Join-Path $projectRoot "src\pages\nexo_av\desktop\components"

Write-Host "🔍 Buscando archivos CSS huérfanos..." -ForegroundColor Cyan
Write-Host "CSS Path: $stylesPath"
Write-Host "Components Path: $componentsPath"
Write-Host ""

if (-not (Test-Path $stylesPath)) {
  Write-Host "❌ No se encontró la carpeta de estilos" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $componentsPath)) {
  Write-Host "❌ No se encontró la carpeta de componentes" -ForegroundColor Red
  exit 1
}

$cssFiles = Get-ChildItem -Path $stylesPath -Filter "*.css" -Recurse
$orphans = @()
$inUse = @()

foreach ($cssFile in $cssFiles) {
  $fileName = $cssFile.Name
  $relativePath = $cssFile.FullName.Replace($projectRoot, "").Replace("\", "/")
  
  # Buscar imports en archivos TSX
  $imports = Select-String -Path "$componentsPath\**\*.tsx" -Pattern $fileName -ErrorAction SilentlyContinue
  
  if ($imports.Count -eq 0) {
    $orphans += [PSCustomObject]@{
      File = $fileName
      Path = $relativePath
      Size = [math]::Round($cssFile.Length / 1KB, 2)
    }
    Write-Host "⚠️  Posible huérfano: $fileName" -ForegroundColor Yellow
  } else {
    $inUse += [PSCustomObject]@{
      File = $fileName
      Path = $relativePath
      UsedBy = $imports.Count
    }
    Write-Host "✅ En uso: $fileName ($($imports.Count) referencias)" -ForegroundColor Green
  }
}

Write-Host "`n" + ("=" * 60)
Write-Host "📊 RESUMEN" -ForegroundColor Cyan
Write-Host ("=" * 60)
Write-Host "Total archivos CSS: $($cssFiles.Count)" -ForegroundColor White
Write-Host "En uso: $($inUse.Count)" -ForegroundColor Green
Write-Host "Huérfanos detectados: $($orphans.Count)" -ForegroundColor Yellow

if ($orphans.Count -gt 0) {
  Write-Host "`n⚠️  ARCHIVOS HUÉRFANOS (candidatos a eliminación):" -ForegroundColor Yellow
  $orphans | Format-Table -Property File, Path, @{Name="Size (KB)";Expression={$_.Size}} -AutoSize
  
  Write-Host "`n💡 Para eliminar un archivo huérfano:" -ForegroundColor Cyan
  Write-Host "   Remove-Item 'path/to/file.css'"
} else {
  Write-Host "`n🎉 No se detectaron archivos CSS huérfanos!" -ForegroundColor Green
}
