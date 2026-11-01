use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=../../design/icons/sentinel.ico");
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let ico_path = manifest_dir
        .join("..")
        .join("..")
        .join("design")
        .join("icons")
        .join("sentinel.ico");
    let ico_escaped = ico_path.to_string_lossy().replace('\\', "\\\\");

    let rc_content = format!(
        r#"#pragma code_page(65001)
1 ICON "{ico}"
1 VERSIONINFO
FILEVERSION 3,0,0,0
PRODUCTVERSION 3,0,0,0
FILEOS 0x40004
FILETYPE 0x1
BEGIN
  BLOCK "StringFileInfo"
  BEGIN
    BLOCK "040904B0"
    BEGIN
      VALUE "CompanyName", "IPScans Cybersecurity\0"
      VALUE "FileDescription", "IPScans Sentinel — Autonomous Cybersecurity, Modem & Camera Defense Engine\0"
      VALUE "FileVersion", "3.0.0.0\0"
      VALUE "InternalName", "IPScans-Sentinel.exe\0"
      VALUE "LegalCopyright", "Copyright (C) 2026 IPScans. All rights reserved.\0"
      VALUE "OriginalFilename", "IPScans-Sentinel.exe\0"
      VALUE "ProductName", "IPScans Sentinel\0"
      VALUE "ProductVersion", "3.0.0.0\0"
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x0409, 1200
  END
END
"#,
        ico = ico_escaped
    );

    let rc_path = out_dir.join("sentinel.rc");
    let res_path = out_dir.join("sentinel.res");
    let _ = fs::write(&rc_path, rc_content);

    let rc_exe = r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\rc.exe";
    if std::path::Path::new(rc_exe).exists() {
        let status = Command::new(rc_exe)
            .args(["/nologo", "/fo", &res_path.to_string_lossy(), &rc_path.to_string_lossy()])
            .status();
        if let Ok(s) = status {
            if s.success() && res_path.exists() {
                println!("cargo:rustc-link-arg-bins={}", res_path.display());
            }
        }
    }
}
