"""First-run privacy/terms gate: the user must read and accept before the
main window appears. Acceptance is remembered (QSettings) so it's only
asked once per install, not on every launch.
"""
from __future__ import annotations

from PyQt6.QtCore import QSettings
from PyQt6.QtWidgets import (
    QCheckBox,
    QDialog,
    QDialogButtonBox,
    QLabel,
    QTextEdit,
    QVBoxLayout,
)

_ORG, _APP = "ipscans", "NetworkScanner"
_SETTINGS_KEY = "privacy_terms_accepted_v1"

PRIVACY_TEXT = """
<h3>Privacy Notice &amp; Terms of Use</h3>

<p><b>What this app does:</b> ipscans Network Scanner discovers devices on
the local network you point it at (via ICMP ping, ARP, and optional SNMP /
WMI / UPnP / Nmap queries) and displays their IP, MAC address, vendor,
hostname, open ports and, where available, serial number.</p>

<p><b>Data collection:</b> This application does not transmit any scan
results, device information, or telemetry to ipscans.com or any third
party. All scanning happens locally between your computer and the devices
on your own network. No account, sign-up, or internet connection is
required for the app to function.</p>

<p><b>Local storage:</b> The only data this app stores is your
acceptance of this notice and your scan settings, saved locally on your
own machine.</p>

<p><b>Your responsibility:</b> You must only scan networks and devices you
own, administer, or have explicit permission to test. Scanning networks
without authorization may be illegal in your jurisdiction. The authors of
this software are not responsible for misuse.</p>

<p><b>No warranty:</b> This software is provided "as is", without warranty
of any kind. Network scan results (vendor lookups, serial numbers, open
ports) are best-effort and may be incomplete or inaccurate depending on
the devices and protocols available on your network.</p>

<p>By clicking "I Agree", you confirm that you have read and accept this
notice and that you will only use this tool on networks you are
authorized to scan.</p>
"""


def has_accepted_privacy_terms() -> bool:
    settings = QSettings(_ORG, _APP)
    return bool(settings.value(_SETTINGS_KEY, False, type=bool))


def _remember_acceptance() -> None:
    settings = QSettings(_ORG, _APP)
    settings.setValue(_SETTINGS_KEY, True)


class PrivacyTermsDialog(QDialog):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Privacy Notice & Terms of Use")
        self.resize(560, 480)
        self.setModal(True)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 20)
        layout.setSpacing(14)

        heading = QLabel("Before you continue")
        heading.setObjectName("TitleText")
        layout.addWidget(heading)

        text = QTextEdit()
        text.setReadOnly(True)
        text.setHtml(PRIVACY_TEXT)
        layout.addWidget(text, stretch=1)

        self.agree_check = QCheckBox(
            "I have read and agree to the Privacy Notice and Terms of Use above."
        )
        layout.addWidget(self.agree_check)

        buttons = QDialogButtonBox()
        self.decline_btn = buttons.addButton("Decline and Exit", QDialogButtonBox.ButtonRole.RejectRole)
        self.accept_btn = buttons.addButton("I Agree", QDialogButtonBox.ButtonRole.AcceptRole)
        self.accept_btn.setObjectName("PrimaryButton")
        self.decline_btn.setObjectName("GhostButton")
        self.accept_btn.setEnabled(False)
        layout.addWidget(buttons)

        self.agree_check.toggled.connect(self.accept_btn.setEnabled)
        self.accept_btn.clicked.connect(self._on_accept)
        self.decline_btn.clicked.connect(self.reject)

    def _on_accept(self) -> None:
        _remember_acceptance()
        self.accept()
