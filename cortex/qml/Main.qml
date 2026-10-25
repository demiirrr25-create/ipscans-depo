import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window
import Cortex3DPrimitives 1.0

Window {
    id: rootWindow
    width: 1540
    height: 920
    minimumWidth: 1240
    minimumHeight: 760
    visible: true
    title: "IPScans Cortex · 2.4.0"
    color: Theme.bg
    flags: Qt.Window | Qt.FramelessWindowHint | Qt.WindowSystemMenuHint | Qt.WindowMinimizeButtonHint | Qt.WindowMaximizeButtonHint

    // Global State — Light by default matching ipscans.com
    property bool isDark: backend ? backend.isDarkTheme : false
    property string lang: backend ? backend.language : "tr"
    property bool sidebarCollapsed: false
    property int activeNavIndex: 0
    property string cameraGridMode: "1x1" // "1x1" or "2x2"
    property bool showRoiOverlay: true
    property bool showHeatmapOverlay: false
    property bool commandPaletteOpen: false
    property string toastMessage: ""

    // Keep singleton Theme.dark synchronized with backend.isDarkTheme
    Binding {
        target: Theme
        property: "dark"
        value: rootWindow.isDark
    }

    function tr(trText, enText) {
        return rootWindow.lang === "tr" ? trText : enText
    }

    function showToast(msg) {
        rootWindow.toastMessage = msg
        toastTimer.restart()
    }

    function setActiveTab(idx) {
        rootWindow.activeNavIndex = idx
    }

    function setStartupPreview(activeState, progressVal) {
        if (!activeState) {
            startupOverlay.skipSequence()
        } else if (progressVal <= 0.05) {
            startupOverlay.startSequence()
        } else {
            startupOverlay.freezeAtProgress(progressVal)
        }
    }

    Timer {
        id: toastTimer
        interval: 3400
        repeat: false
        onTriggered: rootWindow.toastMessage = ""
    }

    Connections {
        target: backend
        function onToastRequested(message, level) {
            rootWindow.showToast(message)
        }
        function onThemeChanged() {
            rootWindow.isDark = backend.isDarkTheme
            rootWindow.lang = backend.language
        }
    }

    Shortcut {
        sequence: "Ctrl+K"
        onActivated: rootWindow.commandPaletteOpen = !rootWindow.commandPaletteOpen
    }

    Shortcut {
        sequence: "Escape"
        onActivated: {
            if (startupOverlay.active) {
                startupOverlay.skipSequence()
            } else if (rootWindow.commandPaletteOpen) {
                rootWindow.commandPaletteOpen = false
            }
        }
    }

    // Outer 1px Window Frame
    Rectangle {
        anchors.fill: parent
        color: Theme.bg
        border.width: 1
        border.color: Theme.borderStrong

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 1
            spacing: 0

            // =================================================================
            // 1. IPSCAN.COM EDITORIAL HEADER & FRAMELESS TITLEBAR (60px)
            // =================================================================
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 60
                color: Theme.surface

                // Bottom 1px hairline separator
                Rectangle {
                    anchors.bottom: parent.bottom
                    anchors.left: parent.left
                    anchors.right: parent.right
                    height: 1
                    color: Theme.border
                }

                // Native Window Drag & Double-Click Maximize
                DragHandler {
                    target: null
                    onActiveChanged: if (active) rootWindow.startSystemMove()
                }
                TapHandler {
                    onDoubleTapped: {
                        if (rootWindow.visibility === Window.Maximized)
                            rootWindow.showNormal()
                        else
                            rootWindow.showMaximized()
                    }
                }

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 18
                    anchors.rightMargin: 10
                    spacing: 12

                    // IPScans Hexagonal Cube Logo + Wordmark (matching ipscans.com header)
                    RowLayout {
                        spacing: 9

                        Canvas {
                            id: brandMarkCanvas
                            width: 26
                            height: 26
                            property bool darkMode: rootWindow.isDark
                            onDarkModeChanged: requestPaint()
                            Component.onCompleted: requestPaint()
                            onPaint: {
                                var ctx = getContext("2d")
                                ctx.reset()
                                ctx.strokeStyle = darkMode ? "#F5F7FA" : "#0B0D12"
                                ctx.lineWidth = 1.75
                                ctx.lineJoin = "round"
                                ctx.lineCap = "round"
                                // Outer hexagon
                                var cx = 13, cy = 13, r = 10.5
                                ctx.beginPath()
                                for (var i = 0; i < 6; i++) {
                                    var ang = (i * 60 - 90) * Math.PI / 180.0
                                    var px = cx + r * Math.cos(ang)
                                    var py = cy + r * Math.sin(ang)
                                    if (i === 0) ctx.moveTo(px, py)
                                    else ctx.lineTo(px, py)
                                }
                                ctx.closePath()
                                ctx.stroke()
                                // Inner signal core
                                ctx.fillStyle = "#2F6BFF"
                                ctx.beginPath()
                                ctx.arc(cx, cy, 3.6, 0, Math.PI * 2)
                                ctx.fill()
                            }
                        }

                        Text {
                            text: "IPScans"
                            color: Theme.ink
                            font.family: Theme.sans
                            font.pixelSize: 17
                            font.weight: Theme.wDisplay
                            font.letterSpacing: Theme.tight(17)
                        }

                        Rectangle {
                            height: 24
                            width: cortexChipRow.implicitWidth + 16
                            radius: 12
                            color: Theme.bgMuted
                            border.width: 1
                            border.color: Theme.border

                            RowLayout {
                                id: cortexChipRow
                                anchors.centerIn: parent
                                spacing: 6
                                Rectangle {
                                    width: 6
                                    height: 6
                                    radius: 3
                                    color: Theme.signal
                                }
                                Text {
                                    text: "Cortex 2.4"
                                    color: Theme.ink2
                                    font.family: Theme.sans
                                    font.pixelSize: 12
                                    font.weight: Theme.wMedium
                                }
                            }
                        }
                    }

                    Item { Layout.preferredWidth: 8 }

                    // Top Navigation Text Links (matching ipscans.com 15px ink-2 -> active ink)
                    RowLayout {
                        spacing: 4
                        Repeater {
                            model: [
                                { tr: "Genel Bakış", en: "Overview", idx: 0 },
                                { tr: "Kameralar", en: "Cameras", idx: 1 },
                                { tr: "Olay Kuralları", en: "Event Rules", idx: 2 },
                                { tr: "Adli Arşiv", en: "Forensic Vault", idx: 3 },
                                { tr: "Ayarlar", en: "Settings", idx: 4 }
                            ]
                            delegate: Rectangle {
                                required property var modelData
                                readonly property bool activeLink: rootWindow.activeNavIndex === modelData.idx
                                height: 34
                                width: topLinkText.implicitWidth + 22
                                radius: 17
                                color: activeLink ? Theme.bgMuted : (topLinkMouse.containsMouse ? Theme.bgSubtle : "transparent")

                                Text {
                                    id: topLinkText
                                    anchors.centerIn: parent
                                    text: rootWindow.tr(modelData.tr, modelData.en)
                                    color: activeLink ? Theme.ink : Theme.ink2
                                    font.family: Theme.sans
                                    font.pixelSize: 13
                                    font.weight: activeLink ? Theme.wMedium : Theme.wBody
                                }

                                MouseArea {
                                    id: topLinkMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: rootWindow.activeNavIndex = modelData.idx
                                }
                            }
                        }
                    }

                    Item { Layout.fillWidth: true }

                    // Command Palette Pill Trigger (Ctrl+K)
                    Rectangle {
                        Layout.preferredWidth: 248
                        Layout.preferredHeight: 36
                        radius: 18
                        color: cmdTriggerMouse.containsMouse ? Theme.bgMuted : Theme.bgSubtle
                        border.width: 1
                        border.color: Theme.borderStrong

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 8
                            spacing: 8

                            Canvas {
                                width: 14
                                height: 14
                                property color col: Theme.ink3
                                onColChanged: requestPaint()
                                Component.onCompleted: requestPaint()
                                onPaint: {
                                    var ctx = getContext("2d")
                                    ctx.reset()
                                    ctx.strokeStyle = col
                                    ctx.lineWidth = 1.6
                                    ctx.lineCap = "round"
                                    ctx.beginPath()
                                    ctx.arc(6, 6, 4.5, 0, Math.PI * 2)
                                    ctx.moveTo(9.5, 9.5)
                                    ctx.lineTo(13, 13)
                                    ctx.stroke()
                                }
                            }
                            Text {
                                Layout.fillWidth: true
                                text: rootWindow.tr("Komut, kamera veya kural ara...", "Search commands, cameras, rules...")
                                color: Theme.ink3
                                font.family: Theme.sans
                                font.pixelSize: 12
                                elide: Text.ElideRight
                            }
                            Rectangle {
                                width: 44
                                height: 20
                                radius: 10
                                color: Theme.surface
                                border.width: 1
                                border.color: Theme.border
                                Text {
                                    anchors.centerIn: parent
                                    text: "Ctrl+K"
                                    color: Theme.ink2
                                    font.family: Theme.mono
                                    font.pixelSize: 10
                                    font.weight: Font.Medium
                                }
                            }
                        }

                        MouseArea {
                            id: cmdTriggerMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: rootWindow.commandPaletteOpen = true
                        }
                    }

                    // Live Engine Telemetry Chip
                    Rectangle {
                        height: 34
                        width: engineRow.implicitWidth + 18
                        radius: 17
                        color: Theme.bgSubtle
                        border.width: 1
                        border.color: Theme.border

                        RowLayout {
                            id: engineRow
                            anchors.centerIn: parent
                            spacing: 6
                            Rectangle {
                                width: 6
                                height: 6
                                radius: 3
                                color: Theme.ok
                            }
                            Text {
                                text: backend ? (backend.serverAddress + " · D3D11") : "127.0.0.1:8765 · D3D11"
                                color: Theme.ink2
                                font.family: Theme.mono
                                font.pixelSize: 11
                            }
                        }
                    }

                    // Globe + Language Switch (matching ipscans.com TR toggle)
                    Rectangle {
                        height: 36
                        width: langRow.implicitWidth + 18
                        radius: 18
                        color: langMouse.containsMouse ? Theme.bgMuted : "transparent"

                        RowLayout {
                            id: langRow
                            anchors.centerIn: parent
                            spacing: 5

                            Canvas {
                                width: 15
                                height: 15
                                property color col: Theme.ink2
                                onColChanged: requestPaint()
                                Component.onCompleted: requestPaint()
                                onPaint: {
                                    var ctx = getContext("2d")
                                    ctx.reset()
                                    ctx.strokeStyle = col
                                    ctx.lineWidth = 1.4
                                    ctx.beginPath()
                                    ctx.arc(7.5, 7.5, 6, 0, Math.PI * 2)
                                    ctx.moveTo(1.5, 7.5)
                                    ctx.lineTo(13.5, 7.5)
                                    ctx.stroke()
                                    ctx.beginPath()
                                    ctx.ellipse(4.8, 1.5, 5.4, 12)
                                    ctx.stroke()
                                }
                            }

                            Text {
                                text: rootWindow.lang.toUpperCase()
                                color: Theme.ink
                                font.family: Theme.sans
                                font.pixelSize: 12
                                font.weight: Theme.wMedium
                            }
                        }

                        MouseArea {
                            id: langMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (backend) backend.toggleLanguage()
                        }
                    }

                    // 40px Circular Sun/Moon Theme Toggle Button (matching ipscans.com 1:1)
                    Rectangle {
                        width: 38
                        height: 38
                        radius: 19
                        color: themeMouse.containsMouse ? Theme.bgMuted : Theme.surface
                        border.width: 1
                        border.color: Theme.borderStrong

                        Canvas {
                            id: sunMoonCanvas
                            anchors.centerIn: parent
                            width: 18
                            height: 18
                            property bool darkMode: rootWindow.isDark
                            onDarkModeChanged: requestPaint()
                            Component.onCompleted: requestPaint()
                            onPaint: {
                                var ctx = getContext("2d")
                                ctx.reset()
                                ctx.strokeStyle = darkMode ? "#F5F7FA" : "#0B0D12"
                                ctx.lineWidth = 1.65
                                ctx.lineCap = "round"
                                ctx.lineJoin = "round"
                                if (!darkMode) {
                                    // Crisp Sun icon (light mode active)
                                    ctx.beginPath()
                                    ctx.arc(9, 9, 3.6, 0, Math.PI * 2)
                                    ctx.stroke()
                                    var rays = 8
                                    for (var i = 0; i < rays; i++) {
                                        var a = (i * Math.PI * 2) / rays
                                        ctx.beginPath()
                                        ctx.moveTo(9 + Math.cos(a) * 5.6, 9 + Math.sin(a) * 5.6)
                                        ctx.lineTo(9 + Math.cos(a) * 7.6, 9 + Math.sin(a) * 7.6)
                                        ctx.stroke()
                                    }
                                } else {
                                    // Crisp Crescent Moon icon (dark mode active)
                                    ctx.beginPath()
                                    ctx.arc(9.5, 9, 5.5, 0.35 * Math.PI, 1.45 * Math.PI, false)
                                    ctx.arc(11.8, 7.2, 4.6, 1.35 * Math.PI, 0.42 * Math.PI, true)
                                    ctx.closePath()
                                    ctx.stroke()
                                }
                            }
                        }

                        MouseArea {
                            id: themeMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (backend) backend.toggleTheme()
                        }
                    }

                    // Primary Solid Ink Pill CTA Button (matching ipscans.com "İndir" pill)
                    Rectangle {
                        height: 38
                        width: primaryCtaRow.implicitWidth + 28
                        radius: 19
                        color: primaryCtaMouse.containsMouse ? Theme.primaryHover : Theme.primaryBg

                        RowLayout {
                            id: primaryCtaRow
                            anchors.centerIn: parent
                            spacing: 7

                            Rectangle {
                                width: 6
                                height: 6
                                radius: 3
                                color: Theme.signal
                            }

                            Text {
                                text: backend ? backend.planLabel : "ULTRA"
                                color: Theme.primaryFg
                                font.family: Theme.sans
                                font.pixelSize: 12
                                font.weight: Theme.wMedium
                            }
                        }

                        MouseArea {
                            id: primaryCtaMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: rootWindow.activeNavIndex = 5
                        }
                    }

                    // Windows 11 Minimize / Maximize / Close Controls
                    RowLayout {
                        spacing: 2

                        Rectangle {
                            width: 34
                            height: 32
                            radius: 8
                            color: minMouse.containsMouse ? Theme.bgMuted : "transparent"
                            Text {
                                anchors.centerIn: parent
                                text: "─"
                                color: Theme.ink2
                                font.pixelSize: 11
                            }
                            MouseArea {
                                id: minMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                onClicked: rootWindow.showMinimized()
                            }
                        }

                        Rectangle {
                            width: 34
                            height: 32
                            radius: 8
                            color: maxMouse.containsMouse ? Theme.bgMuted : "transparent"
                            Text {
                                anchors.centerIn: parent
                                text: rootWindow.visibility === Window.Maximized ? "❐" : "□"
                                color: Theme.ink2
                                font.pixelSize: 11
                            }
                            MouseArea {
                                id: maxMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                onClicked: {
                                    if (rootWindow.visibility === Window.Maximized)
                                        rootWindow.showNormal()
                                    else
                                        rootWindow.showMaximized()
                                }
                            }
                        }

                        Rectangle {
                            width: 34
                            height: 32
                            radius: 8
                            color: closeMouse.containsMouse ? Theme.bad : "transparent"
                            Text {
                                anchors.centerIn: parent
                                text: "✕"
                                color: closeMouse.containsMouse ? "#FFFFFF" : Theme.ink2
                                font.pixelSize: 11
                            }
                            MouseArea {
                                id: closeMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                onClicked: rootWindow.close()
                            }
                        }
                    }
                }
            }

            // =================================================================
            // 2. MAIN WORKSPACE ROW (SIDEBAR + ACTIVE VIEWPORT)
            // =================================================================
            RowLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 0

                // -------------------------------------------------------------
                // LEFT SIDEBAR (244px Expanded / 72px Collapsed)
                // -------------------------------------------------------------
                Rectangle {
                    Layout.preferredWidth: rootWindow.sidebarCollapsed ? 72 : 244
                    Layout.fillHeight: true
                    color: Theme.surface

                    Behavior on Layout.preferredWidth {
                        NumberAnimation { duration: Theme.normal; easing.type: Easing.OutCubic }
                    }

                    // Right 1px Hairline Border
                    Rectangle {
                        anchors.right: parent.right
                        anchors.top: parent.top
                        anchors.bottom: parent.bottom
                        width: 1
                        color: Theme.border
                    }

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 8

                        // Interactive 3D Cortex Logo Header Card
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 64
                            radius: 18
                            color: Theme.bgSubtle
                            border.width: 1
                            border.color: Theme.border

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 8
                                anchors.rightMargin: 10
                                spacing: 10

                                CortexLogo3D {
                                    Layout.preferredWidth: 46
                                    Layout.preferredHeight: 46
                                    isDark: rootWindow.isDark
                                }

                                ColumnLayout {
                                    visible: !rootWindow.sidebarCollapsed
                                    Layout.fillWidth: true
                                    spacing: 2

                                    Text {
                                        text: "Cortex Core"
                                        color: Theme.ink
                                        font.family: Theme.sans
                                        font.pixelSize: 14
                                        font.weight: Theme.wDisplay
                                        font.letterSpacing: Theme.tight(14)
                                    }
                                    Text {
                                        text: backend ? backend.workspaceName : "Merkez Saha İstasyonu"
                                        color: Theme.ink3
                                        font.family: Theme.sans
                                        font.pixelSize: 11
                                        elide: Text.ElideRight
                                        Layout.fillWidth: true
                                    }
                                }

                                Rectangle {
                                    width: 26
                                    height: 26
                                    radius: 13
                                    color: collapseMouse.containsMouse ? Theme.bgMuted : "transparent"
                                    Text {
                                        anchors.centerIn: parent
                                        text: rootWindow.sidebarCollapsed ? "»" : "«"
                                        color: Theme.ink2
                                        font.pixelSize: 13
                                    }
                                    MouseArea {
                                        id: collapseMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: rootWindow.sidebarCollapsed = !rootWindow.sidebarCollapsed
                                    }
                                }
                            }
                        }

                        // Eyebrow with 6px Signal Blue Dot (matching ipscans.com eyebrow style)
                        RowLayout {
                            visible: !rootWindow.sidebarCollapsed
                            Layout.leftMargin: 6
                            Layout.topMargin: 6
                            Layout.bottomMargin: 2
                            spacing: 7

                            Rectangle {
                                width: 6
                                height: 6
                                radius: 3
                                color: Theme.signal
                            }

                            Text {
                                text: rootWindow.tr("Operasyon Merkezi", "Operations Center")
                                color: Theme.ink2
                                font.family: Theme.sans
                                font.pixelSize: 12
                                font.weight: Theme.wMedium
                            }
                        }

                        // Navigation Items Model
                        Repeater {
                            model: [
                                {
                                    titleTr: "Genel Bakış",
                                    titleEn: "Overview",
                                    subTr: "3D çekirdek ve canlı saha",
                                    subEn: "3D core & live wall",
                                    iconType: "grid",
                                    badge: "3D"
                                },
                                {
                                    titleTr: "Kameralar",
                                    titleEn: "Cameras",
                                    subTr: "RTSP ve ONVIF kanalları",
                                    subEn: "RTSP & ONVIF channels",
                                    iconType: "camera",
                                    badge: backend ? String(backend.activeCameraCount).padStart(2, "0") : "01"
                                },
                                {
                                    titleTr: "Olay Kuralları",
                                    titleEn: "Event Rules",
                                    subTr: "ROI ve doğal dil kuralları",
                                    subEn: "ROI & VLM prompts",
                                    iconType: "rules",
                                    badge: backend ? String(backend.activeRuleCount).padStart(2, "0") : "04"
                                },
                                {
                                    titleTr: "Olay Arşivi",
                                    titleEn: "Forensic Archive",
                                    subTr: "SHA-256 kanıt kasası",
                                    subEn: "SHA-256 evidence vault",
                                    iconType: "archive",
                                    badge: backend ? String(backend.totalEventCount).padStart(2, "0") : "07"
                                },
                                {
                                    titleTr: "Ayarlar & Lisans",
                                    titleEn: "Settings & Vault",
                                    subTr: "Ollama VLM ve Telegram",
                                    subEn: "Ollama VLM & Telegram",
                                    iconType: "settings",
                                    badge: "Aktif"
                                },
                                {
                                    titleTr: "Paketler",
                                    titleEn: "Plans & Quota",
                                    subTr: "Kapasite ve lisans",
                                    subEn: "Capacity & license",
                                    iconType: "plans",
                                    badge: "ULTRA"
                                }
                            ]

                            delegate: Rectangle {
                                required property var modelData
                                required property int index
                                readonly property bool isCurrent: rootWindow.activeNavIndex === index

                                Layout.fillWidth: true
                                Layout.preferredHeight: 46
                                radius: 14
                                color: isCurrent ? Theme.bgSubtle : (navMouse.containsMouse ? Theme.bgSubtle : "transparent")
                                border.width: isCurrent ? 1 : 0
                                border.color: isCurrent ? Theme.borderStrong : "transparent"

                                // Left Active Signal Pill
                                Rectangle {
                                    visible: parent.isCurrent
                                    anchors.left: parent.left
                                    anchors.verticalCenter: parent.verticalCenter
                                    width: 3
                                    height: 22
                                    radius: 1.5
                                    color: Theme.signal
                                }

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 12
                                    anchors.rightMargin: 10
                                    spacing: 10

                                    // Custom Vector Icon Canvas
                                    Canvas {
                                        Layout.preferredWidth: 18
                                        Layout.preferredHeight: 18
                                        property string iconName: modelData.iconType
                                        property color strokeCol: isCurrent ? Theme.signal : Theme.ink2
                                        Component.onCompleted: requestPaint()
                                        onStrokeColChanged: requestPaint()
                                        onPaint: {
                                            var ctx = getContext("2d")
                                            ctx.reset()
                                            ctx.strokeStyle = strokeCol
                                            ctx.lineWidth = 1.65
                                            ctx.lineCap = "round"
                                            ctx.lineJoin = "round"

                                            if (iconName === "grid") {
                                                ctx.strokeRect(2, 2, 5.5, 5.5)
                                                ctx.strokeRect(10.5, 2, 5.5, 5.5)
                                                ctx.strokeRect(2, 10.5, 5.5, 5.5)
                                                ctx.strokeRect(10.5, 10.5, 5.5, 5.5)
                                            } else if (iconName === "camera") {
                                                ctx.strokeRect(1.5, 4, 10.5, 10)
                                                ctx.beginPath()
                                                ctx.moveTo(12, 7.5)
                                                ctx.lineTo(16.5, 5)
                                                ctx.lineTo(16.5, 13)
                                                ctx.lineTo(12, 10.5)
                                                ctx.closePath()
                                                ctx.stroke()
                                            } else if (iconName === "rules") {
                                                ctx.beginPath()
                                                ctx.moveTo(9, 2)
                                                ctx.lineTo(16, 9)
                                                ctx.lineTo(9, 16)
                                                ctx.lineTo(2, 9)
                                                ctx.closePath()
                                                ctx.stroke()
                                                ctx.beginPath()
                                                ctx.arc(9, 9, 2, 0, Math.PI * 2)
                                                ctx.stroke()
                                            } else if (iconName === "archive") {
                                                ctx.strokeRect(2.5, 3, 13, 12)
                                                ctx.beginPath()
                                                ctx.moveTo(2.5, 7)
                                                ctx.lineTo(15.5, 7)
                                                ctx.moveTo(7, 11)
                                                ctx.lineTo(11, 11)
                                                ctx.stroke()
                                            } else if (iconName === "settings") {
                                                ctx.beginPath()
                                                ctx.arc(9, 9, 5.5, 0, Math.PI * 2)
                                                ctx.stroke()
                                                ctx.beginPath()
                                                ctx.arc(9, 9, 2, 0, Math.PI * 2)
                                                ctx.stroke()
                                            } else {
                                                ctx.beginPath()
                                                ctx.moveTo(9, 2)
                                                ctx.lineTo(15.5, 5.5)
                                                ctx.lineTo(15.5, 12.5)
                                                ctx.lineTo(9, 16)
                                                ctx.lineTo(2.5, 12.5)
                                                ctx.lineTo(2.5, 5.5)
                                                ctx.closePath()
                                                ctx.stroke()
                                            }
                                        }
                                    }

                                    ColumnLayout {
                                        visible: !rootWindow.sidebarCollapsed
                                        Layout.fillWidth: true
                                        spacing: 1

                                        Text {
                                            text: rootWindow.tr(modelData.titleTr, modelData.titleEn)
                                            color: isCurrent ? Theme.ink : Theme.ink2
                                            font.family: Theme.sans
                                            font.pixelSize: 13
                                            font.weight: isCurrent ? Theme.wMedium : Theme.wBody
                                        }
                                        Text {
                                            text: rootWindow.tr(modelData.subTr, modelData.subEn)
                                            color: Theme.ink3
                                            font.family: Theme.sans
                                            font.pixelSize: 10
                                            elide: Text.ElideRight
                                            Layout.fillWidth: true
                                        }
                                    }

                                    Rectangle {
                                        visible: !rootWindow.sidebarCollapsed
                                        height: 20
                                        width: navBadgeText.implicitWidth + 12
                                        radius: 10
                                        color: isCurrent ? Theme.primaryBg : Theme.bgMuted
                                        Text {
                                            id: navBadgeText
                                            anchors.centerIn: parent
                                            text: modelData.badge
                                            color: isCurrent ? Theme.primaryFg : Theme.ink2
                                            font.family: Theme.mono
                                            font.pixelSize: 10
                                            font.weight: Font.Medium
                                        }
                                    }
                                }

                                MouseArea {
                                    id: navMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        rootWindow.activeNavIndex = index
                                    }
                                }
                            }
                        }

                        Item { Layout.fillHeight: true }

                        // VLM & Vault Status Card (20px radius, ipscans.com subtle surface)
                        Rectangle {
                            visible: !rootWindow.sidebarCollapsed
                            Layout.fillWidth: true
                            Layout.preferredHeight: 92
                            radius: 18
                            color: Theme.bgSubtle
                            border.width: 1
                            border.color: Theme.border

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 12
                                spacing: 4

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 6
                                    Rectangle {
                                        width: 6
                                        height: 6
                                        radius: 3
                                        color: Theme.ok
                                    }
                                    Text {
                                        text: rootWindow.tr("Yerel Görsel AI ve Kasa", "Local Vision AI & Vault")
                                        color: Theme.ink
                                        font.family: Theme.sans
                                        font.pixelSize: 11
                                        font.weight: Theme.wMedium
                                    }
                                    Item { Layout.fillWidth: true }
                                    Text {
                                        text: "SHA-256"
                                        color: Theme.ink3
                                        font.family: Theme.mono
                                        font.pixelSize: 10
                                    }
                                }

                                Text {
                                    text: backend ? ("Model: " + backend.vlmModelName) : "Model: gemma3:4b"
                                    color: Theme.ink2
                                    font.family: Theme.mono
                                    font.pixelSize: 11
                                }

                                Text {
                                    text: backend ? ("Disk: " + backend.diskFreeGb.toFixed(1) + " GB boş · " + backend.uptimeText) : "Disk: 67.2 GB boş"
                                    color: Theme.ink3
                                    font.family: Theme.sans
                                    font.pixelSize: 10
                                }

                                // Brand gradient progress bar
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 4
                                    radius: 2
                                    color: Theme.bgMuted
                                    clip: true
                                    Rectangle {
                                        width: parent.width * 0.82
                                        height: parent.height
                                        radius: 2
                                        gradient: Gradient {
                                            orientation: Gradient.Horizontal
                                            GradientStop { position: 0.0; color: Theme.brandA }
                                            GradientStop { position: 0.5; color: Theme.brandB }
                                            GradientStop { position: 1.0; color: Theme.brandC }
                                        }
                                    }
                                }
                            }
                        }

                        // Secondary Pill Button: Replay 3D Startup Sequence
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 38
                            radius: 19
                            color: splashBtnMouse.containsMouse ? Theme.bgMuted : Theme.surface
                            border.width: 1
                            border.color: Theme.borderStrong

                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 6
                                Rectangle {
                                    width: 6
                                    height: 6
                                    radius: 3
                                    color: Theme.signal
                                }
                                Text {
                                    visible: !rootWindow.sidebarCollapsed
                                    text: rootWindow.tr("3D Açılış Sahnesi", "3D Startup Scene")
                                    color: Theme.ink
                                    font.family: Theme.sans
                                    font.pixelSize: 12
                                    font.weight: Theme.wMedium
                                }
                            }

                            MouseArea {
                                id: splashBtnMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: startupOverlay.startSequence()
                            }
                        }

                        // Primary Solid Ink Pill Button: Open Web Admin Panel
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 40
                            radius: 20
                            color: adminBtnMouse.containsMouse ? Theme.primaryHover : Theme.primaryBg

                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 6
                                Text {
                                    visible: !rootWindow.sidebarCollapsed
                                    text: rootWindow.tr("Web Yönetim Paneli ↗", "Web Admin Panel ↗")
                                    color: Theme.primaryFg
                                    font.family: Theme.sans
                                    font.pixelSize: 12
                                    font.weight: Theme.wMedium
                                }
                                Text {
                                    visible: rootWindow.sidebarCollapsed
                                    text: "↗"
                                    color: Theme.primaryFg
                                    font.pixelSize: 12
                                }
                            }

                            MouseArea {
                                id: adminBtnMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: if (backend) backend.openAdminPanel()
                            }
                        }
                    }
                }

                // -------------------------------------------------------------
                // MAIN COMMAND DASHBOARD (Airy Canvas + 24px Radius Cards)
                // -------------------------------------------------------------
                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: Theme.bgSubtle

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 12

                        // =====================================================
                        // ROW 1: 4-CARD APP TELEMETRY STRIP (matching ipscans.com 4-card selector)
                        // =====================================================
                        RowLayout {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 92
                            Layout.minimumHeight: 92
                            Layout.maximumHeight: 92
                            Layout.fillHeight: false
                            spacing: 12

                            Repeater {
                                model: [
                                    {
                                        tagTr: "Aktif Kameralar · RTSP Havuzu",
                                        tagEn: "Active Cameras · RTSP Pool",
                                        metric: (backend ? String(backend.activeCameraCount).padStart(2, "0") : "01") + " / " + (backend ? backend.cameraLimit : 32),
                                        subTr: "CH-01 kapı önü · 192.168.1.100:554 · H.264",
                                        subEn: "CH-01 Front Door · 192.168.1.100:554 · H.264",
                                        pill: "Canlı",
                                        navIdx: 1
                                    },
                                    {
                                        tagTr: "Etkin Olay Kuralları · ROI & VLM",
                                        tagEn: "Active Event Rules · ROI & VLM",
                                        metric: (backend ? String(backend.activeRuleCount).padStart(2, "0") : "04") + " / " + (backend ? backend.ruleLimit : 128),
                                        subTr: "Kedi görüldü · Bölgede insan · Bölgede hareket · privacy",
                                        subEn: "Cat spotted · Person in zone · Motion · privacy mode",
                                        pill: "4 Kural",
                                        navIdx: 2
                                    },
                                    {
                                        tagTr: "Adli Olay Arşivi · SHA-256 Kasa",
                                        tagEn: "Forensic Archive · SHA-256 Vault",
                                        metric: backend ? String(backend.totalEventCount).padStart(2, "0") : "07",
                                        subTr: "Son: Bölgede insan (%96) · kapı önü · Kanıt Kilitli",
                                        subEn: "Latest: Person in zone (96%) · Front Door · Vault Locked",
                                        pill: "%96 Güven",
                                        navIdx: 3
                                    },
                                    {
                                        tagTr: "Yerel Görsel AI ve Telegram Rölesi",
                                        tagEn: "Local Vision AI & Telegram Relay",
                                        metric: backend ? backend.avgLatencyText : "0.4s",
                                        subTr: (backend ? backend.vlmModelName : "gemma3:4b") + " · " + (backend ? backend.telegramHandle : "@intelligentcortexbot"),
                                        subEn: (backend ? backend.vlmModelName : "gemma3:4b") + " · " + (backend ? backend.telegramHandle : "@intelligentcortexbot"),
                                        pill: "Aktif",
                                        navIdx: 4
                                    }
                                ]

                                delegate: Rectangle {
                                    required property var modelData
                                    required property int index
                                    readonly property bool isHighlighted: (rootWindow.activeNavIndex === 0 && index === 0) || (rootWindow.activeNavIndex === modelData.navIdx)

                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 92
                                    Layout.minimumHeight: 92
                                    Layout.maximumHeight: 92
                                    radius: 20
                                    color: Theme.surface
                                    border.width: 1
                                    border.color: isHighlighted ? Theme.borderStrong : Theme.border
                                    clip: true

                                    // Signature ipscans.com bottom gradient underline on active card
                                    Rectangle {
                                        visible: parent.isHighlighted
                                        anchors.bottom: parent.bottom
                                        anchors.left: parent.left
                                        anchors.right: parent.right
                                        anchors.leftMargin: 18
                                        anchors.rightMargin: 18
                                        height: 2.5
                                        radius: 1.25
                                        gradient: Gradient {
                                            orientation: Gradient.Horizontal
                                            GradientStop { position: 0.0; color: Theme.brandA }
                                            GradientStop { position: 0.48; color: Theme.brandB }
                                            GradientStop { position: 1.0; color: Theme.brandC }
                                        }
                                    }

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 14
                                        spacing: 3

                                        // Eyebrow with 6px Signal Blue Dot
                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 6

                                            Rectangle {
                                                width: 6
                                                height: 6
                                                radius: 3
                                                color: Theme.signal
                                            }

                                            Text {
                                                text: rootWindow.tr(modelData.tagTr, modelData.tagEn)
                                                color: Theme.ink2
                                                font.family: Theme.sans
                                                font.pixelSize: 12
                                                font.weight: Theme.wMedium
                                                elide: Text.ElideRight
                                                Layout.fillWidth: true
                                            }

                                            Rectangle {
                                                height: 20
                                                width: kpiPillText.implicitWidth + 12
                                                radius: 10
                                                color: Theme.bgMuted
                                                Text {
                                                    id: kpiPillText
                                                    anchors.centerIn: parent
                                                    text: modelData.pill
                                                    color: Theme.ink2
                                                    font.family: Theme.sans
                                                    font.pixelSize: 10
                                                    font.weight: Theme.wMedium
                                                }
                                            }
                                        }

                                        Text {
                                            text: modelData.metric
                                            color: Theme.ink
                                            font.family: Theme.sans
                                            font.pixelSize: 24
                                            font.weight: Theme.wDisplay
                                            font.letterSpacing: Theme.tracking(24)
                                        }

                                        Text {
                                            Layout.fillWidth: true
                                            text: rootWindow.tr(modelData.subTr, modelData.subEn)
                                            color: Theme.ink3
                                            font.family: Theme.sans
                                            font.pixelSize: 11
                                            elide: Text.ElideRight
                                        }
                                    }

                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: rootWindow.activeNavIndex = (rootWindow.activeNavIndex === modelData.navIdx ? 0 : modelData.navIdx)
                                    }
                                }
                            }
                        }

                        // =====================================================
                        // ROW 2: SPLIT WORKBENCH (LEFT: 3D CORE, RIGHT: 2D NVR WALL)
                        // =====================================================
                        RowLayout {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            Layout.minimumHeight: 420
                            spacing: 12

                            // -------------------------------------------------
                            // LEFT PANEL (48%): REAL QT QUICK 3D CORTEX CORE & TOPOLOGY
                            // -------------------------------------------------
                            Rectangle {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                Layout.preferredWidth: 480
                                radius: Theme.rLg
                                color: Theme.surface
                                border.width: 1
                                border.color: Theme.border
                                clip: true

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 10

                                    // Card Header Toolbar with Eyebrow + Segmented Control
                                    RowLayout {
                                        Layout.fillWidth: true
                                        Layout.preferredHeight: 36
                                        spacing: 8

                                        Rectangle {
                                            width: 14
                                            height: 14
                                            radius: 7
                                            color: Theme.signalSoft
                                            Rectangle {
                                                anchors.centerIn: parent
                                                width: 6
                                                height: 6
                                                radius: 3
                                                color: Theme.signal
                                            }
                                        }

                                        Text {
                                            text: rootWindow.tr("3D Cortex Core & Ağ Topolojisi", "3D Cortex Core & Network Topology")
                                            color: Theme.ink
                                            font.family: Theme.sans
                                            font.pixelSize: 15
                                            font.weight: Theme.wDisplay
                                            font.letterSpacing: Theme.tight(15)
                                        }

                                        Item { Layout.fillWidth: true }

                                        // Segmented Control (matching ipscans.com "Cihaz Keşfi / Topoloji Haritası" pill track)
                                        Rectangle {
                                            height: 32
                                            width: segRow3D.implicitWidth + 8
                                            radius: 16
                                            color: Theme.bgMuted
                                            border.width: 1
                                            border.color: Theme.border

                                            RowLayout {
                                                id: segRow3D
                                                anchors.centerIn: parent
                                                spacing: 2

                                                Rectangle {
                                                    height: 26
                                                    width: seg3DTxt.implicitWidth + 18
                                                    radius: 13
                                                    color: !core3DScene.show2DFallback ? Theme.segActive : "transparent"
                                                    border.width: !core3DScene.show2DFallback ? 1 : 0
                                                    border.color: Theme.border
                                                    Text {
                                                        id: seg3DTxt
                                                        anchors.centerIn: parent
                                                        text: "3D Sahne"
                                                        color: !core3DScene.show2DFallback ? Theme.ink : Theme.ink2
                                                        font.family: Theme.sans
                                                        font.pixelSize: 11
                                                        font.weight: !core3DScene.show2DFallback ? Theme.wMedium : Theme.wBody
                                                    }
                                                    MouseArea {
                                                        anchors.fill: parent
                                                        cursorShape: Qt.PointingHandCursor
                                                        onClicked: core3DScene.show2DFallback = false
                                                    }
                                                }

                                                Rectangle {
                                                    height: 26
                                                    width: seg2DTxt.implicitWidth + 18
                                                    radius: 13
                                                    color: core3DScene.show2DFallback ? Theme.segActive : "transparent"
                                                    border.width: core3DScene.show2DFallback ? 1 : 0
                                                    border.color: Theme.border
                                                    Text {
                                                        id: seg2DTxt
                                                        anchors.centerIn: parent
                                                        text: "2D Matris"
                                                        color: core3DScene.show2DFallback ? Theme.ink : Theme.ink2
                                                        font.family: Theme.sans
                                                        font.pixelSize: 11
                                                        font.weight: core3DScene.show2DFallback ? Theme.wMedium : Theme.wBody
                                                    }
                                                    MouseArea {
                                                        anchors.fill: parent
                                                        cursorShape: Qt.PointingHandCursor
                                                        onClicked: core3DScene.show2DFallback = true
                                                    }
                                                }
                                            }
                                        }

                                        // Auto-Orbit Pill
                                        Rectangle {
                                            height: 30
                                            width: orbitToggleText.implicitWidth + 16
                                            radius: 15
                                            color: core3DScene.autoOrbit ? Theme.signalSoft : Theme.bgSubtle
                                            border.width: 1
                                            border.color: core3DScene.autoOrbit ? Theme.signal : Theme.border
                                            Text {
                                                id: orbitToggleText
                                                anchors.centerIn: parent
                                                text: core3DScene.autoOrbit ? "Yörünge: Açık" : "Yörünge: Durdu"
                                                color: core3DScene.autoOrbit ? Theme.signal : Theme.ink2
                                                font.family: Theme.sans
                                                font.pixelSize: 11
                                                font.weight: Theme.wMedium
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: core3DScene.autoOrbit = !core3DScene.autoOrbit
                                            }
                                        }

                                        // Zoom In / Out / Reset Circular Buttons
                                        Rectangle {
                                            width: 30
                                            height: 30
                                            radius: 15
                                            color: Theme.bgSubtle
                                            border.width: 1
                                            border.color: Theme.borderStrong
                                            Text {
                                                anchors.centerIn: parent
                                                text: "+"
                                                color: Theme.ink
                                                font.family: Theme.mono
                                                font.pixelSize: 13
                                                font.weight: Font.Medium
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: core3DScene.zoomIn()
                                            }
                                        }

                                        Rectangle {
                                            width: 30
                                            height: 30
                                            radius: 15
                                            color: Theme.bgSubtle
                                            border.width: 1
                                            border.color: Theme.borderStrong
                                            Text {
                                                anchors.centerIn: parent
                                                text: "−"
                                                color: Theme.ink
                                                font.family: Theme.mono
                                                font.pixelSize: 13
                                                font.weight: Font.Medium
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: core3DScene.zoomOut()
                                            }
                                        }
                                    }

                                    // 3D Viewport Area
                                    CortexCore3DView {
                                        id: core3DScene
                                        Layout.fillWidth: true
                                        Layout.fillHeight: true
                                        isDark: rootWindow.isDark
                                        topologyNodes: backend ? backend.topologyNodes : []
                                        onNodeClicked: function(nodeId, nodeTitle) {
                                            rootWindow.showToast("3D Düğüm Seçildi: " + nodeTitle)
                                        }
                                    }
                                }
                            }

                            // -------------------------------------------------
                            // RIGHT PANEL (52%): 2D NVR CAMERA COMMAND WALL & CONTEXTUAL SUB-VIEWS
                            // -------------------------------------------------
                            Rectangle {
                                id: cameraPanelCard
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                Layout.preferredWidth: 520
                                radius: Theme.rLg
                                color: Theme.surface
                                border.width: 1
                                border.color: Theme.border
                                clip: true

                                readonly property var primaryCam: (backend && backend.cameras && backend.cameras.length > 0)
                                    ? backend.cameras[0]
                                    : ({
                                        id: "06c256561cc943948c714c45addbcd47",
                                        name: "kapı önü",
                                        channelLabel: "CH-01",
                                        sourceLabel: "rtsp://192.168.1.100:554/stream1",
                                        status: "standby",
                                        statusLabel: "Son Kayıtlı Kare · Hazır",
                                        fpsText: "4.0 FPS",
                                        codecText: "H.264 · 1080p",
                                        ruleCount: 4,
                                        ruleTitles: ["privacy mode", "Kedi görüldü", "Bölgede hareket", "Bölgede insan"],
                                        frameUrl: "image://cortexframe/06c256561cc943948c714c45addbcd47?t=1",
                                        heatmapUrl: "image://cortexheatmap/06c256561cc943948c714c45addbcd47?t=1"
                                    })

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 10

                                    // Camera Command Toolbar
                                    RowLayout {
                                        Layout.fillWidth: true
                                        Layout.preferredHeight: 36
                                        spacing: 8

                                        Rectangle {
                                            width: 14
                                            height: 14
                                            radius: 7
                                            color: Theme.okSoft
                                            Rectangle {
                                                anchors.centerIn: parent
                                                width: 6
                                                height: 6
                                                radius: 3
                                                color: Theme.ok
                                            }
                                        }

                                        Text {
                                            text: rootWindow.tr("Canlı Kamera Komuta Merkezi · 2D NVR", "Live Camera Command Wall · 2D NVR")
                                            color: Theme.ink
                                            font.family: Theme.sans
                                            font.pixelSize: 15
                                            font.weight: Theme.wDisplay
                                            font.letterSpacing: Theme.tight(15)
                                        }

                                        Item { Layout.fillWidth: true }

                                        // ROI Overlay Chip Toggle
                                        Rectangle {
                                            height: 30
                                            width: roiBtnText.implicitWidth + 18
                                            radius: 15
                                            color: rootWindow.showRoiOverlay ? Theme.signalSoft : Theme.bgSubtle
                                            border.width: 1
                                            border.color: rootWindow.showRoiOverlay ? Theme.signal : Theme.border
                                            Text {
                                                id: roiBtnText
                                                anchors.centerIn: parent
                                                text: "ROI Bölgeleri"
                                                color: rootWindow.showRoiOverlay ? Theme.signal : Theme.ink2
                                                font.family: Theme.sans
                                                font.pixelSize: 11
                                                font.weight: Theme.wMedium
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: rootWindow.showRoiOverlay = !rootWindow.showRoiOverlay
                                            }
                                        }

                                        // Heatmap Overlay Chip Toggle
                                        Rectangle {
                                            height: 30
                                            width: heatBtnText.implicitWidth + 18
                                            radius: 15
                                            color: rootWindow.showHeatmapOverlay ? Theme.primaryBg : Theme.bgSubtle
                                            border.width: 1
                                            border.color: rootWindow.showHeatmapOverlay ? Theme.primaryBg : Theme.border
                                            Text {
                                                id: heatBtnText
                                                anchors.centerIn: parent
                                                text: "Isı Haritası"
                                                color: rootWindow.showHeatmapOverlay ? Theme.primaryFg : Theme.ink2
                                                font.family: Theme.sans
                                                font.pixelSize: 11
                                                font.weight: Theme.wMedium
                                            }
                                            MouseArea {
                                                anchors.fill: parent
                                                cursorShape: Qt.PointingHandCursor
                                                onClicked: rootWindow.showHeatmapOverlay = !rootWindow.showHeatmapOverlay
                                            }
                                        }

                                        // Segmented Control: 1x1 vs 2x2 Grid
                                        Rectangle {
                                            height: 32
                                            width: 96
                                            radius: 16
                                            color: Theme.bgMuted
                                            border.width: 1
                                            border.color: Theme.border

                                            RowLayout {
                                                anchors.fill: parent
                                                anchors.margins: 3
                                                spacing: 2

                                                Rectangle {
                                                    Layout.fillWidth: true
                                                    Layout.fillHeight: true
                                                    radius: 13
                                                    color: rootWindow.cameraGridMode === "1x1" ? Theme.segActive : "transparent"
                                                    border.width: rootWindow.cameraGridMode === "1x1" ? 1 : 0
                                                    border.color: Theme.border
                                                    Text {
                                                        anchors.centerIn: parent
                                                        text: "1×1"
                                                        color: rootWindow.cameraGridMode === "1x1" ? Theme.ink : Theme.ink2
                                                        font.family: Theme.mono
                                                        font.pixelSize: 11
                                                        font.weight: Font.Medium
                                                    }
                                                    MouseArea {
                                                        anchors.fill: parent
                                                        cursorShape: Qt.PointingHandCursor
                                                        onClicked: rootWindow.cameraGridMode = "1x1"
                                                    }
                                                }

                                                Rectangle {
                                                    Layout.fillWidth: true
                                                    Layout.fillHeight: true
                                                    radius: 13
                                                    color: rootWindow.cameraGridMode === "2x2" ? Theme.segActive : "transparent"
                                                    border.width: rootWindow.cameraGridMode === "2x2" ? 1 : 0
                                                    border.color: Theme.border
                                                    Text {
                                                        anchors.centerIn: parent
                                                        text: "2×2"
                                                        color: rootWindow.cameraGridMode === "2x2" ? Theme.ink : Theme.ink2
                                                        font.family: Theme.mono
                                                        font.pixelSize: 11
                                                        font.weight: Font.Medium
                                                    }
                                                    MouseArea {
                                                        anchors.fill: parent
                                                        cursorShape: Qt.PointingHandCursor
                                                        onClicked: rootWindow.cameraGridMode = "2x2"
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // Camera Wall Content
                                    GridLayout {
                                        Layout.fillWidth: true
                                        Layout.fillHeight: true
                                        columns: rootWindow.cameraGridMode === "2x2" ? 2 : 1
                                        rowSpacing: 10
                                        columnSpacing: 10

                                        // PRIMARY REAL CAMERA CELL (CH-01 · kapı önü)
                                        Rectangle {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            radius: Theme.rMd
                                            color: "#090C12"
                                            border.width: 1
                                            border.color: Theme.borderStrong
                                            clip: true

                                            // Live / Recorded Camera Frame from QQuickImageProvider
                                            Image {
                                                id: camFeedImage
                                                anchors.fill: parent
                                                anchors.margins: 1
                                                source: cameraPanelCard.primaryCam.frameUrl
                                                fillMode: Image.PreserveAspectCrop
                                                cache: false
                                                asynchronous: false
                                            }

                                            // Optional Heatmap Overlay
                                            Image {
                                                visible: rootWindow.showHeatmapOverlay
                                                anchors.fill: parent
                                                anchors.margins: 1
                                                source: cameraPanelCard.primaryCam.heatmapUrl
                                                fillMode: Image.PreserveAspectCrop
                                                opacity: 0.58
                                                cache: false
                                            }

                                            // Precision NVR Reticle + 8-Handle ROI Zone Studio Canvas
                                            Canvas {
                                                id: roiCanvas
                                                anchors.fill: parent
                                                property bool drawRoi: rootWindow.showRoiOverlay
                                                onDrawRoiChanged: requestPaint()
                                                onPaint: {
                                                    var ctx = getContext("2d")
                                                    ctx.reset()
                                                    var w = width
                                                    var h = height

                                                    // Precision Corner Brackets
                                                    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)"
                                                    ctx.lineWidth = 1.5
                                                    var b = 18
                                                    var m = 12
                                                    ctx.beginPath()
                                                    ctx.moveTo(m, m + b); ctx.lineTo(m, m); ctx.lineTo(m + b, m)
                                                    ctx.moveTo(w - m - b, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + b)
                                                    ctx.moveTo(m, h - m - b); ctx.lineTo(m, h - m); ctx.lineTo(m + b, h - m)
                                                    ctx.moveTo(w - m - b, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - b)
                                                    ctx.stroke()

                                                    if (drawRoi) {
                                                        // Active Detection ROI Polygon Zone (Signal Blue accent)
                                                        ctx.strokeStyle = "rgba(76, 130, 255, 0.90)"
                                                        ctx.fillStyle = "rgba(47, 107, 255, 0.12)"
                                                        ctx.lineWidth = 1.6
                                                        ctx.beginPath()
                                                        ctx.moveTo(w * 0.16, h * 0.24)
                                                        ctx.lineTo(w * 0.84, h * 0.24)
                                                        ctx.lineTo(w * 0.88, h * 0.76)
                                                        ctx.lineTo(w * 0.12, h * 0.76)
                                                        ctx.closePath()
                                                        ctx.fill()
                                                        ctx.stroke()

                                                        // 8-handle vertices & midpoints on ROI polygon
                                                        var pts = [
                                                            [w * 0.16, h * 0.24],
                                                            [w * 0.50, h * 0.24],
                                                            [w * 0.84, h * 0.24],
                                                            [w * 0.86, h * 0.50],
                                                            [w * 0.88, h * 0.76],
                                                            [w * 0.50, h * 0.76],
                                                            [w * 0.12, h * 0.76],
                                                            [w * 0.14, h * 0.50]
                                                        ]
                                                        for (var i = 0; i < pts.length; i++) {
                                                            ctx.fillStyle = "#FFFFFF"
                                                            ctx.beginPath()
                                                            ctx.arc(pts[i][0], pts[i][1], 4, 0, Math.PI * 2)
                                                            ctx.fill()
                                                            ctx.strokeStyle = "#2F6BFF"
                                                            ctx.lineWidth = 1.5
                                                            ctx.stroke()
                                                        }
                                                    }
                                                }
                                            }

                                            // Top OSD Pill Bar (Channel Name, IP, Live Status)
                                            RowLayout {
                                                anchors.top: parent.top
                                                anchors.left: parent.left
                                                anchors.right: parent.right
                                                anchors.margins: 14
                                                spacing: 8

                                                Rectangle {
                                                    height: 28
                                                    width: camTitleRow.implicitWidth + 18
                                                    radius: 14
                                                    color: Theme.surface
                                                    border.width: 1
                                                    border.color: Theme.borderStrong

                                                    RowLayout {
                                                        id: camTitleRow
                                                        anchors.centerIn: parent
                                                        spacing: 7
                                                        Rectangle {
                                                            width: 7
                                                            height: 7
                                                            radius: 3.5
                                                            color: Theme.ok
                                                        }
                                                        Text {
                                                            text: "CH-01 · " + cameraPanelCard.primaryCam.name
                                                            color: Theme.ink
                                                            font.family: Theme.sans
                                                            font.pixelSize: 12
                                                            font.weight: Theme.wMedium
                                                        }
                                                        Text {
                                                            text: "· " + cameraPanelCard.primaryCam.sourceLabel
                                                            color: Theme.ink3
                                                            font.family: Theme.mono
                                                            font.pixelSize: 10
                                                        }
                                                    }
                                                }

                                                Item { Layout.fillWidth: true }

                                                Rectangle {
                                                    height: 28
                                                    width: camStateLabel.implicitWidth + 16
                                                    radius: 14
                                                    color: Theme.surface
                                                    border.width: 1
                                                    border.color: Theme.borderStrong
                                                    Text {
                                                        id: camStateLabel
                                                        anchors.centerIn: parent
                                                        text: cameraPanelCard.primaryCam.statusLabel + " · " + cameraPanelCard.primaryCam.codecText
                                                        color: Theme.ink2
                                                        font.family: Theme.sans
                                                        font.pixelSize: 11
                                                        font.weight: Theme.wMedium
                                                    }
                                                }
                                            }

                                            // Active Rules Pill Strip (Top-Left under OSD)
                                            Flow {
                                                visible: rootWindow.showRoiOverlay
                                                anchors.top: parent.top
                                                anchors.left: parent.left
                                                anchors.topMargin: 48
                                                anchors.leftMargin: 14
                                                spacing: 6

                                                Repeater {
                                                    model: cameraPanelCard.primaryCam.ruleTitles
                                                    delegate: Rectangle {
                                                        required property string modelData
                                                        height: 22
                                                        width: ruleTagRow.implicitWidth + 14
                                                        radius: 11
                                                        color: Theme.surface
                                                        border.width: 1
                                                        border.color: Theme.borderStrong

                                                        RowLayout {
                                                            id: ruleTagRow
                                                            anchors.centerIn: parent
                                                            spacing: 5
                                                            Rectangle {
                                                                width: 5
                                                                height: 5
                                                                radius: 2.5
                                                                color: Theme.signal
                                                            }
                                                            Text {
                                                                text: modelData
                                                                color: Theme.ink
                                                                font.family: Theme.sans
                                                                font.pixelSize: 10
                                                                font.weight: Theme.wMedium
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            // Bottom Camera Control Action Bar (Glassmorphic Surface + Solid Ink Pill CTA)
                                            Rectangle {
                                                anchors.bottom: parent.bottom
                                                anchors.left: parent.left
                                                anchors.right: parent.right
                                                anchors.margins: 12
                                                height: 44
                                                radius: 22
                                                color: Theme.surface
                                                border.width: 1
                                                border.color: Theme.borderStrong

                                                RowLayout {
                                                    anchors.fill: parent
                                                    anchors.leftMargin: 14
                                                    anchors.rightMargin: 8
                                                    spacing: 8

                                                    Rectangle {
                                                        width: 6
                                                        height: 6
                                                        radius: 3
                                                        color: Theme.signal
                                                    }

                                                    Text {
                                                        text: rootWindow.tr("ROI Stüdyo: 4 aktif kural · VLM hazır", "ROI Studio: 4 active rules · VLM ready")
                                                        color: Theme.ink2
                                                        font.family: Theme.sans
                                                        font.pixelSize: 11
                                                        font.weight: Theme.wMedium
                                                    }

                                                    Item { Layout.fillWidth: true }

                                                    // Primary Solid Ink Pill Button: Start/Refresh Stream
                                                    Rectangle {
                                                        height: 30
                                                        width: streamToggleText.implicitWidth + 22
                                                        radius: 15
                                                        color: streamBtnMouse.containsMouse ? Theme.primaryHover : Theme.primaryBg
                                                        Text {
                                                            id: streamToggleText
                                                            anchors.centerIn: parent
                                                            text: rootWindow.tr("Akışı Başlat / Yenile", "Start / Refresh Stream")
                                                            color: Theme.primaryFg
                                                            font.family: Theme.sans
                                                            font.pixelSize: 11
                                                            font.weight: Theme.wMedium
                                                        }
                                                        MouseArea {
                                                            id: streamBtnMouse
                                                            anchors.fill: parent
                                                            hoverEnabled: true
                                                            cursorShape: Qt.PointingHandCursor
                                                            onClicked: {
                                                                var cid = cameraPanelCard.primaryCam.id
                                                                if (backend) backend.toggleCameraStream(cid)
                                                            }
                                                        }
                                                    }

                                                    // Secondary Pill Button: 15s Pass
                                                    Rectangle {
                                                        height: 30
                                                        width: passBtnText.implicitWidth + 18
                                                        radius: 15
                                                        color: passBtnMouse.containsMouse ? Theme.bgMuted : Theme.bgSubtle
                                                        border.width: 1
                                                        border.color: Theme.borderStrong
                                                        Text {
                                                            id: passBtnText
                                                            anchors.centerIn: parent
                                                            text: rootWindow.tr("15sn Geçiş İzni", "15s Pass")
                                                            color: Theme.ink
                                                            font.family: Theme.sans
                                                            font.pixelSize: 11
                                                            font.weight: Theme.wMedium
                                                        }
                                                        MouseArea {
                                                            id: passBtnMouse
                                                            anchors.fill: parent
                                                            hoverEnabled: true
                                                            cursorShape: Qt.PointingHandCursor
                                                            onClicked: {
                                                                var cid = cameraPanelCard.primaryCam.id
                                                                if (backend) backend.grantPass(cid, 15)
                                                            }
                                                        }
                                                    }

                                                    // Secondary Pill Button: Diagnose
                                                    Rectangle {
                                                        height: 30
                                                        width: diagBtnText.implicitWidth + 18
                                                        radius: 15
                                                        color: diagBtnMouse.containsMouse ? Theme.bgMuted : Theme.bgSubtle
                                                        border.width: 1
                                                        border.color: Theme.borderStrong
                                                        Text {
                                                            id: diagBtnText
                                                            anchors.centerIn: parent
                                                            text: rootWindow.tr("Tanılama", "Diagnose")
                                                            color: Theme.ink2
                                                            font.family: Theme.sans
                                                            font.pixelSize: 11
                                                            font.weight: Theme.wMedium
                                                        }
                                                        MouseArea {
                                                            id: diagBtnMouse
                                                            anchors.fill: parent
                                                            hoverEnabled: true
                                                            cursorShape: Qt.PointingHandCursor
                                                            onClicked: {
                                                                var cid = cameraPanelCard.primaryCam.id
                                                                if (backend) backend.diagnoseCamera(cid)
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // ADDITIONAL QUAD CELLS WHEN IN 2x2 MODE
                                        Repeater {
                                            model: rootWindow.cameraGridMode === "2x2" ? [
                                                { ch: "CH-02", label: "Kuzey Çevre Hattı", proto: "ONVIF · Hazır" },
                                                { ch: "CH-03", label: "Depo Giriş Kapısı", proto: "RTSP · Hazır" },
                                                { ch: "CH-04", label: "Sunucu Odası Koridor", proto: "RTSP · Hazır" }
                                            ] : []

                                            delegate: Rectangle {
                                                required property var modelData
                                                Layout.fillWidth: true
                                                Layout.fillHeight: true
                                                radius: Theme.rMd
                                                color: Theme.bgSubtle
                                                border.width: 1
                                                border.color: Theme.border

                                                ColumnLayout {
                                                    anchors.centerIn: parent
                                                    spacing: 6
                                                    Rectangle {
                                                        Layout.alignment: Qt.AlignHCenter
                                                        width: 28
                                                        height: 28
                                                        radius: 14
                                                        color: Theme.signalSoft
                                                        Rectangle {
                                                            anchors.centerIn: parent
                                                            width: 8
                                                            height: 8
                                                            radius: 4
                                                            color: Theme.signal
                                                        }
                                                    }
                                                    Text {
                                                        Layout.alignment: Qt.AlignHCenter
                                                        text: modelData.ch + " · " + modelData.label
                                                        color: Theme.ink
                                                        font.family: Theme.sans
                                                        font.pixelSize: 13
                                                        font.weight: Theme.wMedium
                                                    }
                                                    Text {
                                                        Layout.alignment: Qt.AlignHCenter
                                                        text: modelData.proto
                                                        color: Theme.ink3
                                                        font.family: Theme.mono
                                                        font.pixelSize: 11
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // =====================================================
                        // ROW 3: BOTTOM TELEMETRY DOCK (PIPELINE + FORENSIC EVENTS)
                        // =====================================================
                        RowLayout {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 176
                            Layout.minimumHeight: 176
                            Layout.maximumHeight: 176
                            Layout.fillHeight: false
                            spacing: 12

                            // -------------------------------------------------
                            // BOTTOM LEFT (48%): 4-STAGE HYBRID AI PIPELINE & DENSITY
                            // -------------------------------------------------
                            Rectangle {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 176
                                Layout.maximumHeight: 176
                                Layout.preferredWidth: 480
                                radius: Theme.rLg
                                color: Theme.surface
                                border.width: 1
                                border.color: Theme.border

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 8

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 7
                                        Rectangle {
                                            width: 6
                                            height: 6
                                            radius: 3
                                            color: Theme.signal
                                        }
                                        Text {
                                            text: rootWindow.tr("Hibrit Görsel AI İşleme Hattı ve 24s Yoğunluk", "Hybrid Vision AI Pipeline & 24h Density")
                                            color: Theme.ink
                                            font.family: Theme.sans
                                            font.pixelSize: 13
                                            font.weight: Theme.wMedium
                                        }
                                        Item { Layout.fillWidth: true }
                                        Rectangle {
                                            height: 22
                                            width: pipeTagTxt.implicitWidth + 14
                                            radius: 11
                                            color: Theme.bgMuted
                                            Text {
                                                id: pipeTagTxt
                                                anchors.centerIn: parent
                                                text: "RTSP → ROI → VLM → SHA-256"
                                                color: Theme.ink2
                                                font.family: Theme.mono
                                                font.pixelSize: 10
                                            }
                                        }
                                    }

                                    // 4-Stage Pipeline Row
                                    RowLayout {
                                        Layout.fillWidth: true
                                        Layout.preferredHeight: 72
                                        Layout.maximumHeight: 72
                                        spacing: 8

                                        Repeater {
                                            model: backend ? backend.pipelineStages : []
                                            delegate: Rectangle {
                                                required property var modelData
                                                Layout.fillWidth: true
                                                Layout.preferredHeight: 72
                                                Layout.maximumHeight: 72
                                                radius: 14
                                                color: Theme.bgSubtle
                                                border.width: 1
                                                border.color: Theme.border

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 9
                                                    spacing: 3

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        Text {
                                                            text: modelData.step
                                                            color: Theme.ink3
                                                            font.family: Theme.mono
                                                            font.pixelSize: 9
                                                            font.weight: Font.Medium
                                                        }
                                                        Item { Layout.fillWidth: true }
                                                        Rectangle {
                                                            width: 6
                                                            height: 6
                                                            radius: 3
                                                            color: Theme.ok
                                                        }
                                                    }

                                                    Text {
                                                        Layout.fillWidth: true
                                                        text: modelData.title
                                                        color: Theme.ink
                                                        font.family: Theme.sans
                                                        font.pixelSize: 11
                                                        font.weight: Theme.wMedium
                                                        elide: Text.ElideRight
                                                    }

                                                    Text {
                                                        Layout.fillWidth: true
                                                        text: modelData.metric
                                                        color: Theme.ink2
                                                        font.family: Theme.mono
                                                        font.pixelSize: 10
                                                        elide: Text.ElideRight
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // 24-Hour Activity Density Micro Bar Chart
                                    RowLayout {
                                        Layout.fillWidth: true
                                        Layout.preferredHeight: 34
                                        Layout.maximumHeight: 34
                                        spacing: 4

                                        Text {
                                            text: "24s:"
                                            color: Theme.ink3
                                            font.family: Theme.mono
                                            font.pixelSize: 10
                                        }

                                        Repeater {
                                            model: backend ? backend.hourlyBuckets : []
                                            delegate: Item {
                                                required property var modelData
                                                Layout.fillWidth: true
                                                Layout.preferredHeight: 30

                                                Rectangle {
                                                    anchors.bottom: parent.bottom
                                                    anchors.horizontalCenter: parent.horizontalCenter
                                                    width: Math.max(4, parent.width - 2)
                                                    height: Math.max(4, parent.height * Math.max(0.14, modelData.ratio))
                                                    radius: 2
                                                    color: modelData.count > 0 ? Theme.signal : Theme.bgMuted
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // -------------------------------------------------
                            // BOTTOM RIGHT (52%): REAL FORENSIC EVENT STREAM
                            // -------------------------------------------------
                            Rectangle {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 176
                                Layout.maximumHeight: 176
                                Layout.preferredWidth: 520
                                radius: Theme.rLg
                                color: Theme.surface
                                border.width: 1
                                border.color: Theme.border

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 8

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 7
                                        Rectangle {
                                            width: 6
                                            height: 6
                                            radius: 3
                                            color: Theme.signal
                                        }
                                        Text {
                                            text: rootWindow.tr("Canlı Adli Olay Akışı · SHA-256 Kanıt Zinciri", "Live Forensic Event Stream · SHA-256 Vault")
                                            color: Theme.ink
                                            font.family: Theme.sans
                                            font.pixelSize: 13
                                            font.weight: Theme.wMedium
                                        }
                                        Item { Layout.fillWidth: true }
                                        Rectangle {
                                            height: 22
                                            width: evCountTxt.implicitWidth + 14
                                            radius: 11
                                            color: Theme.bgMuted
                                            Text {
                                                id: evCountTxt
                                                anchors.centerIn: parent
                                                text: (backend ? backend.totalEventCount : 7) + " kayıtlı kanıt"
                                                color: Theme.ink2
                                                font.family: Theme.sans
                                                font.pixelSize: 10
                                                font.weight: Theme.wMedium
                                            }
                                        }
                                    }

                                    // Top 2 Forensic Events with Real Thumbnail & Solid Ink Pill Acknowledge Button
                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        Layout.fillHeight: true
                                        spacing: 6

                                        Repeater {
                                            model: (backend && backend.events) ? backend.events.slice(0, 2) : []

                                            delegate: Rectangle {
                                                required property var modelData
                                                Layout.fillWidth: true
                                                Layout.preferredHeight: 56
                                                Layout.maximumHeight: 56
                                                radius: 14
                                                color: Theme.bgSubtle
                                                border.width: 1
                                                border.color: Theme.border

                                                RowLayout {
                                                    anchors.fill: parent
                                                    anchors.leftMargin: 8
                                                    anchors.rightMargin: 10
                                                    spacing: 10

                                                    // Real Captured Event Snapshot Thumbnail
                                                    Rectangle {
                                                        Layout.preferredWidth: 76
                                                        Layout.preferredHeight: 42
                                                        radius: 8
                                                        color: "#0D111A"
                                                        border.width: 1
                                                        border.color: Theme.border
                                                        clip: true

                                                        Image {
                                                            anchors.fill: parent
                                                            source: modelData.thumbUrl
                                                            fillMode: Image.PreserveAspectCrop
                                                        }
                                                    }

                                                    ColumnLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 2

                                                        RowLayout {
                                                            Layout.fillWidth: true
                                                            spacing: 6

                                                            Text {
                                                                text: modelData.ruleTitle
                                                                color: Theme.ink
                                                                font.family: Theme.sans
                                                                font.pixelSize: 12
                                                                font.weight: Theme.wMedium
                                                            }

                                                            Rectangle {
                                                                height: 18
                                                                width: confLabel.implicitWidth + 10
                                                                radius: 9
                                                                color: Theme.signalSoft
                                                                Text {
                                                                    id: confLabel
                                                                    anchors.centerIn: parent
                                                                    text: modelData.confidenceText
                                                                    color: Theme.signal
                                                                    font.family: Theme.mono
                                                                    font.pixelSize: 10
                                                                    font.weight: Font.Medium
                                                                }
                                                            }

                                                            Item { Layout.fillWidth: true }

                                                            Text {
                                                                text: modelData.timeLabel
                                                                color: Theme.ink3
                                                                font.family: Theme.mono
                                                                font.pixelSize: 10
                                                            }
                                                        }

                                                        Text {
                                                            Layout.fillWidth: true
                                                            text: modelData.cameraName + " · " + modelData.summary
                                                            color: Theme.ink2
                                                            font.family: Theme.sans
                                                            font.pixelSize: 11
                                                            elide: Text.ElideRight
                                                        }
                                                    }

                                                    // Solid Ink Pill Acknowledge / Verify Button
                                                    Rectangle {
                                                        Layout.preferredWidth: 80
                                                        Layout.preferredHeight: 30
                                                        radius: 15
                                                        color: modelData.acknowledged ? Theme.bgMuted : Theme.primaryBg
                                                        border.width: modelData.acknowledged ? 1 : 0
                                                        border.color: Theme.border

                                                        Text {
                                                            anchors.centerIn: parent
                                                            text: modelData.acknowledged ? "Onaylı" : "Onayla"
                                                            color: modelData.acknowledged ? Theme.ink2 : Theme.primaryFg
                                                            font.family: Theme.sans
                                                            font.pixelSize: 11
                                                            font.weight: Theme.wMedium
                                                        }

                                                        MouseArea {
                                                            anchors.fill: parent
                                                            cursorShape: Qt.PointingHandCursor
                                                            onClicked: if (backend && !modelData.acknowledged) backend.acknowledgeEvent(modelData.id)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // =========================================================
                    // MODAL DRAWER FOR DEDICATED SUB-VIEWS (activeNavIndex 1..5)
                    // =========================================================
                    Rectangle {
                        visible: rootWindow.activeNavIndex > 0
                        anchors.fill: parent
                        anchors.margins: 16
                        radius: Theme.rLg
                        color: Theme.surface
                        border.width: 1
                        border.color: Theme.borderStrong

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 24
                            spacing: 16

                            // Sub-View Header with Blue Dot Eyebrow + Display Title + Return Pill
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 12

                                ColumnLayout {
                                    spacing: 4
                                    RowLayout {
                                        spacing: 7
                                        Rectangle {
                                            width: 6
                                            height: 6
                                            radius: 3
                                            color: Theme.signal
                                        }
                                        Text {
                                            text: {
                                                if (rootWindow.activeNavIndex === 1) return "RTSP & ONVIF Kamera Havuzu"
                                                if (rootWindow.activeNavIndex === 2) return "8-Tutamaçlı ROI & Doğal Dil Kural Motoru"
                                                if (rootWindow.activeNavIndex === 3) return "SHA-256 Mühürlü Adli Kanıt Kasası"
                                                if (rootWindow.activeNavIndex === 4) return "Yerel Ollama VLM & Çift Yönlü Telegram Rölesi"
                                                return "Kurumsal Lisans & Kapasite Yönetimi"
                                            }
                                            color: Theme.ink2
                                            font.family: Theme.sans
                                            font.pixelSize: 13
                                            font.weight: Theme.wMedium
                                        }
                                    }

                                    Text {
                                        text: {
                                            if (rootWindow.activeNavIndex === 1) return "Kameralar ve NVR Kanalları."
                                            if (rootWindow.activeNavIndex === 2) return "Olay Kuralları ve Bölge Stüdyosu."
                                            if (rootWindow.activeNavIndex === 3) return "Adli Olay Arşivi ve Kanıt Zinciri."
                                            if (rootWindow.activeNavIndex === 4) return "Ayarlar, Görsel AI ve Bildirimler."
                                            return "Cortex 2.4 Kurumsal Paketler."
                                        }
                                        color: Theme.ink
                                        font.family: Theme.sans
                                        font.pixelSize: 28
                                        font.weight: Theme.wDisplay
                                        font.letterSpacing: Theme.tracking(28)
                                    }
                                }

                                Item { Layout.fillWidth: true }

                                // Primary Solid Ink Pill: Back to Split Workbench
                                Rectangle {
                                    height: 40
                                    width: backPillTxt.implicitWidth + 28
                                    radius: 20
                                    color: backMouse.containsMouse ? Theme.primaryHover : Theme.primaryBg
                                    Text {
                                        id: backPillTxt
                                        anchors.centerIn: parent
                                        text: rootWindow.tr("← Genel Bakışa Dön", "← Back to Overview")
                                        color: Theme.primaryFg
                                        font.family: Theme.sans
                                        font.pixelSize: 12
                                        font.weight: Theme.wMedium
                                    }
                                    MouseArea {
                                        id: backMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: rootWindow.activeNavIndex = 0
                                    }
                                }
                            }

                            Rectangle {
                                Layout.fillWidth: true
                                height: 1
                                color: Theme.border
                            }

                            // Sub-View Content Cards Grid
                            GridLayout {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                columns: 2
                                rowSpacing: 14
                                columnSpacing: 14

                                Repeater {
                                    model: {
                                        if (rootWindow.activeNavIndex === 2 && backend && backend.rulesList && backend.rulesList.length > 0) {
                                            return backend.rulesList.slice(0, 4).map(function(r) {
                                                return {
                                                    badge: r.kindBadge,
                                                    title: r.name,
                                                    desc: r.prompt || ("Kamera: " + r.cameraName + " · Eşik: " + r.thresholdPct),
                                                    meta: "Soğuma: " + r.cooldownSec + " · Durum: " + (r.enabled ? "Etkin" : "Pasif"),
                                                    ruleId: r.id
                                                }
                                            })
                                        }
                                        if (rootWindow.activeNavIndex === 3 && backend && backend.events) {
                                            return backend.events.slice(0, 4).map(function(e) {
                                                return {
                                                    badge: e.confidenceText + " Güven",
                                                    title: e.ruleTitle + " · " + e.cameraName,
                                                    desc: e.summary,
                                                    meta: e.timeLabel + " · SHA-256 Kanıt Kilitli",
                                                    ruleId: ""
                                                }
                                            })
                                        }
                                        return [
                                            {
                                                badge: "CH-01 · Aktif",
                                                title: cameraPanelCard.primaryCam.name + " (" + cameraPanelCard.primaryCam.sourceLabel + ")",
                                                desc: "3-Katmanlı Hibrit Motor: Piksel hareket eşiği + 8-tutamaçlı çokgen ROI + Yerel Ollama VLM doğrulaması.",
                                                meta: "H.264 TCP · 4.0 FPS · AES-256-GCM Kasa",
                                                ruleId: ""
                                            },
                                            {
                                                badge: "Ollama VLM · Hazır",
                                                title: "Yerel Görsel Zekâ (" + (backend ? backend.vlmModelName : "gemma3:4b") + ")",
                                                desc: "Bulut maliyeti olmadan %100 şirket içi (on-premise) görsel sahne muhakemesi ve Türkçe doğal dil kural eşleşmesi.",
                                                meta: "Ortalama Yanıt: " + (backend ? backend.avgLatencyText : "0.4s") + " · Sıfır Veri Sızıntısı",
                                                ruleId: ""
                                            },
                                            {
                                                badge: "Telegram Rölesi",
                                                title: backend ? backend.telegramSummary : "@intelligentcortexbot · Hazır",
                                                desc: "Olay anında yüksek çözünürlüklü kanıt karesi, kural açıklaması ve 15 saniyelik hızlı geçiş izni komutu.",
                                                meta: "Çift Yönlü Bot API · Çoklu Yönetici Hattı",
                                                ruleId: ""
                                            },
                                            {
                                                badge: backend ? backend.planLabel : "CORTEX ULTRA",
                                                title: backend ? backend.planBadge : "CORTEX ULTRA · 32 KAMERA / 128 KURAL",
                                                desc: "Çoklu çalışma alanı (Multi-Tenant), SHA-256 adli kanıt zinciri ve 8 sektörel hazır kurulum paketi aktif.",
                                                meta: "Organizasyon: " + (backend ? backend.workspaceName : "Merkez Saha İstasyonu"),
                                                ruleId: ""
                                            }
                                        ]
                                    }

                                    delegate: Rectangle {
                                        required property var modelData
                                        Layout.fillWidth: true
                                        Layout.fillHeight: true
                                        radius: 20
                                        color: Theme.bgSubtle
                                        border.width: 1
                                        border.color: Theme.border

                                        ColumnLayout {
                                            anchors.fill: parent
                                            anchors.margins: 18
                                            spacing: 8

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 6
                                                Rectangle {
                                                    width: 6
                                                    height: 6
                                                    radius: 3
                                                    color: Theme.signal
                                                }
                                                Text {
                                                    text: modelData.badge
                                                    color: Theme.ink2
                                                    font.family: Theme.sans
                                                    font.pixelSize: 12
                                                    font.weight: Theme.wMedium
                                                }
                                                Item { Layout.fillWidth: true }
                                            }

                                            Text {
                                                Layout.fillWidth: true
                                                text: modelData.title
                                                color: Theme.ink
                                                font.family: Theme.sans
                                                font.pixelSize: 17
                                                font.weight: Theme.wDisplay
                                                font.letterSpacing: Theme.tight(17)
                                                elide: Text.ElideRight
                                            }

                                            Text {
                                                Layout.fillWidth: true
                                                text: modelData.desc
                                                color: Theme.ink2
                                                font.family: Theme.sans
                                                font.pixelSize: 12
                                                wrapMode: Text.WordWrap
                                            }

                                            Item { Layout.fillHeight: true }

                                            Rectangle {
                                                Layout.fillWidth: true
                                                height: 1
                                                color: Theme.border
                                            }

                                            RowLayout {
                                                Layout.fillWidth: true
                                                Text {
                                                    text: modelData.meta
                                                    color: Theme.ink3
                                                    font.family: Theme.mono
                                                    font.pixelSize: 11
                                                }
                                                Item { Layout.fillWidth: true }
                                                Text {
                                                    text: "Detayları Gör →"
                                                    color: Theme.ink
                                                    font.family: Theme.sans
                                                    font.pixelSize: 12
                                                    font.weight: Theme.wMedium
                                                }
                                            }
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                if (modelData.ruleId && backend) {
                                                    backend.toggleRuleEnabled(modelData.ruleId)
                                                } else {
                                                    rootWindow.activeNavIndex = 0
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // =====================================================================
        // 3. COMMAND PALETTE MODAL OVERLAY (Ctrl+K)
        // =====================================================================
        Rectangle {
            visible: rootWindow.commandPaletteOpen
            anchors.fill: parent
            color: Theme.scrim

            MouseArea {
                anchors.fill: parent
                onClicked: rootWindow.commandPaletteOpen = false
            }

            Rectangle {
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: parent.top
                anchors.topMargin: 100
                width: 540
                height: 320
                radius: Theme.rLg
                color: Theme.surface
                border.width: 1
                border.color: Theme.borderStrong

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 18
                    spacing: 10

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8
                        Rectangle {
                            width: 6
                            height: 6
                            radius: 3
                            color: Theme.signal
                        }
                        Text {
                            text: rootWindow.tr("Komut Paleti · Hızlı Eylemler", "Command Palette · Quick Actions")
                            color: Theme.ink
                            font.family: Theme.sans
                            font.pixelSize: 14
                            font.weight: Theme.wMedium
                        }
                        Item { Layout.fillWidth: true }
                        Rectangle {
                            height: 22
                            width: 42
                            radius: 11
                            color: Theme.bgMuted
                            Text {
                                anchors.centerIn: parent
                                text: "ESC"
                                color: Theme.ink3
                                font.family: Theme.mono
                                font.pixelSize: 10
                            }
                        }
                    }

                    Repeater {
                        model: [
                            { label: "3D Sinematik Açılış Sahnesini Oynat", action: "splash" },
                            { label: "Tema Değiştir (Açık / Koyu Görünüm)", action: "theme" },
                            { label: "CH-01 kapı önü · 15 Saniye Geçiş İzni Ver", action: "pass" },
                            { label: "ROI Bölge Çizimlerini Aç / Kapat", action: "roi" },
                            { label: "Web Yönetim Merkezini Tarayıcıda Aç (Port 8766)", action: "admin" }
                        ]

                        delegate: Rectangle {
                            required property var modelData
                            Layout.fillWidth: true
                            Layout.preferredHeight: 42
                            radius: 12
                            color: cmdItemMouse.containsMouse ? Theme.bgMuted : Theme.bgSubtle
                            border.width: 1
                            border.color: Theme.border

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 14
                                anchors.rightMargin: 14
                                Text {
                                    text: modelData.label
                                    color: Theme.ink
                                    font.family: Theme.sans
                                    font.pixelSize: 13
                                    font.weight: Theme.wBody
                                }
                                Item { Layout.fillWidth: true }
                                Text {
                                    text: "→"
                                    color: Theme.ink3
                                    font.family: Theme.sans
                                    font.pixelSize: 13
                                }
                            }

                            MouseArea {
                                id: cmdItemMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    rootWindow.commandPaletteOpen = false
                                    if (modelData.action === "splash") startupOverlay.startSequence()
                                    else if (modelData.action === "theme" && backend) backend.toggleTheme()
                                    else if (modelData.action === "pass" && backend) backend.grantPass("06c256561cc943948c714c45addbcd47", 15)
                                    else if (modelData.action === "roi") rootWindow.showRoiOverlay = !rootWindow.showRoiOverlay
                                    else if (modelData.action === "admin" && backend) backend.openAdminPanel()
                                }
                            }
                        }
                    }
                }
            }
        }

        // =====================================================================
        // 4. TOAST NOTIFICATION PILL BANNER
        // =====================================================================
        Rectangle {
            visible: rootWindow.toastMessage.length > 0
            anchors.bottom: parent.bottom
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.bottomMargin: 24
            height: 40
            width: toastRow.implicitWidth + 32
            radius: 20
            color: Theme.primaryBg

            RowLayout {
                id: toastRow
                anchors.centerIn: parent
                spacing: 8
                Rectangle {
                    width: 6
                    height: 6
                    radius: 3
                    color: Theme.signal
                }
                Text {
                    id: toastText
                    text: rootWindow.toastMessage
                    color: Theme.primaryFg
                    font.family: Theme.sans
                    font.pixelSize: 12
                    font.weight: Theme.wMedium
                }
            }
        }

        // =====================================================================
        // 5. FULL-SCREEN 3D CINEMATIC STARTUP OVERLAY
        // =====================================================================
        CortexStartup3D {
            id: startupOverlay
            anchors.fill: parent
        }
    }
}
