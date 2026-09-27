"""Modal alerts for high-signal events (spec items 9 and 17) — deliberately
worded in neutral, non-accusatory language (spec item 56/57): the app
reports what it observed and suggests next steps, it never claims a
specific device is "guilty" or changes anything automatically.
"""
from __future__ import annotations

from PyQt6.QtWidgets import QMessageBox, QPushButton, QWidget

from pro.models import Event


def show_conflict_alert(parent: QWidget | None, event: Event) -> None:
    box = QMessageBox(parent)
    box.setWindowTitle("IP Conflict Detected")
    box.setIcon(QMessageBox.Icon.Warning)
    box.setText(f"Possible IP conflict on {event.ip}")
    box.setInformativeText(
        f"{event.message}\n\n"
        "Possible cause: two network devices may be using the same IP address.\n\n"
        "Recommended action:\n"
        "1. Check the affected devices.\n"
        "2. Verify DHCP reservations.\n"
        "3. Check static IP configuration.\n"
        "4. Assign unique IP addresses."
    )
    box.setStandardButtons(QMessageBox.StandardButton.Ok)
    box.exec()


def show_new_device_alert(parent: QWidget | None, event: Event) -> str:
    """Returns "trust", "ignore" or "" (dismissed) — spec item 17."""
    box = QMessageBox(parent)
    box.setWindowTitle("New Device Detected")
    box.setIcon(QMessageBox.Icon.Information)
    box.setText(event.message)
    trust_btn = QPushButton("Trust Device")
    ignore_btn = QPushButton("Ignore")
    box.addButton(trust_btn, QMessageBox.ButtonRole.AcceptRole)
    box.addButton(ignore_btn, QMessageBox.ButtonRole.RejectRole)
    box.exec()
    if box.clickedButton() is trust_btn:
        return "trust"
    if box.clickedButton() is ignore_btn:
        return "ignore"
    return ""
