import QtQuick
import QtQuick3D
import QtQuick3D.Helpers
import Cortex3DPrimitives 1.0

Item {
    id: root
    implicitWidth: 40
    implicitHeight: 40

    property string status: "nominal" // "nominal" | "scanning" | "warning" | "alert"
    property bool isDark: Theme.dark
    property real spinTime: 0.0
    property real tiltX: 0.0
    property real tiltY: 0.0
    property real targetTiltX: 0.0
    property real targetTiltY: 0.0

    readonly property color accentColor: {
        if (status === "alert") return Theme.bad
        if (status === "warning") return Theme.warn
        if (status === "scanning") return Theme.signal
        return root.isDark ? "#F5F7FA" : "#0B0D12"
    }

    HoverHandler {
        onPointChanged: {
            var nx = (point.position.x / Math.max(1, root.width)) * 2.0 - 1.0
            var ny = (point.position.y / Math.max(1, root.height)) * 2.0 - 1.0
            root.targetTiltY = nx * 32.0
            root.targetTiltX = -ny * 28.0
        }
        onHoveredChanged: {
            if (!hovered) {
                root.targetTiltX = 0.0
                root.targetTiltY = 0.0
            }
        }
    }

    FrameAnimation {
        running: root.visible && !Theme.reduceMotion
        onTriggered: {
            var dt = Math.min(frameTime, 0.05)
            root.spinTime += dt
            var alpha = 1.0 - Math.exp(-8.0 * dt)
            root.tiltX += (root.targetTiltX - root.tiltX) * alpha
            root.tiltY += (root.targetTiltY - root.tiltY) * alpha
        }
    }

    View3D {
        anchors.fill: parent

        environment: ExtendedSceneEnvironment {
            backgroundMode: SceneEnvironment.Transparent
            antialiasingMode: SceneEnvironment.MSAA
            antialiasingQuality: SceneEnvironment.High
            tonemapMode: SceneEnvironment.TonemapModeFilmic
            glowEnabled: true
            glowIntensity: root.isDark ? 1.15 : 0.65
            glowBloom: root.isDark ? 0.35 : 0.18
        }

        PerspectiveCamera {
            position: Qt.vector3d(0, 0, 240)
            fieldOfView: 38
            clipNear: 10
            clipFar: 1000
        }

        DirectionalLight {
            eulerRotation.x: -35
            eulerRotation.y: 30
            brightness: root.isDark ? 2.2 : 2.6
            color: "#FFFFFF"
        }

        PointLight {
            position: Qt.vector3d(0, 0, 90)
            brightness: root.isDark ? 3.5 : 2.8
            color: "#2F6BFF"
        }

        Node {
            eulerRotation: Qt.vector3d(
                18.0 + root.tiltX,
                root.spinTime * 34.0 + root.tiltY,
                0
            )

            // Central glowing signal core sphere
            Model {
                source: "#Sphere"
                scale: Qt.vector3d(0.42, 0.42, 0.42)
                materials: [
                    PrincipledMaterial {
                        baseColor: "#2F6BFF"
                        metalness: 0.85
                        roughness: 0.14
                        emissiveFactor: Qt.vector3d(0.18, 0.42, 1.0)
                    }
                ]
            }

            // 3D Octahedral Wireframe Cage
            Model {
                geometry: OctaWireLatticeGeometry {
                    size: 56.0
                }
                materials: [
                    PrincipledMaterial {
                        lighting: PrincipledMaterial.NoLighting
                        baseColor: root.isDark ? "#F5F7FA" : "#0B0D12"
                    }
                ]
            }

            // Primary Gyroscope Torus Ring
            Model {
                geometry: TorusRingGeometry {
                    radius: 74.0
                    tubeRadius: 4.2
                }
                eulerRotation: Qt.vector3d(62, root.spinTime * 48.0, 15)
                materials: [
                    PrincipledMaterial {
                        baseColor: root.isDark ? "#F5F7FA" : "#0B0D12"
                        metalness: 0.88
                        roughness: 0.16
                        emissiveFactor: root.isDark ? Qt.vector3d(0.32, 0.38, 0.48) : Qt.vector3d(0.04, 0.05, 0.08)
                    }
                ]
            }

            // Counter-rotating Secondary Signal Torus Ring
            Model {
                geometry: TorusRingGeometry {
                    radius: 86.0
                    tubeRadius: 2.8
                }
                eulerRotation: Qt.vector3d(-48, -root.spinTime * 36.0, -20)
                materials: [
                    PrincipledMaterial {
                        baseColor: "#2F6BFF"
                        metalness: 0.85
                        roughness: 0.2
                        emissiveFactor: Qt.vector3d(0.18, 0.42, 0.98)
                    }
                ]
            }
        }
    }
}
