//! Win32 Native OS Integration: UAC Elevation (`ShellExecuteW` "runas"),
//! Hidden Background Subprocess Execution (`CREATE_NO_WINDOW`), Admin Token Check,
//! and Native Edge/Chromium App-Window Host.

use std::env;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::os::windows::ffi::OsStringExt;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::{Command, Stdio};

pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;
pub const SW_SHOWNORMAL: i32 = 1;

#[repr(C)]
struct FolderId(u32, u16, u16, [u8; 8]);
const DESKTOP: FolderId = FolderId(
    0xb4bfcc3a,
    0xdb2c,
    0x424c,
    [0xb0, 0x29, 0x7f, 0xe9, 0x9a, 0x87, 0xc6, 0x41],
);
const DOWNLOADS: FolderId = FolderId(
    0x374de290,
    0x123f,
    0x4565,
    [0x91, 0x64, 0x39, 0xc4, 0x92, 0x5e, 0x46, 0x7b],
);

#[link(name = "ole32")]
extern "system" {
    fn CoTaskMemFree(ptr: *mut std::ffi::c_void);
}
#[link(name = "kernel32")]
extern "system" {
    fn MoveFileW(existing: *const u16, new: *const u16) -> i32;
    fn GetSystemDirectoryW(buffer: *mut u16, length: u32) -> u32;
}

pub fn system_tool(name: &str) -> std::io::Result<PathBuf> {
    let mut buf = [0u16; 32768];
    let n = unsafe { GetSystemDirectoryW(buf.as_mut_ptr(), buf.len() as u32) } as usize;
    if n == 0 || n >= buf.len() {
        return Err(std::io::Error::last_os_error());
    }
    let dir = PathBuf::from(std::ffi::OsString::from_wide(&buf[..n]));
    Ok(if name.eq_ignore_ascii_case("powershell.exe") {
        dir.join(r"WindowsPowerShell\v1.0\powershell.exe")
    } else {
        dir.join(name).with_extension("exe")
    })
}
#[link(name = "shell32")]
extern "system" {
    fn SHGetKnownFolderPath(
        id: *const FolderId,
        flags: u32,
        token: isize,
        path: *mut *mut u16,
    ) -> i32;
}

fn known_folder(id: &FolderId) -> std::io::Result<PathBuf> {
    let mut ptr = std::ptr::null_mut();
    let result = unsafe { SHGetKnownFolderPath(id, 0, 0, &mut ptr) };
    if result < 0 {
        return Err(std::io::Error::from_raw_os_error(result));
    }
    unsafe {
        let mut len = 0;
        while *ptr.add(len) != 0 {
            len += 1;
        }
        let path = std::ffi::OsString::from_wide(std::slice::from_raw_parts(ptr, len));
        CoTaskMemFree(ptr.cast());
        Ok(path.into())
    }
}

fn copy_desktop_exe(src: &std::path::Path, dest: &std::path::Path) -> std::io::Result<()> {
    use std::{fs, io};
    if dest.exists()
        && fs::metadata(src)?.len() == fs::metadata(dest)?.len()
        && fs::read(src)? == fs::read(dest)?
    {
        return Ok(());
    }
    let temp = dest.with_extension(format!("{}.part", std::process::id()));
    let mut output = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temp)?;
    let result = (|| {
        io::copy(&mut fs::File::open(src)?, &mut output)?;
        output.sync_all()?;
        drop(output);
        let wide = |p: &std::path::Path| {
            p.as_os_str()
                .encode_wide()
                .chain(Some(0))
                .collect::<Vec<_>>()
        };
        // MoveFileW publishes a complete file and never replaces an existing file.
        if unsafe { MoveFileW(wide(&temp).as_ptr(), wide(dest).as_ptr()) } == 0 {
            return Err(io::Error::last_os_error());
        }
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(temp);
    }
    result
}

/// Installs on first interactive launch from the Windows Downloads known folder.
/// Scripted uses remain portable. An explicit installation reports success or failure.
pub fn handle_desktop_install(filename: &str) {
    let args: Vec<_> = env::args_os().skip(1).collect();
    let explicit = args.len() == 1 && args[0] == "--install-desktop";
    if !explicit && !args.is_empty() {
        return;
    }
    let result = (|| {
        let src = env::current_exe()?;
        if !explicit && src.parent() != Some(known_folder(&DOWNLOADS)?.as_path()) {
            return Ok(None);
        }
        let dir = known_folder(&DESKTOP)?;
        let mut dest = dir.join(filename);
        if !explicit && src.parent() == Some(dir.as_path()) {
            return Ok(None);
        }
        if let Err(err) = copy_desktop_exe(&src, &dest) {
            if err.kind() != std::io::ErrorKind::AlreadyExists {
                return Err(err);
            }
            dest = dir.join(format!(
                "{}-{}.exe",
                filename.trim_end_matches(".exe"),
                env!("CARGO_PKG_VERSION")
            ));
            copy_desktop_exe(&src, &dest)?;
        }
        Ok(Some(dest))
    })();
    match result {
        Ok(Some(path)) if explicit => {
            println!("{}", path.display());
            std::process::exit(0);
        }
        Ok(Some(path)) => match Command::new(path).spawn() {
            Ok(_) => std::process::exit(0),
            Err(e) => eprintln!("Desktop launch: {e}"),
        },
        Err(err) => {
            eprintln!("Desktop installation: {err}");
            if explicit {
                std::process::exit(1);
            }
        }
        Ok(None) => {}
    }
}

#[link(name = "shell32")]
extern "system" {
    fn ShellExecuteW(
        hwnd: isize,
        lp_operation: *const u16,
        lp_file: *const u16,
        lp_parameters: *const u16,
        lp_directory: *const u16,
        n_show_cmd: i32,
    ) -> isize;
    fn IsUserAnAdmin() -> i32;
}

fn to_wide_null(s: &str) -> Vec<u16> {
    OsStr::new(s)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

/// Returns `true` if the current Rust process holds an elevated Administrator token.
pub fn is_running_as_admin() -> bool {
    unsafe { IsUserAnAdmin() != 0 }
}

/// Spawns an elevated Administrator process via Windows UAC (`"runas"`).
/// Returns `Ok(true)` if the UAC elevation request succeeded (`ShellExecuteW > 32`).
pub fn spawn_elevated_process(executable: &str, arguments: &str) -> Result<bool, String> {
    let op = to_wide_null("runas");
    let file = to_wide_null(executable);
    let params = to_wide_null(arguments);
    let rc = unsafe {
        ShellExecuteW(
            0,
            op.as_ptr(),
            file.as_ptr(),
            params.as_ptr(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    };
    if rc > 32 {
        Ok(true)
    } else {
        Err(format!(
            "UAC yetkilendirme iptal edildi veya başarısız oldu (kod: {})",
            rc
        ))
    }
}

/// Opens an interactive Administrator `cmd.exe` console window.
pub fn open_admin_cmd_window(initial_command: Option<&str>) -> Result<bool, String> {
    let args = match initial_command {
        Some(cmd) if !cmd.trim().is_empty() => format!("/K title IPScans Sentinel Admin CMD && {}", cmd),
        _ => "/K title IPScans Sentinel — Yonetici CMD Konsolu && cd /d C:\\ && echo [IPScans Sentinel Rust Engine] Yonetici CMD Hazir. && ver".to_string(),
    };
    spawn_elevated_process(
        &system_tool("cmd")
            .map_err(|e| e.to_string())?
            .to_string_lossy(),
        &args,
    )
}

/// Opens an interactive Administrator `powershell.exe` console window.
pub fn open_admin_powershell_window(initial_script: Option<&str>) -> Result<bool, String> {
    let args = match initial_script {
        Some(script) if !script.trim().is_empty() => {
            format!("-NoExit -ExecutionPolicy Bypass -Command \"{}\"", script.replace('"', "\\\""))
        }
        _ => "-NoExit -ExecutionPolicy Bypass -Command \"$Host.UI.RawUI.WindowTitle = 'IPScans Sentinel — Yonetici PowerShell'; Write-Host '[IPScans Sentinel Rust Engine] Yonetici PowerShell Hazir.' -ForegroundColor Cyan\"".to_string(),
    };
    spawn_elevated_process(
        &system_tool("powershell.exe")
            .map_err(|e| e.to_string())?
            .to_string_lossy(),
        &args,
    )
}

/// Re-launches the current executable with Administrator privileges (`runas`).
pub fn elevate_self() -> Result<bool, String> {
    let exe = env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe.to_string_lossy().to_string();
    spawn_elevated_process(&exe_str, "--elevated")
}

/// Runs a hidden command (`CREATE_NO_WINDOW`) and returns `(exit_code, stdout, stderr)`.
pub fn run_hidden_command(program: &str, args: &[&str]) -> (i32, String, String) {
    let program = match system_tool(program) {
        Ok(path) => path,
        Err(e) => return (-1, String::new(), e.to_string()),
    };
    match Command::new(program)
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
    {
        Ok(output) => {
            let code = output.status.code().unwrap_or(-1);
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            (code, stdout, stderr)
        }
        Err(err) => (-1, String::new(), err.to_string()),
    }
}

/// Runs an elevated command silently via PowerShell `Start-Process -Verb RunAs -WindowStyle Hidden -Wait`
/// if the current process is not already elevated, or directly if already Administrator.
pub fn run_privileged_shell(shell: &str, command_line: &str) -> (i32, String, String, bool) {
    let admin = is_running_as_admin();
    if shell.eq_ignore_ascii_case("cmd") {
        let (code, out, err) = run_hidden_command("cmd.exe", &["/C", command_line]);
        (code, out, err, admin)
    } else {
        let (code, out, err) = run_hidden_command(
            "powershell.exe",
            &[
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                command_line,
            ],
        );
        (code, out, err, admin)
    }
}

/// Returns the writable `%LOCALAPPDATA%\IPScans` directory, creating it if needed.
pub fn app_data_dir(sub: &str) -> PathBuf {
    let base = env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(r"C:\Users\Public\IPScans"));
    let dir = base.join("IPScans").join(sub);
    let _ = std::fs::create_dir_all(&dir);
    dir
}

/// Launches a native Edge WebView2 / Chromium `--app` desktop window pointing to `url`.
/// Returns the spawned child process handle if launched directly.
pub fn launch_desktop_app_window(
    app_slug: &str,
    url: &str,
    width: u32,
    height: u32,
) -> Option<std::process::Child> {
    if env::args_os().any(|arg| arg == "--headless") {
        return None;
    }
    let profile_dir = app_data_dir(&format!("webview-{}", app_slug));
    let candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    ];
    for bin in candidates {
        if std::path::Path::new(bin).exists() {
            let app_arg = format!("--app={}", url);
            let size_arg = format!("--window-size={},{}", width, height);
            let data_arg = format!("--user-data-dir={}", profile_dir.display());
            if let Ok(child) = Command::new(bin)
                .args([
                    &app_arg,
                    &size_arg,
                    &data_arg,
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-features=TranslateUI",
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
            {
                return Some(child);
            }
        }
    }
    // Fallback to default browser via rundll32
    let _ = Command::new(system_tool("rundll32").ok()?)
        .args(["url.dll,FileProtocolHandler", url])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
    None
}
