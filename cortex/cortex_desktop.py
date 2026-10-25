# -*- coding: utf-8 -*-
"""
IPScans Cortex â€” Native PySide6 + Qt Quick/QML + Qt Quick 3D Desktop Application.
Preserves 100% of the existing Python backend (server.py, forensics.py, intelligence.py,
access.py, stream.py, local_rules.py) while rendering a hardware-accelerated Direct3D 11
2D/3D command center.
"""

from __future__ import annotations

import argparse
import ctypes
import os
import socket
import sys
import threading
from pathlib import Path

# Ensure high-DPI Per-Monitor V2 scaling and D3D11 RHI before QGuiApplication creation
os.environ.setdefault("QT_ENABLE_HIGHDPI_SCALING", "1")
os.environ.setdefault("QT_QUICK_CONTROLS_STYLE", "Basic")

from PySide6.QtCore import QTimer, Qt, QUrl
from PySide6.QtGui import QFont, QFontDatabase, QGuiApplication, QIcon
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtQuick import QQuickWindow, QSGRendererInterface
from PySide6.QtQuickControls2 import QQuickStyle

import server
from cortex_3d_geometry import register_3d_geometry_types
from cortex_bridge import (
    CortexBackendBridge,
    CortexEventImageProvider,
    CortexFrameImageProvider,
    CortexHeatmapImageProvider,
)


def resolve_resource_path(relative_path: str) -> Path:
    """Resolve resource path safely across source, PyInstaller (_MEIPASS), and Nuitka builds."""
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        base_dir = Path(getattr(sys, "_MEIPASS"))
    else:
        base_dir = Path(__file__).resolve().parent
    return base_dir / relative_path


def configure_windows_shell_integration() -> None:
    """Set explicit Windows 11 AppUserModelID for taskbar grouping and DPI awareness."""
    if sys.platform != "win32":
        return
    try:
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
            "IPScans.Cortex.Desktop.Pro.2.4"
        )
    except Exception:
        pass


def is_port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.25)
        return sock.connect_ex((host, port)) == 0


def ensure_backend_services_running() -> None:
    """Start existing Cortex HTTP API & Telegram polling in daemon threads if not already active."""
    host = getattr(server, "HOST", "127.0.0.1")
    port = int(getattr(server, "PORT", 8765))
    if is_port_in_use(host, port):
        return

    def _run_http_server() -> None:
        try:
            httpd = server.LocalServer((host, port), server.Handler)
            httpd.serve_forever()
        except Exception:
            pass

    threading.Thread(target=_run_http_server, daemon=True, name="CortexHTTPBackend").start()
    try:
        threading.Thread(
            target=server.telegram_polling_worker,
            daemon=True,
            name="CortexTelegramWorker",
        ).start()
    except Exception:
        pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="IPScans Cortex Native 3D Desktop UI")
    parser.add_argument(
        "--capture-verification",
        type=str,
        default="",
        help="Capture verification screenshots (dark, light, 3d_startup) into directory and exit.",
    )
    parser.add_argument(
        "--no-splash",
        action="store_true",
        help="Skip the 3D startup sequence on interactive launch.",
    )
    args = parser.parse_args(argv)

    configure_windows_shell_integration()

    # Force Direct3D 11 hardware RHI for Qt Quick 3D on Windows
    if sys.platform == "win32":
        QQuickWindow.setGraphicsApi(QSGRendererInterface.GraphicsApi.Direct3D11)
    QQuickStyle.setStyle("Basic")
    QGuiApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )

    app = QGuiApplication(sys.argv)
    app.setApplicationName("IPScans Cortex")
    app.setOrganizationName("IPScans")
    app.setApplicationVersion("2.4.0")

    icon_path = resolve_resource_path("ui/favicon.ico")
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    # Register embedded IPScans.com fonts (Google Sans Flex & Google Sans Code)
    for font_rel in ("qml/fonts/GoogleSansFlex.ttf", "qml/fonts/GoogleSansCode.ttf"):
        font_path = resolve_resource_path(font_rel)
        if font_path.is_file():
            QFontDatabase.addApplicationFont(str(font_path))
    if "Google Sans Flex" in QFontDatabase.families():
        app.setFont(QFont("Google Sans Flex", 10))

    # Start or attach to the existing Python backend
    ensure_backend_services_running()

    # Register procedural 3D geometry types (Cortex3DPrimitives 1.0)
    register_3d_geometry_types()

    # Create Backend Bridge & QQuickImageProviders
    bridge = CortexBackendBridge()
    frame_provider = CortexFrameImageProvider(bridge)
    event_provider = CortexEventImageProvider(bridge)
    heatmap_provider = CortexHeatmapImageProvider(bridge)

    engine = QQmlApplicationEngine()
    engine.addImageProvider("cortexframe", frame_provider)
    engine.addImageProvider("cortexevent", event_provider)
    engine.addImageProvider("cortexheatmap", heatmap_provider)
    engine.rootContext().setContextProperty("backend", bridge)

    qml_dir = resolve_resource_path("qml")
    engine.addImportPath(str(qml_dir))
    main_qml = qml_dir / "Main.qml"

    qml_errors: list[str] = []

    def _on_warnings(warnings_list):
        for w in warnings_list:
            msg = w.toString()
            qml_errors.append(msg)
            print(f"[QML WARNING] {msg}", file=sys.stderr)

    engine.warnings.connect(_on_warnings)
    engine.load(QUrl.fromLocalFile(str(main_qml)))

    if not engine.rootObjects():
        print("[FATAL] Failed to load Main.qml", file=sys.stderr)
        return 1

    root_win = engine.rootObjects()[0]

    # Verification Screenshot Harness Mode
    if args.capture_verification:
        out_dir = Path(args.capture_verification).resolve()
        out_dir.mkdir(parents=True, exist_ok=True)

        def _step_1_capture_light():
            if bridge.isDarkTheme:
                bridge.toggleTheme()
            img_light = root_win.grabWindow()
            light_path = out_dir / "cortex_qml_dashboard_light.png"
            img_light.save(str(light_path))
            print(f"[CAPTURED] {light_path} ({img_light.width()}x{img_light.height()})")

            # Switch to Dark Mode
            bridge.toggleTheme()
            QTimer.singleShot(500, _step_2_capture_dark)

        def _step_2_capture_dark():
            img_dark = root_win.grabWindow()
            dark_path = out_dir / "cortex_qml_dashboard_dark.png"
            img_dark.save(str(dark_path))
            print(f"[CAPTURED] {dark_path} ({img_dark.width()}x{img_dark.height()})")

            # Activate 3D Startup Sequence at hero frame (progress=0.68)
            root_win.setStartupPreview(True, 0.68)
            QTimer.singleShot(550, _step_3_capture_startup)

        def _step_3_capture_startup():
            img_splash = root_win.grabWindow()
            splash_path = out_dir / "cortex_qml_3d_startup.png"
            img_splash.save(str(splash_path))
            print(f"[CAPTURED] {splash_path} ({img_splash.width()}x{img_splash.height()})")
            app.quit()

        QTimer.singleShot(900, _step_1_capture_light)
    else:
        # Interactive Launch: Play the 3D Cinematic Startup Sequence on startup
        if not args.no_splash:
            QTimer.singleShot(120, lambda: root_win.setStartupPreview(True, 0.02))

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
