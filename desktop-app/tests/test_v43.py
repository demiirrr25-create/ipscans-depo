import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
os.environ.setdefault('QT_QPA_PLATFORM','offscreen')
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from PyQt6.QtCore import QSettings
from PyQt6.QtWidgets import QApplication
from PyQt6.QtPdf import QPdfDocument
from PyQt6 import sip
from app.core.models import Device
from app.core.device_names import DeviceNames
from app.core.pdf_report import write_pdf
from app.core.search import matches_device
from app.ui.main_window import MainWindow


class NamesAndPDFTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app=QApplication.instance() or QApplication([])
        from PyQt6.QtGui import QFontDatabase
        for font in ['segoeui.ttf','seguisb.ttf','segoeuib.ttf']:
            font_path=Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts'/font
            if font_path.exists(): QFontDatabase.addApplicationFont(str(font_path))

    def test_names_persist_follow_mac_and_do_not_leak_between_networks(self):
        with tempfile.TemporaryDirectory() as folder:
            path=str(Path(folder)/'names.ini')
            store=DeviceNames(QSettings(path,QSettings.Format.IniFormat))
            device=Device('192.168.1.100',mac='02:11:22:33:44:55')
            store.set('office',device,'Kapı kamerası')
            reopened=DeviceNames(QSettings(path,QSettings.Format.IniFormat))
            self.assertEqual(reopened.get('office',device),'Kapı kamerası')
            self.assertEqual(reopened.get('home',device),'')
            self.assertEqual(reopened.get('office',Device('192.168.1.101',mac=device.mac)),'Kapı kamerası')
            self.assertEqual(reopened.get('office',Device(device.ip,mac='02:00:00:00:00:01')),'')
            reopened.set('office',device,'')
            self.assertEqual(reopened.get('office',device),'')
            store.set('office',device,'Door')
            reopened.set('office',Device('192.168.1.101',mac=device.mac),'')
            self.assertEqual(reopened.get('office',device),'')

    def test_map_rename_updates_table_pending_results_and_search(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(MainWindow,'_refresh_adapters'):
            window=MainWindow('tr')
            window.device_names=DeviceNames(QSettings(str(Path(folder)/'names.ini'),QSettings.Format.IniFormat))
            device=Device('192.168.1.100')
            window._on_device_found(device);window._flush_results(True)
            with patch('app.ui.main_window.QInputDialog.getText',return_value=('Kapı kamerası',True)):
                window.network_map.rename_requested.emit(window.model._devices[0])
                self.app.processEvents()
            window._on_device_found(Device(device.ip,hostname='vendor-camera'))
            window._flush_results(True)
            self.assertEqual(window.model._devices[0].display_name,'Kapı kamerası')
            self.assertTrue(matches_device(window.model._devices[0],'name:"kapı kamerası"'))
            self.assertEqual(window.network_map.nodes[device.ip].device.custom_name,'Kapı kamerası')
            with patch('app.ui.main_window.QInputDialog.getText',return_value=('Changed',False)):
                window._rename_device(window.model._devices[0])
            self.assertEqual(window.model._devices[0].custom_name,'Kapı kamerası')
            window.close()

    def test_pdf_unicode_pagination_and_empty_results(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'report.pdf'
            devices=[Device(f'192.0.2.{i+1}',custom_name=f'Kapı kamerası {i+1}',vendor='Üretici',open_ports=[80,443]) for i in range(75)]
            write_pdf(devices,path,target='192.0.2.0/24',lang='tr',completed=False)
            doc=QPdfDocument(None)
            self.assertEqual(doc.load(str(path)),QPdfDocument.Error.None_)
            self.assertGreater(doc.pageCount(),1)
            text=' '.join(doc.getAllText(i).text() for i in range(doc.pageCount()))
            for i in [1,37,75]: self.assertIn(f'Kapı kamerası {i}',text)
            self.assertIn('Kısmi sonuçlar',text)
            doc.close(); sip.delete(doc)
            write_pdf([],path,lang='tr')
            doc=QPdfDocument(None)
            self.assertEqual(doc.load(str(path)),QPdfDocument.Error.None_)
            self.assertEqual(doc.pageCount(),1)
            self.assertIn('cihaz yok',doc.getAllText(0).text())
            doc.close(); sip.delete(doc)

    def test_export_defaults_to_pdf_and_snapshots_filtered_names(self):
        with patch.object(MainWindow,'_refresh_adapters'):
            window=MainWindow('en')
            window.model.add_devices([Device('192.0.2.1',custom_name='Door camera'),Device('192.0.2.2',custom_name='Printer')])
            window.filter_edit.setText('camera')
            with patch('app.ui.main_window.QFileDialog.getSaveFileName',return_value=('report','PDF (*.pdf)')) as dialog, \
                 patch.object(window,'_background') as background,patch('app.ui.main_window.write_pdf') as pdf:
                window._export()
                self.assertEqual(dialog.call_args.args[2],'IPscans-report.pdf')
                background.call_args.args[0]()
                self.assertEqual(pdf.call_args.args[1],Path('report.pdf'))
                self.assertEqual([d.custom_name for d in pdf.call_args.args[0]],['Door camera'])
            window.close()

    def test_large_pdf_record_continues_and_locked_destination_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'report.pdf'
            write_pdf([Device('192.0.2.1',custom_name='Door camera',open_ports=list(range(1,1001)))],path)
            doc=QPdfDocument(None)
            try:
                self.assertEqual(doc.load(str(path)),QPdfDocument.Error.None_)
                self.assertGreater(doc.pageCount(),1)
                text=' '.join(doc.getAllText(i).text() for i in range(doc.pageCount()))
                self.assertIn('1000',text)
                original=path.read_bytes()
                if sys.platform=='win32':
                    with self.assertRaises(OSError): write_pdf([],path)
                    self.assertEqual(path.read_bytes(),original)
            finally:
                doc.close();sip.delete(doc)

if __name__=='__main__': unittest.main()
