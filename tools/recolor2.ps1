$map = [ordered]@{
  'bg-gradient-to-r from-cyan-400 to-violet-500' = 'bg-white'
  'bg-gradient-to-br from-cyan-400 to-violet-600' = 'bg-white'
  'text-slate-950' = 'text-black'
  'text-cyan-300' = 'text-white'
  'text-cyan-400' = 'text-white'
  'text-cyan-200' = 'text-white/80'
  'border-cyan-400/40' = 'border-white/25'
  'border-cyan-500/50' = 'border-white/25'
  'border-cyan-400' = 'border-white/40'
  'focus:border-cyan-500' = 'focus:border-white/40'
  'focus:border-cyan-400' = 'focus:border-white/40'
  'border-cyan-500/30 bg-cyan-500/10' = 'border-white/15 bg-white/5'
  'bg-cyan-500/10' = 'bg-white/5'
  'bg-cyan-400' = 'bg-white'
  'border-emerald-500/40 bg-emerald-500/10' = 'border-white/30 bg-white/10'
  'text-emerald-400' = 'text-white'
  'border-slate-700' = 'border-white/10'
  'border-slate-800' = 'border-white/10'
  'border-slate-900' = 'border-white/10'
  'bg-slate-900/60' = 'bg-white/5'
  'bg-slate-900/40' = 'bg-white/[0.03]'
  'bg-slate-900' = 'bg-white/5'
  'bg-slate-950/80' = 'bg-black/70'
  'bg-slate-950' = 'bg-black'
  'bg-slate-800' = 'bg-white/10'
  'hover:bg-slate-800' = 'hover:bg-white/10'
  'glow-cyan ' = ''
  'text-slate-400' = 'text-neutral-400'
  'text-slate-300' = 'text-neutral-300'
  'text-slate-500' = 'text-neutral-500'
  'text-slate-100' = 'text-white'
  'text-slate-200' = 'text-neutral-200'
  'rgba(34,211,238,' = 'rgba(255,255,255,'
  'rgba(167,139,250,' = 'rgba(255,255,255,'
}
$files = Get-ChildItem -Recurse -File 'C:\Users\pc\ipscans\src' | Where-Object { $_.Extension -eq '.tsx' }
$changed = 0
foreach ($f in $files) {
  $c = Get-Content -Raw -LiteralPath $f.FullName
  if ($null -eq $c) { continue }
  $orig = $c
  foreach ($k in $map.Keys) { $c = $c.Replace($k, $map[$k]) }
  if ($c -ne $orig) { Set-Content -NoNewline -LiteralPath $f.FullName -Value $c; $changed++ }
}
Write-Output "Changed $changed of $($files.Count) files"
