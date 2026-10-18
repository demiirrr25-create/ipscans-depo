"""Windows 11 Setup (OOBE) experience for IPscans+:
Fluid silk ribbon waves, vertical stage tracker, and interactive feature showcase.
"""
from __future__ import annotations

from PyQt6.QtCore import QPropertyAnimation
from PyQt6.QtWidgets import (
    QButtonGroup,
    QCheckBox,
    QDialog,
    QFrame,
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
from app.ui.styles import (
    ThemeManager,
    ThemeToggleButton,
    Win11SilkCanvas,
    get_current_theme,
    get_tokens,
)

LOGO_SIZE = 42


class OnboardingWizard(QDialog):
    """Windows 11 Setup / Feature Showcase Dialog."""

    def __init__(
        self,
        steps: list[str],
        initial_language: str,
        app_icon,
        parent=None,
        is_tour: bool = False,
    ) -> None:
        super().__init__(parent)
        self.steps = steps
        self.language = initial_language
        self.step_index = 0
        self.is_tour = is_tour
        self._checkboxes: dict[str, QCheckBox] = {}
        self._body_views: dict[str, QTextEdit] = {}
        self._headings: dict[str, QLabel] = {}
        self._subheadings: dict[str, QLabel] = {}
        self._stage_labels: list[QLabel] = []
        self._feature_titles: list[QLabel] = []
        self._feature_descs: list[QLabel] = []
        self._feature_cards: list[QFrame] = []

        self.setObjectName("Win11SetupWindow")
        self.setWindowTitle("IPscans+ · Kurulum ve Özellik Tanıtımı")
        self.setWindowIcon(app_icon)
        self.setModal(True)
        self.setFixedSize(860, 580)

        main_layout = QHBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        main_layout.addWidget(self._build_left_panel())
        main_layout.addWidget(self._build_right_canvas(), stretch=1)

        self.apply_theme(get_current_theme())
        ThemeManager.instance().theme_changed.connect(self.apply_theme)
        self._refresh_step()

    # ------------------------------------------------------------- left panel
    def _build_left_panel(self) -> QWidget:
        panel = QFrame()
        panel.setObjectName("Win11Card")
        panel.setFixedWidth(270)
        self._left_panel = panel

        layout = QVBoxLayout(panel)
        layout.setContentsMargins(22, 22, 22, 20)
        layout.setSpacing(14)

        # Brand header
        brand = QHBoxLayout()
        brand.setSpacing(10)
        self._logo_label = QLabel()
        self._logo_label.setPixmap(load_logo_pixmap(LOGO_SIZE))
        self._logo_label.setFixedSize(LOGO_SIZE, LOGO_SIZE)
        brand.addWidget(self._logo_label)

        title_col = QVBoxLayout()
        title_col.setSpacing(1)
        self._name_lbl = QLabel("IPscans+", objectName="TitleText")
        self._edition_lbl = QLabel("HIGH PERFORMANCE SCANNER", objectName="SubtitleText")
        title_col.addWidget(self._name_lbl)
        title_col.addWidget(self._edition_lbl)
        brand.addLayout(title_col)
        brand.addStretch(1)
        layout.addLayout(brand)

        # Animated Windows 11 Silk Ribbon Canvas
        self.silk_canvas = Win11SilkCanvas(self)
        self.silk_canvas.setFixedHeight(120)
        layout.addWidget(self.silk_canvas)

        # Setup Stage Tracker (Vertical Stepper)
        steps_box = QVBoxLayout()
        steps_box.setSpacing(8)
        self._stage_labels = []
        for i, step_key in enumerate(self.steps):
            lbl = QLabel(f"0{i+1} · {self._step_title(step_key)}")
            self._stage_labels.append(lbl)
            steps_box.addWidget(lbl)
        steps_box.addStretch(1)
        layout.addLayout(steps_box, stretch=1)

        # Left bottom security badge
        self._sec_badge = QLabel("100% ÇEVRİM DIŞI · SIFIR TELEMETRİ")
        layout.addWidget(self._sec_badge)

        return panel

    def _step_title(self, key: str) -> str:
        is_tr = str(self.language).lower().startswith("tr")
        mapping_tr = {
            "language": "Dil ve Bölge",
            "welcome": "Hoş Geldiniz",
            "engine": "Tarama Motoru",
            "topology": "Canlı Ağ Haritası",
            "hardware": "Donanım Analizi",
            "privacy": "Gizlilik & Güvenlik",
            "terms": "Kullanım Şartları",
        }
        mapping_en = {
            "language": "Region & Language",
            "welcome": "Welcome",
            "engine": "Scanner Engine",
            "topology": "Network Topology",
            "hardware": "Hardware Profiling",
            "privacy": "Zero Telemetry",
            "terms": "Terms of Use",
        }
        return (mapping_tr if is_tr else mapping_en).get(key, key.capitalize())

    # ------------------------------------------------------------ right canvas
    def _build_right_canvas(self) -> QWidget:
        canvas = QWidget()
        self._right_canvas = canvas
        layout = QVBoxLayout(canvas)
        layout.setContentsMargins(32, 28, 32, 24)
        layout.setSpacing(16)

        header_top = QHBoxLayout()
        header_col = QVBoxLayout()
        header_col.setSpacing(4)
        self._headline_label = QLabel("", objectName="TitleText")
        self._subheadline_label = QLabel("", objectName="SubtitleText")
        self._subheadline_label.setWordWrap(True)
        header_col.addWidget(self._headline_label)
        header_col.addWidget(self._subheadline_label)
        header_top.addLayout(header_col, stretch=1)

        self.theme_toggle_btn = ThemeToggleButton(self, self.language)
        header_top.addWidget(self.theme_toggle_btn)
        layout.addLayout(header_top)

        self.stack = QStackedWidget()
        for key in self.steps:
            self.stack.addWidget(self._build_page(key))
        layout.addWidget(self.stack, stretch=1)

        layout.addLayout(self._build_nav())
        return canvas

    def _build_page(self, key: str) -> QWidget:
        if key == "language":
            return self._build_language_page()
        if key == "engine":
            return self._build_engine_page()
        if key == "topology":
            return self._build_topology_page()
        if key == "hardware":
            return self._build_hardware_page()
        if key == "welcome":
            return self._build_welcome_page()
        return self._build_agreement_page(key)

    def _build_language_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 8, 0, 0)
        layout.setSpacing(14)

        grid = QGridLayout()
        grid.setSpacing(12)
        self._lang_group = QButtonGroup(self)
        self._lang_group.setExclusive(True)
        columns = 2
        for index, (code, name) in enumerate(available_languages()):
            btn = QPushButton(f"  {name}", objectName="LanguageOption")
            btn.setCheckable(True)
            btn.setMinimumHeight(48)
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
        if hasattr(self, "theme_toggle_btn"):
            self.theme_toggle_btn.set_language(self.language)
        self._refresh_step()

    def _build_engine_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 4, 0, 0)
        layout.setSpacing(12)

        is_tr = str(self.language).lower().startswith("tr")
        tile1 = self._create_feature_tile(
            "⚡ " + ("Çok Kanallı Tarama (Multi-Thread ARP/ICMP Sweeps)" if is_tr else "Multi-Threaded ARP & ICMP Sweeps"),
            (
                "256 adresten oluşan C sınıfı bir alt ağı 3 saniyeden kısa sürede eksiksiz tarar. Ham soket (raw socket) ve Npcap optimizasyonuyla minimum paket gecikmesi."
                if is_tr
                else "Scans a full /24 subnet (256 addresses) in under 3 seconds. Raw socket and Npcap packet pacing guarantee near-zero transmission latency."
            ),
        )
        tile2 = self._create_feature_tile(
            "🔍 " + ("Akıllı Port ve Hizmet Tespiti" if is_tr else "Intelligent Port & Service Probing"),
            (
                "HTTP, HTTPS, SSH, RDP, RTSP ve ONVIF servislerini eş zamanlı sorgular. Güvenlik kameralarını ve gömülü IoT cihazlarını anında profiller."
                if is_tr
                else "Concurrently probes HTTP, HTTPS, SSH, RDP, RTSP, and ONVIF ports. Instantly profiles IP surveillance cameras and embedded IoT endpoints."
            ),
        )
        layout.addWidget(tile1)
        layout.addWidget(tile2)
        layout.addStretch(1)
        return page

    def _build_topology_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 4, 0, 0)
        layout.setSpacing(12)

        is_tr = str(self.language).lower().startswith("tr")
        tile1 = self._create_feature_tile(
            "🌐 " + ("Canlı Dinamik Ağ Haritası (Topology Map)" if is_tr else "Live Dynamic Network Topology Map"),
            (
                "Kuvvet yönlendirmeli (force-directed) algoritma ile ağ geçidi, anahtarlar ve bağlı cihazları gerçek zamanlı ilişkisel topoloji üzerinde modeller."
                if is_tr
                else "Force-directed physics simulation models your default gateway, network switches, and connected nodes in an interactive relational graph."
            ),
        )
        tile2 = self._create_feature_tile(
            "🧩 " + ("Cihaz ve Rol Sınıflandırması" if is_tr else "Automatic Device Role Categorization"),
            (
                "Yönlendiriciler, sunucular, iş istasyonları, yazıcılar ve kameralar otomatik olarak filtrelenebilir kategorilere ayrılır."
                if is_tr
                else "Routers, servers, workstations, printers, and cameras are automatically classified into filterable operational clusters."
            ),
        )
        layout.addWidget(tile1)
        layout.addWidget(tile2)
        layout.addStretch(1)
        return page

    def _build_hardware_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 4, 0, 0)
        layout.setSpacing(12)

        is_tr = str(self.language).lower().startswith("tr")
        tile1 = self._create_feature_tile(
            "🏷️ " + ("IEEE Sanctioned MAC Vendor Veritabanı" if is_tr else "IEEE Sanctioned MAC Vendor Database"),
            (
                "Cihazların fiziksel MAC adreslerinden üretici (Apple, Cisco, Intel, Samsung vb.) ve donanım tipini çevrim dışı doğrular."
                if is_tr
                else "Resolves manufacturer details (Apple, Cisco, Intel, Samsung, etc.) offline directly from physical MAC OUI registries."
            ),
        )
        tile2 = self._create_feature_tile(
            "📡 " + ("NetBIOS, mDNS & SSDP Ad Çözümleme" if is_tr else "Multi-Protocol Hostname Resolution"),
            (
                "Yerel DNS sorgularına ek olarak NetBIOS, Bonjour/mDNS ve UPnP/SSDP anonslarını dinleyerek gerçek cihaz adlarını tespit eder."
                if is_tr
                else "Listens for NetBIOS, Bonjour/mDNS, and UPnP/SSDP broadcasts alongside DNS to resolve authentic local device hostnames."
            ),
        )
        layout.addWidget(tile1)
        layout.addWidget(tile2)
        layout.addStretch(1)
        return page

    def _build_welcome_page(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 4, 0, 0)
        layout.setSpacing(12)

        is_tr = str(self.language).lower().startswith("tr")
        tile1 = self._create_feature_tile(
            "🛡️ " + ("Tam Bağımsız & Güvenli Mimari" if is_tr else "Self-Contained & Resilient Architecture"),
            (
                "Hiçbir dış sunucuya veya bulut servisine veri göndermez. Bütün tarama, topoloji ve cihaz veritabanı tamamen kendi bilgisayarınızda çalışır."
                if is_tr
                else "Operates with 100% local autonomy. No telemetry beacons, cloud analytics, or external calls ever leave your workstation."
            ),
        )
        tile2 = self._create_feature_tile(
            "🚀 " + ("Windows 11 Native Entegrasyon" if is_tr else "Windows 11 Native Integration"),
            (
                "Yüksek DPI desteği, çoklu monitör uyumluluğu ve modern Açık/Koyu tema estetiği ile üst düzey masaüstü deneyimi sunar."
                if is_tr
                else "High-DPI scaling, multi-monitor geometry support, and Light/Dark dual-theme styling provide an executive desktop experience."
            ),
        )
        layout.addWidget(tile1)
        layout.addWidget(tile2)
        layout.addStretch(1)
        return page

    def _create_feature_tile(self, title: str, description: str) -> QFrame:
        card = QFrame()
        card.setObjectName("Win11FeatureCard")
        v = QVBoxLayout(card)
        v.setContentsMargins(16, 14, 16, 14)
        v.setSpacing(6)

        t_lbl = QLabel(title)
        d_lbl = QLabel(description)
        d_lbl.setWordWrap(True)

        v.addWidget(t_lbl)
        v.addWidget(d_lbl)
        self._feature_cards.append(card)
        self._feature_titles.append(t_lbl)
        self._feature_descs.append(d_lbl)
        return card

    def _build_agreement_page(self, key: str) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 4, 0, 0)
        layout.setSpacing(12)

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
        row.setContentsMargins(0, 10, 0, 0)
        self.back_btn = QPushButton(objectName="Win11Ghost")
        self.back_btn.clicked.connect(self._go_back)

        self.decline_btn = QPushButton(objectName="Win11Ghost")
        self.decline_btn.clicked.connect(self.reject)

        self.primary_btn = QPushButton(objectName="Win11Primary")
        self.primary_btn.clicked.connect(self._go_next)

        row.addWidget(self.back_btn)
        row.addWidget(self.decline_btn)
        row.addStretch(1)

        self._dots_row = QHBoxLayout()
        self._dots_row.setSpacing(6)
        self._dot_widgets: list[QLabel] = []
        for _ in self.steps:
            dot = QLabel("●")
            self._dots_row.addWidget(dot)
            self._dot_widgets.append(dot)
        row.addLayout(self._dots_row)
        row.addSpacing(16)

        row.addWidget(self.primary_btn)
        return row

    def apply_theme(self, theme: str | None = None) -> None:
        tk = get_tokens(theme)
        self.setStyleSheet(f"QDialog#Win11SetupWindow {{ background-color: {tk['bg_canvas']}; }}")
        self._left_panel.setStyleSheet(
            f"QFrame#Win11Card {{ background-color: {tk['bg_surface']}; border: none; border-right: 1px solid {tk['border_default']}; border-radius: 0px; }}"
        )
        self._name_lbl.setStyleSheet(f"font-size: 18px; font-weight: bold; color: {tk['text_primary']};")
        self._edition_lbl.setStyleSheet(
            f"font-size: 9px; font-weight: 600; letter-spacing: 0.10em; color: {tk['text_tertiary']};"
        )
        self._sec_badge.setStyleSheet(
            f"font-family: Consolas, monospace; font-size: 9px; letter-spacing: 0.08em; color: {tk['text_tertiary']}; padding: 4px 0;"
        )
        self._headline_label.setStyleSheet(f"font-size: 22px; font-weight: 600; color: {tk['text_primary']};")
        self._subheadline_label.setStyleSheet(
            f"font-size: 13px; color: {tk['text_secondary']}; line-height: 1.4;"
        )

        for card in self._feature_cards:
            card.setStyleSheet(
                f"QFrame#Win11FeatureCard {{ background-color: {tk['bg_surface']}; border: 1px solid {tk['border_default']}; border-radius: 12px; }}"
            )
        for t_lbl in self._feature_titles:
            t_lbl.setStyleSheet(f"font-size: 14px; font-weight: 600; color: {tk['text_primary']};")
        for d_lbl in self._feature_descs:
            d_lbl.setStyleSheet(f"font-size: 12px; color: {tk['text_secondary']}; line-height: 1.4;")

        if hasattr(self, "_lang_group"):
            lang_qss = (
                f"QPushButton#LanguageOption {{ background: {tk['bg_surface']}; border: 1px solid {tk['border_default']}; border-radius: 12px; font-size: 13px; font-weight: 500; color: {tk['text_primary']}; text-align: left; padding-left: 16px; }}"
                f"QPushButton#LanguageOption:hover {{ background: {tk['bg_hover']}; border-color: {tk['border_strong']}; }}"
                f"QPushButton#LanguageOption:checked {{ background: {tk['accent_subtle']}; color: {tk['accent_primary']}; font-weight: bold; border-color: {tk['accent_primary']}; }}"
            )
            for btn in self._lang_group.buttons():
                btn.setStyleSheet(lang_qss)

        for body in self._body_views.values():
            body.setStyleSheet(
                f"QTextEdit {{ background-color: {tk['bg_surface']}; border: 1px solid {tk['border_default']}; border-radius: 12px; padding: 12px; font-size: 12px; color: {tk['text_secondary']}; }}"
            )
        for cb in self._checkboxes.values():
            cb.setStyleSheet(
                f"QCheckBox {{ font-size: 12px; color: {tk['text_primary']}; spacing: 8px; }}"
                f"QCheckBox::indicator {{ width: 18px; height: 18px; border-radius: 4px; border: 1px solid {tk['border_strong']}; background: {tk['bg_surface']}; }}"
                f"QCheckBox::indicator:checked {{ background: {tk['accent_primary']}; border-color: {tk['accent_primary']}; image: none; }}"
            )

        self.silk_canvas.update()
        if hasattr(self, "theme_toggle_btn"):
            self.theme_toggle_btn.set_language(self.language)
            self.theme_toggle_btn.update()
        self._refresh_step()

    # ------------------------------------------------------------- flow
    def _current_step_is_ready(self) -> bool:
        key = self.steps[self.step_index]
        if key in ("language", "engine", "topology", "hardware", "welcome"):
            return True
        return self._checkboxes.get(key, QCheckBox()).isChecked()

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
        if self.step_index >= len(self.steps):
            return
        tk = get_tokens()
        key = self.steps[self.step_index]
        self.stack.setCurrentIndex(self.step_index)
        is_tr = str(self.language).lower().startswith("tr")

        # Update left stage tracker highlights
        for i, lbl in enumerate(self._stage_labels):
            if i < len(self.steps):
                step_k = self.steps[i]
                title = self._step_title(step_k)
                if i == self.step_index:
                    lbl.setText(f"● 0{i+1} · {title}")
                    lbl.setStyleSheet(
                        f"font-size: 11px; font-weight: bold; padding: 6px 10px; border-radius: 8px; background-color: {tk['accent_primary']}; color: {tk['text_inverse']};"
                    )
                elif i < self.step_index:
                    lbl.setText(f"✓ 0{i+1} · {title}")
                    lbl.setStyleSheet(
                        f"font-size: 11px; padding: 6px 10px; border-radius: 8px; color: {tk['text_primary']}; background-color: {tk['bg_elevated']};"
                    )
                else:
                    lbl.setText(f"· 0{i+1} · {title}")
                    lbl.setStyleSheet(
                        f"font-size: 11px; padding: 6px 10px; border-radius: 8px; color: {tk['text_tertiary']}; background: transparent;"
                    )

        # Update dots
        for i, dot in enumerate(self._dot_widgets):
            dot.setStyleSheet(
                f"font-size: 10px; color: {tk['accent_primary']};"
                if i == self.step_index
                else f"font-size: 10px; color: {tk['border_strong']};"
            )

        # Headings per step
        if key == "language":
            self._headline_label.setText("Bölge ve Dil Seçimi" if is_tr else "Region & Language")
            self._subheadline_label.setText(
                "IPscans+ arayüzü ve yerel raporlama için tercih ettiğiniz dili belirleyin."
                if is_tr
                else "Choose your preferred operational language for IPscans+ and export reports."
            )
            self.primary_btn.setText("İleri →" if is_tr else "Next →")
            self.decline_btn.setVisible(False)
        elif key == "engine":
            self._headline_label.setText("Yüksek Performanslı Tarama Motoru" if is_tr else "High-Performance Scanner Engine")
            self._subheadline_label.setText(
                "Gelişmiş donanım hızlandırmalı ARP/ICMP tarama teknolojisi ve anlık soket yönetimi."
                if is_tr
                else "Hardware-accelerated ARP and ICMP packet sequencing with adaptive socket pacing."
            )
            self.primary_btn.setText("İleri →" if is_tr else "Next →")
            self.decline_btn.setVisible(False)
        elif key == "topology":
            self._headline_label.setText("Dinamik Topoloji ve Cihaz Ayrıştırma" if is_tr else "Dynamic Relational Topology")
            self._subheadline_label.setText(
                "Ağ geçidi ve bağlı cihazları canlı fiziksel ilişki haritası üzerinden izleyin."
                if is_tr
                else "Visualize gateway routing, subnet boundaries, and interconnected devices in real time."
            )
            self.primary_btn.setText("İleri →" if is_tr else "Next →")
            self.decline_btn.setVisible(False)
        elif key == "hardware":
            self._headline_label.setText("Donanım ve Üretici Teşhisi" if is_tr else "Hardware Profiling & MAC OUI")
            self._subheadline_label.setText(
                "Yerel cihazların gerçek üretici kimliklerini, model bilgilerini ve yayın adlarını keşfedin."
                if is_tr
                else "Identify authentic equipment manufacturers, firmware traits, and broadcast hostnames."
            )
            self.primary_btn.setText("İleri →" if is_tr else "Next →")
            self.decline_btn.setVisible(False)
        elif key == "welcome":
            self._headline_label.setText("IPscans+'a Hoş Geldiniz" if is_tr else "Welcome to IPscans+")
            self._subheadline_label.setText(
                "Kurumsal düzeyde yerel ağ analiz ve güvenlik platformu."
                if is_tr
                else "Executive-grade local network intelligence and diagnostic platform."
            )
            self.primary_btn.setText("Başla →" if is_tr else "Get Started →")
            self.decline_btn.setVisible(False)
        else:
            get_body = get_terms_body if key == "terms" else get_privacy_body
            heading_key = f"{key}_heading"
            checkbox_key = f"{key}_checkbox"
            accept_key = f"{key}_accept"
            decline_key = f"{key}_decline"
            self._headline_label.setText(t(self.language, heading_key))
            self._subheadline_label.setText(
                "Kullanıcı gizliliği ve yerel veri işleme prensiplerini inceleyin."
                if is_tr
                else "Review local telemetry boundaries and cryptographic storage guarantees."
            )
            if key in self._body_views:
                self._body_views[key].setHtml(get_body(self.language))
            if key in self._checkboxes:
                self._checkboxes[key].setText(t(self.language, checkbox_key))
            self.primary_btn.setText(
                ("Kabul Et ve Başlat" if self.step_index == len(self.steps) - 1 else "İleri →")
                if is_tr
                else t(self.language, accept_key)
            )
            self.decline_btn.setText(t(self.language, decline_key))
            self.decline_btn.setVisible(True)

        self.back_btn.setText("Geri" if is_tr else "Back")
        self.back_btn.setVisible(self.step_index > 0)
        self.primary_btn.setEnabled(self._current_step_is_ready())

    # ------------------------------------------------------------ entrance
    def showEvent(self, event) -> None:  # noqa: N802 (Qt override)
        super().showEvent(event)
        if getattr(self, "_animated_in", False):
            return
        self._animated_in = True

        effect = QGraphicsOpacityEffect(self._logo_label)
        self._logo_label.setGraphicsEffect(effect)
        fade = QPropertyAnimation(effect, b"opacity", self)
        fade.setDuration(260)
        fade.setStartValue(0.0)
        fade.setEndValue(1.0)
        fade.start()
        self._entrance_fade = fade
