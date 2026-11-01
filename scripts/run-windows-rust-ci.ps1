$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Write-Host "=== 1. Cargo Test (--workspace --locked) ==="
cargo test --workspace --locked
if ($LASTEXITCODE -ne 0) { throw "cargo test failed" }

Write-Host "=== 2. Cargo Build Release (--workspace --release --locked) ==="
cargo build --workspace --release --locked
if ($LASTEXITCODE -ne 0) { throw "cargo build --release failed" }

Write-Host "=== 3. Export Desktop Catalog ==="
.\target\release\ipscans-web.exe --export-catalog public\desktop
if ($LASTEXITCODE -ne 0) { throw "export-catalog failed" }

Write-Host "=== 4. Verify 8 Windows EXEs (PE x64, .rsrc Icon, --version, --selftest, --install-desktop SHA-256) ==="
$apps = @(
  'IPscans-Plus.exe',
  'ipscans-network-health-pro.exe',
  'IPScans-Sentinel.exe',
  'IPCast.exe',
  'IPScans-LPR-Pro.exe',
  'IPScans-Cortex.exe',
  'CortexAdmin.exe',
  'ipscans-network-scanner.exe'
)

$downloads = Join-Path $env:TEMP "ipscans-ci-downloads-$PID"
$desktop = Join-Path $env:TEMP "ipscans-ci-desktop-$PID"
New-Item -ItemType Directory -Force -Path $downloads, $desktop | Out-Null
$previousDesktop = $env:IPSCANS_DESKTOP_DIR
$env:IPSCANS_DESKTOP_DIR = $desktop

try {
  foreach ($app in $apps) {
    $built = Join-Path "target\release" $app
    if (-not (Test-Path $built)) { throw "Missing release binary: $built" }

    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $built))
    if ([BitConverter]::ToUInt16($bytes, 0) -ne 0x5A4D) { throw "$app is missing MZ header" }
    $peOffset = [BitConverter]::ToInt32($bytes, 0x3C)
    if ([BitConverter]::ToUInt32($bytes, $peOffset) -ne 0x00004550) { throw "$app is missing PE header" }
    $machine = [BitConverter]::ToUInt16($bytes, $peOffset + 4)
    if ($machine -ne 0x8664) { throw "$app is not x64 (machine=$machine)" }
    $ascii = [System.Text.Encoding]::ASCII.GetString($bytes)
    if (-not $ascii.Contains('.rsrc')) { throw "$app has no .rsrc icon section" }

    $downloaded = Join-Path $downloads $app
    Copy-Item $built $downloaded -Force

    $ver = & $downloaded --version
    if ($LASTEXITCODE -ne 0) { throw "$app --version failed" }
    & $downloaded --selftest | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "$app --selftest failed" }
    $installedPath = (& $downloaded --install-desktop | Select-Object -Last 1).Trim()
    if ($LASTEXITCODE -ne 0) { throw "$app --install-desktop failed" }
    if (-not (Test-Path $installedPath)) { throw "$app was not copied to $installedPath" }

    $srcHash = (Get-FileHash $downloaded -Algorithm SHA256).Hash
    $dstHash = (Get-FileHash $installedPath -Algorithm SHA256).Hash
    if ($srcHash -ne $dstHash) { throw "$app desktop copy hash mismatch: $srcHash != $dstHash" }

    & $installedPath --selftest | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "installed $app --selftest failed" }
    Write-Host ("VERIFIED {0,-32} | {1} | SHA256={2}" -f $app, $ver, $srcHash)
  }
} finally {
  if ($null -eq $previousDesktop) {
    Remove-Item Env:IPSCANS_DESKTOP_DIR -ErrorAction SilentlyContinue
  } else {
    $env:IPSCANS_DESKTOP_DIR = $previousDesktop
  }
  Remove-Item -Recurse -Force $downloads, $desktop -ErrorAction SilentlyContinue
}
Write-Host "=== ALL 8 WINDOWS EXES VERIFIED SUCCESSFULLY ==="
