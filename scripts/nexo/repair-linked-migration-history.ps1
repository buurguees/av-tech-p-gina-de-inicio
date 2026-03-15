param(
  [string]$MigrationListPath,
  [string[]]$ApplyVersions = @(),
  [int]$BatchSize = 50,
  [switch]$Apply,
  [string]$VerificationOutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

function Write-Fail([string]$Message) {
  Write-Host "[error] $Message"
  exit 1
}

function Invoke-CmdCapture {
  param(
    [string]$Command,
    [int]$TimeoutMs = 120000
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "cmd.exe"
  $psi.Arguments = "/c $Command"
  $psi.WorkingDirectory = (Get-Location).Path
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  [void]$process.Start()

  if (-not $process.WaitForExit($TimeoutMs)) {
    try { $process.Kill() } catch {}
    throw "Timeout ejecutando: $Command"
  }

  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()

  [pscustomobject]@{
    ExitCode = $process.ExitCode
    StdOut = $stdout
    StdErr = $stderr
  }
}

function Split-Batches {
  param(
    [string[]]$Items,
    [int]$Size
  )

  $batches = @()
  if (-not $Items -or $Items.Count -eq 0) {
    return $batches
  }

  for ($i = 0; $i -lt $Items.Count; $i += $Size) {
    $last = [Math]::Min($i + $Size - 1, $Items.Count - 1)
    $batches += ,($Items[$i..$last])
  }

  return $batches
}

if (-not $MigrationListPath) {
  $MigrationListPath = Join-Path (Get-Location).Path "docs/supabase/evidence/2026-03-13/migration-list-linked.txt"
}

if (-not (Test-Path -LiteralPath $MigrationListPath)) {
  Write-Fail "No existe el fichero de evidencia: $MigrationListPath"
}

if ($BatchSize -lt 1) {
  Write-Fail "BatchSize debe ser >= 1"
}

$lines = Get-Content -LiteralPath $MigrationListPath
$rows = $lines | Where-Object { $_ -match '^\s*[0-9]*\s*\|\s*[0-9]*\s*\|' }

$remoteOnly = New-Object System.Collections.Generic.List[string]
$localOnly = New-Object System.Collections.Generic.List[string]

foreach ($line in $rows) {
  $parts = $line -split '\|'
  if ($parts.Count -lt 3) {
    continue
  }

  $local = $parts[0].Trim()
  $remote = $parts[1].Trim()

  if ([string]::IsNullOrWhiteSpace($local) -and -not [string]::IsNullOrWhiteSpace($remote)) {
    $remoteOnly.Add($remote)
    continue
  }

  if (-not [string]::IsNullOrWhiteSpace($local) -and [string]::IsNullOrWhiteSpace($remote)) {
    $localOnly.Add($local)
  }
}

$applySet = New-Object System.Collections.Generic.HashSet[string]
foreach ($version in $ApplyVersions) {
  if (-not [string]::IsNullOrWhiteSpace($version)) {
    [void]$applySet.Add($version.Trim())
  }
}

$appliedVersions = @($localOnly | Where-Object { $applySet.Contains($_) })
$pendingLocalVersions = @($localOnly | Where-Object { -not $applySet.Contains($_) })
$invalidApplyVersions = @($ApplyVersions | Where-Object { $localOnly -notcontains $_ })

if ($invalidApplyVersions.Count -gt 0) {
  Write-Fail "Estas versiones no figuran como local-only en la evidencia: $($invalidApplyVersions -join ', ')"
}

$summary = [pscustomobject]@{
  migration_list = $MigrationListPath
  remote_only_count = $remoteOnly.Count
  local_only_count = $localOnly.Count
  will_revert_count = $remoteOnly.Count
  will_apply_count = $appliedVersions.Count
  pending_local_count = $pendingLocalVersions.Count
  apply_versions = $appliedVersions
  pending_local_versions = $pendingLocalVersions
}

$summary | ConvertTo-Json -Depth 4

if (-not $Apply.IsPresent) {
  Write-Info "Dry-run. No se ha ejecutado ningun repair."
  exit 0
}

Write-Info "Aplicando repair controlado sobre historial remoto"

$revertBatches = Split-Batches -Items $remoteOnly.ToArray() -Size $BatchSize
$batchIndex = 0
foreach ($batch in $revertBatches) {
  $batchIndex++
  Write-Info "Batch revertido $batchIndex/$($revertBatches.Count): $($batch[0]) .. $($batch[$batch.Count - 1])"
  $command = "npx supabase migration repair --status reverted $($batch -join ' ')"
  $result = Invoke-CmdCapture -Command $command -TimeoutMs 120000
  if ($result.ExitCode -ne 0) {
    Write-Host $result.StdOut
    Write-Host $result.StdErr
    Write-Fail "Fallo en batch revertido $batchIndex"
  }
}

if ($appliedVersions.Count -gt 0) {
  Write-Info "Marcando como applied: $($appliedVersions -join ', ')"
  $command = "npx supabase migration repair --status applied $($appliedVersions -join ' ')"
  $result = Invoke-CmdCapture -Command $command -TimeoutMs 120000
  if ($result.ExitCode -ne 0) {
    Write-Host $result.StdOut
    Write-Host $result.StdErr
    Write-Fail "Fallo al marcar versiones applied"
  }
}

Write-Info "Revalidando estado linked"
$verify = Invoke-CmdCapture -Command "npx supabase migration list --linked" -TimeoutMs 120000
if ($verify.ExitCode -ne 0) {
  Write-Host $verify.StdOut
  Write-Host $verify.StdErr
  Write-Fail "Fallo revalidando migration list --linked"
}

if ($VerificationOutputPath) {
  $outputDir = Split-Path -Parent $VerificationOutputPath
  if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
  }
  Set-Content -LiteralPath $VerificationOutputPath -Value $verify.StdOut -Encoding utf8
  Write-Info "Verificacion guardada en $VerificationOutputPath"
}

Write-Host $verify.StdOut
