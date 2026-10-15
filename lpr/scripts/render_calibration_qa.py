"""Render the real calibration dialog using an explicitly synthetic video frame."""
import argparse
import os
from pathlib import Path
from queue import Queue
import sys

os.environ.setdefault("QT_QPA_PLATFORM","offscreen")
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QPainter,QColor,QFont,QFontDatabase
from lpr.calibration import CameraCalibration,CalibrationRegion,RecognitionLine
from lpr.lines import CrossingLine
from lpr.preview import PreviewDialog
from lpr.desktop import STYLE


class SyntheticCapture:
    frames=Queue(maxsize=1)
    def is_alive(self):return False


def main():
    parser=argparse.ArgumentParser();parser.add_argument("output",type=Path);args=parser.parse_args()
    app=QApplication.instance() or QApplication([])
    # Windows' offscreen plugin does not enumerate system fonts reliably.
    font=Path(os.environ.get("WINDIR","C:/Windows"))/"Fonts"/"segoeui.ttf"
    if font.is_file():QFontDatabase.addApplicationFont(str(font))
    app.setFont(QFont("Segoe UI",10));app.setStyleSheet(STYLE)
    config=CameraCalibration((CrossingLine("trigger","Giriş",(.1,.74),(.9,.74),allowed_directions=("entry",)),),
        (RecognitionLine("read","Plaka okuma",(.24,.43),(.76,.43),priority=3,region_id="read-roi"),),
        (CalibrationRegion("read-roi","Okuma alanı",((.18,.17),(.82,.17),(.92,.82),(.08,.82))),
         CalibrationRegion.rectangle("vehicle-roi","Araç alanı",(.04,.08),(.96,.92),purpose="vehicle")))
    dialog=PreviewDialog("synthetic","synthetic-qa",capture_worker=SyntheticCapture(),calibration=config,save_calibration=lambda value:None)
    dialog.timer.stop();dialog.setWindowTitle("Kalibrasyon · Sentetik geometri doğrulaması")
    dialog.resize(1200,850);dialog.show();app.processEvents()
    frame=np.full((540,960,3),24,dtype=np.uint8)
    frame[:,465:495]=42
    dialog.surface.set_frame(frame)
    painter=QPainter(dialog.surface.image);painter.setPen(QColor("#cccccc"));painter.setFont(QFont("Segoe UI",16))
    painter.drawText(28,24,"SENTETİK DOĞRULAMA GÖRÜNTÜSÜ · GERÇEK KAMERA DEĞİLDİR")
    painter.end()
    dialog.surface.selected="read";dialog.surface.selectionChanged.emit()
    dialog.status.setText("SENTETİK QA · 960 × 540 · Koordinat ve çizim aracı doğrulaması; RTSP veya OCR performans kanıtı değildir.")
    app.processEvents()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    if not dialog.grab().save(str(args.output)):raise RuntimeError("Screenshot could not be saved")
    print(str(args.output))
    dialog.close();app.processEvents()


if __name__=="__main__":main()
