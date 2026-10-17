# IPScans Design System

Single visual identity for ipscans.com and every IPScans Windows application.
Token values live in [`tokens.json`](./tokens.json). Every product must use those exact values.

## Principles

1. **Function first.** Never remove a working feature to simplify a screen. Reorganize instead.
2. **Black canvas, white type, controlled greys.** `#000` background, `#FFF` primary text,
   `#A1A1A1` secondary, `#6E6E6E` tertiary. Surfaces step up in small increments
   (`#0A0A0A` → `#111` → `#191919`). Hairline borders `#1F1F1F`.
3. **Color is information, never decoration.** Status colors (`statusOk/Warn/Error/Info`) appear
   only as small dots, thin rings, inline text or chart series — never as filled info boxes,
   tinted banners or green callouts.
4. **One primary action per view.** Primary button = white fill, black text. Secondary = 1px
   `#2E2E2E` border, white text. Ghost = text only.
5. **Quiet chrome.** No decorative badges, gradients-for-gradients-sake, glow blobs, giant
   watermark wordmarks, or marketing filler sentences.
6. **Motion explains state.** 120 / 200 / 400 ms with `cubic-bezier(0.2,0,0,1)`. Animate only
   `opacity` and `transform` (GPU friendly). Respect `prefers-reduced-motion` on web and a
   "reduce motion" setting / Windows animation setting on desktop.

## Banned UI text (main surfaces)

Do not render any of these anywhere in primary UI (web pages, app windows, splash screens):

- Version tags in hero/header/splash/sidebar (e.g. `v4.3`, `Version 4.3.0`, `Beta 0.3`).
  Version information belongs only in **About** dialogs, download metadata tables and release notes.
- `Antigravity`, `Antigravity Design`, `Design System`, `Powered by …`, `Next Generation UI`,
  `Premium UI`, `Black Infinity`, or any other design-technology / framework name.
- Decorative tagline filler ("Next-gen experience", "Ultra modern", etc.).

## Typography

| Role       | Web (Geist)            | Desktop (Segoe UI Variable) |
|------------|------------------------|-----------------------------|
| Display    | 56–72px, 600, -0.03em  | Display 40px, 600           |
| H1         | 40px, 600, -0.02em     | Display 28px, 600           |
| H2         | 28px, 600, -0.02em     | Display 20px, 600           |
| Body       | 16px, 400              | Text 14px, 400              |
| Label      | 13px, 500              | Text 13px, 500              |
| Caption    | 12px, 400, `#6E6E6E`   | Text 12px, 400              |
| Numeric    | Geist Mono, tabular    | Cascadia Mono / tabular     |

Numbers that update live (speeds, latencies, counters) always use tabular figures.

## Components

- **Panel**: `surface1`, 1px `border`, radius `lg` (14). No shadows on black.
- **Table**: header row `textTertiary` 12px uppercase-free labels, rows 40px, hairline separators,
  hover `surfaceHover`, selected row = 2px white left indicator + `surface3`.
- **Sidebar (desktop)**: 232px, `bg`, items 36px tall radius `md`, active item `surface3` + white text,
  inactive `textSecondary`. Monochrome line icons, 1.5px stroke, 18px.
- **Inputs**: `surface2`, 1px `borderStrong`, focus ring 1px white + 3px `rgba(255,255,255,0.12)`.
- **Charts**: series 1 white, series 2 `chartSecondary`, grid `chartGrid`, no chart borders.
- **Status**: 8px dot + label. Never full-row coloring.

## Windows welcome experience (all desktop apps)

Shared behaviour, implemented natively in each app's toolkit:

1. **Launch splash** — frameless, full-screen black window on the primary monitor.
   IPScans mark fades/scales in (0.92 → 1.0, 600 ms, easeOut), app name appears below in
   Display weight, a 2px progress line and a single status line reflect **real** init steps
   (loading settings, databases, models, network adapters…). No fake timers.
2. **First run only** — a Windows 11 OOBE-style flow: full-screen, one question per step,
   large left-aligned title, short helper text, primary button bottom-right, Back bottom-left,
   step dots. Steps are app-specific (language, privacy/telemetry consent, permissions,
   license, network/camera setup) and every step is skippable when not legally required.
   Completion is persisted (QSettings / app settings) so it never repeats.
3. **Daily launches** — splash stays only as long as initialization actually takes
   (target < 1.2 s, no minimum artificial delay beyond a 250 ms fade), then cross-fades into
   the main window.
4. **Escape hatch** — `Esc` exits full screen / skips the splash at any time; `Alt+F4` closes;
   the OOBE has a visible "Skip setup" text button. CLI `--no-splash` disables it.
5. **Transition** — main window opens maximized-or-restored with a 200 ms opacity fade.

## Web specifics

- Max content width 1200px, 24px gutters, header 64px, sticky, `rgba(0,0,0,0.8)` + backdrop blur.
- Footer: compact link columns + legal line. **No giant wordmark.**
- Product pages: hero (name, one-line value, primary download), real screenshot/preview,
  feature grid (icon + title + one sentence), technical spec table, download metadata
  (version, size, SHA-256) at the bottom.
