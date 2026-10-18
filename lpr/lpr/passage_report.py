"""Operator report view; recognition status is not an accuracy measurement."""
from PySide6.QtWidgets import QDialog,QVBoxLayout,QLabel,QTabWidget,QTableWidget,QTableWidgetItem,QHeaderView,QDialogButtonBox
from .theme import apply_theme


class PassageReport(QDialog):
    def __init__(self,report,parent=None):
        super().__init__(parent)
        self.setWindowTitle('Geçiş raporu / Passage report (UTC)');self.resize(1000,650)
        apply_theme(self)
        layout=QVBoxLayout(self);total=report['total']
        layout.addWidget(QLabel(f"Toplam / Total: {total['total']}    Giriş / Entry: {total['entries']}    Çıkış / Exit: {total['exits']}"))
        rate=total['recognized']/total['total'] if total['total'] else None
        ratio=f'{rate:.1%}' if rate is not None else '—'
        explanation=QLabel(f"Modelin doğruladığı / Model-recognized: {ratio} · İnceleme / Review: {total['review']} · Okunamadı / Unread: {total['unread']}\n"
            'Bu oran plaka doğruluğu değildir; kayıtlı model kararlarını gösterir. / This is a recorded decision ratio, not measured plate accuracy.')
        explanation.setObjectName('muted');explanation.setWordWrap(True);layout.addWidget(explanation)
        tabs=QTabWidget();layout.addWidget(tabs,1)
        for key,title in (('daily','Günlük / Daily'),('hourly','Saatlik / Hourly'),('cameras','Kamera / Camera')):
            rows=report[key];table=QTableWidget(len(rows),7)
            table.setHorizontalHeaderLabels(['UTC / Kamera','Toplam','Giriş','Çıkış','Doğrulandı','İnceleme','Okunamadı'])
            table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
            table.setAlternatingRowColors(True);table.verticalHeader().hide()
            table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
            for i,row in enumerate(rows):
                for j,column in enumerate(('bucket','total','entries','exits','recognized','review','unread')):
                    table.setItem(i,j,QTableWidgetItem(str(row[column])))
            tabs.addTab(table,title)
        buttons=QDialogButtonBox(QDialogButtonBox.StandardButton.Close);buttons.rejected.connect(self.reject);layout.addWidget(buttons)
