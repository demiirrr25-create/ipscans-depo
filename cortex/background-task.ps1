param(
    [Parameter(Mandatory=$true)][string]$Executable,
    [Parameter(Mandatory=$true)][string]$DataDirectory,
    [switch]$Remove
)
$ErrorActionPreference = 'Stop'
$taskName = 'IPScans Cortex Background'
if ($Remove) {
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existing) {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    exit 0
}
$exePath = [IO.Path]::GetFullPath($Executable)
$programRoot = [Environment]::GetFolderPath('ProgramFiles').TrimEnd('\') + '\'
if (-not $exePath.StartsWith($programRoot,[StringComparison]::OrdinalIgnoreCase)) {
    throw 'Background task executable must be installed under Program Files.'
}
if (-not (Test-Path -LiteralPath $exePath -PathType Leaf)) { throw 'Cortex executable missing.' }
$dataPath = [IO.Path]::GetFullPath($DataDirectory)
New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
# LocalService gets access only to Cortex data, never the user's entire profile.
$acl = Get-Acl -LiteralPath $dataPath
$serviceSid = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-19')
$access = New-Object System.Security.AccessControl.FileSystemAccessRule($serviceSid,'Modify','ContainerInherit,ObjectInherit','None','Allow')
$acl.SetAccessRule($access)
Set-Acl -LiteralPath $dataPath -AclObject $acl
# Explicitly approved: allow the boot account to reuse the installed engine/models.
$ollamaExe = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'
$modelPath = if ($env:OLLAMA_MODELS) { $env:OLLAMA_MODELS } else { Join-Path $env:USERPROFILE '.ollama\models' }
$runtimeSettings = @{}
if (Test-Path -LiteralPath $ollamaExe -PathType Leaf) {
    $runtimeSettings.executable = $ollamaExe
    $runtimeAcl = Get-Acl -LiteralPath (Split-Path -Parent $ollamaExe)
    $runtimeAcl.SetAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($serviceSid,'ReadAndExecute','ContainerInherit,ObjectInherit','None','Allow')))
    Set-Acl -LiteralPath (Split-Path -Parent $ollamaExe) -AclObject $runtimeAcl
}
if (Test-Path -LiteralPath $modelPath -PathType Container) {
    $runtimeSettings.models = [IO.Path]::GetFullPath($modelPath)
    $modelAcl = Get-Acl -LiteralPath $modelPath
    $modelAcl.SetAccessRule($access)
    Set-Acl -LiteralPath $modelPath -AclObject $modelAcl
}
$settingsFile = Join-Path $dataPath 'runtime-settings.json'
if ($runtimeSettings.Count -gt 0) { $runtimeSettings | ConvertTo-Json | Set-Content -LiteralPath $settingsFile -Encoding UTF8 }
$arguments = '--portable --background --data-dir "' + $dataPath + '"'
$action = New-ScheduledTaskAction -Execute $exePath -Argument $arguments -WorkingDirectory ([IO.Path]::GetDirectoryName($exePath))
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'S-1-5-19' -LogonType ServiceAccount -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
}
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Cortex camera monitoring. Starts at Windows boot independently of the browser.' -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Output 'Cortex background startup registered.'
