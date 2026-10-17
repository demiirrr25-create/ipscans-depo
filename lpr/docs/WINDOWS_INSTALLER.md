# Windows preview installer, 0.5.0.dev3

Build the native executable with `python scripts/build_windows.py`, then run `python scripts/build_installer.py --compiler <absolute-path-to-ISCC.exe>`. The second command checks the installer version against the application version. Inno Setup 6.7.3 was used for this checkpoint. The official compiler download had a valid Authenticode signature from Pyrsys B.V.; its SHA-256 was `9c73c3bae7ed48d44112a0f48e66742c00090bdb5bef71d9d3c056c66e97b732`. The compiler displayed a non-commercial-use banner although its distributed LICENSE.TXT permits commercial applications; commercial release qualification must resolve this tool licensing status. No commercial-readiness claim is made.

The generated installer is a real current-user installer, not a renamed portable EXE. It installs the bundled application and notices, registers an uninstaller, creates Start menu and optional desktop shortcuts, and offers opt-in Windows sign-in startup. Deselecting startup during reinstallation removes the corresponding Run value. It does not delete the runtime database/models folder when removed. The preview has its own installation directory and uninstall identity; runtime records still use the existing Windows-user LPR Pro data directory.

## Verified on this Windows 11 host

- Source and frozen `--worker package-test --output <new-folder>` checks passed. This command opens the application with a temporary synthetic database, displays 40 passage rows, exports CSV/XLSX/PDF and opens the three-page PDF. It never connects to a camera. The frozen check ran with a PATH containing only Windows System32, not the external Python environment.
- Silent installation into an isolated workspace directory completed with code 0. Desktop and Start menu shortcut targets matched the installed EXE, and uninstall registration was present.
- The installed EXE passed the same package check with code 0.
- Autostart was absent by default, present only after explicitly selecting it, and removed when deselected on reinstallation.
- Same-version reinstallation completed with code 0 and retained an unrelated test file. This is not a cross-version upgrade or rollback qualification.
- Uninstallation completed with code 0, removed the EXE, shortcuts and registration, and retained the unrelated test file. The test install was removed afterward.
- Final EXE with the user's authorized MC510 camera: 15-second diagnostic, one capture connection, 191 displayed/painted frames at 2304×1296, 61 OCR processing batches, clean capture and OCR shutdown. This measures execution and shared capture, not plate accuracy or physical passage detection.
- Full source test suite: 97 passed.

## Not yet qualified

This is an unsigned development preview. Authenticode signing, signed update delivery, rollback, clean-machine installation, older Windows versions, cross-version data migration, long-duration/multi-camera qualification, representative field vehicle/OCR accuracy and production website publication remain incomplete. Model files are not embedded; evaluation setup downloads them separately. The existing user's camera secrets are never included in the build or reports.
