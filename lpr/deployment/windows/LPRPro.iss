#define ProductVersion "0.5.0.dev4"
#define ProductName "IPScans LPR Pro Preview"
#define ProductExe "IPScans-LPR-Pro.exe"

[Setup]
AppId={{C0C64B48-051B-43EC-ABCB-DF47AB5D5403}
AppName={#ProductName}
AppVersion={#ProductVersion}
AppVerName={#ProductName} {#ProductVersion}
AppPublisher=IPScans
AppPublisherURL=https://ipscans.com
DefaultDirName={localappdata}\Programs\IPScans\LPR Pro Preview
DefaultGroupName={#ProductName}
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir=..\..\dist\installer
OutputBaseFilename=IPScans-LPR-Pro-{#ProductVersion}-Setup
SetupIconFile=..\..\assets\icons\lpr-pro.ico
UninstallDisplayIcon={app}\{#ProductExe}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
UsePreviousTasks=yes
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
InfoBeforeFile=INSTALL_NOTES.txt
VersionInfoVersion=0.5.0.3

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"
Name: "autostart"; Description: "Windows oturumu açıldığında başlat / Start at Windows sign-in"; Flags: unchecked

[Files]
Source: "..\..\dist\{#ProductExe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\third-party-notices\*"; DestDir: "{app}\third-party-notices"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "INSTALL_NOTES.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#ProductName}"; Filename: "{app}\{#ProductExe}"
Name: "{autodesktop}\{#ProductName}"; Filename: "{app}\{#ProductExe}"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "IPScansLPRProPreview"; ValueData: """{app}\{#ProductExe}"""; Tasks: autostart; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: none; ValueName: "IPScansLPRProPreview"; Tasks: not autostart; Flags: deletevalue

[Run]
Filename: "{app}\{#ProductExe}"; Description: "{cm:LaunchProgram,{#ProductName}}"; Flags: nowait postinstall skipifsilent
