"""Fail-closed Windows update verification and staging; never runs an installer.

The signing certificate fingerprint is deployment policy, not manifest data.
All network activity is bounded HTTPS on the policy's single origin. The caller
must run check/stage off the UI thread and explicitly authorize installation.
"""
import base64
from dataclasses import asdict,dataclass
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
from urllib.parse import urlsplit,urljoin
from urllib.request import HTTPRedirectHandler,ProxyHandler,Request,build_opener

APP_ID='ipscans-lpr-pro'
MAX_INSTALLER_BYTES=512*1024*1024
MAX_MANIFEST_BYTES=64*1024
VERSION=re.compile(r'(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})(?:(\.dev|rc)(0|[1-9][0-9]{0,5}))?\Z')
HASH=re.compile(r'[0-9a-f]{64}\Z')


class UpdateError(ValueError):
    pass


def version_key(value):
    match=VERSION.fullmatch(value) if isinstance(value,str) else None
    if not match:raise UpdateError('Geçersiz sürüm biçimi.')
    major,minor,patch,kind,number=match.groups()
    return (int(major),int(minor),int(patch),{'.dev':0,'rc':1,None:2}[kind],int(number or 0))


def https_origin(url):
    try:
        if not isinstance(url,str) or not 1<=len(url)<=2048 or any(ord(c)<33 or ord(c)>126 for c in url):raise ValueError()
        parts=urlsplit(url)
        if parts.scheme!='https' or not parts.hostname or parts.username or parts.password or parts.fragment:raise ValueError()
        if parts.port is not None and not 1<=parts.port<=65535:raise ValueError()
        return (parts.hostname.lower(),parts.port if parts.port is not None else 443)
    except (ValueError,TypeError):raise UpdateError('Güncelleme adresi güvenli bir HTTPS adresi olmalı.') from None


def decode_json(data):
    def unique(pairs):
        value={}
        for key,item in pairs:
            if key in value:raise UpdateError('Yinelenen güncelleme alanı.')
            value[key]=item
        return value
    try:
        value=json.loads(data.decode('utf-8'),object_pairs_hook=unique,
                         parse_constant=lambda _:(_ for _ in ()).throw(UpdateError('Geçersiz sayı.')))
    except (ValueError,UnicodeDecodeError):raise UpdateError('Güncelleme bilgisi okunamadı.') from None
    if not isinstance(value,dict):raise UpdateError('Geçersiz güncelleme bilgisi.')
    return value


@dataclass(frozen=True)
class UpdatePolicy:
    manifest_url:str
    channel:str='stable'
    publisher_sha256:str=''
    product_name:str='IPScans LPR Pro'

    def __post_init__(self):
        https_origin(self.manifest_url)
        if self.channel not in ('stable','preview'):raise UpdateError('Geçersiz güncelleme kanalı.')
        if not isinstance(self.publisher_sha256,str) or (self.publisher_sha256 and not HASH.fullmatch(self.publisher_sha256)):raise UpdateError('Geçersiz yayıncı sertifikası parmak izi.')
        if not isinstance(self.product_name,str) or not 1<=len(self.product_name)<=120 or self.product_name.strip()!=self.product_name or any(ord(c)<32 for c in self.product_name):raise UpdateError('Geçersiz ürün kimliği.')


@dataclass(frozen=True)
class ReleaseManifest:
    version:str
    channel:str
    url:str
    sha256:str
    size:int
    schema:int=1
    app:str=APP_ID


def parse_manifest(data,policy):
    if len(data)>MAX_MANIFEST_BYTES:raise UpdateError('Güncelleme bilgisi çok büyük.')
    fields=decode_json(data)
    if set(fields)!={'schema','app','version','channel','url','sha256','size'}:
        raise UpdateError('Güncelleme alanları geçersiz; manifest yayıncı güveni tanımlayamaz.')
    if type(fields['schema']) is not int or fields['schema']!=1 or fields['app']!=APP_ID:raise UpdateError('Güncelleme bu uygulamaya ait değil.')
    key=version_key(fields['version'])
    if fields['channel']!=policy.channel or (policy.channel=='stable' and key[3]!=2):raise UpdateError('Güncelleme kanalı veya kararlılık düzeyi uygun değil.')
    if not isinstance(fields['sha256'],str) or not HASH.fullmatch(fields['sha256']):raise UpdateError('Geçersiz paket özeti.')
    if type(fields['size']) is not int or not 1<=fields['size']<=MAX_INSTALLER_BYTES:raise UpdateError('Geçersiz paket boyutu.')
    if https_origin(fields['url'])!=https_origin(policy.manifest_url):raise UpdateError('Paket adresi güvenilen yayın kaynağından farklı.')
    return ReleaseManifest(**fields)


@dataclass(frozen=True)
class UpdateStatus:
    code:str
    message:str
    manifest:ReleaseManifest|None=None
    path:Path|None=None


class SameOriginRedirect(HTTPRedirectHandler):
    max_redirections=5
    max_repeats=2

    def __init__(self,origin):
        super().__init__();self.origin=origin

    def redirect_request(self,req,fp,code,msg,headers,newurl):
        target=urljoin(req.full_url,newurl)
        if https_origin(target)!=self.origin:raise UpdateError('Güncelleme başka bir kaynağa yönlendirildi.')
        return super().redirect_request(req,fp,code,msg,headers,target)


class HTTPSReader:
    """Bound both bytes and time; never follow a redirect to a different origin."""
    def __init__(self,origin,*,timeout=10,deadline=300):
        if not 0<timeout<=30 or not 0<deadline<=900:raise UpdateError('Geçersiz indirme süresi.')
        self.origin,self.timeout,self.deadline=origin,timeout,deadline
        self.opener=build_opener(ProxyHandler({}),SameOriginRedirect(origin))

    def chunks(self,url,maximum):
        if https_origin(url)!=self.origin:raise UpdateError('Güvenilmeyen indirme kaynağı.')
        request=Request(url,headers={'Accept-Encoding':'identity','User-Agent':'IPScans-LPR-Updater/1'})
        started=time.monotonic();total=0
        try:
            with self.opener.open(request,timeout=self.timeout) as response:
                if https_origin(response.geturl())!=self.origin:raise UpdateError('Güvenilmeyen indirme yönlendirmesi.')
                if response.status!=200:raise UpdateError('Güncelleme sunucusu dosyayı sağlamadı.')
                if response.headers.get('Content-Encoding','identity').lower() not in ('identity',''):raise UpdateError('Sıkıştırılmış güncelleme aktarımı kabul edilmedi.')
                length=response.headers.get('Content-Length')
                if length is not None and (not length.isdigit() or int(length)>maximum):raise UpdateError('İndirme boyutu sınırı aşıldı.')
                while True:
                    if time.monotonic()-started>self.deadline:raise UpdateError('Güncelleme indirme süresi doldu.')
                    block=response.read(min(256*1024,maximum-total+1))
                    if not block:break
                    total+=len(block)
                    if total>maximum:raise UpdateError('İndirme boyutu sınırı aşıldı.')
                    yield block
                if length is not None and total!=int(length):raise UpdateError('İndirme tamamlanmadı.')
        except UpdateError:raise
        except Exception:raise UpdateError('Güncelleme güvenli olarak indirilemedi.') from None


def authenticode_identity(path):
    """Ask Windows to validate trust, then read signer identity and signed resources.

    An encoded *constant* script reads the filename from the process environment;
    filenames are never interpolated into PowerShell code or evaluated as commands.
    """
    if os.name!='nt':raise UpdateError('İmza doğrulaması Windows gerektirir.')
    import ctypes
    buffer=ctypes.create_unicode_buffer(32768)
    if not ctypes.windll.kernel32.GetWindowsDirectoryW(buffer,len(buffer)):
        raise UpdateError('Windows doğrulayıcısı bulunamadı.')
    executable=Path(buffer.value)/'System32/WindowsPowerShell/v1.0/powershell.exe'
    script='''$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$file=$env:IPSCANS_UPDATE_FILE
$signature=Get-AuthenticodeSignature -LiteralPath $file
$fingerprint=''
if ($null -ne $signature.SignerCertificate) {
  $sha=[Security.Cryptography.SHA256]::Create()
  try { $fingerprint=[BitConverter]::ToString($sha.ComputeHash($signature.SignerCertificate.RawData)).Replace('-','').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
$version=[Diagnostics.FileVersionInfo]::GetVersionInfo($file)
@{status=$signature.Status.ToString();publisher_sha256=$fingerprint;product_name=$version.ProductName;version=$version.ProductVersion} | ConvertTo-Json -Compress
'''
    env=dict(os.environ);env['IPSCANS_UPDATE_FILE']=str(Path(path).resolve())
    # Do not import caller-supplied PowerShell modules or a PowerShell 7 module
    # into the system Windows PowerShell verifier.
    env['PSModulePath']=str(executable.parent/'Modules')
    try:
        result=subprocess.run([str(executable),'-NoProfile','-NonInteractive','-EncodedCommand',base64.b64encode(script.encode('utf-16le')).decode('ascii')],
            env=env,capture_output=True,timeout=45,creationflags=subprocess.CREATE_NO_WINDOW,check=False)
        if result.returncode or len(result.stdout)>8192:raise UpdateError('Windows paket imzasını doğrulayamadı.')
        return decode_json(result.stdout)
    except (OSError,subprocess.SubprocessError):raise UpdateError('Windows paket imzasını doğrulayamadı.') from None


def verify_authenticode(path,manifest,policy,*,identity_reader=authenticode_identity):
    if not policy.publisher_sha256:raise UpdateError('Güvenilen yayıncı sertifikası yapılandırılmadı.')
    identity=identity_reader(path)
    if identity.get('status')!='Valid':raise UpdateError('Kurulum dosyasının Windows imzası geçerli değil.')
    actual=identity.get('publisher_sha256','')
    if not isinstance(actual,str) or not hmac.compare_digest(actual,policy.publisher_sha256):raise UpdateError('Kurulum dosyasının yayıncısı güvenilen yayıncıyla eşleşmiyor.')
    # Inno Setup pads string resources. Ignore padding only, not version content.
    product=identity.get('product_name');version=identity.get('version')
    if not isinstance(product,str) or not isinstance(version,str) or product.rstrip(' \0')!=policy.product_name or version.rstrip(' \0')!=manifest.version:
        raise UpdateError('İmzalı ürün veya sürüm bilgisi güncellemeyle eşleşmiyor.')


class UpdateManager:
    def __init__(self,directory,policy,*,reader=None,signature_verifier=verify_authenticode):
        self.directory=Path(directory)
        self.policy=policy
        self.reader=reader or HTTPSReader(https_origin(policy.manifest_url))
        self.verify_signature=signature_verifier

    def _configured(self):
        if not self.policy.publisher_sha256:
            return UpdateStatus('signing_not_configured','Güvenilen imza sertifikası yapılandırılmadı; güncelleme indirme kapalı.')
        return None

    def _state(self):
        path=self.directory/'state.json'
        if not path.exists():return {'schema':1,'staged':None,'previous':None,'high_water_version':None}
        try:
            with path.open('rb') as source:data=source.read(MAX_MANIFEST_BYTES+1)
            if len(data)>MAX_MANIFEST_BYTES:raise UpdateError('Güncelleme durumu çok büyük.')
            state=decode_json(data)
            if set(state)!={'schema','staged','previous','high_water_version'} or type(state['schema']) is not int or state['schema']!=1:raise UpdateError('Güncelleme durumu geçersiz.')
            if state['high_water_version'] is not None:version_key(state['high_water_version'])
            for key in ('staged','previous'):
                record=state[key]
                if record is None:continue
                if set(record)!={'manifest','filename','publisher_sha256','product_name'}:raise UpdateError('Güncelleme kaydı geçersiz.')
                manifest=parse_manifest(json.dumps(record['manifest']).encode(),self.policy)
                if state['high_water_version'] is None or version_key(state['high_water_version'])<version_key(manifest.version):raise UpdateError('Güncelleme sürüm geçmişi tutarsız.')
                if record['filename']!=manifest.sha256+'.exe':raise UpdateError('Güncelleme yolu geçersiz.')
                if record['publisher_sha256']!=self.policy.publisher_sha256 or record['product_name']!=self.policy.product_name:raise UpdateError('Güncelleme güven ilkesi değişti; kayıt yeniden kurulmalı.')
            return state
        except UpdateError:raise
        except Exception:raise UpdateError('Önceki güncelleme durumu okunamadı; korunuyor.') from None

    def _baseline(self,current_version,state):
        values=[current_version]
        if state['high_water_version']:values.append(state['high_water_version'])
        return max(values,key=version_key)

    def check(self,current_version):
        if status:=self._configured():return status
        try:
            state=self._state();baseline=self._baseline(current_version,state)
            data=b''.join(self.reader.chunks(self.policy.manifest_url,MAX_MANIFEST_BYTES))
            manifest=parse_manifest(data,self.policy)
            if version_key(manifest.version)<=version_key(baseline):
                return UpdateStatus('up_to_date','Daha yeni bir sürüm bulunamadı; eski sürüme otomatik geçiş yapılmaz.',manifest)
            return UpdateStatus('update_available','Yeni sürüm bulundu. İndirildikten sonra yayıncı imzası doğrulanacak.',manifest)
        except Exception as error:
            return self._failure(error)

    @staticmethod
    def _failure(error):
        return UpdateStatus('failed',str(error) if isinstance(error,UpdateError) else 'Güncelleme işlemi tamamlanamadı; önceki paket korundu.')

    def _verify_file(self,path,manifest):
        if path.is_symlink() or not path.is_file() or path.stat().st_size!=manifest.size:raise UpdateError('Paket boyutu veya dosya türü uygun değil.')
        digest=hashlib.sha256()
        with path.open('rb') as source:
            if source.read(2)!=b'MZ':raise UpdateError('Paket bir Windows kurulum dosyası değil.')
            source.seek(0);total=0
            for block in iter(lambda:source.read(256*1024),b''):
                total+=len(block)
                if total>manifest.size:raise UpdateError('Doğrulama sırasında paket boyutu değişti.')
                digest.update(block)
        if not hmac.compare_digest(digest.hexdigest(),manifest.sha256):raise UpdateError('Paket bütünlük doğrulamasından geçemedi.')
        self.verify_signature(path,manifest,self.policy)

    def _write_state(self,state):
        descriptor,filename=tempfile.mkstemp(prefix='.state-',suffix='.json',dir=self.directory)
        temporary=Path(filename)
        try:
            with os.fdopen(descriptor,'wb') as target:
                target.write(json.dumps(state,sort_keys=True,separators=(',',':')).encode('utf-8'))
                target.flush();os.fsync(target.fileno())
            os.replace(temporary,self.directory/'state.json')
        finally:temporary.unlink(missing_ok=True)

    def stage(self,manifest,current_version):
        if status:=self._configured():return status
        temporary=None;lock=None
        try:
            manifest=parse_manifest(json.dumps(asdict(manifest)).encode('utf-8'),self.policy)
            self.directory.mkdir(parents=True,exist_ok=True)
            lock_path=self.directory/'.stage.lock'
            try:descriptor=os.open(lock_path,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
            except FileExistsError:
                raise UpdateError('Başka bir güncelleme sürüyor veya önceki işlem kilidi incelenmeli.') from None
            lock=lock_path
            os.close(descriptor)
            state=self._state();baseline=self._baseline(current_version,state)
            if version_key(manifest.version)<=version_key(baseline):raise UpdateError('Aynı veya eski sürüm güncelleme olarak hazırlanamaz.')
            descriptor,filename=tempfile.mkstemp(prefix='.download-',suffix='.exe',dir=self.directory)
            temporary=Path(filename);total=0
            with os.fdopen(descriptor,'wb') as target:
                for block in self.reader.chunks(manifest.url,manifest.size):
                    total+=len(block)
                    if total>manifest.size:raise UpdateError('Paket bildirilen boyutu aştı.')
                    target.write(block)
                target.flush();os.fsync(target.fileno())
            self._verify_file(temporary,manifest)
            target=self.directory/(manifest.sha256+'.exe')
            if target.exists():self._verify_file(target,manifest);temporary.unlink();temporary=None
            else:os.replace(temporary,target);temporary=None
            record={'manifest':asdict(manifest),'filename':target.name,
                    'publisher_sha256':self.policy.publisher_sha256,'product_name':self.policy.product_name}
            self._write_state({'schema':1,'staged':record,'previous':state['staged'],'high_water_version':manifest.version})
            # Only retire a previously recorded package after the new pointer is committed.
            retired=state['previous']
            if retired and retired['filename'] not in {record['filename'],(state['staged'] or {}).get('filename')}:
                old=self.directory/retired['filename']
                try:
                    if not old.is_symlink():old.unlink(missing_ok=True)
                except OSError:pass  # A retained old package is safer than a failed staged update.
            return UpdateStatus('staged','Paket bütünlüğü ve yayıncı imzası doğrulandı. Kurulum başlatılmadı.',manifest,target)
        except Exception as error:return self._failure(error)
        finally:
            if temporary is not None:
                try:temporary.unlink(missing_ok=True)
                except OSError:pass
            if lock is not None:
                try:lock.unlink(missing_ok=True)
                except OSError:pass

    def candidate(self,*,previous=False):
        if status:=self._configured():return status
        try:
            record=self._state()['previous' if previous else 'staged']
            if record is None:return UpdateStatus('no_previous' if previous else 'not_staged','Doğrulanacak kayıtlı paket yok.')
            manifest=parse_manifest(json.dumps(record['manifest']).encode(),self.policy)
            target=self.directory/record['filename'];self._verify_file(target,manifest)
            return UpdateStatus('previous_verified' if previous else 'staged',
                'Önceki paket yeniden doğrulandı; geri dönüş başlatılmadı.' if previous else 'Hazır paket yeniden doğrulandı; kurulum başlatılmadı.',manifest,target)
        except Exception as error:return self._failure(error)

    def rollback_candidate(self):
        return self.candidate(previous=True)
