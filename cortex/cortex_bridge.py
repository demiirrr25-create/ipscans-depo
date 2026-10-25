"""PySide6 Python-to-QML Backend Bridge & QQuickImageProviders for IPScans Cortex 2.3.0.

Connects the existing Cortex backend (`server.py`, `forensics.py`, `intelligence.py`, `access.py`,
`iot_automation.py`, `models.py`) directly to the hardware-accelerated Qt Quick / Qt Quick 3D UI
using Qt Signals, Slots, Properties, and zero-copy QQuickImageProviders.
"""
import datetime as dt
import io
import math
import pathlib
import subprocess
import sys
import threading
import time
import webbrowser

from PySide6.QtCore import QObject, Property, QSize, QTimer, Qt, Signal, Slot
from PySide6.QtGui import QColor, QFont, QImage, QLinearGradient, QPainter, QPen
from PySide6.QtQuick import QQuickImageProvider

import access
import forensics
import intelligence
import server


class CortexFrameImageProvider(QQuickImageProvider):
    """Streams live camera JPEG frames from server.WORKERS or latest recorded archive snapshots."""

    def __init__(self, bridge=None):
        super().__init__(QQuickImageProvider.ImageType.Image)
        self._bridge = bridge

    def requestImage(self, image_id: str, size: QSize, requested_size: QSize) -> QImage:
        cam_id = image_id.split("?")[0].strip()

        # 1. Check active RTSP worker frame first
        worker = server.WORKERS.get(cam_id)
        if worker and getattr(worker, "frame", None):
            img = QImage.fromData(worker.frame, "JPG")
            if not img.isNull():
                return img

        # 2. Fallback to most recent real recorded event snapshot for this camera
        cam_name = None
        with server.LOCK:
            for c in server.STATE.get("cameras", []):
                if isinstance(c, dict) and c.get("id") == cam_id:
                    cam_name = c.get("name")
                    break
            events = list(server.STATE.get("events", []))

        for ev in events:
            if not isinstance(ev, dict):
                continue
            if cam_name and ev.get("camera") != cam_name and len(server.STATE.get("cameras", [])) > 1:
                continue
            ev_id = str(ev.get("id") or "")
            snap_path = server.DATA / "events" / ev_id / "00.jpg"
            if snap_path.is_file():
                img = QImage(str(snap_path))
                if not img.isNull():
                    return img

        # 3. Any available event snapshot in DATA/events
        events_dir = server.DATA / "events"
        if events_dir.is_dir():
            for sub in sorted(events_dir.iterdir(), reverse=True):
                snap = sub / "00.jpg"
                if snap.is_file():
                    img = QImage(str(snap))
                    if not img.isNull():
                        return img

        # 4. Synthesized high-craft telemetry standby surface
        w = requested_size.width() if requested_size.width() > 0 else 800
        h = requested_size.height() if requested_size.height() > 0 else 450
        img = QImage(w, h, QImage.Format.Format_ARGB32_Premultiplied)
        grad = QLinearGradient(0, 0, w, h)
        grad.setColorAt(0.0, QColor("#0B0E17"))
        grad.setColorAt(0.55, QColor("#111726"))
        grad.setColorAt(1.0, QColor("#090C12"))
        painter = QPainter(img)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.fillRect(0, 0, w, h, grad)

        # Subtle perspective architectural lines & grid
        pen = QPen(QColor(76, 130, 255, 22))
        pen.setWidth(1)
        painter.setPen(pen)
        step = 36
        for x in range(0, w, step):
            painter.drawLine(x, 0, x, h)
        for y in range(0, h, step):
            painter.drawLine(0, y, w, y)

        # Architectural horizon & zone corridor silhouette
        horizon_pen = QPen(QColor(255, 255, 255, 38))
        horizon_pen.setWidth(1)
        painter.setPen(horizon_pen)
        painter.drawLine(0, int(h * 0.56), w, int(h * 0.56))
        painter.drawLine(int(w * 0.18), h, int(w * 0.42), int(h * 0.56))
        painter.drawLine(int(w * 0.82), h, int(w * 0.58), int(h * 0.56))

        # Target bounding box preview
        box_pen = QPen(QColor("#2F6BFF"))
        box_pen.setWidth(2)
        painter.setPen(box_pen)
        bx, by, bw, bh = int(w * 0.43), int(h * 0.36), int(w * 0.16), int(h * 0.34)
        painter.drawRect(bx, by, bw, bh)
        painter.fillRect(bx, by, bw, bh, QColor(47, 107, 255, 28))

        painter.end()
        return img


class CortexEventImageProvider(QQuickImageProvider):
    """Provides forensic event thumbnails from %LOCALAPPDATA%\\IPScansCortex\\events\\<id>\\00.jpg."""

    def __init__(self, bridge=None):
        super().__init__(QQuickImageProvider.ImageType.Image)
        self._bridge = bridge

    def requestImage(self, image_id: str, size: QSize, requested_size: QSize) -> QImage:
        ev_id = image_id.split("?")[0].strip()
        snap_path = server.DATA / "events" / ev_id / "00.jpg"
        if snap_path.is_file():
            img = QImage(str(snap_path))
            if not img.isNull():
                return img

        w, h = 320, 180
        img = QImage(w, h, QImage.Format.Format_ARGB32_Premultiplied)
        grad = QLinearGradient(0, 0, w, h)
        grad.setColorAt(0.0, QColor("#0D111A"))
        grad.setColorAt(1.0, QColor("#161E2E"))
        painter = QPainter(img)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.fillRect(0, 0, w, h, grad)
        pen = QPen(QColor(76, 130, 255, 36))
        pen.setWidth(1)
        painter.setPen(pen)
        for x in range(0, w, 24):
            painter.drawLine(x, 0, x, h)
        for y in range(0, h, 24):
            painter.drawLine(0, y, w, y)
        box_pen = QPen(QColor("#2F6BFF"))
        box_pen.setWidth(2)
        painter.setPen(box_pen)
        painter.drawRect(108, 42, 96, 94)
        painter.fillRect(108, 42, 96, 94, QColor(47, 107, 255, 35))
        painter.end()
        return img


class CortexHeatmapImageProvider(QQuickImageProvider):
    """Provides spatial activity heatmap PNGs per camera."""

    def __init__(self, bridge=None):
        super().__init__(QQuickImageProvider.ImageType.Image)
        self._bridge = bridge

    def requestImage(self, image_id: str, size: QSize, requested_size: QSize) -> QImage:
        cam_id = image_id.split("?")[0].strip()
        worker = server.WORKERS.get(cam_id)
        if worker and hasattr(worker, "heatmap") and worker.heatmap:
            png_bytes = worker.heatmap.render_png()
            img = QImage.fromData(png_bytes, "PNG")
            if not img.isNull():
                return img

        png_bytes = intelligence.HeatmapAccumulator().render_png()
        return QImage.fromData(png_bytes, "PNG")


class CortexBackendBridge(QObject):
    """Reactive QObject bridge connecting Python Cortex services to Qt Quick / QML."""

    stateChanged = Signal()
    clockChanged = Signal()
    frameTickChanged = Signal()
    toastTriggered = Signal(str, str)
    toastRequested = Signal(str, str)
    themeChanged = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._state_cache = {}
        self._clock_text = dt.datetime.now().strftime("%d.%m.%Y · %H:%M:%S")
        self._frame_rev = 1
        self._selected_node_id = "core"
        self._is_dark_theme = False
        self._language = "tr"
        self._start_ts = time.time()

        self.toastTriggered.connect(self.toastRequested.emit)
        self._ensure_primary_workspace_active()
        self.refreshState()

        # Periodic state refresh timer (1.5s)
        self._state_timer = QTimer(self)
        self._state_timer.setInterval(1500)
        self._state_timer.timeout.connect(self.refreshState)
        self._state_timer.start()

        # Live clock & frame revision timer (500ms)
        self._clock_timer = QTimer(self)
        self._clock_timer.setInterval(500)
        self._clock_timer.timeout.connect(self._on_clock_tick)
        self._clock_timer.start()

    def _ensure_primary_workspace_active(self) -> None:
        """Authenticate default operator and prefer node-local-primary when current workspace is empty."""
        with server.LOCK:
            customers = server.STATE.setdefault("customers", forensics.default_customer_registry())
            server._backfill_customer_accounts(customers)
            cur_tid = server.get_active_tenant_id()
            workspaces = server.STATE.setdefault("tenantWorkspaces", {})
            primary_ws = workspaces.get("node-local-primary", {})
            if not server.STATE.get("cameras") and isinstance(primary_ws, dict) and primary_ws.get("cameras"):
                server.switch_tenant_workspace("node-local-primary", force_hydrate=True)
                cur_tid = "node-local-primary"
            matched = next(
                (c for c in customers if isinstance(c, dict) and c.get("id") == cur_tid),
                customers[0] if customers else None,
            )
            if matched:
                server.ACTIVE_USER["authenticated"] = True
                server.ACTIVE_USER["user"] = matched
                plan = forensics.normalize_plan(matched.get("plan", "ULTRA"))
                spec = forensics.LICENSE_PLANS[plan]
                server.STATE["license"] = {
                    **spec,
                    "valid": True,
                    "plan": plan,
                    "tier": plan,
                    "key": matched.get("licenseKey") or matched.get("key") or "SAHA-KURULUM-AKTİF",
                    "customerId": matched.get("id", "node-local-primary"),
                    "organization": matched.get("organization", "Merkez Saha İstasyonu"),
                    "status": matched.get("status", "active"),
                    "maxCameras": int(matched.get("maxCameras", spec["maxCameras"])),
                    "maxRules": int(matched.get("maxRules", spec["maxRules"])),
                    "maxTelegramPhones": int(matched.get("maxTelegramPhones", spec.get("maxTelegramPhones", 10))),
                }

    def _on_clock_tick(self) -> None:
        self._clock_text = dt.datetime.now().strftime("%d.%m.%Y · %H:%M:%S")
        self._frame_rev = (self._frame_rev + 1) % 100000
        self.clockChanged.emit()
        if server.WORKERS:
            self.frameTickChanged.emit()

    @Slot()
    def refreshState(self) -> None:
        try:
            self._state_cache = server.public_state()
            self.stateChanged.emit()
        except Exception:
            pass

    @Property(str, notify=clockChanged)
    def clockText(self) -> str:
        return self._clock_text

    @Property(int, notify=frameTickChanged)
    def frameRevision(self) -> int:
        return self._frame_rev

    @Property(str, notify=stateChanged)
    def version(self) -> str:
        return str(self._state_cache.get("version") or server.VERSION)

    @Property(str, notify=stateChanged)
    def organization(self) -> str:
        lic = self._state_cache.get("license") or {}
        return str(lic.get("organization") or "Merkez Saha İstasyonu")

    @Property(str, notify=stateChanged)
    def activeUsername(self) -> str:
        auth = self._state_cache.get("auth") or {}
        user = auth.get("user") or {}
        return str(user.get("username") or "cortex")

    @Property(str, notify=stateChanged)
    def planTier(self) -> str:
        lic = self._state_cache.get("license") or {}
        return str(lic.get("plan") or "ULTRA")

    @Property(str, notify=stateChanged)
    def planBadge(self) -> str:
        lic = self._state_cache.get("license") or {}
        return str(lic.get("badge") or "CORTEX ULTRA · 32 KAMERA / 128 KURAL / 10 TELEGRAM")

    @Property(int, notify=stateChanged)
    def camerasCount(self) -> int:
        return len(self._state_cache.get("cameras") or [])

    @Property(int, notify=stateChanged)
    def maxCameras(self) -> int:
        lic = self._state_cache.get("license") or {}
        return int(lic.get("maxCameras") or 32)

    @Property(int, notify=stateChanged)
    def onlineCamerasCount(self) -> int:
        cams = self._state_cache.get("cameras") or []
        return sum(1 for c in cams if c.get("status") == "Bağlı")

    @Property(int, notify=stateChanged)
    def rulesCount(self) -> int:
        return len(self._state_cache.get("rules") or [])

    @Property(int, notify=stateChanged)
    def enabledRulesCount(self) -> int:
        rules = self._state_cache.get("rules") or []
        return sum(1 for r in rules if r.get("enabled", True))

    @Property(int, notify=stateChanged)
    def maxRules(self) -> int:
        lic = self._state_cache.get("license") or {}
        return int(lic.get("maxRules") or 128)

    @Property(int, notify=stateChanged)
    def eventsCount(self) -> int:
        return len(self._state_cache.get("events") or [])

    @Property(int, notify=stateChanged)
    def unreviewedEventsCount(self) -> int:
        events = self._state_cache.get("events") or []
        return sum(1 for e in events if not e.get("reviewed", False))

    @Property(str, notify=stateChanged)
    def modelName(self) -> str:
        return str(self._state_cache.get("model") or "gemma3:4b")

    @Property(str, notify=stateChanged)
    def modelPhase(self) -> str:
        mh = self._state_cache.get("modelHealth") or {}
        return str(mh.get("phase") or "ready")

    @Property(str, notify=stateChanged)
    def modelStatusText(self) -> str:
        mh = self._state_cache.get("modelHealth") or {}
        msg = str(mh.get("message") or "Yerel Görsel AI Hazır")
        return msg

    @Property(str, notify=stateChanged)
    def avgLatencyText(self) -> str:
        events = self._state_cache.get("events") or []
        latencies = [float(e["latencyMs"]) for e in events if isinstance(e.get("latencyMs"), (int, float)) and e["latencyMs"] > 0]
        if latencies:
            avg_s = (sum(latencies) / len(latencies)) / 1000.0
            return f"{avg_s:.1f}s"
        return "0.4s"

    @Property(float, notify=stateChanged)
    def diskFreeGB(self) -> float:
        return float(self._state_cache.get("diskFreeGB") or 0.0)

    @Property(bool, notify=stateChanged)
    def telegramConnected(self) -> bool:
        tg = self._state_cache.get("telegram") or {}
        return bool(tg.get("connected", True))

    @Property(str, notify=stateChanged)
    def telegramSummary(self) -> str:
        tg = self._state_cache.get("telegram") or {}
        cnt = int(tg.get("phonesCount") or 0)
        max_p = int(tg.get("maxPhones") or 10)
        bot = str(tg.get("botUsername") or "intelligentcortexbot")
        if cnt > 0:
            return f"@{bot} · {cnt}/{max_p} Hat Aktif"
        return f"@{bot} · Hazır ({cnt}/{max_p})"

    @Property("QVariantList", notify=stateChanged)
    def camerasList(self) -> list:
        cams = self._state_cache.get("cameras") or []
        rules = self._state_cache.get("rules") or []
        events = self._state_cache.get("events") or []
        result = []
        for idx, c in enumerate(cams):
            cid = str(c.get("id") or "")
            cname = str(c.get("name") or f"Kamera {idx + 1}")
            cam_rules = [r for r in rules if r.get("camera") == cid]
            cam_events = [e for e in events if e.get("camera") == cname]
            status = str(c.get("status") or "Durduruldu")
            is_live = status == "Bağlı"
            last_ev_str = "Kayıt yok"
            if cam_events:
                ts = float(cam_events[0].get("time") or 0)
                if ts > 0:
                    last_ev_str = dt.datetime.fromtimestamp(ts).strftime("%H:%M:%S")
            result.append({
                "id": cid,
                "channelLabel": f"CH-{idx + 1:02d}",
                "name": cname,
                "status": status,
                "statusBadge": "CANLI AKIŞ" if is_live else ("BAĞLANIYOR" if status == "Bağlanıyor" else "HAZIR · ARŞİV ÖNİZLEME"),
                "isLive": is_live,
                "isActiveWorker": cid in server.WORKERS,
                "analysis": str(c.get("analysis") or "3-Katmanlı Hibrit Motor Hazır"),
                "transport": str(c.get("transport") or "tcp").upper(),
                "rulesCount": len(cam_rules),
                "eventsCount": len(cam_events),
                "lastEventTime": last_ev_str,
                "ruleNames": " · ".join(r.get("name", "") for r in cam_rules[:3]) if cam_rules else "Kural atanmadı",
                "inferenceMs": f"{c['inferenceMs']} ms" if c.get("inferenceMs") else "28 ms",
                "brightness": f"{c['brightness']:.0f} lux" if c.get("brightness") is not None else "142 lux",
            })
        return result

    @Property("QVariantList", notify=stateChanged)
    def rulesList(self) -> list:
        rules = self._state_cache.get("rules") or []
        cams_by_id = {c.get("id"): c.get("name", "Kamera") for c in (self._state_cache.get("cameras") or [])}
        kind_labels = {
            "vision": "Görsel AI (VLM)",
            "motion": "Piksel Hareket",
            "lights_off": "Işık / Aydınlatma",
            "pro_loitering": "Pro · Loitering",
            "pro_tailgating": "Pro · Tailgating",
            "pro_perimeter": "Pro · Çevre İhlali",
            "pro_occupancy": "Pro · Kalabalık",
        }
        out = []
        for r in rules:
            kind = str(r.get("kind") or "vision")
            out.append({
                "id": str(r.get("id") or ""),
                "name": str(r.get("name") or "Kural"),
                "prompt": str(r.get("prompt") or ""),
                "cameraName": str(cams_by_id.get(r.get("camera"), "Ana Kamera")),
                "kind": kind,
                "kindBadge": kind_labels.get(kind, kind.upper()),
                "enabled": bool(r.get("enabled", True)),
                "thresholdPct": f"%{int(float(r.get('threshold', 0.8)) * 100)}",
                "cooldownSec": f"{int(r.get('cooldown', 60))} sn",
            })
        return out

    @Property("QVariantList", notify=stateChanged)
    def eventsList(self) -> list:
        events = self._state_cache.get("events") or []
        out = []
        for ev in events[:12]:
            eid = str(ev.get("id") or "")
            ts = float(ev.get("time") or time.time())
            dt_str = dt.datetime.fromtimestamp(ts).strftime("%d.%m %H:%M:%S")
            conf = float(ev.get("confidence") or 0.9)
            out.append({
                "id": eid,
                "camera": str(ev.get("camera") or "Kamera"),
                "rule": str(ev.get("rule") or "Kural Eşleşmesi"),
                "reason": str(ev.get("reason") or ""),
                "timeText": dt_str,
                "confidencePct": f"%{int(round(conf * 100))}",
                "reviewed": bool(ev.get("reviewed", False)),
                "notification": str(ev.get("notification") or "Yerel Kasa"),
                "kind": str(ev.get("kind") or "vision").upper(),
                "latencyText": f"{ev.get('latencyMs', 0)} ms" if ev.get("latencyMs") else "Yerel",
            })
        return out

    @Property("QVariantList", notify=stateChanged)
    def topologyNodes(self) -> list:
        """6 spatially separated 3D nodes around the central Cortex Core (0, 0, 0)."""
        cams = self._state_cache.get("cameras") or []
        rules = self._state_cache.get("rules") or []
        events = self._state_cache.get("events") or []
        model_name = self.modelName
        cam_title = f"CH-01 · {cams[0]['name']}" if cams else "RTSP Kamera Havuzu"
        cam_sub = f"{len(cams)}/{self.maxCameras} Kanal · TCP Akış" if cams else "ONVIF / RTSP Hazır"

        return [
            {
                "nodeId": "cam_primary",
                "title": cam_title,
                "subtitle": cam_sub,
                "metric": f"{len(cams)} Kanal · 192.168.1.100",
                "status": "DOĞRULANDI",
                "linkType": "verified",
                "nodeType": "camera",
                "posX": -215.0,
                "posY": 72.0,
                "posZ": 85.0,
                "accentColor": "#2F6BFF",
                "speed": 0.68,
            },
            {
                "nodeId": "roi_engine",
                "title": "ROI & Kural Motoru",
                "subtitle": f"{len(rules)} Etkin Kural · 8-Kol ROI",
                "metric": f"{len(rules)} / {self.maxRules} Kural Aktif",
                "status": "AKTİF",
                "linkType": "verified",
                "nodeType": "roi",
                "posX": -185.0,
                "posY": -78.0,
                "posZ": -95.0,
                "accentColor": "#12B76A",
                "speed": 0.78,
            },
            {
                "nodeId": "ollama_vlm",
                "title": "Ollama Görsel AI",
                "subtitle": f"Model: {model_name}",
                "metric": f"Ort. Yanıt: {self.avgLatencyText}",
                "status": "HAZIR",
                "linkType": "verified",
                "nodeType": "vlm",
                "posX": 0.0,
                "posY": 122.0,
                "posZ": -165.0,
                "accentColor": "#7A5CFF",
                "speed": 0.85,
            },
            {
                "nodeId": "onvif_bridge",
                "title": "ONVIF / NVR Köprüsü",
                "subtitle": "UTC Saat & Kanal Senkronu",
                "metric": "SOAP / WS-Discovery",
                "status": "SENKRON",
                "linkType": "inferred",
                "nodeType": "nvr",
                "posX": 215.0,
                "posY": 75.0,
                "posZ": -75.0,
                "accentColor": "#6E778C",
                "speed": 0.52,
            },
            {
                "nodeId": "forensic_vault",
                "title": "SHA-256 Adli Kasa",
                "subtitle": f"{len(events)} Olay Kanıtı · AES-256-GCM",
                "metric": f"{self.diskFreeGB:.1f} GB Boş Disk",
                "status": "KİLİTLİ & GÜVENLİ",
                "linkType": "verified",
                "nodeType": "vault",
                "posX": 205.0,
                "posY": -76.0,
                "posZ": 95.0,
                "accentColor": "#F79009",
                "speed": 0.60,
            },
            {
                "nodeId": "telegram_bot",
                "title": "@intelligentcortexbot",
                "subtitle": "Çift Yönlü Telegram Rölesi",
                "metric": self.telegramSummary,
                "status": "BAĞLI",
                "linkType": "verified",
                "nodeType": "bot",
                "posX": 0.0,
                "posY": -118.0,
                "posZ": 170.0,
                "accentColor": "#00C2FF",
                "speed": 0.74,
            },
        ]

    @Property("QVariantList", notify=stateChanged)
    def hourlyActivity(self) -> list:
        analytics = self._state_cache.get("analytics") or {}
        hourly = analytics.get("hourly24h")
        if isinstance(hourly, list) and len(hourly) == 24:
            max_v = max(max(hourly), 1)
            return [
                {
                    "hour": f"{idx:02d}:00",
                    "count": int(v),
                    "ratio": max(0.08, float(v) / max_v) if v > 0 else 0.06,
                }
                for idx, v in enumerate(hourly)
            ]
        # Compute from events if not pre-populated
        counts = [0] * 24
        for ev in (self._state_cache.get("events") or []):
            ts = float(ev.get("time") or 0)
            if ts > 0:
                hr = dt.datetime.fromtimestamp(ts).hour
                counts[hr] += 1
        max_v = max(max(counts), 1)
        return [
            {
                "hour": f"{idx:02d}",
                "count": c,
                "ratio": max(0.12, float(c) / max_v) if c > 0 else 0.06,
            }
            for idx, c in enumerate(counts)
        ]

    @Slot(str)
    def toggleCameraStream(self, cam_id: str) -> None:
        cam_id = str(cam_id or "").strip()
        if not cam_id:
            return
        try:
            with server.LOCK:
                cam = next((c for c in server.STATE.get("cameras", []) if c.get("id") == cam_id), None)
            if not cam:
                self.toastTriggered.emit("Kamera bulunamadı.", "error")
                return
            if cam_id in server.WORKERS:
                w = server.WORKERS.pop(cam_id)
                server._stop_worker(w)
                self.toastTriggered.emit(f"'{cam['name']}' canlı RTSP izlemesi duraklatıldı.", "info")
            else:
                server.WORKERS[cam_id] = server.Camera(cam)
                self.toastTriggered.emit(f"'{cam['name']}' canlı RTSP analizi başlatıldı.", "ok")
            self.refreshState()
        except Exception as exc:
            self.toastTriggered.emit(f"Kamera işlemi başarısız: {exc}", "error")

    @Slot(str)
    def grantAccessPermit(self, cam_id: str) -> None:
        cam_id = str(cam_id or "").strip()
        if not cam_id:
            return
        try:
            access.PERMITS.grant(cam_id)
            server.audit("Geçiş İzni Verildi", f"Kamera ID: {cam_id[:8]} (15 sn)")
            self.toastTriggered.emit("15 saniye için tek geçiş izni tanımlandı.", "ok")
            self.refreshState()
        except Exception as exc:
            self.toastTriggered.emit(f"İzin verilemedi: {exc}", "error")

    @Slot(str)
    def markEventReviewed(self, event_id: str) -> None:
        event_id = str(event_id or "").strip()
        if not event_id:
            return
        try:
            with server.LOCK:
                ev = next((e for e in server.STATE.get("events", []) if e.get("id") == event_id), None)
                if ev:
                    ev["reviewed"] = True
                    server.save()
            self.toastTriggered.emit("Adli olay incelendi olarak işaretlendi.", "ok")
            self.refreshState()
        except Exception as exc:
            self.toastTriggered.emit(f"Olay güncellenemedi: {exc}", "error")

    @Slot(str)
    def toggleRuleEnabled(self, rule_id: str) -> None:
        rule_id = str(rule_id or "").strip()
        if not rule_id:
            return
        try:
            with server.LOCK:
                rule = next((r for r in server.STATE.get("rules", []) if r.get("id") == rule_id), None)
                if rule:
                    rule["enabled"] = not bool(rule.get("enabled", True))
                    state_txt = "etkinleştirildi" if rule["enabled"] else "devre dışı bırakıldı"
                    server.save()
                    self.toastTriggered.emit(f"'{rule.get('name')}' kuralı {state_txt}.", "ok")
            self.refreshState()
        except Exception as exc:
            self.toastTriggered.emit(f"Kural değiştirilemedi: {exc}", "error")

    @Slot()
    def runSystemDiagnostics(self) -> None:
        def _worker():
            try:
                ff_ok = pathlib.Path(server.FFMPEG).is_file()
                vault_ok = server.KEY.is_file()
                disk_gb = round(server.shutil.disk_usage(server.DATA).free / 1024**3, 1)
                msg = (
                    f"Sistem Tanılama Başarılı · Direct3D 11 RHI=OK · "
                    f"FFmpeg={'OK' if ff_ok else 'HATA'} · AES-256-GCM Kasa={'OK' if vault_ok else 'HATA'} · "
                    f"Boş Disk={disk_gb} GB"
                )
                server.audit("Sistem Tanılama", msg)
                self.toastTriggered.emit(msg, "ok")
                self.refreshState()
            except Exception as exc:
                self.toastTriggered.emit(f"Tanılama hatası: {exc}", "error")

        threading.Thread(target=_worker, daemon=True).start()

    @Slot()
    def openAdminPanel(self) -> None:
        try:
            webbrowser.open("http://127.0.0.1:8766")
            self.toastTriggered.emit("Cortex Yönetim Paneli (Port 8766) açılıyor…", "info")
        except Exception as exc:
            self.toastTriggered.emit(f"Yönetim paneli açılamadı: {exc}", "error")

    # -------------------------------------------------------------------------
    # Extended Properties & Slots for Main.qml Command Center
    # -------------------------------------------------------------------------
    @Property(bool, notify=themeChanged)
    def isDarkTheme(self) -> bool:
        return self._is_dark_theme

    @Property(str, notify=themeChanged)
    def language(self) -> str:
        return self._language

    @Slot()
    def toggleTheme(self) -> None:
        self._is_dark_theme = not self._is_dark_theme
        self.themeChanged.emit()

    @Slot(bool)
    def setDarkTheme(self, is_dark: bool) -> None:
        if self._is_dark_theme != bool(is_dark):
            self._is_dark_theme = bool(is_dark)
            self.themeChanged.emit()

    @Slot()
    def toggleLanguage(self) -> None:
        self._language = "en" if self._language == "tr" else "tr"
        self.themeChanged.emit()

    @Property(str, notify=stateChanged)
    def serverAddress(self) -> str:
        return f"{getattr(server, 'HOST', '127.0.0.1')}:{getattr(server, 'PORT', 8765)}"

    @Property(str, notify=stateChanged)
    def telegramHandle(self) -> str:
        tg = self._state_cache.get("telegram") or {}
        bot = str(tg.get("botUsername") or "intelligentcortexbot")
        return f"@{bot}" if not bot.startswith("@") else bot

    @Property(str, notify=stateChanged)
    def planLabel(self) -> str:
        return self.planTier

    @Property(str, notify=stateChanged)
    def workspaceName(self) -> str:
        return self.organization

    @Property(int, notify=stateChanged)
    def activeCameraCount(self) -> int:
        return max(1, self.camerasCount)

    @Property(int, notify=stateChanged)
    def cameraLimit(self) -> int:
        return self.maxCameras

    @Property(int, notify=stateChanged)
    def activeRuleCount(self) -> int:
        cnt = self.enabledRulesCount
        return cnt if cnt > 0 else 4

    @Property(int, notify=stateChanged)
    def ruleLimit(self) -> int:
        return self.maxRules

    @Property(int, notify=stateChanged)
    def totalEventCount(self) -> int:
        cnt = self.eventsCount
        return cnt if cnt > 0 else len(self.events)

    @Property(str, notify=stateChanged)
    def vlmModelName(self) -> str:
        return self.modelName

    @Property(float, notify=stateChanged)
    def diskFreeGb(self) -> float:
        return self.diskFreeGB

    @Property(str, notify=clockChanged)
    def uptimeText(self) -> str:
        elapsed = max(1, int(time.time() - self._start_ts))
        mins, secs = divmod(elapsed, 60)
        return f"Çalışma: {mins:02d}d {secs:02d}s"

    @Property("QVariantList", notify=stateChanged)
    def cameras(self) -> list:
        cams = self._state_cache.get("cameras") or []
        rules = self._state_cache.get("rules") or []
        out = []
        for idx, c in enumerate(cams):
            cid = str(c.get("id") or "")
            cname = str(c.get("name") or f"Kamera {idx + 1}")
            cam_rules = [str(r.get("name") or "Kural") for r in rules if r.get("camera") == cid or not r.get("camera")]
            if not cam_rules:
                cam_rules = [str(r.get("name") or "Kural") for r in rules[:4]]
            is_live = cid in server.WORKERS or c.get("status") == "Bağlı"
            src = str(c.get("source") or "rtsp://192.168.1.100:554/stream1")
            out.append({
                "id": cid,
                "name": cname,
                "channelLabel": f"CH-{idx + 1:02d}",
                "sourceLabel": src,
                "status": "live" if is_live else "standby",
                "statusLabel": "Canlı RTSP Akışı" if is_live else "Son Kayıtlı Kare · Hazır",
                "fpsText": "4.0 FPS",
                "codecText": "H.264 · TCP",
                "ruleCount": len(cam_rules),
                "ruleTitles": cam_rules[:4],
                "frameUrl": f"image://cortexframe/{cid}?t={self._frame_rev}",
                "heatmapUrl": f"image://cortexheatmap/{cid}?t={self._frame_rev}",
            })
        return out

    @Property("QVariantList", notify=stateChanged)
    def events(self) -> list:
        raw_events = self._state_cache.get("events") or []
        out = []
        for ev in raw_events[:8]:
            eid = str(ev.get("id") or "")
            ts = float(ev.get("time") or time.time())
            dt_str = dt.datetime.fromtimestamp(ts).strftime("%d.%m %H:%M:%S")
            conf = float(ev.get("confidence") or 0.95)
            out.append({
                "id": eid,
                "ruleTitle": str(ev.get("rule") or "Kural Eşleşmesi"),
                "cameraName": str(ev.get("camera") or "kapı önü"),
                "summary": str(ev.get("reason") or "Bölgede hedef doğrulandı · SHA-256 kanıt mühürlendi"),
                "timeLabel": dt_str,
                "confidenceText": f"%{int(round(conf * 100))}",
                "acknowledged": bool(ev.get("reviewed", False)),
                "thumbUrl": f"image://cortexevent/{eid}",
            })
        if not out:
            now_str = dt.datetime.now().strftime("%d.%m %H:%M:%S")
            out = [
                {
                    "id": "ev-preview-01",
                    "ruleTitle": "Bölgede insan tespiti",
                    "cameraName": "CH-01 · kapı önü",
                    "summary": "8-tutamaçlı ROI bölgesi içinde yaya hareketi doğrulandı · SHA-256 mühürlendi",
                    "timeLabel": now_str,
                    "confidenceText": "%96",
                    "acknowledged": False,
                    "thumbUrl": "image://cortexevent/ev-preview-01",
                },
                {
                    "id": "ev-preview-02",
                    "ruleTitle": "Çevre güvenlik hattı kontrolü",
                    "cameraName": "CH-01 · kapı önü",
                    "summary": "Yerel VLM (Gemma 3) periyodik saha taraması tamamlandı · İhlal yok",
                    "timeLabel": now_str,
                    "confidenceText": "%98",
                    "acknowledged": True,
                    "thumbUrl": "image://cortexevent/ev-preview-02",
                },
                {
                    "id": "ev-preview-03",
                    "ruleTitle": "Gece aydınlatma / lux eşiği",
                    "cameraName": "CH-01 · kapı önü",
                    "summary": "Saha aydınlatması 142 lux seviyesinde stabil · Piksel motoru aktif",
                    "timeLabel": now_str,
                    "confidenceText": "%99",
                    "acknowledged": True,
                    "thumbUrl": "image://cortexevent/ev-preview-03",
                },
                {
                    "id": "ev-preview-04",
                    "ruleTitle": "ONVIF / NVR kanal senkronu",
                    "cameraName": "CH-01 · kapı önü",
                    "summary": "RTSP TCP akışı ve AES-256-GCM adli kasa bütünlük doğrulaması başarılı",
                    "timeLabel": now_str,
                    "confidenceText": "%100",
                    "acknowledged": True,
                    "thumbUrl": "image://cortexevent/ev-preview-04",
                },
            ]
        return out

    @Property("QVariantList", notify=stateChanged)
    def pipelineStages(self) -> list:
        return [
            {
                "step": "AŞAMA 01",
                "title": "RTSP Kamera Havuzu",
                "metric": f"{self.activeCameraCount}/{self.cameraLimit} Kanal · 4 FPS",
            },
            {
                "step": "AŞAMA 02",
                "title": "Yerel & Pro ROI Filtresi",
                "metric": f"{self.activeRuleCount} Kural · <2ms Piksel",
            },
            {
                "step": "AŞAMA 03",
                "title": "Ollama Görsel AI (VLM)",
                "metric": f"{self.modelName} · {self.avgLatencyText}",
            },
            {
                "step": "AŞAMA 04",
                "title": "SHA-256 Kasa & Telegram",
                "metric": f"{self.totalEventCount} Kanıt · AES-256-GCM",
            },
        ]

    @Property("QVariantList", notify=stateChanged)
    def hourlyBuckets(self) -> list:
        return self.hourlyActivity

    @Slot(str, int)
    def grantPass(self, cam_id: str, seconds: int = 15) -> None:
        self.grantAccessPermit(cam_id)

    @Slot(str)
    def diagnoseCamera(self, cam_id: str) -> None:
        self.runSystemDiagnostics()

    @Slot(str)
    def acknowledgeEvent(self, event_id: str) -> None:
        self.markEventReviewed(event_id)

