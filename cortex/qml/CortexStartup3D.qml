import QtQuick
import QtQuick.Layouts
import QtQuick3D
import QtQuick3D.Helpers
import Cortex3DPrimitives 1.0

Item {
    id: startupRoot
    property bool active: false
    property bool isDark: Theme.dark
    property real progress: 0.0
    property int stepIndex: 0
    signal startupFinished()

    visible: active || opacity > 0.01
    opacity: active ? 1.0 : 0.0
    Behavior on opacity {
        NumberAnimation { duration: Theme.normal; easing.type: Easing.OutCubic }
    }

    readonly property var stepTitles: [
        "01 · Direct3D 11 RHI ve yerel görsel motor başlatılıyor",
        "02 · Uzamsal 3D çekirdek ve optik kafes oluşturuluyor",
        "03 · 3D Cortex Core ve yörünge halkaları kilitleniyor",
        "04 · Ağ düğümleri ve RTSP kamera havuzu doğrulanıyor",
        "05 · SHA-256 adli kasa ve Ollama VLM bağlantısı aktif",
        "06 · IPScans Cortex 2.4.0 komuta merkezi hazır",
        "07 · Operasyonel çalışma alanına geçiş yapılıyor"
    ]

    function startSequence() {
        startupRoot.progress = 0.0
        startupRoot.stepIndex = 0
        startupRoot.active = true
        seqTimer.restart()
    }

    function freezeAtProgress(pVal) {
        seqTimer.stop()
        startupRoot.progress = pVal
        startupRoot.stepIndex = Math.min(6, Math.floor(pVal * 7))
        startupRoot.active = true
    }

    function skipSequence() {
        seqTimer.stop()
        startupRoot.active = false
        startupRoot.startupFinished()
    }

    Timer {
        id: seqTimer
        interval: 32
        repeat: true
        running: false
        onTriggered: {
            startupRoot.progress = Math.min(1.0, startupRoot.progress + 0.014)
            var idx = Math.min(6, Math.floor(startupRoot.progress * 7))
            startupRoot.stepIndex = idx
            if (startupRoot.progress >= 1.0) {
                seqTimer.stop()
                startupRoot.active = false
                startupRoot.startupFinished()
            }
        }
    }

    Rectangle {
        anchors.fill: parent
        color: Theme.bg
    }

    // Subtle radial dash-field background matching ipscans.com hero
    Canvas {
        id: dashFieldCanvas
        anchors.fill: parent
        property bool darkMode: startupRoot.isDark
        onDarkModeChanged: requestPaint()
        Component.onCompleted: requestPaint()
        onPaint: {
            var ctx = getContext("2d")
            ctx.reset()
            var cx = width * 0.5
            var cy = height * 0.44
            var rings = 11
            for (var r = 1; r <= rings; r++) {
                var rad = r * Math.min(width, height) * 0.048
                var count = r * 14
                for (var i = 0; i < count; i++) {
                    var ang = (i / count) * Math.PI * 2 + r * 0.17
                    var x1 = cx + Math.cos(ang) * rad
                    var y1 = cy + Math.sin(ang) * rad * 0.78
                    var x2 = cx + Math.cos(ang) * (rad + 6)
                    var y2 = cy + Math.sin(ang) * (rad + 6) * 0.78
                    ctx.strokeStyle = (i % 3 === 0)
                        ? (darkMode ? "rgba(122, 92, 255, 0.20)" : "rgba(122, 92, 255, 0.16)")
                        : (darkMode ? "rgba(76, 130, 255, 0.22)" : "rgba(47, 107, 255, 0.18)")
                    ctx.lineWidth = 1.4
                    ctx.beginPath()
                    ctx.moveTo(x1, y1)
                    ctx.lineTo(x2, y2)
                    ctx.stroke()
                }
            }
        }
    }

    View3D {
        id: splashView3D
        anchors.fill: parent
        camera: splashCam

        environment: ExtendedSceneEnvironment {
            clearColor: startupRoot.isDark ? "#07080B" : "#FFFFFF"
            backgroundMode: SceneEnvironment.Transparent
            antialiasingMode: SceneEnvironment.MSAA
            antialiasingQuality: SceneEnvironment.VeryHigh
            glowEnabled: true
            glowStrength: startupRoot.isDark ? 1.12 : 0.55
            glowIntensity: startupRoot.isDark ? 0.82 : 0.35
            glowBloom: startupRoot.isDark ? 0.30 : 0.15
            glowBlendMode: ExtendedSceneEnvironment.Additive
            tonemapMode: SceneEnvironment.TonemapModeFilmic
            exposure: 1.02
        }

        PerspectiveCamera {
            id: splashCam
            position: Qt.vector3d(0, 75 * (1.0 - startupRoot.progress * 0.55), 680 - startupRoot.progress * 230)
            eulerRotation.x: -5 * (1.0 - startupRoot.progress * 0.55)
            fieldOfView: 45 - startupRoot.progress * 6
            clipNear: 10
            clipFar: 2500
        }

        DirectionalLight {
            eulerRotation.x: -38
            eulerRotation.y: -28
            brightness: (startupRoot.isDark ? 2.0 : 2.5) * Math.min(1.0, startupRoot.progress * 2.2)
            color: "#FFFFFF"
        }

        PointLight {
            position: Qt.vector3d(200 * Math.cos(startupRoot.progress * 6.28), 110, 180 * Math.sin(startupRoot.progress * 6.28))
            brightness: 3.0 * Math.min(1.0, startupRoot.progress * 1.8)
            color: "#2F6BFF"
            quadraticFade: 0.00022
        }

        PointLight {
            position: Qt.vector3d(0, -100, 120)
            brightness: 1.5
            color: "#7A5CFF"
            quadraticFade: 0.00025
        }

        // 3D Floor Grid
        Model {
            position: Qt.vector3d(0, -125, 0)
            geometry: RadarGrid3DGeometry {
                id: splashFloorGeo
                Component.onCompleted: splashFloorGeo.rebuild(150.0, 420.0)
            }
            materials: [
                PrincipledMaterial {
                    baseColor: startupRoot.isDark ? "#22FFFFFF" : "#180B0D12"
                    opacity: startupRoot.isDark ? 0.25 : 0.18
                    alphaMode: PrincipledMaterial.Blend
                    lighting: PrincipledMaterial.NoLighting
                }
            ]
        }

        // Central 3D Cortex Assembly
        Node {
            id: splashCoreAssembly
            position: Qt.vector3d(0, 32, 0)
            eulerRotation.y: startupRoot.progress * 240.0
            scale: Qt.vector3d(0.72 + startupRoot.progress * 0.26, 0.72 + startupRoot.progress * 0.26, 0.72 + startupRoot.progress * 0.26)

            // Inner metallic signal core sphere
            Model {
                source: "#Sphere"
                scale: Qt.vector3d(0.54, 0.54, 0.54)
                materials: [
                    PrincipledMaterial {
                        baseColor: "#2F6BFF"
                        metalness: 0.90
                        roughness: 0.14
                        emissiveFactor: Qt.vector3d(0.18, 0.42, 0.95)
                    }
                ]
            }

            // 3D Octahedron Wire Lattice
            Model {
                eulerRotation.x: startupRoot.progress * 120
                eulerRotation.z: startupRoot.progress * 90
                geometry: OctaWireLatticeGeometry {
                    id: splashOctaGeo
                    Component.onCompleted: splashOctaGeo.rebuild(78.0)
                }
                materials: [
                    PrincipledMaterial {
                        baseColor: startupRoot.isDark ? "#F5F7FA" : "#0B0D12"
                        emissiveFactor: startupRoot.isDark ? Qt.vector3d(0.85, 0.90, 1.0) : Qt.vector3d(0.04, 0.05, 0.08)
                        lighting: PrincipledMaterial.NoLighting
                    }
                ]
            }

            // Orbital Ring 1 (Primary Ink / Alabaster Ring)
            Model {
                eulerRotation.x: 68 - startupRoot.progress * 44
                eulerRotation.y: startupRoot.progress * 180
                geometry: TorusRingGeometry {
                    id: splashRing1
                    Component.onCompleted: splashRing1.rebuild(112.0, 1.9, 84, 16)
                }
                materials: [
                    PrincipledMaterial {
                        baseColor: startupRoot.isDark ? "#F5F7FA" : "#0B0D12"
                        metalness: 0.90
                        roughness: 0.14
                        emissiveFactor: startupRoot.isDark ? Qt.vector3d(0.45, 0.50, 0.60) : Qt.vector3d(0.04, 0.05, 0.07)
                    }
                ]
            }

            // Orbital Ring 2 (Signal Blue Ring)
            Model {
                eulerRotation.x: -52 + startupRoot.progress * 32
                eulerRotation.z: 35 - startupRoot.progress * 35
                geometry: TorusRingGeometry {
                    id: splashRing2
                    Component.onCompleted: splashRing2.rebuild(142.0, 1.5, 84, 14)
                }
                materials: [
                    PrincipledMaterial {
                        baseColor: "#2F6BFF"
                        metalness: 0.88
                        roughness: 0.18
                        emissiveFactor: Qt.vector3d(0.18, 0.42, 0.95)
                    }
                ]
            }

            // Orbital Ring 3 (Brand Violet Precision Ring)
            Model {
                eulerRotation.y: -startupRoot.progress * 150
                eulerRotation.z: 18
                geometry: TorusRingGeometry {
                    id: splashRing3
                    Component.onCompleted: splashRing3.rebuild(172.0, 1.1, 96, 12)
                }
                materials: [
                    PrincipledMaterial {
                        baseColor: "#7A5CFF"
                        metalness: 0.85
                        roughness: 0.24
                        emissiveFactor: Qt.vector3d(0.28, 0.22, 0.65)
                    }
                ]
            }
        }
    }

    // Top Header Bar inside Startup Overlay
    RowLayout {
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.margins: 28
        spacing: 10

        // Eyebrow blue dot + platform text matching ipscans.com
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
            text: "IPScans Cortex 2.4 · Kurumsal Kamera Görsel AI Platformu"
            color: Theme.ink2
            font.family: Theme.sans
            font.pixelSize: 13
            font.weight: Theme.wMedium
        }

        Item { Layout.fillWidth: true }

        // Secondary Pill Skip Button
        Rectangle {
            height: 36
            width: skipRow.implicitWidth + 28
            radius: 18
            color: skipMouse.containsMouse ? Theme.bgMuted : Theme.surface
            border.width: 1
            border.color: Theme.borderStrong

            RowLayout {
                id: skipRow
                anchors.centerIn: parent
                spacing: 8
                Text {
                    text: "Sahneyi Atla"
                    color: Theme.ink
                    font.family: Theme.sans
                    font.pixelSize: 12
                    font.weight: Theme.wMedium
                }
                Rectangle {
                    height: 18
                    width: 34
                    radius: 9
                    color: Theme.bgMuted
                    Text {
                        anchors.centerIn: parent
                        text: "ESC"
                        color: Theme.ink3
                        font.family: Theme.mono
                        font.pixelSize: 10
                        font.weight: Font.Medium
                    }
                }
            }

            MouseArea {
                id: skipMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: startupRoot.skipSequence()
            }
        }
    }

    // Bottom Brand & Progress Card (24px radius, 1px hairline border, ipscans.com editorial typography)
    Rectangle {
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: 36
        width: 640
        height: 148
        radius: Theme.rLg
        color: Theme.surface
        border.width: 1
        border.color: Theme.borderStrong

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 22
            spacing: 8

            // Eyebrow with 6px signal blue dot
            RowLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 8
                Rectangle {
                    width: 12
                    height: 12
                    radius: 6
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
                    text: "Cortex 2.4 · Uzamsal 3D Zekâ Çekirdeği"
                    color: Theme.ink2
                    font.family: Theme.sans
                    font.pixelSize: 13
                    font.weight: Theme.wMedium
                }
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "Her kameraya kurumsal görsel zekâ."
                color: Theme.ink
                font.family: Theme.sans
                font.pixelSize: 24
                font.weight: Theme.wDisplay
                font.letterSpacing: Theme.tracking(24)
            }

            // Progress Bar with IPScans Brand Gradient (#2f6bff -> #00c2ff -> #7a5cff)
            Rectangle {
                Layout.fillWidth: true
                height: 6
                radius: 3
                color: Theme.bgMuted
                clip: true

                Rectangle {
                    width: parent.width * startupRoot.progress
                    height: parent.height
                    radius: 3
                    gradient: Gradient {
                        orientation: Gradient.Horizontal
                        GradientStop { position: 0.0; color: Theme.brandA }
                        GradientStop { position: 0.48; color: Theme.brandB }
                        GradientStop { position: 1.0; color: Theme.brandC }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: startupRoot.stepTitles[startupRoot.stepIndex]
                    color: Theme.ink3
                    font.family: Theme.sans
                    font.pixelSize: 12
                }
                Item { Layout.fillWidth: true }
                Text {
                    text: Math.round(startupRoot.progress * 100) + "%"
                    color: Theme.ink
                    font.family: Theme.mono
                    font.pixelSize: 12
                    font.weight: Font.Medium
                }
            }
        }
    }
}
