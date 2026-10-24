Cortex 2.1.1 fixes startup with existing CXV2 encrypted configurations and ships a Windows installer that creates the desktop and Start menu shortcuts.

- Preserves existing encrypted settings and customer workspaces.
- Desktop shortcut starts the local application at http://127.0.0.1:8765/; repeated launches reuse the running instance.
- Startup failures now display an error and write a diagnostic log.
- Keeps the updated plan UI; cloud operation remains unavailable.

Download **IPScans-Cortex-Setup-2.1.1.exe**. Close any older running Cortex version before updating.

Validated with 92 Python tests, packaged EXE startup against a copy of an existing CXV2 profile, repeated launch, actual Windows installation, installed-file hash and desktop shortcut startup.
