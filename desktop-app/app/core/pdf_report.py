"""Vector PDF reports with Unicode text, repeating headers and atomic saving."""
from datetime import datetime
from PyQt6.QtCore import QIODevice, QMarginsF, QRectF, QSaveFile, Qt
from PyQt6.QtGui import QColor, QFont, QFontMetricsF, QPageLayout, QPageSize, QPainter, QPdfWriter


def _page_chunks(text, metrics, width, height, flags):
    """Split oversized observations without dropping ports or long device metadata."""
    chunks = []
    while text:
        low, high = 1, len(text)
        while low < high:
            mid = (low + high + 1) // 2
            if metrics.boundingRect(QRectF(0, 0, width, 100000), flags, text[:mid]).height() <= height:
                low = mid
            else:
                high = mid - 1
        cut = low
        if cut < len(text):
            boundary = max(text.rfind(' ', 0, cut), text.rfind(',', 0, cut))
            if boundary > cut // 2: cut = boundary + 1
        chunks.append(text[:cut].strip())
        text = text[cut:].lstrip()
    return chunks or ['']


def write_pdf(devices, path, *, target='', completed=True, lang='en'):
    tr = lang == 'tr'
    title = 'Ağ keşif raporu' if tr else 'Network discovery report'
    headers = ['Cihaz adı', 'IP adresi', 'MAC adresi', 'Üretici / tür', 'TCP portları'] if tr else [
        'Device name', 'IP address', 'MAC address', 'Vendor / type', 'TCP ports']
    output = QSaveFile(str(path))
    if not output.open(QIODevice.OpenModeFlag.WriteOnly):
        raise OSError(output.errorString())
    writer = QPdfWriter(output)
    writer.setTitle(title)
    writer.setCreator('IPScans+ 4.3.0')
    writer.setResolution(96)
    writer.setPageLayout(QPageLayout(QPageSize(QPageSize.PageSizeId.A4),
        QPageLayout.Orientation.Landscape, QMarginsF(14, 14, 14, 14)))
    painter = QPainter()
    if not painter.begin(writer):
        output.cancelWriting()
        raise OSError('Could not initialize the PDF writer.')
    width, height = writer.width(), writer.height()
    widths = [width*.26, width*.19, width*.18, width*.23, width*.14]
    body_font = QFont('Segoe UI', 10)
    bold_font = QFont('Segoe UI', 10, QFont.Weight.DemiBold)
    flags = int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignTop | Qt.TextFlag.TextWordWrap | Qt.TextFlag.TextWrapAnywhere)
    stamp = datetime.now().astimezone().strftime('%Y-%m-%d %H:%M %z')
    rows = []
    metrics = QFontMetricsF(bold_font, writer)
    available = height - 258
    for device in devices:
        values = [device.display_name, device.ip, device.mac or '—',
                  '\n'.join(filter(None, [device.vendor, device.device_type])),
                  ', '.join(map(str, device.open_ports)) or '—']
        # Size each row before pagination; user names are never truncated.
        row_height = max(46, max(metrics.boundingRect(QRectF(0, 0, w-24, 10000), flags, value).height()
                                  for w, value in zip(widths, values)) + 24)
        if row_height <= available:
            rows.append((values, row_height))
        else:
            parts = [_page_chunks(v, metrics, w-24, available-28, flags) for v,w in zip(values,widths)]
            for part in range(max(map(len, parts))):
                segment = [pieces[part] if part < len(pieces) else '' for pieces in parts]
                if part:
                    segment[0] = device.display_name + (' (devam)' if tr else ' (continued)')
                    segment[1] = device.ip
                h = max(46, max(metrics.boundingRect(QRectF(0,0,w-24,100000),flags,v).height() for w,v in zip(widths,segment))+24)
                rows.append((segment,h))
    pages = [[]]
    used = 0
    for row in rows:
        if row[1] > available:
            painter.end(); output.cancelWriting()
            raise ValueError('A device record is too large for one PDF page.')
        if used + row[1] > available and pages[-1]:
            pages.append([]); used = 0
        pages[-1].append(row); used += row[1]
    try:
        for number, page in enumerate(pages, 1):
            if number > 1 and not writer.newPage():
                raise OSError('Could not create a PDF page.')
            painter.fillRect(QRectF(0, 0, width, height), QColor('#ffffff'))
            painter.fillRect(QRectF(0, 0, width, 112), QColor('#101216'))
            painter.setPen(QColor('#ffffff'))
            painter.setFont(QFont('Segoe UI', 10, QFont.Weight.DemiBold))
            painter.drawText(QRectF(22, 16, width-44, 22), 'IPSCANS+  /  4.3')
            painter.setFont(QFont('Segoe UI', 24, QFont.Weight.DemiBold))
            painter.drawText(QRectF(20, 45, width-40, 44), title)
            painter.setPen(QColor('#555b66')); painter.setFont(body_font)
            state = ('Tamamlandı' if tr else 'Completed') if completed else ('Kısmi sonuçlar' if tr else 'Partial results')
            painter.drawText(QRectF(0, 126, width, 26), f'{len(devices)} '+('cihaz' if tr else 'devices')+f'  ·  {state}  ·  {stamp}')
            # Target can contain a bounded multi-network specification; wrap rather than overflow.
            painter.drawText(QRectF(0, 151, width, 24), metrics.elidedText(
                ('Hedef: ' if tr else 'Target: ')+target, Qt.TextElideMode.ElideRight, width))
            y = 183
            painter.fillRect(QRectF(0, y-9, width, 33), QColor('#eef0f3'))
            painter.setFont(bold_font); painter.setPen(QColor('#3c424d'))
            x = 0
            for label, w in zip(headers, widths):
                painter.drawText(QRectF(x+12, y-3, w-24, 24), label); x += w
            y += 25
            if not page:
                painter.setFont(body_font)
                painter.drawText(QRectF(12, y+20, width-24, 40), 'Bu görünümde cihaz yok.' if tr else 'No devices in this view.')
            for i, (values, row_height) in enumerate(page):
                painter.fillRect(QRectF(0, y, width, row_height), QColor('#f6f7f9' if i%2==0 else '#ffffff'))
                x = 0
                for col, (value,w) in enumerate(zip(values,widths)):
                    painter.setPen(QColor('#151820' if col==0 else '#414753'))
                    painter.setFont(bold_font if col==0 else body_font)
                    painter.drawText(QRectF(x+12,y+12,w-24,row_height-20),flags,value)
                    x += w
                y += row_height
            painter.setFont(QFont('Segoe UI', 8)); painter.setPen(QColor('#666d79'))
            note = 'Özel adlar yerel etiketlerdir. Bulgular bu taramayı yansıtır.' if tr else 'Custom names are local labels. Observations reflect this scan.'
            painter.drawText(QRectF(0,height-25,width-90,24),note)
            painter.drawText(QRectF(width-80,height-25,80,24),Qt.AlignmentFlag.AlignRight,f'{number} / {len(pages)}')
        if not painter.end():
            raise OSError('The PDF painter could not finish.')
        # Destruction finalizes the PDF trailer before committing the QIODevice.
        del writer
        if not output.commit():
            raise OSError(output.errorString())
    except Exception:
        if painter.isActive(): painter.end()
        output.cancelWriting()
        raise
