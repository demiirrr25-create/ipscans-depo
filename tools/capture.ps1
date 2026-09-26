Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  public struct RECT { public int L, T, R, B; }
}
"@
$p = Start-Process -FilePath "C:\Users\pc\ipscans\public\downloads\ipscans-scanner.exe" -PassThru
Start-Sleep -Seconds 2
try {
  $h = $p.MainWindowHandle
  [Win]::SetForegroundWindow($h) | Out-Null
  Start-Sleep -Milliseconds 400
  $r = New-Object Win+RECT
  [Win]::GetWindowRect($h, [ref]$r) | Out-Null
  $w = $r.R - $r.L; $ht = $r.B - $r.T
  $bmp = New-Object System.Drawing.Bitmap $w, $ht
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.L, $r.T, 0, 0, $bmp.Size)
  $bmp.Save("C:\Users\pc\ipscans\tools\app-preview.png")
  "saved $w x $ht"
} finally {
  Start-Sleep -Milliseconds 200
  if (-not $p.HasExited) { $p.Kill() }
}
