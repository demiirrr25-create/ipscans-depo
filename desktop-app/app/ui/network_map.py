"""Viewport-culling node graph with explicit adjacency and inference evidence."""
from __future__ import annotations

from collections import defaultdict, deque
from pathlib import Path

from PyQt6.QtCore import QPointF, QRectF, QSize, Qt, pyqtSignal
from PyQt6.QtGui import QColor, QFont, QImage, QPainter, QPainterPath, QPen
from PyQt6.QtSvg import QSvgGenerator
from PyQt6.QtWidgets import (
    QApplication,
    QFileDialog,
    QGraphicsItem,
    QGraphicsObject,
    QGraphicsScene,
    QGraphicsView,
    QHBoxLayout,
    QLabel,
    QMenu,
    QMessageBox,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from app.core.models import Device
from app.core.topology import build_topology
from app.i18n import t
from app.ui.device_icons import icon_for_type
from app.ui.styles import ThemeManager, get_current_theme, get_tokens
from app.ui.widgets import matches_device


class DeviceNode(QGraphicsObject):
    activated = pyqtSignal(object)
    rename_requested = pyqtSignal(object)
    refresh_requested = pyqtSignal(str)
    collapse_requested = pyqtSignal(str)

    def __init__(self, device: Device, lang: str, menu_owner=None) -> None:
        super().__init__()
        self.device, self.lang = device, lang
        self.menu_owner = menu_owner
        self.setFlags(
            QGraphicsItem.GraphicsItemFlag.ItemIsSelectable
            | QGraphicsItem.GraphicsItemFlag.ItemIsFocusable
        )
        self.setToolTip(
            f"{device.display_name}\n{device.ip}\n{device.device_type} / {device.reachability}\n"
            f"{device.classification_confidence} confidence: {device.classification_evidence or 'Unknown'}\n"
            f"{device.connection_evidence or 'Physical connection unknown'}"
        )

    def boundingRect(self) -> QRectF:
        return QRectF(0, 0, 240, 90)

    def paint(self, painter: QPainter, option, widget=None) -> None:
        theme = get_current_theme()
        tokens = get_tokens(theme)
        is_light = theme == "light"

        active_sel = self.isSelected() or self.hasFocus()
        border_col = QColor(tokens["signal"] if active_sel else tokens["borderStrong"])
        border_w = 1.8 if active_sel else 1.0
        card_fill = QColor(tokens["surface"] if is_light else tokens["surface2"])

        painter.setPen(QPen(border_col, border_w))
        painter.setBrush(card_fill)
        painter.drawRoundedRect(self.boundingRect().adjusted(1, 1, -1, -1), 14, 14)

        # Status dot indicator
        is_online = self.device.reachability == "Online"
        status_col = QColor(tokens["statusOk"] if is_online else tokens["statusWarn"])
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(status_col)
        painter.drawEllipse(QPointF(224.0, 18.0), 4.0, 4.0)

        icon_for_type(self.device.device_type, theme).paint(painter, 12, 14, 28, 28)

        painter.setPen(QColor(tokens["text"]))
        painter.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        painter.drawText(
            QRectF(50, 10, 166, 24),
            painter.fontMetrics().elidedText(
                self.device.custom_name or self.device.ip,
                Qt.TextElideMode.ElideRight,
                162,
            ),
        )
        painter.setFont(QFont("Segoe UI", 9))
        painter.setPen(QColor(tokens["textSecondary"]))
        name = self.device.ip if self.device.custom_name else self.device.display_name
        painter.drawText(
            QRectF(50, 34, 176, 20),
            painter.fontMetrics().elidedText(name, Qt.TextElideMode.ElideRight, 172),
        )
        painter.setPen(QColor(tokens["textTertiary"]))
        painter.drawText(
            QRectF(12, 62, 220, 20),
            f"{self.device.reachability} | {self.device.device_type}",
        )

    def mouseDoubleClickEvent(self, event) -> None:
        self.activated.emit(self.device)
        event.accept()

    def keyPressEvent(self, event) -> None:
        if event.key() in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            self.activated.emit(self.device)
            event.accept()
        elif event.key() == Qt.Key.Key_F2:
            self.rename_requested.emit(self.device)
            event.accept()
        else:
            super().keyPressEvent(event)

    def contextMenuEvent(self, event) -> None:
        device, owner = self.device, self.menu_owner
        menu = QMenu()
        rename = menu.addAction(t(self.lang, "rename_device"))
        menu.addSeparator()
        refresh = menu.addAction(t(self.lang, "refresh_node"))
        collapse = menu.addAction(t(self.lang, "collapse_branch"))
        open_device = menu.addAction(t(self.lang, "open_device"))
        copy = menu.addAction(t(self.lang, "copy_ip"))
        callbacks = {
            rename: ((owner.rename_requested.emit if owner else self.rename_requested.emit), device),
            refresh: ((owner.refresh_requested.emit if owner else self.refresh_requested.emit), device.ip),
            collapse: ((owner.toggle_branch if owner else self.collapse_requested.emit), device.ip),
            open_device: ((owner.device_activated.emit if owner else self.activated.emit), device),
        }
        chosen = menu.exec(event.screenPos())
        if chosen in callbacks:
            callback, argument = callbacks[chosen]
            callback(argument)
        elif chosen == copy:
            QApplication.clipboard().setText(device.ip)


class GroupNode(QGraphicsObject):
    activated = pyqtSignal(str)

    def __init__(self, label, key):
        super().__init__()
        self.label, self.key = label, key
        self.setFlag(QGraphicsItem.GraphicsItemFlag.ItemIsFocusable)
        self.setToolTip(label + " / Enter")

    def boundingRect(self):
        return QRectF(0, 0, 260, 40)

    def paint(self, painter, option, widget=None):
        tokens = get_tokens()
        painter.setPen(QPen(QColor(tokens["borderStrong"]), 1, Qt.PenStyle.DashLine))
        painter.setBrush(QColor(tokens["surface2"]))
        painter.drawRoundedRect(self.boundingRect().adjusted(1, 1, -1, -1), 14, 14)
        painter.setPen(QColor(tokens["textSecondary"]))
        painter.drawText(self.boundingRect(), Qt.AlignmentFlag.AlignCenter, self.label)

    def mouseDoubleClickEvent(self, event):
        self.activated.emit(self.key)
        event.accept()

    def keyPressEvent(self, event):
        if event.key() in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            self.activated.emit(self.key)
        else:
            super().keyPressEvent(event)


class GraphView(QGraphicsView):
    def drawBackground(self, painter: QPainter, rect: QRectF) -> None:  # noqa: N802
        theme = get_current_theme()
        tokens = get_tokens(theme)
        is_light = theme == "light"
        bg_col = QColor(tokens["surface1"] if is_light else tokens["bg"])
        painter.fillRect(rect, bg_col)

        # Subtle radial topology rings painted directly onto background
        ring_col = QColor(tokens["borderStrong"] if is_light else tokens["border"])
        ring_col.setAlpha(95 if is_light else 75)
        painter.save()
        painter.setPen(QPen(ring_col, 1.0, Qt.PenStyle.DotLine))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        center = QPointF(120.0, 95.0)
        for radius in (180.0, 360.0, 560.0, 780.0):
            painter.drawEllipse(center, radius, radius)
        painter.restore()

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
    rename_requested = pyqtSignal(object)
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
        self.expanded_groups: set[str] = set()
        self._theme = get_current_theme()

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
        self.legend = QLabel(t(lang, "map_legend"))
        self.legend.setWordWrap(True)
        layout.addWidget(self.legend)
        self.scene = QGraphicsScene(self)
        self.view = GraphView(self.scene)
        self.view.setAccessibleName(t(lang, "network_map"))
        self.view.setAccessibleDescription(t(lang, "graph_accessibility"))
        self.view.setDragMode(QGraphicsView.DragMode.ScrollHandDrag)
        self.view.setRenderHint(QPainter.RenderHint.Antialiasing)
        self.view.setViewportUpdateMode(QGraphicsView.ViewportUpdateMode.MinimalViewportUpdate)
        self.view.setTransformationAnchor(QGraphicsView.ViewportAnchor.AnchorUnderMouse)
        layout.addWidget(self.view, stretch=1)

        self.apply_theme(self._theme)
        ThemeManager.instance().theme_changed.connect(self.apply_theme)

    def apply_theme(self, theme: str | None = None) -> None:
        self._theme = (theme or get_current_theme()).lower()
        tokens = get_tokens(self._theme)
        bg = tokens["surface1"] if self._theme == "light" else tokens["bg"]
        self.scene.setBackgroundBrush(QColor(bg))
        if self.devices:
            self._render()
        else:
            self.scene.update()
        self.view.viewport().update()

    def set_filter_text(self, text: str) -> None:
        self.needle = text.strip().lower()
        self._render()

    def refresh(
        self,
        devices: list[Device],
        gateway: str | None = None,
        local_network: str | None = None,
    ) -> None:
        self.devices, self.gateway, self.local_network = list(devices), gateway, local_network
        self._render()

    def _render(self) -> None:
        tokens = get_tokens(self._theme)
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
        matches = {d.ip for d in self.devices if matches_device(d, self.needle)}
        visible = set(matches)
        for ip in list(matches):
            seen = set()
            while ip in parent and ip not in seen:
                seen.add(ip)
                ip = parent[ip]
                visible.add(ip)
        for ip in self.collapsed:
            queue = deque(children[ip])
            while queue:
                child = queue.popleft()
                visible.discard(child)
                queue.extend(children[child])
        effective = {ip: [c for c in kids if c in visible] for ip, kids in children.items()}
        groups = {}
        if not self.needle:
            for ip, kids in effective.items():
                if len(kids) > 24 and ip not in self.expanded_groups:
                    groups[ip] = len(kids) - 24
                    effective[ip] = kids[:24]
        widths = {}

        def width(ip):
            stack = [(ip, False)]
            while stack:
                key, ready = stack.pop()
                if key in widths:
                    continue
                if ready:
                    widths[key] = max(260, sum(widths[c] for c in effective.get(key, [])))
                else:
                    stack.append((key, True))
                    stack.extend((c, False) for c in effective.get(key, []))
            return widths[ip]

        positions = {}

        def place(ip, x, y):
            stack = [(ip, x, y)]
            while stack:
                key, left, top = stack.pop()
                positions[key] = (left + width(key) / 2 - 120, top)
                offset = left
                for child in effective.get(key, []):
                    stack.append((child, offset, top + 180))
                    offset += width(child)

        roots = [ip for ip in by_ip if ip in visible and ip not in parent]
        roots.sort(key=lambda ip: (ip != self.gateway, ip))
        unresolved = [ip for ip in roots if not children[ip] and ip != self.gateway]
        cursor = 0
        for ip in roots:
            if ip not in unresolved:
                place(ip, cursor, 50)
                cursor += width(ip) + 80
        if unresolved:
            label = self.scene.addText(
                ("Çözümlenmemiş cihazlar" if self.lang == "tr" else "Unresolved Devices")
                + f" / {len(unresolved)}"
            )
            label.setDefaultTextColor(QColor(tokens["textSecondary"]))
            label.setPos(cursor, 0)
            shown = unresolved if self.needle or "unresolved" in self.expanded_groups else unresolved[:24]
            for i, ip in enumerate(shown):
                positions[ip] = (cursor + i % 4 * 260, 50 + i // 4 * 112)
            if len(shown) < len(unresolved):
                group = GroupNode(f"+ {len(unresolved) - len(shown)} devices · double-click to expand", "unresolved")
                group.activated.connect(self.expand_group)
                group.setPos(cursor, 50 + 6 * 112)
                self.scene.addItem(group)
        for ip, (x, y) in positions.items():
            device = by_ip[ip]
            node = DeviceNode(device, self.lang, self)
            node.setPos(x, y)
            node.setOpacity(1 if ip in matches else 0.45)
            node.activated.connect(self.device_activated.emit)
            node.rename_requested.connect(self.rename_requested.emit)
            node.refresh_requested.connect(self.refresh_requested.emit)
            node.collapse_requested.connect(self.toggle_branch)
            node.setSelected(ip in selected)
            self.scene.addItem(node)
            self.nodes[ip] = node
            if ip in groups:
                group = GroupNode(f"+ {groups[ip]} branches · double-click to expand", ip)
                group.activated.connect(self.expand_group)
                group.setPos(x, y + 100)
                self.scene.addItem(group)
        for link in links:
            a, b = self.nodes.get(link.parent), self.nodes.get(link.child)
            if not a or not b:
                continue
            edge_col = QColor(tokens["signal"] if link.confirmed else tokens["textTertiary"])
            pen = QPen(edge_col, 1.6 if link.confirmed else 1.4)
            if not link.confirmed:
                pen.setStyle(Qt.PenStyle.DashLine)
            path = QPainterPath()
            path.moveTo(a.x() + 120, a.y() + 90)
            mid = (a.y() + 90 + b.y()) / 2
            path.cubicTo(a.x() + 120, mid, b.x() + 120, mid, b.x() + 120, b.y())
            edge = self.scene.addPath(path, pen)
            edge.setZValue(-1)
            edge.setToolTip(f"{'Confirmed adjacency' if link.confirmed else 'Inferred route'}: {link.evidence}")
        self.scene.setSceneRect(self.scene.itemsBoundingRect().adjusted(-30, -30, 30, 30))

    def expand_group(self, key: str) -> None:
        self.expanded_groups.add(key)
        self._render()

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
        self.expanded_groups.update(d.ip for d in self.devices)
        self.expanded_groups.add("unresolved")
        self._render()

    def fit(self) -> None:
        if self.nodes:
            self.view.fitInView(self.scene.sceneRect(), Qt.AspectRatioMode.KeepAspectRatio)

    def choose_export(self) -> None:
        path, selected = QFileDialog.getSaveFileName(
            self, t(self.lang, "export_map"), "IPscans-network-map.svg", "SVG (*.svg);;PNG (*.png)"
        )
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
        tokens = get_tokens(self._theme)
        bg_hex = tokens["surface1"] if self._theme == "light" else tokens["bg"]
        image = None
        if path.suffix.lower() == ".svg":
            surface = QSvgGenerator()
            surface.setFileName(str(path))
            surface.setSize(size)
            surface.setViewBox(QRectF(0, 0, size.width(), size.height()))
        else:
            image = QImage(size, QImage.Format.Format_RGB32)
            image.fill(QColor(bg_hex))
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
