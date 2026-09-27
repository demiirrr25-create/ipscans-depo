# ipscans Network Health Pro

Commercial "IP Conflict Prevention & Network Health" edition, built on top
of the free [`../desktop-app`](../desktop-app) IP Scanner. Ships as a
**separate** Windows executable/product with its own download page,
per product decision — see [`/memories/session/network-health-pro.md`](../.).

## Why this isn't a fork

This project does not copy or modify a single file from `../desktop-app`.
Instead, `main.py` adds that sibling project's root to `sys.path` at
runtime, and the PyInstaller build (`.github/workflows/build-desktop-app-pro.yml`)
adds it via `--paths` so the same source is statically analyzed and bundled
into this app's own standalone `.exe`. The free app's `MainWindow` is
embedded unmodified as this app's first tab ("Scanner"), so switching
between the free and Pro versions feels like the same product family
(product rule #1), while `pro/` and `ui/` add everything Pro on top.

## Layout

- `pro/` — pure Python engine, no Qt import, fully unit-testable headless:
  `database.py` (SQLite), `conflict_engine.py` (IP conflict / MAC-change
  detection with false-positive reduction), `health_score.py`,
  `ping_utils.py` (latency/packet loss), `license.py` (Phase-1 mock —
  Phase 2 will call the ipscans.com Next.js API), `export.py`, `monitor.py`
  (continuous-monitoring QThread), `notifications.py` (Windows toast).
- `ui/` — PyQt6 widgets for the new tabs (Dashboard, Monitoring, Event Log,
  Inventory, License), reusing `../desktop-app`'s `DARK_QSS` and button/
  label object names (`ui/pro_styles.py` only *adds* new QSS, e.g. for the
  tab strip, never replaces the original stylesheet).
- `tests/test_engine.py` — run with `python3 tests/test_engine.py` (or
  pytest); covers the conflict engine's confidence rules and false-positive
  cases explicitly, plus health score and mock licensing.

## Local testing (no Windows/display needed)

```bash
pip install PyQt6  # plus ../desktop-app/requirements.txt's non-Windows deps
python3 tests/test_engine.py                       # pure-Python engine tests
QT_QPA_PLATFORM=offscreen python3 main.py --selftest  # boots every tab headlessly
```

## Regenerating assets/icon_pro.ico

`assets/icon_pro.ico` / `icon_pro.png` are committed, pre-baked (PRO-badged)
copies of the free app's icon — regenerate them if that base icon ever
changes (requires `pip install Pillow` in addition to the deps above):

```bash
QT_QPA_PLATFORM=offscreen python3 -c "
from PyQt6.QtWidgets import QApplication; import sys
app = QApplication(sys.argv)
from ui.pro_resources import _with_pro_badge
from app.ui.resources import load_app_icon
from PIL import Image
badged = _with_pro_badge(load_app_icon().pixmap(256, 256))
badged.save('/tmp/_master.png')
master = Image.open('/tmp/_master.png').convert('RGBA')
master.save('assets/icon_pro.png')
master.save('assets/icon_pro.ico', format='ICO',
             sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
"
```

## What's NOT built yet (see session memory for the full plan)

Real license backend/payment, auto-update, multi-site/cloud management,
code signing, and PDF/Excel export are later phases — Phase 1 is the local
engine + Pro UI + a local-only mock license, matching the product spec's
own "first development stage" scope.
