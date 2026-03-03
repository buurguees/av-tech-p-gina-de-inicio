param(
  [string]$OutputPath,
  [string]$EnvFile = ".env",
  [string]$PgDumpPath,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

function Write-WarnLine([string]$Message) {
  Write-Host "[warn] $Message"
}

function Write-Fail([string]$Message) {
  Write-Host "[error] $Message"
  exit 1
}

function Read-EnvValue([string]$Path, [string]$Key) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $pattern = "^\s*$([regex]::Escape($Key))\s*=\s*(.*)\s*$"
  $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match $pattern } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $value = [regex]::Match($line, $pattern).Groups[1].Value.Trim()
  if ($value.StartsWith("'") -and $value.EndsWith("'")) {
    $value = $value.Substring(1, $value.Length - 2)
  } elseif ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  return $value
}

function Resolve-PgDumpBinary([string]$ExplicitPath) {
  if ($ExplicitPath) {
    if (Test-Path -LiteralPath $ExplicitPath) {
      return (Resolve-Path -LiteralPath $ExplicitPath).Path
    }
    Write-Fail "No existe pg_dump en la ruta indicada: $ExplicitPath"
  }

  $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  return $null
}

$repoRoot = (Get-Location).Path
$dateStamp = Get-Date -Format "yyyy-MM-dd"

if (-not $OutputPath) {
  $OutputPath = Join-Path $repoRoot "ops/backups/supabase/$dateStamp/remote_schema.sql"
}

$resolvedEnvFile = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $repoRoot $EnvFile }
$dbUrl = $env:SUPABASE_DB_URL

if (-not $dbUrl) {
  $dbUrl = Read-EnvValue -Path $resolvedEnvFile -Key "SUPABASE_DB_URL"
  if ($dbUrl) {
    Write-Info "SUPABASE_DB_URL cargada desde $resolvedEnvFile"
  }
}

if (-not $dbUrl) {
  Write-Fail "No se encontro SUPABASE_DB_URL en entorno ni en $resolvedEnvFile"
}

$pgDumpBinary = Resolve-PgDumpBinary -ExplicitPath $PgDumpPath
if (-not $pgDumpBinary) {
  Write-Fail "No se encontro pg_dump en PATH. Usa -PgDumpPath <ruta\\pg_dump.exe> o instala PostgreSQL client tools."
}

$outputDir = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

if ((Test-Path -LiteralPath $OutputPath) -and -not $Force.IsPresent) {
  Write-Fail "Ya existe $OutputPath. Usa -Force para sobrescribir."
}

Write-Info "Exportando schema remoto a $OutputPath"
$env:PGPASSWORD = $null
& $pgDumpBinary --schema-only --no-owner --no-privileges $dbUrl | Out-File -FilePath $OutputPath -Encoding utf8

if (-not (Test-Path -LiteralPath $OutputPath)) {
  Write-Fail "No se genero el archivo de salida."
}

$sizeBytes = (Get-Item -LiteralPath $OutputPath).Length
if ($sizeBytes -le 0) {
  Write-Fail "El archivo generado esta vacio: $OutputPath"
}

Write-Info "Export completado. Tamaño: $sizeBytes bytes"
Write-Host "OK: $OutputPath"
