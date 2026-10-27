[Setup]
AppId=IPScansCortexDesktop
AppName=IPScans Cortex
AppVersion=3.0.0
AppPublisher=IPScans
AppPublisherURL=https://ipscans.com/tr/cortex
DefaultDirName={autopf}\IPScansCortex
UsePreviousAppDir=no
DefaultGroupName=IPScans Cortex
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputDir=..\..\..\outputs
OutputBaseFilename=IPScans-Cortex-Setup-3.0.0
SetupIconFile=ui\cortex.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\versions\3.0.0\Cortex.exe
CloseApplications=yes
RestartApplications=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "background"; Description: "Bilgisayar açılışında arka planda başlat (oturum açılması gerekmez)"; Flags: checkedonce

[Files]
Source: "..\..\..\outputs\IPScans-Cortex-3.0.0.exe"; DestDir: "{app}\versions\3.0.0"; DestName: "Cortex.exe"; Flags: ignoreversion

Source: "background-task.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\..\outputs\CortexAdmin-3.0.0.exe"; DestDir: "{app}\versions\3.0.0"; DestName: "CortexAdmin.exe"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\IPScans Cortex"; Filename: "{app}\versions\3.0.0\Cortex.exe"; Parameters: "--portable"; WorkingDir: "{app}\versions\3.0.0"
Name: "{group}\IPScans Cortex"; Filename: "{app}\versions\3.0.0\Cortex.exe"; Parameters: "--portable"; WorkingDir: "{app}\versions\3.0.0"

Name: "{group}\Cortex Yönetim Merkezi"; Filename: "{app}\versions\3.0.0\CortexAdmin.exe"; WorkingDir: "{app}\versions\3.0.0"

[Run]
Filename: "{app}\versions\3.0.0\Cortex.exe"; Parameters: "--portable"; Description: "Cortex'i başlat"; Flags: nowait postinstall skipifsilent

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var ResultCode: Integer; Args: String;
begin
  if CurStep = ssPostInstall then begin
    Args := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\background-task.ps1') + '" -Executable "' + ExpandConstant('{app}\versions\3.0.0\Cortex.exe') + '" -DataDirectory "' + ExpandConstant('{localappdata}\IPScansCortex') + '"';
    if not WizardIsTaskSelected('background') then Args := Args + ' -Remove';
    if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Args, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) or (ResultCode <> 0) then
      RaiseException('Arka plan görevi yapılandırılamadı. Kurulumu yönetici olarak yeniden çalıştırın.');
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var ResultCode: Integer; Args: String;
begin
  if CurUninstallStep = usUninstall then begin
    Args := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\background-task.ps1') + '" -Executable "' + ExpandConstant('{app}\versions\3.0.0\Cortex.exe') + '" -DataDirectory "' + ExpandConstant('{localappdata}\IPScansCortex') + '" -Remove';
    Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Args, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;
