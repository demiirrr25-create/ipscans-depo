"""Administrator update review UI; background verification, never installation."""
from dataclasses import asdict
import json
import os
from pathlib import Path
from queue import Queue,Empty
import tempfile
from threading import Thread,Event
from PySide6.QtCore import QTimer,Qt,QUrl
from PySide6.QtGui import QDesktopServices
from PySide6.QtWidgets import (QWidget,QVBoxLayout,QHBoxLayout,QFormLayout,QLabel,
    QPushButton,QLineEdit,QComboBox,QDialog,QDialogButtonBox)
from .updates import (UpdatePolicy,UpdateManager,UpdateStatus,UpdateError,
    HTTPSReader,https_origin,verify_authenticode,decode_json)
from .theme import apply_theme


def policy_path(directory):
    return Path(directory)/'update-policy.json'


def read_policy(directory,product_name):
    path=policy_path(directory)
    if not path.exists():return None
    try:
        with path.open('rb') as source:data=source.read(8193)
        if len(data)>8192:raise UpdateError('Yerel güncelleme ilkesi çok büyük.')
        fields=decode_json(data)
        if set(fields)!={'schema','manifest_url','channel','publisher_sha256','product_name'} or type(fields['schema']) is not int or fields.pop('schema')!=1:
            raise UpdateError('Yerel güncelleme ilkesi geçersiz.')
        policy=UpdatePolicy(**fields)
        if policy.product_name!=product_name:raise UpdateError('Güncelleme ilkesi bu ürün sürümüne ait değil.')
        return policy
    except UpdateError:raise
    except Exception:raise UpdateError('Yerel güncelleme ilkesi okunamadı; güncellemeler kapalı.') from None


def write_policy(directory,policy):
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    descriptor,name=tempfile.mkstemp(prefix='.update-policy-',suffix='.json',dir=directory)
    temporary=Path(name)
    try:
        with os.fdopen(descriptor,'wb') as target:
            target.write(json.dumps({'schema':1,**asdict(policy)},sort_keys=True).encode('utf-8'))
            target.flush();os.fsync(target.fileno())
        os.replace(temporary,policy_path(directory))
    finally:temporary.unlink(missing_ok=True)


def plain_label(text='',name=None):
    item=QLabel(text);item.setWordWrap(True);item.setTextFormat(Qt.TextFormat.PlainText)
    if name:item.setObjectName(name)
    return item


class UpdatePolicyDialog(QDialog):
    def __init__(self,policy,product_name,parent=None):
        super().__init__(parent)
        self.policy=None;self.product_name=product_name
        self.setWindowTitle('Güvenilen güncelleme yayıncısı');self.setMinimumWidth(560);apply_theme(self)
        layout=QVBoxLayout(self)
        layout.addWidget(plain_label('Yalnız yetkili yöneticinin bağımsız olarak doğruladığı yayın adresini ve imza sertifikası parmak izini kullanın. İndirme manifesti güvenilen yayıncıyı belirleyemez.','muted'))
        form=QFormLayout();layout.addLayout(form)
        self.url=QLineEdit(policy.manifest_url if policy else '');self.url.setPlaceholderText('Güvenilen HTTPS manifest adresi')
        self.url.setMaxLength(2048)
        self.channel=QComboBox();self.channel.addItem('Kararlı','stable');self.channel.addItem('Önizleme','preview')
        self.channel.setCurrentIndex(self.channel.findData(policy.channel if policy else 'preview' if 'Preview' in product_name else 'stable'))
        self.fingerprint=QLineEdit(policy.publisher_sha256 if policy else '')
        self.fingerprint.setPlaceholderText('Yayıncı sertifikasının SHA-256 parmak izi · 64 onaltılık karakter');self.fingerprint.setMaxLength(128)
        form.addRow('Yayın adresi',self.url);form.addRow('Kanal',self.channel)
        form.addRow('Sertifika SHA-256',self.fingerprint);form.addRow('İmzalı ürün adı',plain_label(product_name))
        layout.addWidget(plain_label('Boş parmak izi indirmeyi kapalı tutar. Kaydetmek kontrol veya indirme başlatmaz. Kurulum bu ekran tarafından çalıştırılmaz.','muted'))
        self.error=plain_label();layout.addWidget(self.error)
        buttons=QDialogButtonBox(QDialogButtonBox.StandardButton.Save|QDialogButtonBox.StandardButton.Cancel)
        buttons.button(QDialogButtonBox.StandardButton.Save).setText('İlkeyi kaydet')
        buttons.button(QDialogButtonBox.StandardButton.Cancel).setText('İptal')
        buttons.accepted.connect(self.validate);buttons.rejected.connect(self.reject);layout.addWidget(buttons)

    def validate(self):
        try:
            self.policy=UpdatePolicy(self.url.text().strip(),self.channel.currentData(),
                self.fingerprint.text().strip().lower().replace(':',''),self.product_name)
            self.accept()
        except UpdateError as error:self.error.setText(str(error))


class CancelableReader:
    def __init__(self,policy,cancel):
        self.reader=HTTPSReader(https_origin(policy.manifest_url));self.cancel=cancel

    def chunks(self,url,maximum):
        if self.cancel.is_set():raise UpdateError('Güncelleme işlemi iptal edildi.')
        for block in self.reader.chunks(url,maximum):
            if self.cancel.is_set():raise UpdateError('Güncelleme işlemi iptal edildi.')
            yield block
        if self.cancel.is_set():raise UpdateError('Güncelleme işlemi iptal edildi.')


def cancellable_manager(directory,policy,cancel):
    def signature(path,manifest,trust):
        if cancel.is_set():raise UpdateError('Güncelleme işlemi iptal edildi.')
        verify_authenticode(path,manifest,trust)
        if cancel.is_set():raise UpdateError('Güncelleme işlemi iptal edildi.')
    return UpdateManager(directory,policy,reader=CancelableReader(policy,cancel),signature_verifier=signature)


class UpdatesPanel(QWidget):
    def __init__(self,ops,session,data_directory,current_version,*,product_name='IPScans LPR Pro Preview',
                 parent=None,manager_factory=cancellable_manager):
        super().__init__(parent)
        apply_theme(self)
        self.ops,self.session=ops,session
        self.directory=Path(data_directory);self.current_version=current_version;self.product_name=product_name
        self.manager_factory=manager_factory;self.policy=None;self.available=None;self.verified_path=None
        self.worker=None;self.closed=False;self.cancel=Event();self.results=Queue(maxsize=1);self.generation=0
        cancel=self.cancel;self.destroyed.connect(lambda *args:cancel.set())
        layout=QVBoxLayout(self);layout.setContentsMargins(0,12,0,12)
        layout.addWidget(plain_label('Doğrulanmış güncellemeler','pageTitle'))
        layout.addWidget(plain_label(f'Yüklü sürüm: {current_version} · Kurulum bu ekrandan otomatik çalıştırılmaz.','muted'))
        self.policy_summary=plain_label();layout.addWidget(self.policy_summary)
        actions=QHBoxLayout();layout.addLayout(actions)
        self.check_button=QPushButton('Yeni sürümü kontrol et');self.check_button.clicked.connect(lambda:self.begin('check'));actions.addWidget(self.check_button)
        self.stage_button=QPushButton('İndir ve imzayı doğrula');self.stage_button.clicked.connect(lambda:self.begin('stage'));actions.addWidget(self.stage_button)
        self.previous_button=QPushButton('Önceki paketi doğrula');self.previous_button.clicked.connect(lambda:self.begin('previous'));actions.addWidget(self.previous_button)
        self.policy_button=QPushButton('Yayıncı ilkesi');self.policy_button.clicked.connect(self.configure);actions.addWidget(self.policy_button)
        self.cancel_button=QPushButton('İptal et');self.cancel_button.clicked.connect(self.cancel_operation);actions.addWidget(self.cancel_button)
        self.status=plain_label();layout.addWidget(self.status)
        self.details=plain_label();self.details.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse);layout.addWidget(self.details)
        self.folder_button=QPushButton('Doğrulanan paketin klasörünü aç');self.folder_button.clicked.connect(self.open_folder);layout.addWidget(self.folder_button)
        self.timer=QTimer(self);self.timer.setInterval(100);self.timer.timeout.connect(self.poll);self.timer.start()
        self.reload_policy()

    def authorize(self):
        self.ops.check(self.session,'manage')

    def busy(self):
        return self.worker is not None and self.worker.is_alive()

    def controls(self):
        try:self.authorize();permitted=True
        except PermissionError:permitted=False
        idle=permitted and not self.busy() and not self.closed
        configured=self.policy is not None and bool(self.policy.publisher_sha256)
        self.check_button.setEnabled(idle and configured)
        self.stage_button.setEnabled(idle and configured and self.available is not None)
        self.previous_button.setEnabled(idle and configured)
        self.policy_button.setEnabled(idle)
        self.cancel_button.setEnabled(permitted and self.busy() and not self.closed and not self.cancel.is_set())
        self.folder_button.setEnabled(idle and self.verified_path is not None)

    def reload_policy(self):
        self.generation+=1
        self.policy=None;self.available=None;self.verified_path=None;self.details.clear()
        try:
            self.authorize();self.policy=read_policy(self.directory,self.product_name)
            if self.policy is None:
                self.policy_summary.setText('Güvenilen yayın adresi ve imza sertifikası yapılandırılmadı. Güncelleme kontrolü kapalı.')
            else:
                self.policy_summary.setText(f'Kanal: {self.policy.channel} · Yayın adresi: {self.policy.manifest_url}\nYayıncı sertifikası: {self.policy.publisher_sha256 or "Yapılandırılmadı"}')
            if not self.policy or not self.policy.publisher_sha256:self.status.setText('İmzalı yayın yapılandırılana kadar mevcut indirme ve kurulum yöntemini kullanın.')
            else:self.status.setText('Kontrole hazır. Bir sürüm bulunması, paket imzasının doğrulandığı anlamına gelmez.')
        except PermissionError:
            self.policy_summary.setText('Güncelleme yönetimi için yönetici yetkisi gerekir.');self.status.clear()
        except UpdateError as error:self.policy_summary.setText(str(error));self.status.setText('Güncelleme kontrolü kapalı.')
        self.controls()

    def configure(self):
        if self.busy() or self.closed:return
        try:
            self.authorize();dialog=UpdatePolicyDialog(self.policy,self.product_name,self)
            if dialog.exec()!=QDialog.DialogCode.Accepted:return
            self.authorize()
            with self.ops.db:self.ops._audit(self.session.username,'update_policy_configuration_requested','local administrator policy')
            write_policy(self.directory,dialog.policy)
            self.reload_policy()
        except PermissionError:self.status.setText('Yönetici oturumu geçersiz.')
        except Exception:self.status.setText('Güncelleme ilkesi kaydedilemedi.')

    def begin(self,operation):
        if self.busy() or self.closed:return
        try:self.authorize()
        except PermissionError:self.status.setText('Yönetici oturumu geçersiz.');self.controls();return
        if self.policy is None or not self.policy.publisher_sha256:
            self.status.setText('Güvenilen yayıncı yapılandırılmadı; işlem başlatılmadı.');return
        if operation not in ('check','stage','previous') or (operation=='stage' and self.available is None):return
        policy=self.policy;candidate=self.available;version=self.current_version
        directory=self.directory/'verified-updates';factory=self.manager_factory
        self.generation+=1;generation=self.generation
        while True:
            try:self.results.get_nowait()
            except Empty:break
        self.cancel.clear();cancel=self.cancel;results=self.results
        self.status.setText('Güvenli güncelleme kontrolü sürüyor…' if operation=='check' else 'Paket indiriliyor ve doğrulanıyor…' if operation=='stage' else 'Önceki paket yeniden doğrulanıyor…')
        self.verified_path=None;self.details.clear()
        if operation=='check':self.available=None
        def run():
            try:
                manager=factory(directory,policy,cancel)
                result=manager.check(version) if operation=='check' else manager.stage(candidate,version) if operation=='stage' else manager.rollback_candidate()
            except Exception:result=UpdateStatus('failed','Güncelleme işlemi tamamlanamadı; kurulum başlatılmadı.')
            if not cancel.is_set():results.put((generation,operation,result))
        self.worker=Thread(target=run,name='update-verification',daemon=True);self.worker.start();self.controls()

    def poll(self):
        if self.closed:return
        try:self.authorize()
        except PermissionError:
            self.cancel.set();self.available=None;self.verified_path=None;self.details.clear()
            self.policy_summary.setText('Güncelleme yönetimi için yönetici oturumu gerekli.')
            self.status.setText('Oturum sona erdi; güncelleme işlemi durduruluyor.');self.controls();return
        try:generation,operation,status=self.results.get_nowait()
        except Empty:
            self.controls();return
        if self.cancel.is_set() or generation!=self.generation:self.controls();return
        self.status.setText(status.message)
        if operation=='check':self.available=status.manifest if status.code=='update_available' else None
        if operation=='stage' and status.code=='staged':self.available=None
        if status.manifest is not None:
            release=status.manifest
            details=f'Sürüm: {release.version} · Kanal: {release.channel} · Boyut: {release.size/1024/1024:.1f} MB\nSHA-256: {release.sha256}'
            if status.code in ('staged','previous_verified') and status.path is not None:
                self.verified_path=status.path;details+=f'\nDoğrulanan paket: {status.path}\nKurulum başlatılmadı.'
            else:details+='\nPaket imzası henüz doğrulanmadı.'
            self.details.setText(details)
        self.controls()

    def open_folder(self):
        try:self.authorize()
        except PermissionError:self.status.setText('Yönetici oturumu geçersiz.');return
        if self.verified_path is None or self.busy():return
        folder=(self.directory/'verified-updates').resolve()
        if self.verified_path.parent.resolve()!=folder:return
        if not QDesktopServices.openUrl(QUrl.fromLocalFile(str(folder))):self.status.setText('Paket klasörü açılamadı.')

    def cancel_operation(self):
        self.cancel.set();self.status.setText('İşlem iptal ediliyor. Kurulum başlatılmadı.');self.controls()

    def shutdown(self):
        self.closed=True;self.cancel.set();self.timer.stop();self.controls()

    def closeEvent(self,event):
        self.shutdown();super().closeEvent(event)
