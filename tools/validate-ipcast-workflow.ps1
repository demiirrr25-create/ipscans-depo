param([string]$Path = (Join-Path $PSScriptRoot '../.github/workflows/build-ipcast.yml'))
$ErrorActionPreference = 'Stop'
$source = Get-Content -LiteralPath $Path -Raw
$blocks = [regex]::Matches($source, '(?m)^        run: \|\r?\n((?:          .*\r?\n|\r?\n)+)')
$count = 0
foreach ($block in $blocks) {
    $script = [regex]::Replace($block.Groups[1].Value, '(?m)^          ', '')
    $scriptTokens = $null
    $parseErrors = $null
    [void][System.Management.Automation.Language.Parser]::ParseInput($script, [ref]$scriptTokens, [ref]$parseErrors)
    if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
    $count++
}
if ($count -lt 5) { throw "Expected Windows workflow script blocks were not found." }
Write-Output "Validated $count PowerShell workflow blocks."
