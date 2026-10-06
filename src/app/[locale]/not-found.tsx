"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";

const copy: Record<Locale, { message: string; home: string; tools: string; search: string }> = {
  en: { message: "This address is not available. Return to the network or find another tool.", home: "Go home", tools: "Explore tools", search: "Search" },
  tr: { message: "Bu adrese ulaşılamıyor. Ana sayfaya dönün veya başka bir araç bulun.", home: "Ana sayfa", tools: "Araçları keşfet", search: "Ara" },
  de: { message: "Diese Adresse ist nicht verfügbar. Zur Startseite zurückkehren oder ein anderes Tool finden.", home: "Startseite", tools: "Tools entdecken", search: "Suchen" },
  fr: { message: "Cette adresse est introuvable. Revenez à l'accueil ou trouvez un autre outil.", home: "Accueil", tools: "Explorer les outils", search: "Rechercher" },
  es: { message: "Esta dirección no está disponible. Vuelve al inicio o busca otra herramienta.", home: "Inicio", tools: "Explorar herramientas", search: "Buscar" },
  it: { message: "Questo indirizzo non è disponibile. Torna alla home o trova un altro strumento.", home: "Home", tools: "Esplora gli strumenti", search: "Cerca" },
  pt: { message: "Este endereço não está disponível. Volte ao início ou encontre outra ferramenta.", home: "Início", tools: "Explorar ferramentas", search: "Pesquisar" },
  nl: { message: "Dit adres is niet beschikbaar. Ga terug naar de startpagina of vind een ander hulpmiddel.", home: "Startpagina", tools: "Tools ontdekken", search: "Zoeken" },
  pl: { message: "Ten adres jest niedostępny. Wróć na stronę główną lub znajdź inne narzędzie.", home: "Strona główna", tools: "Przeglądaj narzędzia", search: "Szukaj" },
  ru: { message: "Этот адрес недоступен. Вернитесь на главную или найдите другой инструмент.", home: "На главную", tools: "Посмотреть инструменты", search: "Поиск" },
  ar: { message: "هذا العنوان غير متاح. عد إلى الصفحة الرئيسية أو ابحث عن أداة أخرى.", home: "الرئيسية", tools: "استكشاف الأدوات", search: "بحث" },
  ja: { message: "このアドレスは利用できません。ホームに戻るか、別のツールを探してください。", home: "ホームに戻る", tools: "ツールを見る", search: "検索" },
  ko: { message: "이 주소를 사용할 수 없습니다. 홈으로 돌아가거나 다른 도구를 찾아보세요.", home: "홈으로", tools: "도구 살펴보기", search: "검색" },
  zh: { message: "该地址不可用。返回首页或查找其他工具。", home: "返回首页", tools: "探索工具", search: "搜索" },
};

export default function NotFound() {
  const { locale: segment } = useParams<{ locale: string }>();
  const locale = isLocale(segment) ? segment : "en";
  const t = copy[locale];
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-4 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-400">IPSCANS / SIGNAL LOST</p>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(6rem,23vw,16rem)] font-semibold leading-none tracking-[-0.1em]">404<span className="text-neutral-500">.</span></h1>
      <p className="mt-6 max-w-lg text-lg text-neutral-300">{t.message}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href={`/${locale}`} className="btn-primary inline-flex min-h-12 items-center rounded-lg px-6 font-semibold">{t.home} ↗</Link>
        <Link href={`/${locale}/download`} className="btn-ghost inline-flex min-h-12 items-center rounded-lg px-6">{t.tools} ↗</Link>
        <button type="button" onClick={() => document.getElementById("site-search-input")?.focus()} className="btn-ghost min-h-12 rounded-lg px-6">{t.search} ⌕</button>
      </div>
    </div>
  );
}
