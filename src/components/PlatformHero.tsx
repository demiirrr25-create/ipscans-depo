import { uiText } from '@/i18n/ui';
import Link from 'next/link';
import { InfinityScene } from './InfinityScene';
import { ProductPreview } from './ProductPreview';
import { LiveIp } from './LiveIp';
import { locales, type Locale } from '@/i18n/config';
import { toolKeys, toolPath } from '@/lib/tool-routes';
import { scannerApplication, platformCopy } from '@/content/applications';
import { posts } from '@/content/posts';

export function PlatformHero({locale, ipLabel}: {locale: Locale; ipLabel: string}) {
  const guides = posts.filter((post) => post.body[locale]).length;
  // Every figure is derived from live content so the hero never overstates.
  const stats = [
    { value: String(toolKeys.length), label: uiText(locale, 'web tools', 'web aracı') },
    { value: String(locales.length), label: uiText(locale, 'languages', 'dil') },
    { value: `${guides}+`, label: uiText(locale, 'network guides', 'ağ rehberi') },
    { value: '100%', label: uiText(locale, 'free · no account', 'ücretsiz · hesapsız') },
  ];
  return <>
    <section className="aurora-hero">
      <div className="aurora-hero__glow" aria-hidden="true" />
      <div className="aurora-hero__inner">
        <div>
          <p className="aurora-pill"><b>IPscans+ {scannerApplication.version}</b>{uiText(locale, 'Free network tools · No sign-up', 'Ücretsiz ağ araçları · Kayıt gerekmez')}</p>
          <h1>{uiText(locale,'Every connection.','Her bağlantı.')}<br/><span className="text-aurora">{uiText(locale,'In focus.','Net bir bakış.')}</span></h1>
          <p className="aurora-hero__lead">{uiText(locale,'Discover your network. Understand your devices. See connections with their evidence. Focused network tools for desktop and web.','Ağınızı keşfedin. Cihazları tanıyın. Bağlantıları kanıtlarıyla görün. Masaüstü ve web için sade, güçlü ağ araçları.')}</p>
          <div className="aurora-hero__actions">
            <a href={scannerApplication.downloadUrl} className="btn-primary">{platformCopy[locale].downloadApp} IPscans+ <span aria-hidden="true">↓</span></a>
            <Link href={`/${locale}/download`} className="btn-ghost">{platformCopy[locale].explore} <span aria-hidden="true">→</span></Link>
          </div>
          <div className="aurora-hero__meta">
            <LiveIp label={ipLabel}/>
            <Link href={toolPath('speedTest',locale)}>{uiText(locale,'Measure your connection','Bağlantını ölç')} <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="aurora-hero__visual">
          <div className="aurora-hero__ring" aria-hidden="true" />
          <InfinityScene/>
        </div>
      </div>
      <ul className="aurora-stats">
        {stats.map((stat) => <li key={stat.label} className="aurora-stat"><strong className="text-aurora">{stat.value}</strong><span>{stat.label}</span></li>)}
      </ul>
    </section>
    <section className="infinity-product-story">
      <div>
        <p className="aurora-eyebrow">IPscans+</p>
        <h2 className="mt-4">{uiText(locale,'The pattern behind connections','Bağlantıların ardındaki düzen')}</h2>
        <p className="mb-8 max-w-md leading-relaxed text-neutral-400">{scannerApplication.description[locale]}</p>
        <Link href={`/${locale}/applications/scanner`} className="btn-ghost inline-flex min-h-12 items-center gap-2 px-6 text-sm font-semibold">{platformCopy[locale].details} <span aria-hidden="true">→</span></Link>
      </div>
      <ProductPreview locale={locale}/>
    </section>
  </>;
}
