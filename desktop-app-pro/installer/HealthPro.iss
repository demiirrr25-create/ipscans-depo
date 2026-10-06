#define MyAppName "Network Health Pro"
#define MyAppVersion "1.2.1"
#define MyAppExeName "ipscans-network-health-pro.exe"

[Setup]
AppId={{B633E8D5-058B-47CB-A345-A4C419223B4D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=IPScans
DefaultDirName={localappdata}\Programs\IPScans\Network Health Pro
DefaultGroupName=IPScans
PrivilegesRequired=lowest
OutputDir=..\dist\installer
OutputBaseFilename=Network-Health-Pro-Setup
SetupIconFile=..\assets\icon_pro.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "..\dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
