; IPCast installer (spec §30/Phase 12). Compiled with Inno Setup's iscc.exe against the output of
; `dotnet publish` (see .github/workflows/build-ipcast.yml, which actually builds AND runs this
; installer silently to verify it works - not just that the script is well-formed).
;
; The portable option from spec §29/§32 already exists without this file: the self-contained
; single-file IPCast.exe from `dotnet publish` runs with no installation at all. This installer is
; the *additional*, traditional Next/Install/Finish option for users who want a Start Menu entry,
; optional desktop shortcut, and optional "start with Windows".

#define MyAppName "IPCast"
#define MyAppVersion "1.1.0-preview.3"
#define MyAppPublisher "IPCast"
#define MyAppExeName "IPCast.exe"
#define MyPublishDir "..\publish\win-x64"

[Setup]
AppId={{C9C6B2C0-6B0E-4C2A-9E9C-7B0B1D2E3F4A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\publish\installer
OutputBaseFilename=IPCast-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "startupicon"; Description: "&Start IPCast when Windows starts"; GroupDescription: "Additional options:"; Flags: unchecked

[Files]
Source: "{#MyPublishDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startupicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent unchecked
