use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

// Shared by the Windows application build scripts. Prefer the active SDK on PATH.
fn embed_icon(bin: &str, icon: &str) {
    if env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let manifest = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let asset = manifest
        .join("../../design/icons")
        .join(format!("{icon}.ico"))
        .canonicalize()
        .unwrap();
    println!("cargo:rerun-if-changed={}", asset.display());
    println!("cargo:rerun-if-changed=../../design/windows_resource.rs");
    println!("cargo:rerun-if-env-changed=RC");
    let out = PathBuf::from(env::var_os("OUT_DIR").unwrap());
    let rc = out.join(format!("{bin}.rc"));
    let res = out.join(format!("{bin}.res"));
    let filename = asset.to_string_lossy();
    let filename = filename.trim_start_matches(r"\\?\").replace('\\', "/");
    fs::write(
        &rc,
        format!("#pragma code_page(65001)\n1 ICON \"{filename}\"\n"),
    )
    .unwrap();
    let compiler = env::var_os("RC").map(PathBuf::from).unwrap_or_else(|| {
        if Command::new("rc.exe").arg("/?").output().is_ok() {
            return "rc.exe".into();
        }
        let kits = Path::new(&env::var_os("ProgramFiles(x86)").unwrap_or_default())
            .join("Windows Kits/10/bin");
        let mut versions: Vec<_> = fs::read_dir(kits)
            .into_iter()
            .flatten()
            .flatten()
            .filter_map(|entry| {
                let version = entry
                    .file_name()
                    .to_str()?
                    .split('.')
                    .map(str::parse::<u32>)
                    .collect::<Result<Vec<_>, _>>()
                    .ok()?;
                let path = entry.path().join("x64/rc.exe");
                path.is_file().then_some((version, path))
            })
            .collect();
        versions.sort();
        versions
            .pop()
            .expect("Install Windows SDK or set RC to rc.exe")
            .1
    });
    assert!(
        Command::new(compiler)
            .arg("/nologo")
            .arg("/fo")
            .arg(&res)
            .arg(&rc)
            .status()
            .expect("start rc.exe")
            .success(),
        "icon compilation failed for {bin}"
    );
    println!("cargo:rustc-link-arg-bin={bin}={}", res.display());
}
