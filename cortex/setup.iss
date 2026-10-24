[Setup]
AppId=IPScansCortexDesktop
AppName=IPScans Cortex
AppVersion=2.3.0
AppPublisher=IPScans
AppPublisherURL=https://ipscans.com/tr/cortex
DefaultDirName={localappdata}\Programs\IPScansCortex
DefaultGroupName=IPScans Cortex
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\..\..\outputs
OutputBaseFilename=IPScans-Cortex-Setup-2.3.0
SetupIconFile=ui\cortex.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\versions\2.3.0\Cortex.exe
CloseApplications=yes
RestartApplications=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\..\..\outputs\IPScans-Cortex-2.3.0.exe"; DestDir: "{app}\versions\2.3.0"; DestName: "Cortex.exe"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\IPScans Cortex"; Filename: "{app}\versions\2.3.0\Cortex.exe"; Parameters: "--portable"; WorkingDir: "{app}\versions\2.3.0"
Name: "{group}\IPScans Cortex"; Filename: "{app}\versions\2.3.0\Cortex.exe"; Parameters: "--portable"; WorkingDir: "{app}\versions\2.3.0"

[Run]
Filename: "{app}\versions\2.3.0\Cortex.exe"; Parameters: "--portable"; Description: "Cortex'i başlat"; Flags: nowait postinstall skipifsilent
