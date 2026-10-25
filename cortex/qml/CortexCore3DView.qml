import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick3D
import QtQuick3D.Helpers
import Cortex3DPrimitives 1.0

Item {
    id: root

    property bool isDark: Theme.dark
    property var topologyNodes: []
    property string selectedNodeId: "core"
    property bool viewMode3D: !show2DFallback
    property bool show2DFallback: false
    property bool autoRotate: true
    property alias autoOrbit: root.autoRotate
    property real simTime: 0.0
    signal nodeClicked(string nodeId, string nodeTitle)

    // Orbit camera spherical coordinates
    property real targetYaw: 24.0
    property real targetPitch: 20.0
    property real targetDistance: 615.0
    property real currentYaw: 24.0
    property real currentPitch: 20.0
    property real currentDistance: 615.0

    // Projected 2D coordinates for each 3D node
    property var projectedCoords: []

    readonly property color panelBg: root.isDark ? "#07080B" : "#F7F8FA"
    readonly property color hudPillBg: root.isDark ? "#E6141821" : "#F2FFFFFF"
    readonly property color hudBorder: Theme.borderStrong

    function alignYToVector(vec) {
        var len = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z)
        if (len < 0.0001) return Qt.quaternion(1, 0, 0, 0)
        var dx = vec.x / len
        var dy = vec.y / len
        var dz = vec.z / len
        if (dy < -0.9999) return Qt.quaternion(0, 1, 0, 0)
        var w = 1.0 + dy
        var x = dz
        var y = 0.0
        var z = -dx
        var norm = Math.sqrt(w * w + x * x + y * y + z * z)
        return Qt.quaternion(w / norm, x / norm, y / norm, z / norm)
    }

    function zoomIn() {
        targetDistance = Math.max(300.0, targetDistance - 55.0)
    }

    function zoomOut() {
        targetDistance = Math.min(820.0, targetDistance + 55.0)
    }

    function resetCamera() {
        targetYaw = 24.0
        targetPitch = 20.0
        targetDistance = 615.0
        selectedNodeId = "core"
    }

    function focusNode(nodeObj) {
        if (!nodeObj) {
            resetCamera()
            return
        }
        selectedNodeId = nodeObj.nodeId
        var angleDeg = Math.atan2(nodeObj.posX, nodeObj.posZ) * (180.0 / Math.PI)
        targetYaw = angleDeg * 0.55
        targetPitch = nodeObj.posY > 0 ? 24.0 : 12.0
    }

    readonly property var selectedNodeData: {
        if (selectedNodeId === "core" || !topologyNodes || topologyNodes.length === 0) {
            return {
                nodeId: "core",
                title: "Cortex 3D Core · Merkezi Zekâ Çekirdeği",
                subtitle: "3-Katmanlı Hibrit Motor (Piksel + 8-Tutamaçlı ROI + Yerel VLM) · Direct3D 11",
                metric: "127.0.0.1:8765 · AES-256-GCM Kasa · 60 FPS",
                status: "Çevrimiçi",
                accentColor: "#2F6BFF"
            }
        }
        for (var i = 0; i < topologyNodes.length; ++i) {
            if (topologyNodes[i].nodeId === selectedNodeId) {
                return topologyNodes[i]
            }
        }
        return topologyNodes[0]
    }

    FrameAnimation {
        running: root.visible && root.viewMode3D
        onTriggered: {
            var dt = Math.min(frameTime, 0.05)
            if (!Theme.reduceMotion) {
                root.simTime += dt
                if (root.autoRotate && !orbitDrag.active) {
                    root.targetYaw = (root.targetYaw + dt * 9.5) % 360.0
                }
            }

            var alpha = 1.0 - Math.exp(-9.0 * dt)
            root.currentYaw += (root.targetYaw - root.currentYaw) * alpha
            root.currentPitch += (root.targetPitch - root.currentPitch) * alpha
            root.currentDistance += (root.targetDistance - root.currentDistance) * alpha

            var yawRad = root.currentYaw * (Math.PI / 180.0)
            var pitchRad = root.currentPitch * (Math.PI / 180.0)
            var cosPitch = Math.cos(pitchRad)

            mainCamera.position = Qt.vector3d(
                root.currentDistance * Math.sin(yawRad) * cosPitch,
                root.currentDistance * Math.sin(pitchRad) + 12.0,
                root.currentDistance * Math.cos(yawRad) * cosPitch
            )
            mainCamera.lookAt(Qt.vector3d(0, -6, 0))

            // Project 3D node positions to 2D viewport for clean callout tags
            if (root.topologyNodes && root.topologyNodes.length > 0 && view3d.width > 0) {
                var arr = []
                for (var i = 0; i < root.topologyNodes.length; ++i) {
                    var n = root.topologyNodes[i]
                    var p2d = view3d.mapFrom3DScene(Qt.vector3d(n.posX, n.posY + 22.0, n.posZ))
                    arr.push({
                        x: p2d.x,
                        y: p2d.y,
                        z: p2d.z,
                        visible: p2d.x > 16 && p2d.x < view3d.width - 16 && p2d.y > 32 && p2d.y < view3d.height - 72
                    })
                }
                root.projectedCoords = arr
            }
        }
    }

    // =========================================================================
    // 1. REAL GPU 3D SCENE (QtQuick3D View3D + ExtendedSceneEnvironment)
    // =========================================================================
    Rectangle {
        id: stage3DContainer
        anchors.fill: parent
        radius: Theme.rMd
        color: root.panelBg
        visible: root.viewMode3D
        clip: true

        // Subtle radial dash-field accent behind 3D view
        Canvas {
            id: stageDashCanvas
            anchors.fill: parent
            property bool darkMode: root.isDark
            onDarkModeChanged: requestPaint()
            Component.onCompleted: requestPaint()
            onPaint: {
                var ctx = getContext("2d")
                ctx.reset()
                var cx = width * 0.5
                var cy = height * 0.45
                for (var r = 1; r <= 7; r++) {
                    var rad = r * Math.min(width, height) * 0.068
                    var count = r * 10
                    for (var i = 0; i < count; i++) {
                        var ang = (i / count) * Math.PI * 2 + r * 0.25
                        var x1 = cx + Math.cos(ang) * rad
                        var y1 = cy + Math.sin(ang) * rad * 0.72
                        var x2 = cx + Math.cos(ang) * (rad + 4.5)
                        var y2 = cy + Math.sin(ang) * (rad + 4.5) * 0.72
                        ctx.strokeStyle = darkMode ? "rgba(76, 130, 255, 0.14)" : "rgba(47, 107, 255, 0.14)"
                        ctx.lineWidth = 1.2
                        ctx.beginPath()
                        ctx.moveTo(x1, y1)
                        ctx.lineTo(x2, y2)
                        ctx.stroke()
                    }
                }
            }
        }

        View3D {
            id: view3d
            anchors.fill: parent
            camera: mainCamera

            environment: ExtendedSceneEnvironment {
                backgroundMode: SceneEnvironment.Transparent
                clearColor: root.panelBg
                antialiasingMode: SceneEnvironment.MSAA
                antialiasingQuality: SceneEnvironment.High
                tonemapMode: SceneEnvironment.TonemapModeFilmic
                glowEnabled: true
                glowIntensity: root.isDark ? 1.15 : 0.48
                glowBloom: root.isDark ? 0.36 : 0.14
                glowUseBicubicUpscale: true
                vignetteEnabled: root.isDark
                vignetteStrength: 0.25
            }

            PerspectiveCamera {
                id: mainCamera
                position: Qt.vector3d(185, 165, 470)
                fieldOfView: 40.0
                clipNear: 15.0
                clipFar: 3000.0
            }

            // Key Studio Light
            DirectionalLight {
                eulerRotation: Qt.vector3d(-38, 32, 0)
                brightness: root.isDark ? 2.1 : 2.6
                color: "#FFFFFF"
                ambientColor: root.isDark ? "#1C1E26" : "#8A94A6"
            }

            // Counter Rim Light (Signal Blue)
            DirectionalLight {
                eulerRotation: Qt.vector3d(32, -142, 0)
                brightness: root.isDark ? 1.2 : 1.5
                color: "#2F6BFF"
            }

            // Central Cortex Core PointLight
            PointLight {
                position: Qt.vector3d(0, 0, 0)
                brightness: (root.isDark ? 4.4 : 3.2) + 0.7 * Math.sin(root.simTime * 2.6)
                color: "#2F6BFF"
                quadraticFade: 0.00014
            }

            // 3D Spatial Radar Floor Grid
            Model {
                position: Qt.vector3d(0, -116, 0)
                geometry: RadarGrid3DGeometry {}
                materials: [
                    PrincipledMaterial {
                        lighting: PrincipledMaterial.NoLighting
                        baseColor: root.isDark ? "#26FFFFFF" : "#220B0D12"
                        opacity: root.isDark ? 0.22 : 0.16
                        alphaMode: PrincipledMaterial.Blend
                    }
                ]
            }

            // Outer Floor Accent Torus Ring
            Model {
                position: Qt.vector3d(0, -116, 0)
                eulerRotation: Qt.vector3d(0, root.simTime * 4.0, 0)
                geometry: TorusRingGeometry {
                    radius: 255.0
                    tubeRadius: 0.9
                }
                materials: [
                    PrincipledMaterial {
                        baseColor: "#2F6BFF"
                        metalness: 0.8
                        roughness: 0.2
                        opacity: root.isDark ? 0.32 : 0.38
                        alphaMode: PrincipledMaterial.Blend
                        emissiveFactor: Qt.vector3d(0.08, 0.22, 0.52)
                    }
                ]
            }

            // =================================================================
            // CENTRAL 3D CORTEX CORE ASSEMBLY
            // =================================================================
            Node {
                id: cortexCoreAssembly
                position: Qt.vector3d(0, 0, 0)

                // 1. Inner Singularity Signal Sphere
                Model {
                    source: "#Sphere"
                    scale: Qt.vector3d(0.46, 0.46, 0.46)
                    materials: [
                        PrincipledMaterial {
                            baseColor: "#2F6BFF"
                            metalness: 0.88
                            roughness: 0.12
                            emissiveFactor: Qt.vector3d(0.22, 0.48, 1.0)
                        }
                    ]
                }

                // 2. 3D Octahedral Geodesic Wireframe Lattice Cage
                Model {
                    eulerRotation: Qt.vector3d(root.simTime * 11.0, root.simTime * 19.0, 0)
                    geometry: OctaWireLatticeGeometry {
                        size: 62.0
                    }
                    materials: [
                        PrincipledMaterial {
                            lighting: PrincipledMaterial.NoLighting
                            baseColor: root.isDark ? "#F5F7FA" : "#0B0D12"
                            emissiveFactor: root.isDark ? Qt.vector3d(0.85, 0.92, 1.0) : Qt.vector3d(0.04, 0.05, 0.08)
                        }
                    ]
                }

                // 3. Inner Gyroscope Torus Ring (Radius 76)
                Model {
                    eulerRotation: Qt.vector3d(64.0, root.simTime * 32.0, 18.0)
                    geometry: TorusRingGeometry {
                        radius: 76.0
                        tubeRadius: 2.1
                    }
                    materials: [
                        PrincipledMaterial {
                            baseColor: root.isDark ? "#F5F7FA" : "#0B0D12"
                            metalness: 0.88
                            roughness: 0.16
                            emissiveFactor: root.isDark ? Qt.vector3d(0.42, 0.55, 0.72) : Qt.vector3d(0.04, 0.05, 0.08)
                        }
                    ]
                }

                // 4. Middle Counter-Rotating Gimbal Torus Ring (Radius 96)
                Model {
                    eulerRotation: Qt.vector3d(-38.0, -root.simTime * 24.0, root.simTime * 14.0)
                    geometry: TorusRingGeometry {
                        radius: 96.0
                        tubeRadius: 1.7
                    }
                    materials: [
                        PrincipledMaterial {
                            baseColor: "#2F6BFF"
                            metalness: 0.86
                            roughness: 0.18
                            emissiveFactor: Qt.vector3d(0.18, 0.42, 0.95)
                        }
                    ]
                }

                // 5. Outer Precision Equatorial Torus Ring (Radius 118)
                Model {
                    eulerRotation: Qt.vector3d(16.0, root.simTime * 12.0, -24.0)
                    geometry: TorusRingGeometry {
                        radius: 118.0
                        tubeRadius: 1.2
                    }
                    materials: [
                        PrincipledMaterial {
                            baseColor: "#7A5CFF"
                            metalness: 0.86
                            roughness: 0.22
                            emissiveFactor: Qt.vector3d(0.24, 0.18, 0.55)
                        }
                    ]
                }
            }

            // =================================================================
            // 6 SPATIALLY SEPARATED 3D DEVICE NODES & VOLUMETRIC LINK BEAMS
            // =================================================================
            Repeater3D {
                model: root.topologyNodes ? root.topologyNodes.length : 0

                Node {
                    id: nodeDelegate
                    required property int index
                    readonly property var itemData: root.topologyNodes[index] || ({
                        nodeId: "", title: "", posX: 150, posY: 0, posZ: 0,
                        accentColor: "#2F6BFF", nodeType: "camera", speed: 0.65
                    })
                    readonly property vector3d posVec: Qt.vector3d(itemData.posX, itemData.posY, itemData.posZ)
                    readonly property real dist: Math.sqrt(posVec.x * posVec.x + posVec.y * posVec.y + posVec.z * posVec.z)
                    readonly property color accentCol: Theme.nodeAccent(itemData.nodeType || "camera")
                    readonly property bool isSelected: root.selectedNodeId === itemData.nodeId

                    // Animated packet travel factors t1, t2 in [0.18, 0.92]
                    readonly property real rawT1: (root.simTime * (itemData.speed || 0.65) + index * 0.19) % 1.0
                    readonly property real rawT2: (root.simTime * (itemData.speed || 0.65) + index * 0.19 + 0.5) % 1.0
                    readonly property real t1: 0.22 + rawT1 * 0.72
                    readonly property real t2: 0.94 - rawT2 * 0.72

                    PrincipledMaterial {
                        id: nodePbrMat
                        baseColor: nodeDelegate.accentCol
                        metalness: 0.80
                        roughness: 0.18
                        emissiveFactor: Qt.vector3d(
                            nodeDelegate.accentCol.r * (nodeDelegate.isSelected ? 0.85 : 0.45),
                            nodeDelegate.accentCol.g * (nodeDelegate.isSelected ? 0.85 : 0.45),
                            nodeDelegate.accentCol.b * (nodeDelegate.isSelected ? 0.85 : 0.45)
                        )
                    }

                    PrincipledMaterial {
                        id: nodeChassisMat
                        baseColor: root.isDark ? "#141821" : "#1E2433"
                        metalness: 0.90
                        roughness: 0.18
                        specularAmount: 0.9
                    }

                    // 1. 3D Volumetric Link Beam (Core <-> Node)
                    Model {
                        source: "#Cylinder"
                        position: Qt.vector3d(nodeDelegate.posVec.x * 0.54, nodeDelegate.posVec.y * 0.54, nodeDelegate.posVec.z * 0.54)
                        rotation: root.alignYToVector(nodeDelegate.posVec)
                        scale: Qt.vector3d(
                            nodeDelegate.isSelected ? 0.024 : 0.013,
                            (nodeDelegate.dist * 0.82) / 100.0,
                            nodeDelegate.isSelected ? 0.024 : 0.013
                        )
                        materials: [
                            PrincipledMaterial {
                                baseColor: nodeDelegate.accentCol
                                opacity: nodeDelegate.isSelected ? 0.78 : (root.isDark ? 0.34 : 0.42)
                                alphaMode: PrincipledMaterial.Blend
                                emissiveFactor: Qt.vector3d(
                                    nodeDelegate.accentCol.r * 0.38,
                                    nodeDelegate.accentCol.g * 0.38,
                                    nodeDelegate.accentCol.b * 0.38
                                )
                            }
                        ]
                    }

                    // 2. Traveling 3D Data Packet Sphere #1 (Inbound/Outbound)
                    Model {
                        source: "#Sphere"
                        position: Qt.vector3d(
                            nodeDelegate.posVec.x * nodeDelegate.t1,
                            nodeDelegate.posVec.y * nodeDelegate.t1,
                            nodeDelegate.posVec.z * nodeDelegate.t1
                        )
                        scale: Qt.vector3d(0.085, 0.085, 0.085)
                        materials: [nodePbrMat]
                    }

                    // 3. Traveling 3D Data Packet Sphere #2 (Counter-Stream)
                    Model {
                        source: "#Sphere"
                        position: Qt.vector3d(
                            nodeDelegate.posVec.x * nodeDelegate.t2,
                            nodeDelegate.posVec.y * nodeDelegate.t2,
                            nodeDelegate.posVec.z * nodeDelegate.t2
                        )
                        scale: Qt.vector3d(0.065, 0.065, 0.065)
                        materials: [nodePbrMat]
                    }

                    // 4. Vertical Drop Line to 3D Radar Floor Grid
                    Model {
                        source: "#Cylinder"
                        position: Qt.vector3d(
                            nodeDelegate.posVec.x,
                            (nodeDelegate.posVec.y - 116.0) * 0.5,
                            nodeDelegate.posVec.z
                        )
                        scale: Qt.vector3d(0.007, Math.abs(nodeDelegate.posVec.y + 116.0) / 100.0, 0.007)
                        materials: [
                            PrincipledMaterial {
                                lighting: PrincipledMaterial.NoLighting
                                baseColor: nodeDelegate.accentCol
                                opacity: 0.18
                                alphaMode: PrincipledMaterial.Blend
                            }
                        ]
                    }

                    // 5. 3D Node Hardware Assembly at (posX, posY, posZ)
                    Node {
                        position: nodeDelegate.posVec
                        eulerRotation.y: root.simTime * 22.0

                        // Outer 3D Orbital Halo Torus around Node
                        Model {
                            eulerRotation: Qt.vector3d(70, root.simTime * 35.0, 0)
                            geometry: TorusRingGeometry {
                                radius: nodeDelegate.isSelected ? 28.0 : 23.0
                                tubeRadius: nodeDelegate.isSelected ? 1.5 : 1.0
                            }
                            materials: [nodePbrMat]
                        }

                        // Camera Node 3D Mesh (#Cube chassis + #Cone lens)
                        Node {
                            visible: nodeDelegate.itemData.nodeType === "camera"
                            Model {
                                source: "#Cube"
                                scale: Qt.vector3d(0.24, 0.16, 0.30)
                                materials: [nodeChassisMat]
                            }
                            Model {
                                source: "#Cone"
                                position: Qt.vector3d(0, 0, 19)
                                eulerRotation.x: -90
                                scale: Qt.vector3d(0.18, 0.18, 0.18)
                                materials: [nodePbrMat]
                            }
                        }

                        // NVR / ONVIF Bridge 3D Mesh (Stacked Server Blades)
                        Node {
                            visible: nodeDelegate.itemData.nodeType === "nvr"
                            Model {
                                source: "#Cube"
                                position: Qt.vector3d(0, 8, 0)
                                scale: Qt.vector3d(0.28, 0.06, 0.24)
                                materials: [nodeChassisMat]
                            }
                            Model {
                                source: "#Cube"
                                position: Qt.vector3d(0, 0, 0)
                                scale: Qt.vector3d(0.28, 0.06, 0.24)
                                materials: [nodePbrMat]
                            }
                            Model {
                                source: "#Cube"
                                position: Qt.vector3d(0, -8, 0)
                                scale: Qt.vector3d(0.28, 0.06, 0.24)
                                materials: [nodeChassisMat]
                            }
                        }

                        // VLM / ROI / Bot / Vault 3D Core Mesh
                        Node {
                            visible: nodeDelegate.itemData.nodeType !== "camera" && nodeDelegate.itemData.nodeType !== "nvr"
                            Model {
                                source: nodeDelegate.itemData.nodeType === "vault" ? "#Cube" : "#Sphere"
                                scale: Qt.vector3d(0.25, 0.25, 0.25)
                                eulerRotation: Qt.vector3d(45, 45, 0)
                                materials: [nodePbrMat]
                            }
                            Model {
                                source: "#Cube"
                                scale: Qt.vector3d(0.22, 0.22, 0.22)
                                materials: [nodeChassisMat]
                            }
                        }
                    }
                }
            }
        }

        // Orbit Drag & Wheel Interaction
        DragHandler {
            id: orbitDrag
            target: null
            property point lastPt: Qt.point(0, 0)
            onActiveChanged: {
                if (active) lastPt = centroid.position
            }
            onCentroidChanged: {
                if (active) {
                    var dx = centroid.position.x - lastPt.x
                    var dy = centroid.position.y - lastPt.y
                    lastPt = centroid.position
                    root.targetYaw -= dx * 0.42
                    root.targetPitch = Math.max(-68.0, Math.min(68.0, root.targetPitch + dy * 0.35))
                }
            }
        }

        WheelHandler {
            onWheel: function(event) {
                var delta = event.angleDelta.y
                root.targetDistance = Math.max(290.0, Math.min(840.0, root.targetDistance - delta * 0.32))
            }
        }

        // =====================================================================
        // PROJECTED 2D NODE CALLOUT BADGES (Non-Overlapping & Clickable)
        // =====================================================================
        Repeater {
            model: root.topologyNodes ? root.topologyNodes.length : 0

            Rectangle {
                required property int index
                readonly property var nodeInfo: root.topologyNodes[index] || ({})
                readonly property var proj: (root.projectedCoords && index < root.projectedCoords.length)
                    ? root.projectedCoords[index]
                    : ({ x: 0, y: 0, visible: false })
                readonly property bool isSel: root.selectedNodeId === nodeInfo.nodeId
                readonly property color dotCol: Theme.nodeAccent(nodeInfo.nodeType || "camera")

                visible: proj.visible
                x: Math.max(10, Math.min(stage3DContainer.width - width - 10, proj.x - width * 0.5))
                y: Math.max(44, Math.min(stage3DContainer.height - 96, proj.y - height - 8))
                width: badgeRow.implicitWidth + 18
                height: 26
                radius: 13
                color: isSel ? Theme.primaryBg : root.hudPillBg
                border.width: 1
                border.color: isSel ? Theme.primaryBg : root.hudBorder

                RowLayout {
                    id: badgeRow
                    anchors.centerIn: parent
                    spacing: 6

                    Rectangle {
                        width: 6
                        height: 6
                        radius: 3
                        color: isSel ? Theme.signal : parent.parent.dotCol
                    }

                    Text {
                        text: nodeInfo.title || ""
                        color: isSel ? Theme.primaryFg : Theme.ink
                        font.family: Theme.sans
                        font.pixelSize: 11
                        font.weight: isSel ? Font.DemiBold : Font.Medium
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: root.focusNode(nodeInfo)
                }
            }
        }

        // =====================================================================
        // TOP HUD STATUS BAR INSIDE 3D STAGE
        // =====================================================================
        RowLayout {
            anchors.top: parent.top
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.margins: 12
            spacing: 8

            Rectangle {
                height: 26
                width: coreStatusRow.implicitWidth + 18
                radius: 13
                color: root.hudPillBg
                border.width: 1
                border.color: root.hudBorder

                RowLayout {
                    id: coreStatusRow
                    anchors.centerIn: parent
                    spacing: 6

                    Rectangle {
                        width: 6
                        height: 6
                        radius: 3
                        color: Theme.ok
                    }

                    Text {
                        text: "Qt Quick 3D · D3D11 RHI · Aktif"
                        color: Theme.ink
                        font.family: Theme.sans
                        font.pixelSize: 11
                        font.weight: Theme.wMedium
                    }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: root.resetCamera()
                }
            }

            Rectangle {
                height: 26
                width: nodeCntText.implicitWidth + 16
                radius: 13
                color: root.hudPillBg
                border.width: 1
                border.color: root.hudBorder

                Text {
                    id: nodeCntText
                    anchors.centerIn: parent
                    text: "7 düğüm · 6 aktif bağ"
                    color: Theme.ink2
                    font.family: Theme.mono
                    font.pixelSize: 10
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                height: 26
                width: hintText.implicitWidth + 16
                radius: 13
                color: root.hudPillBg
                border.width: 1
                border.color: root.hudBorder

                Text {
                    id: hintText
                    anchors.centerIn: parent
                    text: "Sürükle: Yörünge · Tekerlek: Zoom"
                    color: Theme.ink3
                    font.family: Theme.sans
                    font.pixelSize: 10
                }
            }
        }

        // =====================================================================
        // BOTTOM HUD: QUICK-SELECT NODE PILLS & SELECTED NODE TELEMETRY BAR
        // =====================================================================
        ColumnLayout {
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            anchors.margins: 12
            spacing: 6

            // Selected Node Live Telemetry Inspector Strip
            Rectangle {
                Layout.fillWidth: true
                height: 36
                radius: Theme.rSm
                color: root.hudPillBg
                border.width: 1
                border.color: root.hudBorder

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 10
                    spacing: 8

                    Rectangle {
                        width: 7
                        height: 7
                        radius: 3.5
                        color: Theme.signal
                    }

                    Text {
                        text: root.selectedNodeData.title || "Cortex 3D Core"
                        color: Theme.ink
                        font.family: Theme.sans
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                    }

                    Text {
                        text: "·"
                        color: Theme.ink3
                        font.pixelSize: 12
                    }

                    Text {
                        text: root.selectedNodeData.subtitle || ""
                        color: Theme.ink2
                        font.family: Theme.sans
                        font.pixelSize: 11
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    Rectangle {
                        height: 22
                        width: metricLabel.implicitWidth + 14
                        radius: 11
                        color: Theme.bgMuted
                        border.width: 1
                        border.color: Theme.border

                        Text {
                            id: metricLabel
                            anchors.centerIn: parent
                            text: root.selectedNodeData.metric || ""
                            color: Theme.ink2
                            font.family: Theme.mono
                            font.pixelSize: 10
                            font.weight: Font.Medium
                        }
                    }
                }
            }

            // Quick-Select Node Pills Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 5

                // Core Pill
                Rectangle {
                    height: 26
                    width: corePillLbl.implicitWidth + 18
                    radius: 13
                    color: root.selectedNodeId === "core" ? Theme.primaryBg : root.hudPillBg
                    border.width: 1
                    border.color: root.selectedNodeId === "core" ? Theme.primaryBg : root.hudBorder

                    Text {
                        id: corePillLbl
                        anchors.centerIn: parent
                        text: "● 3D Core"
                        color: root.selectedNodeId === "core" ? Theme.primaryFg : Theme.ink2
                        font.family: Theme.sans
                        font.pixelSize: 11
                        font.weight: Font.Medium
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.resetCamera()
                    }
                }

                Repeater {
                    model: root.topologyNodes ? root.topologyNodes.length : 0

                    Rectangle {
                        required property int index
                        readonly property var nObj: root.topologyNodes[index] || ({})
                        readonly property bool activeSel: root.selectedNodeId === nObj.nodeId

                        Layout.fillWidth: true
                        height: 26
                        radius: 13
                        color: activeSel ? Theme.primaryBg : root.hudPillBg
                        border.width: 1
                        border.color: activeSel ? Theme.primaryBg : root.hudBorder

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 8
                            anchors.rightMargin: 8
                            spacing: 5

                            Rectangle {
                                width: 5
                                height: 5
                                radius: 2.5
                                color: activeSel ? Theme.signal : Theme.nodeAccent(nObj.nodeType || "camera")
                            }

                            Text {
                                Layout.fillWidth: true
                                text: {
                                    var nid = nObj.nodeId || ""
                                    if (nid === "cam_primary") return "CH-01"
                                    if (nid === "roi_engine") return "ROI Motoru"
                                    if (nid === "ollama_vlm") return "Ollama AI"
                                    if (nid === "onvif_bridge") return "ONVIF NVR"
                                    if (nid === "forensic_vault") return "Adli Kasa"
                                    if (nid === "telegram_bot") return "Telegram"
                                    return nObj.title || ""
                                }
                                color: activeSel ? Theme.primaryFg : Theme.ink2
                                font.family: Theme.sans
                                font.pixelSize: 10
                                font.weight: activeSel ? Font.DemiBold : Font.Medium
                                elide: Text.ElideRight
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.focusNode(nObj)
                        }
                    }
                }
            }
        }
    }

    // =========================================================================
    // 2. STRUCTURED 2D TOPOLOGY MATRIX FALLBACK VIEW
    // =========================================================================
    Rectangle {
        anchors.fill: parent
        radius: Theme.rMd
        color: Theme.bgSubtle
        visible: !root.viewMode3D
        border.width: 1
        border.color: Theme.border

        GridLayout {
            anchors.fill: parent
            anchors.margins: 12
            columns: 3
            rowSpacing: 10
            columnSpacing: 10

            Repeater {
                model: root.topologyNodes ? root.topologyNodes.length : 0

                Rectangle {
                    required property int index
                    readonly property var nObj: root.topologyNodes[index] || ({})
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    radius: Theme.rMd
                    color: Theme.surface
                    border.width: 1
                    border.color: Theme.border

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 6

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6
                            Rectangle {
                                width: 6
                                height: 6
                                radius: 3
                                color: Theme.nodeAccent(nObj.nodeType || "camera")
                            }
                            Text {
                                text: nObj.status || "Aktif"
                                color: Theme.ink2
                                font.family: Theme.sans
                                font.pixelSize: 11
                                font.weight: Font.Medium
                            }
                            Item { Layout.fillWidth: true }
                            Text {
                                text: "Core ⇄ Node"
                                color: Theme.ink3
                                font.family: Theme.mono
                                font.pixelSize: 10
                            }
                        }

                        Text {
                            text: nObj.title || ""
                            color: Theme.ink
                            font.family: Theme.sans
                            font.pixelSize: 14
                            font.weight: Theme.wMedium
                            font.letterSpacing: Theme.tight(14)
                        }

                        Text {
                            text: nObj.subtitle || ""
                            color: Theme.ink2
                            font.family: Theme.sans
                            font.pixelSize: 11
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Item { Layout.fillHeight: true }

                        Rectangle {
                            Layout.fillWidth: true
                            height: 26
                            radius: 13
                            color: Theme.bgMuted

                            Text {
                                anchors.left: parent.left
                                anchors.leftMargin: 10
                                anchors.verticalCenter: parent.verticalCenter
                                text: nObj.metric || ""
                                color: Theme.ink2
                                font.family: Theme.mono
                                font.pixelSize: 10
                            }
                        }
                    }
                }
            }
        }
    }
}
