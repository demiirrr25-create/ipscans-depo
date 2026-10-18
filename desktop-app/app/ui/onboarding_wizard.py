"""Unified first-run onboarding: one modern wizard window that walks the
user through language selection, then Terms of Use, then Privacy Policy —
replacing the previous three separate popups (timed splash, language
dialog, privacy dialog) with a single cohesive, animated experience. Only
the steps not yet completed are shown, so a user who already picked a
language but hasn't accepted the policies yet (e.g. after an app update)
resumes exactly where they left off instead of repeating everything.
"""
from __future__ import annotations

from PyQt6.QtCore import QEasingCurve, QPropertyAnimation, QRect, Qt
from PyQt6.QtWidgets import (
    QButtonGroup,
    QCheckBox,
    QDialog,
    QGraphicsOpacityEffect,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QStackedWidget,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from app.i18n import (
    available_languages,
    get_privacy_body,
    get_terms_body,
    save_language,
    t,
)
from app.ui.privacy_dialog import accept_privacy, accept_terms
from app.ui.resources import load_logo_pixmap

LOGO_SIZE = 64


class OnboardingWizard(QDialog):
    def __init__(self, steps: list[str], initial_language: str, app_icon, parent=None) -> None:
        super().__init__(parent)
        self.steps = steps
        self.language = initial_language
        self.step_index = 0
        self._checkboxes: dict[str, QCheckBox] = {}
        self._body_views: dict[str, QTextEdit] = {}
        self._headings: dict[str, QLabel] = {}

        self.setObjectName("AppRoot")
        self.setWindowTitle("ipscans")
        self.setWindowIcon(app_icon)
        self.setModal(True)
        self.setFixedSize(560, 640)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(28, 28, 28, 22)
        outer.setSpacing(14)

        outer.addWidget(self._build_header())
        self.dots = self._build_dots()
        outer.addWidget(self.dots, alignment=Qt.AlignmentFlag.AlignHCenter)

        self.stack = QStackedWidget()
        for key in self.steps:
            self.stack.addWidget(self._build_page(key))
        outer.addWidget(self.stack, stretch=1)

        outer.addLayout(self._build_nav())
        self._refresh_step()

    # ------------------------------------------------------------- header
    def _build_header(self) -> QWidget:
        wrap = QVBoxLayout()
        wrap.setSpacing(4)

        self._logo_label = QLabel()
        self._logo_label.setPixmap(load_logo_pixmap(LOGO_SIZE))
        self._logo_label.setFixedSize(LOGO_SIZE, LOGO_SIZE)
        wrap.addWidget(self._logo_label, alignment=Qt.AlignmentFlag.AlignHCenter)

        title = QLabel("ipscans", objectName="TitleText")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._title_label = title
        wrap.addWidget(title)

        header = QWidget()
        header.setLayout(wrap)
        return header

    def _build_dots(self) -> QWidget:
        row = QHBoxLayout()
        row.setSpacing(8)
        self._dot_labels: list[QLabel] = []
        for _ in self.steps:
            dot = QLabel("●")
            dot.setObjectName("SubtitleText")
            row.addWidget(dot)
            self._dot_labels.append(dot)
        wrap = QWidget()
        wrap.setLayout(row)
        return wrap

    # --------------------------------------------------------------- pages
    def _build_page(self, key: str) -> QWidget:
        if key == "language":
            return self._build_language_page()
        return self._build_agreement_page(key)

    def _build_language_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(14)

        subtitle = QLabel(t(self.language, "lang_subtitle"), objectName="SubtitleText")
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._headings["language"] = subtitle
        layout.addWidget(subtitle)
        layout.addSpacing(10)

        grid = QGridLayout()
        grid.setSpacing(10)
        self._lang_group = QButtonGroup(self)
        self._lang_group.setExclusive(True)
        columns = 2
        for index, (code, name) in enumerate(available_languages()):
            btn = QPushButton(name, objectName="LanguageOption")
            btn.setCheckable(True)
            btn.setMinimumHeight(44)
            btn.setProperty("langCode", code)
            self._lang_group.addButton(btn)
            grid.addWidget(btn, index // columns, index % columns)
            if code == self.language:
                btn.setChecked(True)
        self._lang_group.buttonClicked.connect(self._on_language_clicked)
        layout.addLayout(grid)
        layout.addStretch(1)
        return page

    def _on_language_clicked(self, button: QPushButton) -> None:
        self.language = button.property("langCode")
        self._refresh_step()

    def _build_agreement_page(self, key: str) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(12)

        heading = QLabel(objectName="SubtitleText")
        heading.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._headings[key] = heading
        layout.addWidget(heading)

        body = QTextEdit(readOnly=True)
        self._body_views[key] = body
        layout.addWidget(body, stretch=1)

        checkbox = QCheckBox()
        checkbox.toggled.connect(self._on_checkbox_toggled)
        self._checkboxes[key] = checkbox
        layout.addWidget(checkbox)
        return page

    def _on_checkbox_toggled(self, _checked: bool) -> None:
        self.primary_btn.setEnabled(self._current_step_is_ready())

    # ------------------------------------------------------------ nav bar
    def _build_nav(self) -> QHBoxLayout:
        row = QHBoxLayout()
        self.back_btn = QPushButton(objectName="GhostButton")
        self.decline_btn = QPushButton(objectName="GhostButton")
        self.primary_btn = QPushButton(objectName="PrimaryButton")
        self.back_btn.clicked.connect(self._go_back)
        self.decline_btn.clicked.connect(self.reject)
        self.primary_btn.clicked.connect(self._go_next)
        row.addWidget(self.back_btn)
        row.addWidget(self.decline_btn)
        row.addStretch(1)
        row.addWidget(self.primary_btn)
        return row

    # ------------------------------------------------------------- flow
    def _current_step_is_ready(self) -> bool:
        key = self.steps[self.step_index]
        if key == "language":
            return True
        return self._checkboxes[key].isChecked()

    def _go_next(self) -> None:
        key = self.steps[self.step_index]
        if key == "language":
            save_language(self.language)
        elif key == "terms":
            accept_terms()
        elif key == "privacy":
            accept_privacy()

        if self.step_index == len(self.steps) - 1:
            self.accept()
            return
        self.step_index += 1
        self._refresh_step()

    def _go_back(self) -> None:
        if self.step_index > 0:
            self.step_index -= 1
            self._refresh_step()

    def _refresh_step(self) -> None:
        key = self.steps[self.step_index]
        self.stack.setCurrentIndex(self.step_index)

        # Text is re-localized on every visit since the user can change
        # language mid-flow and jump back to a page built before that.
        if key == "language":
            self._title_label.setText(t(self.language, "lang_title"))
            self._headings["language"].setText(t(self.language, "lang_subtitle"))
            self.primary_btn.setText(t(self.language, "lang_continue"))
        else:
            self._title_label.setText("ipscans")
            get_body = get_terms_body if key == "terms" else get_privacy_body
            heading_key = f"{key}_heading"
            checkbox_key = f"{key}_checkbox"
            accept_key = f"{key}_accept"
            decline_key = f"{key}_decline"
            self._headings[key].setText(t(self.language, heading_key))
            self._body_views[key].setHtml(get_body(self.language))
            self._checkboxes[key].setText(t(self.language, checkbox_key))
            self.primary_btn.setText(t(self.language, accept_key))
            self.decline_btn.setText(t(self.language, decline_key))

        self.back_btn.setText(t(self.language, "wizard_back"))
        self.back_btn.setVisible(self.step_index > 0)
        self.decline_btn.setVisible(key != "language")
        self.primary_btn.setEnabled(self._current_step_is_ready())

        for i, dot in enumerate(self._dot_labels):
            dot.setStyleSheet("color: #ffffff;" if i <= self.step_index else "color: rgba(255,255,255,0.25);")

    # ------------------------------------------------------------ entrance
    def showEvent(self, event) -> None:  # noqa: N802 (Qt override)
        super().showEvent(event)
        if getattr(self, "_animated_in", False):
            return
        self._animated_in = True

        effect = QGraphicsOpacityEffect(self._logo_label)
        self._logo_label.setGraphicsEffect(effect)
        fade = QPropertyAnimation(effect, b"opacity", self)
        fade.setDuration(500)
        fade.setStartValue(0.0)
        fade.setEndValue(1.0)

        final_rect = self._logo_label.geometry()
        center = final_rect.center()
        start_size = int(LOGO_SIZE * 0.5)
        start_rect = QRect(0, 0, start_size, start_size)
        start_rect.moveCenter(center)
        self._logo_label.setGeometry(start_rect)
        grow = QPropertyAnimation(self._logo_label, b"geometry", self)
        grow.setDuration(550)
        grow.setStartValue(start_rect)
        grow.setEndValue(final_rect)
        grow.setEasingCurve(QEasingCurve.Type.OutBack)

        self._entrance_fade = fade
        self._entrance_grow = grow
        fade.start()
        grow.start()
