#define MyAppName "IPscans+"
#define MyAppVersion "2.0.2"
#define MyAppExeName "IPscans-Plus.exe"

[Setup]
AppId={{8E97A926-5E3A-4A45-A536-D1DCA9D08703}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=IPScans
DefaultDirName={localappdata}\Programs\IPScans\IPscans+
DefaultGroupName=IPScans
PrivilegesRequired=lowest
OutputDir=..\dist\installer
OutputBaseFilename=IPscans-Plus-Setup
SetupIconFile=..\assets\icon.ico
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
