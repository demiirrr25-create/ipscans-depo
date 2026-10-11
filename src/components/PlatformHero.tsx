import { uiText } from '@/i18n/ui';
import Link from 'next/link';
import { InfinityScene } from './InfinityScene';
import { ProductPreview } from './ProductPreview';
import { LiveIp } from './LiveIp';
import type { Locale } from '@/i18n/config';
import { toolPath } from '@/lib/tool-routes';
import { scannerApplication, platformCopy } from '@/content/applications';
export function PlatformHero({locale, ipLabel}: {locale: Locale; ipLabel: string}) {
  return <>
    <section className="infinity-hero">
      <div className="infinity-hero-grid">
        <div className="infinity-hero-copy">
          <h1>{uiText(locale,'Every connection.','Her bağlantı.')}<br/><span>{uiText(locale,'In focus.','Net bir bakış.')}</span></h1>
          <p className="infinity-intro">{uiText(locale,'Discover your network. Understand your devices. See connections with their evidence. Focused network tools for desktop and web.','Ağınızı keşfedin. Cihazları tanıyın. Bağlantıları kanıtlarıyla görün. Masaüstü ve web için sade, güçlü ağ araçları.')}</p>
          <div className="infinity-actions"><a href={scannerApplication.downloadUrl} className="btn-primary">{platformCopy[locale].downloadApp} IPscans+ <span aria-hidden="true">↓</span></a><Link href={`/${locale}/download`} className="infinity-text-link">{platformCopy[locale].explore} <span aria-hidden="true">↗</span></Link></div>
        </div>
        <div className="infinity-visual"><InfinityScene/></div>
      </div>
      <div className="infinity-status"><LiveIp label={ipLabel}/><Link href={toolPath('speedTest',locale)}>{uiText(locale,'Measure your connection','Bağlantını ölç')} <span aria-hidden="true">↗</span></Link><span aria-hidden="true">↓</span></div>
    </section>
    <section className="infinity-product-story">
      <div><h2>{uiText(locale,'The pattern behind connections','Bağlantıların ardındaki düzen')}</h2><Link href={`/${locale}/applications/scanner`} className="infinity-text-link">{platformCopy[locale].details} ↗</Link></div>
      <ProductPreview locale={locale}/>
    </section>
  </>;
}
