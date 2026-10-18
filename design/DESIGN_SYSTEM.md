# IPScans Unified Design System (v2.0)

Single visual identity, component architecture, and dual-theme (`Light` + `Dark` + `System`) specification for **IPScans.com** and every **IPScans Windows Desktop Application** (`IPscans+`, `IPScans Network Health Pro`, `IPCast`, `IPScans LPR Pro`, and `IPScans Cortex`).

Token values live in [`tokens.json`](./tokens.json). Every web surface and desktop application must use these exact tokens.

---

## 1. Core Design Philosophy

1. **One Ecosystem, Zero Visual Seam**: Opening any IPScans desktop EXE (`IPscans+`, `IPCast`, `LPR Pro`, `Cortex`, `Network Health Pro`) must feel like a direct native extension of `IPScans.com`.
2. **Dual-Theme Mastery (Light & Dark Mode)**:
   - **Light Mode**: Crisp editorial white (`#FFFFFF`) and cool alabaster (`#F8F9FA`, `#F1F3F5`) surfaces, deep obsidian ink (`#0B0D12`), subtle hairline borders (`#E5E7EB`), and signature IPScans Signal Blue (`#2F6BFF`) focus/interactive accents.
   - **Dark Mode**: Deep carbon-obsidian (`#07080B`) and elevated slate (`#0D0F14`, `#13161E`) surfaces, luminous off-white typography (`#F5F7FA`), hairline borders (`#1E222D`), and radiant Signal Blue (`#4C82FF`) accents.
   - **Theme Control & Persistence**: Every application and the website provides a top-level **Sun / Moon theme toggle button** in the header/navigation bar. Theme choice (`light` | `dark`) is persisted across restarts (`localStorage` on web, `QSettings` in Qt apps, `PreferencesStore` in Avalonia, `localStorage` + settings in Cortex) and automatically detects the OS preference (`prefers-color-scheme` / Windows `AppsUseLightTheme` registry key) on first launch.
3. **Function First**: Never remove or break an existing capability, protocol probe, camera stream, or security check. Standardize and elevate the visual hierarchy around every feature.
4. **Quiet Chrome**: No amateur neon clutter, no gratuitous version badges in headers, no artificial splash delays.

---

## 2. Typography & Numeric Discipline

| Role       | Web (`Google Sans Flex`)     | Desktop (`Segoe UI Variable`)        |
|------------|------------------------------|--------------------------------------|
| Display    | 56–72px, 550, `-0.035em`     | `Segoe UI Variable Display`, 32–38px, 600 |
| H1         | 38–52px, 550, `-0.03em`      | `Segoe UI Variable Display`, 24–26px, 600 |
| H2         | 26–34px, 550, `-0.025em`     | `Segoe UI Variable Display`, 18–20px, 600 |
| Body       | 16px, 400                    | `Segoe UI Variable Text`, 13–14px, 400 |
| Label      | 13px, 500                    | `Segoe UI Variable Text`, 12–13px, 500 |
| Caption    | 12px, 450, `textTertiary`    | `Segoe UI Variable Text`, 11–12px, 400 |
| Monospace  | `Google Sans Code`, tabular  | `Cascadia Mono`, `Consolas`, tabular |

All live telemetry, IP addresses, MAC addresses, ports, speeds, latencies, and counters must use tabular figures.

---

## 3. Unified Component Standards

- **Header / Top Bar**:
  - Height `64–68px`, brand mark + product title on the start side, pill-shaped segmented navigation in the center or left sidebar, action controls + **Sun/Moon Theme Toggle (`☀️` / `🌙` or vector icon)** on the end side.
- **Buttons**:
  - Pill radius (`999px` on web / `18–20px` in desktop toolkits).
  - **Primary**: High-contrast solid fill (`#0B0D12` text `#FFFFFF` in Light Mode; `#F5F7FA` text `#07080B` in Dark Mode) or Signal Blue (`#2F6BFF`) for active operations.
  - **Secondary**: `surface1`/`surface2` fill with `1px` `borderStrong` stroke.
  - **Ghost / Icon**: Transparent fill, subtle hover pill (`surfaceHover`).
- **Cards & Panels**:
  - `surface1` background, `1px` `border` stroke, rounded corners (`16–22px`).
- **Tables & Data Grids**:
  - Clean header row (`surface1`, `textTertiary` 12px semibold labels), `40–44px` row height, hairline row separators, subtle hover (`surfaceHover`), selected row highlighted with Signal Blue tint or high-contrast pill selection.
- **Inputs, Selects & Search Bars**:
  - `surface` / `surface1` background, `1px` `borderStrong`, `14–18px` radius, `2px` Signal Blue focus ring (`#2F6BFF` / `#4C82FF`).
- **Scrollbars**:
  - Minimalist 8–10px rounded thumb matching the active theme (`#D1D5DB` in Light, `#2C3242` in Dark).
- **Charts & Topology**:
  - Canvas, SVG, and `QGraphicsScene` backgrounds, node cards, edge lines, and text labels dynamically switch palettes when the theme toggles.
