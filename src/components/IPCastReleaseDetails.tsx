import type { Locale } from "@/i18n/config";
import { ipcastRelease, platformCopy } from "@/content/applications";

export function IPCastReleaseDetails({ locale }: { locale: Locale }) {
  const copy = platformCopy[locale];
  const labels: Record<Locale, readonly [string, string, string, string, string]> = {
    tr: ["Yayın tarihi", "Kurulum paketini indir", "Sürüm notları", "Taşınabilir EXE", "İmzasız · SHA-256 bütünlük kontrolü"],
    en: ["Release date", "Download installer", "Release notes", "Portable EXE", "Unsigned · SHA-256 integrity check"],
    de: ["Veröffentlicht", "Installer herunterladen", "Versionshinweise", "Portable EXE", "Nicht signiert · SHA-256-Integritätsprüfung"],
    fr: ["Date de publication", "Télécharger l'installateur", "Notes de version", "EXE portable", "Non signé · Contrôle d'intégrité SHA-256"],
    es: ["Fecha de publicación", "Descargar instalador", "Notas de versión", "EXE portátil", "Sin firma · Verificación SHA-256"],
    it: ["Data di rilascio", "Scarica installer", "Note di rilascio", "EXE portatile", "Non firmato · Verifica integrità SHA-256"],
    pt: ["Data de lançamento", "Descarregar instalador", "Notas de lançamento", "EXE portátil", "Sem assinatura · Verificação SHA-256"],
    nl: ["Releasedatum", "Installatieprogramma downloaden", "Releaseopmerkingen", "Draagbare EXE", "Niet ondertekend · SHA-256-integriteitscontrole"],
    pl: ["Data wydania", "Pobierz instalator", "Informacje o wydaniu", "Przenośny EXE", "Bez podpisu · Kontrola integralności SHA-256"],
    ru: ["Дата выпуска", "Скачать установщик", "Примечания к выпуску", "Портативный EXE", "Без подписи · Проверка SHA-256"],
    ar: ["تاريخ الإصدار", "تنزيل برنامج التثبيت", "ملاحظات الإصدار", "ملف EXE محمول", "غير موقّع · التحقق من SHA-256"],
    ja: ["公開日", "インストーラーをダウンロード", "リリースノート", "ポータブル EXE", "未署名 · SHA-256 整合性確認"],
    ko: ["출시일", "설치 프로그램 다운로드", "릴리스 정보", "포터블 EXE", "서명되지 않음 · SHA-256 무결성 검사"],
    zh: ["发布日期", "下载安装程序", "发行说明", "便携版 EXE", "未签名 · SHA-256 完整性校验"],
  };
  const label = labels[locale];
  return (
    <dl className="mt-6 space-y-3 rounded-xl border border-white/15 bg-white/[0.03] p-4 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-400">{copy.version}</dt><dd className="text-white">{ipcastRelease.version} · {copy.preview}</dd></div>
      <div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-400">{copy.platform}</dt><dd className="text-white">{ipcastRelease.platform}</dd></div>
      <div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-400">{label[0]}</dt><dd className="text-white"><time dateTime={ipcastRelease.publishedAt}>{new Date(ipcastRelease.publishedAt).toLocaleDateString(locale, { timeZone: "UTC" })}</time></dd></div>
      <div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-400">{copy.size}</dt><dd className="text-white">{(ipcastRelease.bytes / 1024 / 1024).toFixed(1)} MiB</dd></div>
      <div><dt className="text-neutral-400">{copy.checksum}</dt><dd className="mt-1 break-all font-mono text-xs text-white">{ipcastRelease.sha256}</dd></div>
      <div><dt className="text-neutral-400">{label[4]}</dt><dd className="mt-3 flex flex-wrap gap-3">
        <a className="rounded-lg border border-white/25 px-3 py-2 text-white hover:bg-white/10" href={ipcastRelease.installerUrl}>{label[1]} · {(ipcastRelease.installerBytes / 1024 / 1024).toFixed(1)} MiB</a>
        <a className="px-2 py-2 text-neutral-300 underline underline-offset-4" href={ipcastRelease.url}>{label[3]}</a>
        <a className="px-2 py-2 text-neutral-300 underline underline-offset-4" href={ipcastRelease.releaseUrl}>{label[2]}</a>
      </dd></div>
    </dl>
  );
}
