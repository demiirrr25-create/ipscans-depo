use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let ico_path = manifest_dir.join("..").join("design").join("icons").join("ipcast.ico");
    let ico_escaped = ico_path.to_string_lossy().replace('\\', "\\\\");
    let rc_content = format!("#pragma code_page(65001)\n1 ICON \"{}\"\n", ico_escaped);
    let rc_path = out_dir.join("ipcast.rc");
    let res_path = out_dir.join("ipcast.res");
    let _ = fs::write(&rc_path, rc_content);
    let rc_exe = r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\rc.exe";
    if std::path::Path::new(rc_exe).exists() {
        if let Ok(s) = Command::new(rc_exe)
            .args(["/nologo", "/fo", &res_path.to_string_lossy(), &rc_path.to_string_lossy()])
            .status()
        {
            if s.success() && res_path.exists() {
                println!("cargo:rustc-link-arg-bins={}", res_path.display());
            }
        }
    }
}
