param(
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    if (-not $SkipBuild) {
        Write-Host "Running cargo test --workspace..."
        cargo test --workspace
        if ($LASTEXITCODE -ne 0) { throw "Cargo workspace tests failed." }

        Write-Host "Building all 8 IPScans Rust 3.0 release binaries..."
        cargo build --release --workspace
        if ($LASTEXITCODE -ne 0) { throw "Cargo release build failed." }
    }

    $binaries = @(
        "IPScans-Sentinel.exe",
        "IPscans-Plus.exe",
        "IPCast.exe",
        "IPScans-LPR-Pro.exe",
        "IPScans-Cortex.exe",
        "CortexAdmin.exe",
        "ipscans-network-health-pro.exe",
        "ipscans-network-scanner.exe"
    )

    $sums = @()
    foreach ($bin in $binaries) {
        $path = Join-Path $root "target\release\$bin"
        if (-not (Test-Path $path)) {
            throw "Expected Rust binary not found: $path"
        }
        $proc = Start-Process -FilePath $path -ArgumentList "--selftest" -WindowStyle Hidden -Wait -PassThru
        if ($proc.ExitCode -ne 0) {
            throw "Selftest failed for $bin (exit code $($proc.ExitCode))"
        }
        $item = Get-Item $path
        $hash = (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant()
        $sums += "$hash  $bin ($($item.Length) bytes)"
        Write-Host "Verified $bin -> $hash ($($item.Length) bytes)"
    }

    Set-Content -Path (Join-Path $root "target\release\SHA256SUMS.txt") -Value ($sums -join "`n") -Encoding utf8
}
finally {
    Pop-Location
}
