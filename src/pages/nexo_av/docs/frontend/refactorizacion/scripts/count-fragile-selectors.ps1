# ============================================
# COUNT FRAGILE SELECTORS
# Cuenta selectores [class*="..."] en archivos CSS
# Estos selectores son frágiles y deben eliminarse
# ============================================

$projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
$stylesPath = Join-Path $projectRoot "src\pages\nexo_av\desktop\styles"

Write-Host "🔍 Contando selectores frágiles [class*='...']..." -ForegroundColor Cyan
Write-Host "Path: $stylesPath"
Write-Host ""

if (-not (Test-Path $stylesPath)) {
  Write-Host "❌ No se encontró la carpeta de estilos" -ForegroundColor Red
  exit 1
}

$files = Get-ChildItem -Path $stylesPath -Filter "*.css" -Recurse
$totalFragile = 0
$fileStats = @()

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $matches = [regex]::Matches($content, '\[class\*=')
  
  if ($matches.Count -gt 0) {
    $totalFragile += $matches.Count
    $relativePath = $file.FullName.Replace($projectRoot, "").Replace("\", "/")
    
    $fileStats += [PSCustomObject]@{
      File = $file.Name
      Path = $relativePath
      Count = $matches.Count
    }
    
    Write-Host "⚠️  $($file.Name): $($matches.Count) selectores" -ForegroundColor Yellow
  }
}

Write-Host "`n" + ("=" * 60)
Write-Host "📊 RESUMEN" -ForegroundColor Cyan
Write-Host ("=" * 60)
Write-Host "Total archivos analizados: $($files.Count)" -ForegroundColor White
Write-Host "Archivos con selectores frágiles: $($fileStats.Count)" -ForegroundColor Yellow
Write-Host "Total selectores [class*='...']: $totalFragile" -ForegroundColor Red

if ($fileStats.Count -gt 0) {
  Write-Host "`n⚠️  TOP 10 ARCHIVOS CON MÁS SELECTORES FRÁGILES:" -ForegroundColor Yellow
  $fileStats | Sort-Object -Property Count -Descending | Select-Object -First 10 | Format-Table -Property File, Count, Path -AutoSize
}

Write-Host "`n💡 Estos selectores deben reemplazarse con clases semánticas en CSS Modules" -ForegroundColor Cyan

# También contar !important
Write-Host "`n🔍 Contando usos de !important..." -ForegroundColor Cyan
$totalImportant = 0
$importantStats = @()

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $matches = [regex]::Matches($content, '!important')
  
  if ($matches.Count -gt 0) {
    $totalImportant += $matches.Count
    $relativePath = $file.FullName.Replace($projectRoot, "").Replace("\", "/")
    
    $importantStats += [PSCustomObject]@{
      File = $file.Name
      Path = $relativePath
      Count = $matches.Count
    }
  }
}

Write-Host "`n📊 Total usos de !important: $totalImportant" -ForegroundColor Red

if ($importantStats.Count -gt 0) {
  Write-Host "`n⚠️  TOP 10 ARCHIVOS CON MÁS !important:" -ForegroundColor Yellow
  $importantStats | Sort-Object -Property Count -Descending | Select-Object -First 10 | Format-Table -Property File, Count -AutoSize
}
