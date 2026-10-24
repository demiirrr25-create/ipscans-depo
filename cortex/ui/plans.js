/* Package presentation uses the server's catalog. Cloud is deliberately unavailable. */
let planRenderKey = '';
function renderPlans() {
  if (!state) return;
  const en = currentLang === 'en';
  const t = (tr, english) => en ? english : tr;
  const lic = state.license || {};
  const tier = ['PRO','PLUS','ULTRA'].includes(lic.plan) ? lic.plan : 'PRO';
  const plans = state.licensePlans || {};
  const spec = plans[tier];
  if (!spec) return;
  const cameras = (state.cameras || []).length;
  const rules = (state.rules || []).length;
  const phones = (state.phones || []).length;
  const maxPhones = spec.maxPhones || (tier === 'ULTRA' ? 12 : (tier === 'PLUS' ? 6 : 2));
  const key = JSON.stringify([tier, cameras, rules, phones, lic.status, currentLang, plans]);
  if (key === planRenderKey) return;
  planRenderKey = key;
  const nav = document.querySelector('nav [data-tab="plans"] span:last-child');
  if (nav) nav.textContent = t('Paketler', 'Plans');
  const usage = (label, used, limit) => `<div class="plan-meter"><div><span>${label}</span><strong>${used}<small> / ${limit}</small></strong></div><progress value="${Math.min(used,limit)}" max="${limit}" aria-label="${label}: ${used} / ${limit}"></progress>${used >= limit ? `<small class="capacity-note">${t('Paket kapasitesine ulaşıldı','Plan capacity reached')}</small>` : ''}</div>`;
  const spotlight = document.querySelector('#planSpotlight');
  if (spotlight) {
    spotlight.hidden = false;
    spotlight.className = tier === 'ULTRA' ? 'plan-spotlight is-ultra' : 'plan-spotlight';
    spotlight.innerHTML = `<div class="plan-pitch"><span class="plan-kicker">${t('ÇALIŞMA ALANINIZ','YOUR WORKSPACE')} / CORTEX ${tier}</span><h2>${tier === 'ULTRA' ? t('Tüm sahanız. Tek kontrol merkezi.','Your whole site. One control center.') : t('Daha geniş bir görüş. Daha fazla kontrol.','A wider view. More control.')}</h2><p>${tier === 'ULTRA' ? t('32 kamera, 128 kural ve 30 güne kadar yerel olay arşivi. Ultra ayrıcalıklarınızı keşfedin.','32 cameras, 128 rules and up to 30 days of local event history. Explore your Ultra benefits.') : t('Ultra ile 32 kameraya, 128 kurala ve 30 günlük olay arşivine geçin.','Move to Ultra for 32 cameras, 128 rules and 30 days of event history.')}</p><button type="button" class="primary" data-tab="plans">${tier === 'ULTRA' ? t('Paketimi keşfet','Explore my plan') : t('Ultra ayrıcalıklarını keşfet','Explore Ultra benefits')} <span aria-hidden="true">↗</span></button></div><div class="plan-usage"><span class="plan-kicker">${t('MEVCUT KULLANIM','CURRENT USAGE')}</span>${usage(t('Kamera','Cameras'),cameras,spec.maxCameras)}${usage(t('Kural','Rules'),rules,spec.maxRules)}${usage(t('Telegram Alıcı','Telegram Recipients'),phones,maxPhones)}</div>`;
  }
  const descriptions = {
    PRO: t('Küçük işletmeler için yerel gözlem.','Local monitoring for small businesses.'),
    PLUS: t('Görsel AI ile daha derin analiz.','Deeper analysis with vision AI.'),
    ULTRA: t('Tüm saha için kapsamlı denetim.','Comprehensive control across your site.')
  };
  const details = {
    PRO: [t('Yerel kurallar ve geçiş kontrolü','Local rules and crossing detection'),t('Bölge çizim stüdyosu','Region drawing studio'),t('Telegram bildirimleri','Telegram alerts'),t('Site ve perakende paketleri','Residential and retail packs')],
    PLUS: [t('PRO özelliklerinin tamamı','Everything in PRO'),t('Ollama görsel AI ve akıllı takip','Ollama vision AI and smart tracking'),t('İki yönlü Telegram ve kanıt ZIP','Two-way Telegram and evidence ZIP'),t('7 sektör paketi','7 sector packs')],
    ULTRA: [t('PLUS özelliklerinin tamamı','Everything in PLUS'),t('Copilot arama ve gizlilik maskeleme','Copilot search and privacy masking'),t('İmzalı webhook ve denetim izi','Signed webhooks and audit trail'),t('NVR filo yönetimi ve 8 sektör','NVR fleet management and 8 sectors')]
  };
  const planCenter = document.querySelector('#planCenter');
  if (!planCenter) return;
  planCenter.innerHTML = `<div class="plans-heading"><span class="eyebrow">CORTEX / ${t('PAKETLER','PLANS')}</span><h1>${t('Sahanız büyüdükçe,<br>kontrol sizde kalsın.','As your site grows,<br>stay in control.')}</h1><p>${t('İhtiyacınıza uygun kapasiteyi seçin. Mevcut paketiniz ve kullanımınız her zaman görünür.','Choose the capacity you need. Your current plan and usage stay visible.')}</p></div><div class="plan-current"><span>${t('Aktif paket','Current plan')}: <strong>Cortex ${tier}</strong></span><span>${cameras} / ${spec.maxCameras} ${t('kamera','cameras')} · ${rules} / ${spec.maxRules} ${t('kural','rules')} · ${phones} / ${maxPhones} ${t('alıcı','recipients')}</span><span>${lic.status === 'suspended' ? t('Askıya alınmış','Suspended') : t('Yerel çalışma','Local processing')}</span></div><div class="plans-grid">${['PRO','PLUS','ULTRA'].map(name => {
    const p=plans[name]; if (!p) return '';
    const isCurrent = name === tier;
    return `<article class="plan-option ${name === 'ULTRA' ? 'featured' : ''} ${isCurrent ? 'is-current-plan' : ''}" aria-label="Cortex ${name}"><div class="plan-option-top"><span class="plan-kicker">CORTEX ${name}</span><span class="plan-chip ${isCurrent ? 'is-active-chip' : ''}">${isCurrent ? t('Paketiniz','Your plan') : name === 'ULTRA' ? t('En kapsamlı','Most complete') : t('Yerel','Local')}</span></div><h2>${p.maxCameras}<small> ${t('kamera','cameras')}</small></h2><p>${descriptions[name]}</p><div class="plan-numbers"><strong>${p.maxRules} ${t('kural','rules')}</strong><span>${p.maxRetentionDays} ${t('gün olay arşivi','days of event history')}</span></div><ul>${details[name].map(x=>`<li><span aria-hidden="true">✓</span>${x}</li>`).join('')}</ul><button type="button" data-tab="settings" class="${name === 'ULTRA' ? 'primary' : ''}">${isCurrent ? t('Lisansımı yönet','Manage my license') : t('Lisans anahtarını etkinleştir','Activate a license key')} ↗</button></article>`;
  }).join('')}</div><section class="cloud-roadmap"><div class="cloud-symbol" aria-hidden="true">☁</div><div><span class="plan-kicker">ULTRA / ${t('PLANLANAN ÖZELLİK','PLANNED FEATURE')}</span><h2>${t('Bilgisayar kapalıyken de takip.','Monitoring when your PC is off.')}</h2><p>${t('Bulutta kesintisiz çalışma henüz sunulmuyor ve mevcut pakete dahil aktif bir hizmet değildir. Ayrı bir sunucu ve kamera ağına bilgisayardan bağımsız erişim kurulması gerekir. Bu sürümde analiz için Cortex’in çalıştığı bilgisayar açık kalmalıdır.','Continuous cloud processing is not available and is not an active service included in your plan. It requires a separate server and camera access independent of your PC. In this release, the computer running Cortex must stay on for analysis.')}</p><span class="plan-chip">${t('Henüz kullanıma açık değil','Not available yet')}</span></div></section><p class="plan-footnote">${t('Arşiv süresi olay kayıtları içindir; kesintisiz NVR video kaydı değildir. Kapasite, kamera akışına ve donanıma göre değişir. Paket değişimi için yetkili sağlayıcınızdan lisans anahtarı alın.','Retention applies to event evidence, not continuous NVR recording. Performance depends on your camera streams and hardware. Contact your authorized provider for a plan license key.')}</p>`;
}
