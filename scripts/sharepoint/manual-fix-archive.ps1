Param(
  [string]$ProjectRef = "takvthfatlcjsqgssnta",
  [switch]$DeployEdgeFunction
)

$ErrorActionPreference = "Stop"

Write-Host "== NEXO AV | Diagnostico archivado SharePoint ==" -ForegroundColor Cyan

Write-Host "`n[1/4] Comprobando patrones problematicos en plantillas PDF..." -ForegroundColor Yellow
$pdfFiles = @(
  "src/pages/nexo_av/assets/plantillas/QuotePDFDocument.tsx",
  "src/pages/nexo_av/assets/plantillas/InvoicePDFDocument.tsx"
)

foreach ($file in $pdfFiles) {
  if (-not (Test-Path $file)) {
    throw "No existe: $file"
  }

  $content = Get-Content -Raw -Path $file
  if ($content -match 'pageNumber === totalPages \? .*: ""') {
    Write-Host "  - Corrigiendo retorno vacio en $file" -ForegroundColor DarkYellow
    $fixed = [regex]::Replace($content, 'pageNumber === totalPages \? (.*) : ""', 'pageNumber === totalPages ? $1 : null')
    Set-Content -Path $file -Value $fixed
  } else {
    Write-Host "  - OK $file" -ForegroundColor Green
  }
}

Write-Host "`n[2/4] Build local..." -ForegroundColor Yellow
npm run -s build

Write-Host "`n[3/4] Verificando CLI Supabase..." -ForegroundColor Yellow
npx supabase --version | Out-Null
Write-Host "  - Supabase CLI OK" -ForegroundColor Green

if ($DeployEdgeFunction) {
  Write-Host "`n[4/4] Desplegando Edge Function sharepoint-storage..." -ForegroundColor Yellow
  npx supabase functions deploy sharepoint-storage --project-ref $ProjectRef
  Write-Host "  - Deploy completado" -ForegroundColor Green
} else {
  Write-Host "`n[4/4] Deploy omitido (usa -DeployEdgeFunction para desplegar)." -ForegroundColor DarkYellow
}

Write-Host "`nListo. Recomendado: hard refresh (Ctrl+F5) y reintentar archivado." -ForegroundColor Cyan
