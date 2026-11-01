//! Win32 Native OS Integration: UAC Elevation (`ShellExecuteW` "runas"),
//! Hidden Background Subprocess Execution (`CREATE_NO_WINDOW`), Admin Token Check,
//! and Native Edge/Chromium App-Window Host.

use std::env;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::{Command, Stdio};

pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;
pub const SW_SHOWNORMAL: i32 = 1;

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
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
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
        Err(format!("UAC yetkilendirme iptal edildi veya başarısız oldu (kod: {})", rc))
    }
}

/// Opens an interactive Administrator `cmd.exe` console window.
pub fn open_admin_cmd_window(initial_command: Option<&str>) -> Result<bool, String> {
    let args = match initial_command {
        Some(cmd) if !cmd.trim().is_empty() => format!("/K title IPScans Sentinel Admin CMD && {}", cmd),
        _ => "/K title IPScans Sentinel — Yonetici CMD Konsolu && cd /d C:\\ && echo [IPScans Sentinel Rust Engine] Yonetici CMD Hazir. && ver".to_string(),
    };
    spawn_elevated_process("cmd.exe", &args)
}

/// Opens an interactive Administrator `powershell.exe` console window.
pub fn open_admin_powershell_window(initial_script: Option<&str>) -> Result<bool, String> {
    let args = match initial_script {
        Some(script) if !script.trim().is_empty() => {
            format!("-NoExit -ExecutionPolicy Bypass -Command \"{}\"", script.replace('"', "\\\""))
        }
        _ => "-NoExit -ExecutionPolicy Bypass -Command \"$Host.UI.RawUI.WindowTitle = 'IPScans Sentinel — Yonetici PowerShell'; Write-Host '[IPScans Sentinel Rust Engine] Yonetici PowerShell Hazir.' -ForegroundColor Cyan\"".to_string(),
    };
    spawn_elevated_process("powershell.exe", &args)
}

/// Re-launches the current executable with Administrator privileges (`runas`).
pub fn elevate_self() -> Result<bool, String> {
    let exe = env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe.to_string_lossy().to_string();
    spawn_elevated_process(&exe_str, "--elevated")
}

/// Runs a hidden command (`CREATE_NO_WINDOW`) and returns `(exit_code, stdout, stderr)`.
pub fn run_hidden_command(program: &str, args: &[&str]) -> (i32, String, String) {
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
pub fn launch_desktop_app_window(app_slug: &str, url: &str, width: u32, height: u32) -> Option<std::process::Child> {
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
    let _ = Command::new("rundll32.exe")
        .args(["url.dll,FileProtocolHandler", url])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
    None
}
