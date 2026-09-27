"""First-run language picker: shown once, right after the privacy notice is
accepted — an ipscans-branded screen where the user chooses one of 5+
supported languages before the main window opens. The choice is remembered
(QSettings) so returning users go straight to the main window.
"""
from __future__ import annotations

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QButtonGroup,
    QDialog,
    QGridLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
)

from app.i18n import DEFAULT_LANGUAGE, available_languages, save_language, t
from app.ui.resources import load_logo_pixmap


class LanguageDialog(QDialog):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("LanguageDialog")
        self.setWindowTitle("ipscans")
        self.setModal(True)
        self.setFixedWidth(460)
        self.selected_language = "en"

        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 36, 32, 28)
        layout.setSpacing(6)
        layout.setAlignment(Qt.AlignmentFlag.AlignHCenter)

        logo = QLabel()
        logo.setPixmap(load_logo_pixmap(56))
        logo.setFixedSize(56, 56)
        logo.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(logo, alignment=Qt.AlignmentFlag.AlignCenter)

        title = QLabel("ipscans")
        title.setObjectName("TitleText")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)

        subtitle = QLabel(t(DEFAULT_LANGUAGE, "lang_subtitle"))
        subtitle.setObjectName("SubtitleText")
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addSpacing(2)
        layout.addWidget(subtitle)

        layout.addSpacing(20)

        grid_wrap = QVBoxLayout()
        grid_wrap.setSpacing(0)
        grid = QGridLayout()
        grid.setSpacing(10)
        self._group = QButtonGroup(self)
        self._group.setExclusive(True)

        columns = 2
        for index, (code, name) in enumerate(available_languages()):
            btn = QPushButton(name, objectName="LanguageOption")
            btn.setCheckable(True)
            btn.setMinimumHeight(44)
            btn.setProperty("langCode", code)
            self._group.addButton(btn)
            grid.addWidget(btn, index // columns, index % columns)
            if index == 0:
                btn.setChecked(True)
        grid_wrap.addLayout(grid)
        layout.addLayout(grid_wrap)

        layout.addSpacing(22)
        self.continue_btn = QPushButton(t(DEFAULT_LANGUAGE, "lang_continue"), objectName="PrimaryButton")
        self.continue_btn.setMinimumHeight(42)
        layout.addWidget(self.continue_btn)

        self._group.buttonClicked.connect(self._on_language_clicked)
        self.continue_btn.clicked.connect(self._on_continue)

    def _on_language_clicked(self, button: QPushButton) -> None:
        self.selected_language = button.property("langCode")
        self.continue_btn.setText(t(self.selected_language, "lang_continue"))

    def _on_continue(self) -> None:
        save_language(self.selected_language)
        self.accept()
