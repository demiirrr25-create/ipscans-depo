"""Custom GPU-accelerated 3D procedural geometries for QtQuick3D (PySide6 6.12+).

Provides:
- TorusRingGeometry: Smooth 3D metallic/emissive torus ring with vertex normals.
- OctaWireLatticeGeometry: 3D octahedral + geodesic wireframe lattice (PrimitiveType.Lines).
- RadarGrid3DGeometry: 3D spatial floor grid with concentric orbital rings and radial axes (PrimitiveType.Lines).
"""
import math
import struct
from PySide6.QtCore import Property, QByteArray, Signal, Slot
from PySide6.QtGui import QVector3D
from PySide6.QtQml import QmlElement
from PySide6.QtQuick3D import QQuick3DGeometry

QML_IMPORT_NAME = "Cortex3DPrimitives"
QML_IMPORT_MAJOR_VERSION = 1


@QmlElement
class TorusRingGeometry(QQuick3DGeometry):
    """True 3D Torus mesh with analytical surface normals for PBR PrincipledMaterial."""

    radiusChanged = Signal()
    tubeRadiusChanged = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._radius = 90.0
        self._tube_radius = 1.8
        self._major_segments = 80
        self._minor_segments = 20
        self._rebuild()

    @Property(float, notify=radiusChanged)
    def radius(self) -> float:
        return self._radius

    @radius.setter
    def radius(self, val: float) -> None:
        val = max(5.0, float(val))
        if abs(self._radius - val) > 1e-4:
            self._radius = val
            self.radiusChanged.emit()
            self._rebuild()

    @Property(float, notify=tubeRadiusChanged)
    def tubeRadius(self) -> float:
        return self._tube_radius

    @tubeRadius.setter
    def tubeRadius(self, val: float) -> None:
        val = max(0.2, float(val))
        if abs(self._tube_radius - val) > 1e-4:
            self._tube_radius = val
            self.tubeRadiusChanged.emit()
            self._rebuild()

    @Slot(float, float, int, int)
    def rebuild(self, radius: float = 90.0, tube_radius: float = 1.8, major_segments: int = 80, minor_segments: int = 20) -> None:
        self._radius = max(5.0, float(radius))
        self._tube_radius = max(0.2, float(tube_radius))
        self._major_segments = max(12, int(major_segments))
        self._minor_segments = max(8, int(minor_segments))
        self._rebuild()

    def _rebuild(self) -> None:
        self.clear()
        R = self._radius
        r = self._tube_radius
        maj = self._major_segments
        min_s = self._minor_segments

        verts = bytearray()
        indices = bytearray()

        for i in range(maj + 1):
            u = (i / maj) * 2.0 * math.pi
            cu, su = math.cos(u), math.sin(u)
            for j in range(min_s + 1):
                v = (j / min_s) * 2.0 * math.pi
                cv, sv = math.cos(v), math.sin(v)
                px = (R + r * cv) * cu
                py = r * sv
                pz = (R + r * cv) * su
                nx = cv * cu
                ny = sv
                nz = cv * su
                verts.extend(struct.pack("<6f", px, py, pz, nx, ny, nz))

        for i in range(maj):
            for j in range(min_s):
                a = i * (min_s + 1) + j
                b = (i + 1) * (min_s + 1) + j
                c = (i + 1) * (min_s + 1) + (j + 1)
                d = i * (min_s + 1) + (j + 1)
                indices.extend(struct.pack("<6I", a, b, d, b, c, d))

        stride = 6 * 4
        self.setVertexData(QByteArray(bytes(verts)))
        self.setIndexData(QByteArray(bytes(indices)))
        self.setStride(stride)
        self.setBounds(QVector3D(-(R + r), -r, -(R + r)), QVector3D(R + r, r, R + r))
        self.setPrimitiveType(QQuick3DGeometry.PrimitiveType.Triangles)
        self.addAttribute(
            QQuick3DGeometry.Attribute.Semantic.PositionSemantic,
            0,
            QQuick3DGeometry.Attribute.ComponentType.F32Type,
        )
        self.addAttribute(
            QQuick3DGeometry.Attribute.Semantic.NormalSemantic,
            12,
            QQuick3DGeometry.Attribute.ComponentType.F32Type,
        )
        self.addAttribute(
            QQuick3DGeometry.Attribute.Semantic.IndexSemantic,
            0,
            QQuick3DGeometry.Attribute.ComponentType.U32Type,
        )
        self.update()


@QmlElement
class OctaWireLatticeGeometry(QQuick3DGeometry):
    """3D geodesic/octahedral wireframe cage for the central Cortex Core."""

    sizeChanged = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._size = 68.0
        self._rebuild()

    @Property(float, notify=sizeChanged)
    def size(self) -> float:
        return self._size

    @size.setter
    def size(self, val: float) -> None:
        val = max(10.0, float(val))
        if abs(self._size - val) > 1e-4:
            self._size = val
            self.sizeChanged.emit()
            self._rebuild()

    @Slot(float)
    def rebuild(self, size: float = 68.0) -> None:
        self._size = max(10.0, float(size))
        self._rebuild()

    def _rebuild(self) -> None:
        self.clear()
        s = self._size
        # Outer octahedron + dual rotated inner octahedron vertices
        pts = [
            (s, 0.0, 0.0),
            (-s, 0.0, 0.0),
            (0.0, s, 0.0),
            (0.0, -s, 0.0),
            (0.0, 0.0, s),
            (0.0, 0.0, -s),
        ]
        # Secondary 45-degree rotated equatorial & polar vertices for rich 3D cage
        h = s * 0.72
        pts.extend([
            (h, 0.0, h),
            (-h, 0.0, h),
            (-h, 0.0, -h),
            (h, 0.0, -h),
            (h * 0.7, h * 0.85, 0.0),
            (-h * 0.7, h * 0.85, 0.0),
            (-h * 0.7, -h * 0.85, 0.0),
            (h * 0.7, -h * 0.85, 0.0),
        ])

        edges = [
            # Primary octahedron
            (2, 0), (2, 1), (2, 4), (2, 5),
            (3, 0), (3, 1), (3, 4), (3, 5),
            (0, 4), (4, 1), (1, 5), (5, 0),
            # Secondary cage struts
            (6, 7), (7, 8), (8, 9), (9, 6),
            (2, 6), (2, 7), (2, 8), (2, 9),
            (3, 6), (3, 7), (3, 8), (3, 9),
            (10, 11), (12, 13), (0, 10), (1, 11), (1, 12), (0, 13),
        ]

        verts = bytearray()
        for a, b in edges:
            ax, ay, az = pts[a]
            bx, by, bz = pts[b]
            verts.extend(struct.pack("<6f", ax, ay, az, 0.0, 1.0, 0.0))
            verts.extend(struct.pack("<6f", bx, by, bz, 0.0, 1.0, 0.0))

        stride = 6 * 4
        self.setVertexData(QByteArray(bytes(verts)))
        self.setStride(stride)
        self.setBounds(QVector3D(-s, -s, -s), QVector3D(s, s, s))
        self.setPrimitiveType(QQuick3DGeometry.PrimitiveType.Lines)
        self.addAttribute(
            QQuick3DGeometry.Attribute.Semantic.PositionSemantic,
            0,
            QQuick3DGeometry.Attribute.ComponentType.F32Type,
        )
        self.addAttribute(
            QQuick3DGeometry.Attribute.Semantic.NormalSemantic,
            12,
            QQuick3DGeometry.Attribute.ComponentType.F32Type,
        )
        self.update()


@QmlElement
class RadarGrid3DGeometry(QQuick3DGeometry):
    """3D perspective radar floor grid with concentric orbital rings and crosshairs."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._rebuild()

    @Slot(float, float)
    def rebuild(self, inner_r: float = 95.0, outer_r: float = 340.0) -> None:
        self._rebuild()

    def _rebuild(self) -> None:
        self.clear()
        verts = bytearray()
        max_r = 340.0

        # 4 concentric circles on the Y=0 plane
        for ring_r in (95.0, 175.0, 255.0, 335.0):
            segs = 96
            for i in range(segs):
                a1 = (i / segs) * 2.0 * math.pi
                a2 = ((i + 1) / segs) * 2.0 * math.pi
                verts.extend(
                    struct.pack(
                        "<6f",
                        math.cos(a1) * ring_r,
                        0.0,
                        math.sin(a1) * ring_r,
                        0.0,
                        1.0,
                        0.0,
                    )
                )
                verts.extend(
                    struct.pack(
                        "<6f",
                        math.cos(a2) * ring_r,
                        0.0,
                        math.sin(a2) * ring_r,
                        0.0,
                        1.0,
                        0.0,
                    )
                )

        # 12 radial spokes
        for s_idx in range(12):
            ang = (s_idx / 12.0) * 2.0 * math.pi
            ca, sa = math.cos(ang), math.sin(ang)
            verts.extend(struct.pack("<6f", ca * 45.0, 0.0, sa * 45.0, 0.0, 1.0, 0.0))
            verts.extend(struct.pack("<6f", ca * 335.0, 0.0, sa * 335.0, 0.0, 1.0, 0.0))

        stride = 6 * 4
        self.setVertexData(QByteArray(bytes(verts)))
        self.setStride(stride)
        self.setBounds(QVector3D(-max_r, -2.0, -max_r), QVector3D(max_r, 2.0, max_r))
        self.setPrimitiveType(QQuick3DGeometry.PrimitiveType.Lines)
        self.addAttribute(
            QQuick3DGeometry.Attribute.Semantic.PositionSemantic,
            0,
            QQuick3DGeometry.Attribute.ComponentType.F32Type,
        )
        self.addAttribute(
            QQuick3DGeometry.Attribute.Semantic.NormalSemantic,
            12,
            QQuick3DGeometry.Attribute.ComponentType.F32Type,
        )
        self.update()


def register_3d_geometry_types() -> None:
    """Ensure Cortex3DPrimitives 1.0 QML types are imported and registered."""
    return None

