"""Modal alerts for high-signal events (spec items 9 and 17) — deliberately
worded in neutral, non-accusatory language (spec item 56/57): the app
reports what it observed and suggests next steps, it never claims a
specific device is "guilty" or changes anything automatically.
"""
from __future__ import annotations

from PyQt6.QtWidgets import QMessageBox, QPushButton, QWidget

from pro.models import Event
from pro.pro_content import t


def show_conflict_alert(parent: QWidget | None, event: Event, lang: str = "en") -> None:
    box = QMessageBox(parent)
    box.setWindowTitle(t(lang, "conflict_title"))
    box.setIcon(QMessageBox.Icon.Warning)
    box.setText(t(lang, "conflict_text", ip=event.ip))
    box.setInformativeText(
        f"{event.message}\n\n{t(lang, 'conflict_cause')}\n\n{t(lang, 'conflict_action')}"
    )
    box.setStandardButtons(QMessageBox.StandardButton.Ok)
    box.exec()


def show_new_device_alert(parent: QWidget | None, event: Event, lang: str = "en") -> str:
    """Returns "trust", "ignore" or "" (dismissed) — spec item 17."""
    box = QMessageBox(parent)
    box.setWindowTitle(t(lang, "new_device_title"))
    box.setIcon(QMessageBox.Icon.Information)
    box.setText(event.message)
    trust_btn = QPushButton(t(lang, "trust_device"))
    ignore_btn = QPushButton(t(lang, "ignore"))
    box.addButton(trust_btn, QMessageBox.ButtonRole.AcceptRole)
    box.addButton(ignore_btn, QMessageBox.ButtonRole.RejectRole)
    box.exec()
    if box.clickedButton() is trust_btn:
        return "trust"
    if box.clickedButton() is ignore_btn:
        return "ignore"
    return ""
