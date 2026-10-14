"""Render code-native SVG branding to distributable PNG and Windows ICO."""
import os
os.environ.setdefault("QT_QPA_PLATFORM","offscreen")
from pathlib import Path
from PySide6.QtCore import Qt,QSize
from PySide6.QtGui import QGuiApplication,QImage,QPainter
from PySide6.QtSvg import QSvgRenderer

root=Path(__file__).resolve().parents[1]
app=QGuiApplication([])
for kind,size in (("logos",QSize(1280,320)),("icons",QSize(256,256))):
    path=root/"assets"/kind/"lpr-pro.svg"
    renderer=QSvgRenderer(str(path))
    if not renderer.isValid():raise ValueError("Invalid branding SVG")
    image=QImage(size,QImage.Format.Format_ARGB32)
    image.fill(Qt.GlobalColor.black)
    painter=QPainter(image)
    renderer.render(painter)
    painter.end()
    if not image.save(str(path.with_suffix(".png"))):raise RuntimeError("PNG export failed")
    if kind=="icons" and not image.save(str(path.with_suffix(".ico"))):raise RuntimeError("ICO export failed")
