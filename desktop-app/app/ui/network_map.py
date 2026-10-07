"""Viewport-culling node graph with explicit adjacency and inference evidence."""
from __future__ import annotations

from collections import defaultdict, deque
from pathlib import Path
import webbrowser

from PyQt6.QtCore import QRectF, QSize, Qt, pyqtSignal
from PyQt6.QtGui import QColor, QFont, QImage, QPainter, QPen
from PyQt6.QtSvg import QSvgGenerator
from PyQt6.QtWidgets import (
    QApplication, QFileDialog, QGraphicsItem, QGraphicsObject, QGraphicsScene,
    QGraphicsView, QHBoxLayout, QLabel, QMenu, QMessageBox, QPushButton, QVBoxLayout, QWidget,
)

from app.core.models import Device
from app.core.topology import build_topology
from app.i18n import t
from app.ui.device_icons import icon_for_type
from app.ui.widgets import matches_device


class DeviceNode(QGraphicsObject):
    activated = pyqtSignal(object)
    refresh_requested = pyqtSignal(str)
    collapse_requested = pyqtSignal(str)

    def __init__(self, device: Device, lang: str) -> None:
        super().__init__()
        self.device, self.lang = device, lang
        self.setFlags(QGraphicsItem.GraphicsItemFlag.ItemIsSelectable
                      | QGraphicsItem.GraphicsItemFlag.ItemIsFocusable)
        self.setToolTip(
            f"{device.ip}\n{device.device_type} / {device.reachability}\n"
            f"{device.classification_confidence} confidence: {device.classification_evidence or 'Unknown'}\n"
            f"{device.connection_evidence or 'Physical connection unknown'}"
        )

    def boundingRect(self) -> QRectF:
        return QRectF(0, 0, 240, 90)

    def paint(self, painter: QPainter, option, widget=None) -> None:
        painter.setPen(QPen(QColor("#ffffff" if self.isSelected() or self.hasFocus() else "#555555"), 2))
        painter.setBrush(QColor("#171717"))
        painter.drawRoundedRect(self.boundingRect().adjusted(1, 1, -1, -1), 5, 5)
        icon_for_type(self.device.device_type).paint(painter, 12, 14, 28, 28)
        painter.setPen(QColor("#ffffff"))
        painter.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        painter.drawText(QRectF(50, 10, 180, 24), self.device.ip)
        painter.setFont(QFont("Segoe UI", 9))
        name = self.device.hostname or self.device.upnp_friendly_name or self.device.vendor or self.device.device_type
        painter.drawText(QRectF(50, 34, 180, 20), name[:26])
        painter.setPen(QColor("#cccccc"))
        painter.drawText(QRectF(12, 62, 220, 20), f"{self.device.reachability} | {self.device.device_type}")

    def mouseDoubleClickEvent(self, event) -> None:
        self.activated.emit(self.device)
        event.accept()

    def keyPressEvent(self, event) -> None:
        if event.key() in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            self.activated.emit(self.device)
            event.accept()
        else:
            super().keyPressEvent(event)

    def contextMenuEvent(self, event) -> None:
        menu = QMenu()
        details = menu.addAction(t(self.lang, "device_details"))
        refresh = menu.addAction(t(self.lang, "refresh_node"))
        collapse = menu.addAction(t(self.lang, "collapse_branch"))
        open_device = menu.addAction(t(self.lang, "open_device"))
        copy = menu.addAction(t(self.lang, "copy_ip"))
        chosen = menu.exec(event.screenPos())
        if chosen == details:
            self.activated.emit(self.device)
        elif chosen == refresh:
            self.refresh_requested.emit(self.device.ip)
        elif chosen == collapse:
            self.collapse_requested.emit(self.device.ip)
        elif chosen == open_device:
            webbrowser.open(self.device.url)
        elif chosen == copy:
            QApplication.clipboard().setText(self.device.ip)


class GraphView(QGraphicsView):
    def wheelEvent(self, event) -> None:
        if event.modifiers() & Qt.KeyboardModifier.ControlModifier:
            self.zoom(1.2 if event.angleDelta().y() > 0 else 1 / 1.2)
            event.accept()
        else:
            super().wheelEvent(event)

    def zoom(self, factor: float) -> None:
        scale = self.transform().m11() * factor
        if 0.02 <= scale <= 4:
            self.scale(factor, factor)


class NetworkMap(QWidget):
    device_activated = pyqtSignal(object)
    refresh_requested = pyqtSignal(str)

    def __init__(self, lang: str = "en", parent=None) -> None:
        super().__init__(parent)
        self.lang = lang
        self.devices: list[Device] = []
        self.gateway: str | None = None
        self.local_network: str | None = None
        self.needle = ""
        self.collapsed: set[str] = set()
        self.nodes: dict[str, DeviceNode] = {}
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        actions = QHBoxLayout()
        for key, callback in (
            ("zoom_out", lambda: self.view.zoom(1 / 1.2)),
            ("zoom_in", lambda: self.view.zoom(1.2)),
            ("fit_screen", self.fit),
            ("collapse_branch", self.collapse_selected),
            ("expand_all", self.expand_all),
            ("export_map", self.choose_export),
        ):
            button = QPushButton(t(lang, key))
            button.setAccessibleName(t(lang, key))
            button.clicked.connect(callback)
            actions.addWidget(button)
        actions.addStretch()
        layout.addLayout(actions)
        legend = QLabel(t(lang, "map_legend"))
        legend.setWordWrap(True)
        layout.addWidget(legend)
        self.scene = QGraphicsScene(self)
        self.scene.setBackgroundBrush(QColor("#0a0a0a"))
        self.view = GraphView(self.scene)
        self.view.setAccessibleName(t(lang, "network_map"))
        self.view.setAccessibleDescription(t(lang, "graph_accessibility"))
        self.view.setDragMode(QGraphicsView.DragMode.ScrollHandDrag)
        self.view.setRenderHint(QPainter.RenderHint.Antialiasing)
        self.view.setViewportUpdateMode(QGraphicsView.ViewportUpdateMode.MinimalViewportUpdate)
        self.view.setTransformationAnchor(QGraphicsView.ViewportAnchor.AnchorUnderMouse)
        layout.addWidget(self.view, stretch=1)

    def set_filter_text(self, text: str) -> None:
        self.needle = text.strip().lower()
        self._render()

    def refresh(self, devices: list[Device], gateway: str | None = None,
                local_network: str | None = None) -> None:
        self.devices, self.gateway, self.local_network = list(devices), gateway, local_network
        self._render()

    def _render(self) -> None:
        selected = {item.device.ip for item in self.scene.selectedItems() if isinstance(item, DeviceNode)}
        self.scene.clear()
        self.nodes.clear()
        by_ip = {device.ip: device for device in self.devices}
        links = build_topology(self.devices, self.gateway, self.local_network)
        children: dict[str, list[str]] = defaultdict(list)
        parent = {}
        for link in links:
            children[link.parent].append(link.child)
            parent[link.child] = link.parent
        depth: dict[str, int] = {}
        hidden = set()
        queue = deque((ip, 0, False) for ip in by_ip if ip not in parent)
        while queue:
            ip, level, hide = queue.popleft()
            if ip in depth:
                continue
            depth[ip] = level
            if hide:
                hidden.add(ip)
            queue.extend((child, min(level + 1, 8), hide or ip in self.collapsed)
                         for child in children[ip])
        rows: dict[int, int] = defaultdict(int)
        for device in self.devices:
            if device.ip in hidden or not matches_device(device, self.needle):
                continue
            level = depth.get(device.ip, 0)
            row = rows[level]
            rows[level] += 1
            node = DeviceNode(device, self.lang)
            node.setPos(level * 1080 + row % 4 * 260, row // 4 * 112)
            node.activated.connect(self.device_activated.emit)
            node.refresh_requested.connect(self.refresh_requested.emit)
            node.collapse_requested.connect(self.toggle_branch)
            node.setSelected(device.ip in selected)
            self.scene.addItem(node)
            self.nodes[device.ip] = node
        for link in links:
            a, b = self.nodes.get(link.parent), self.nodes.get(link.child)
            if not a or not b:
                continue
            pen = QPen(QColor("#aaaaaa" if link.confirmed else "#666666"), 1.5)
            if not link.confirmed:
                pen.setStyle(Qt.PenStyle.DashLine)
            edge = self.scene.addLine(a.x() + 240, a.y() + 45, b.x(), b.y() + 45, pen)
            edge.setZValue(-1)
            edge.setToolTip(f"{'Confirmed adjacency' if link.confirmed else 'Inferred route'}: {link.evidence}")
        self.scene.setSceneRect(self.scene.itemsBoundingRect().adjusted(-30, -30, 30, 30))

    def toggle_branch(self, ip: str) -> None:
        if ip in self.collapsed:
            self.collapsed.remove(ip)
        else:
            self.collapsed.add(ip)
        self._render()

    def collapse_selected(self) -> None:
        selected = [item.device.ip for item in self.scene.selectedItems() if isinstance(item, DeviceNode)]
        for ip in selected:
            self.collapsed.add(ip)
        self._render()

    def expand_all(self) -> None:
        self.collapsed.clear()
        self._render()

    def fit(self) -> None:
        if self.nodes:
            self.view.fitInView(self.scene.sceneRect(), Qt.AspectRatioMode.KeepAspectRatio)

    def choose_export(self) -> None:
        path, selected = QFileDialog.getSaveFileName(
            self, t(self.lang, "export_map"), "IPscans-network-map.svg", "SVG (*.svg);;PNG (*.png)")
        if not path:
            return
        target = Path(path)
        if target.suffix.lower() not in (".svg", ".png"):
            target = target.with_suffix(".png" if "PNG" in selected else ".svg")
        try:
            self.export_graph(target)
        except (OSError, ValueError) as exc:
            QMessageBox.warning(self, t(self.lang, "export_map"), str(exc))

    def export_graph(self, path: Path) -> None:
        if not self.nodes:
            raise ValueError("There are no visible devices to export.")
        if path.suffix.lower() not in (".png", ".svg"):
            raise ValueError("Network Map export supports SVG or PNG.")
        if path.suffix.lower() == ".png" and len(self.nodes) > 250:
            raise ValueError("PNG export supports up to 250 visible nodes; use SVG for larger networks.")
        bounds = self.scene.sceneRect()
        factor = min(1.0, 4096 / max(bounds.width(), bounds.height()))
        size = QSize(max(1, int(bounds.width() * factor)), max(1, int(bounds.height() * factor)))
        image = None
        if path.suffix.lower() == ".svg":
            surface = QSvgGenerator()
            surface.setFileName(str(path))
            surface.setSize(size)
            surface.setViewBox(QRectF(0, 0, size.width(), size.height()))
        else:
            image = QImage(size, QImage.Format.Format_RGB32)
            image.fill(QColor("#0a0a0a"))
            surface = image
        painter = QPainter(surface)
        if not painter.isActive():
            raise OSError("Could not create the map export.")
        try:
            self.scene.render(painter, QRectF(0, 0, size.width(), size.height()), bounds)
        finally:
            painter.end()
        if image is not None and not image.save(str(path), "PNG"):
            raise OSError("Could not save the map export.")
