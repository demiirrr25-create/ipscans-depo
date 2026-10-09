#define MyAppName "IPscans+"
#define MyAppVersion "4.2.0"
#define MyAppExeName "IPscans-Plus.exe"

[Setup]
AppId={{8E97A926-5E3A-4A45-A536-D1DCA9D08703}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=IPScans
SetupMutex=IPScansPlusSetup
CloseApplications=yes
RestartApplications=no
DefaultDirName={localappdata}\Programs\IPScans\IPscans+
DefaultGroupName=IPScans
PrivilegesRequired=lowest
OutputDir=..\dist\installer
OutputBaseFilename=IPscans-Plus-Setup
SetupIconFile=..\assets\icon.ico
UninstallDisplayIcon={app}\versions\{#MyAppVersion}\{#MyAppExeName}
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
; Never overwrite the previous release's running image. This also permits
; upgrading old onefile launchers that Restart Manager cannot close.
Source: "..\dist\{#MyAppExeName}"; DestDir: "{app}\versions\{#MyAppVersion}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\versions\{#MyAppVersion}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\versions\{#MyAppVersion}\{#MyAppExeName}"; Tasks: desktopicon

[Code]
function CreateFileW(FileName: String; Access, Share: LongWord; Security: Integer;
  Creation, Flags: LongWord; Template: Integer): Integer;
  external 'CreateFileW@kernel32.dll stdcall';
function CloseHandle(Handle: Integer): Boolean;
  external 'CloseHandle@kernel32.dll stdcall';

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Target: String;
  Handle: Integer;
begin
  Result := '';
  Target := ExpandConstant('{app}\versions\{#MyAppVersion}\{#MyAppExeName}');
  if FileExists(Target) then begin
    Handle := CreateFileW(Target, $40000000, 7, 0, 3, 0, 0);
    if Handle = -1 then
      Result := 'IPscans+ is running or the installation folder is not writable. ' +
        'Close IPscans+ (including background instances), then retry. ' +
        'No application files have been replaced.'
    else
      CloseHandle(Handle);
  end;
end;
