"""My Sites tab (innovative idea #8 / spec items 41-43): a technician-style
view of every site reported under the current license, using the existing
/api/site/list endpoint — no separate web login system needed, the license
(email + key) already authenticated the request.
"""
from __future__ import annotations

from PyQt6.QtWidgets import (
    QHeaderView,
    QLabel,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from pro.license import LicenseProvider
from pro.pro_content import t
from pro.remote_api import RemoteAPIError, post_json


class MySitesWidget(QWidget):
    def __init__(self, license_provider: LicenseProvider, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._provider = license_provider
        self.lang = lang

        outer = QVBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)
        outer.setSpacing(10)

        self.note_label = QLabel("")
        self.note_label.setObjectName("StatusLabel")
        self.note_label.setWordWrap(True)
        outer.addWidget(self.note_label)

        self.refresh_btn = QPushButton(t(lang, "my_sites_refresh"), objectName="GhostButton")
        self.refresh_btn.clicked.connect(self.refresh)
        outer.addWidget(self.refresh_btn)

        columns = [
            t(lang, "my_sites_col_name"), t(lang, "my_sites_col_devices"), t(lang, "my_sites_col_online"),
            t(lang, "my_sites_col_offline"), t(lang, "my_sites_col_conflicts"), t(lang, "my_sites_col_health"),
            t(lang, "my_sites_col_synced"),
        ]
        self.table = QTableWidget(0, len(columns))
        self.table.setHorizontalHeaderLabels(columns)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.table.verticalHeader().setVisible(False)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        outer.addWidget(self.table)

        # Only set the initial note from the cached license status (no
        # network call) — the actual /site/list request only fires when the
        # user clicks Refresh, so opening this tab can never stall the UI.
        status = self._provider.get_status_from_cache_only()
        if not status.has_feature("multi_site"):
            self.note_label.setText(t(lang, "my_sites_requires_license"))

    def refresh(self) -> None:
        status = self._provider.get_status_from_cache_only()
        if not status.has_feature("multi_site"):
            self.note_label.setText(t(self.lang, "my_sites_requires_license"))
            self.table.setRowCount(0)
            return

        try:
            data = post_json("/site/list", {"email": status.email, "key": status.license_key})
        except RemoteAPIError:
            self.note_label.setText(t(self.lang, "my_sites_requires_license"))
            return

        sites = data.get("sites", [])
        self.table.setRowCount(0)
        if not sites:
            self.note_label.setText(t(self.lang, "my_sites_empty"))
            return
        self.note_label.setText("")

        for site in sites:
            row = self.table.rowCount()
            self.table.insertRow(row)
            values = [
                site.get("name", "—"), site.get("deviceCount", 0), site.get("onlineCount", 0),
                site.get("offlineCount", 0), site.get("conflictCount", 0), f"{site.get('healthScore', 0)}%",
                site.get("lastSyncedAt", "—"),
            ]
            for col, value in enumerate(values):
                self.table.setItem(row, col, QTableWidgetItem(str(value)))
