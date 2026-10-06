# IPScans

IPScans is a Next.js network-tools platform. The web tools include IP lookup, DNS, WHOIS, port checking and a browser-based speed test. Local network discovery requires the downloadable Windows IP Scanner; a browser cannot directly scan a local network.

## Development

```bash
npm ci
npm run dev
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Open `/en` or another supported locale. Locale-prefixed URLs are canonical; `/` redirects according to the saved language preference or the browser's `Accept-Language` header. Add new locales in `src/i18n/config.ts`, supply complete strings in `src/i18n/dictionaries.ts` and `src/content/applications.ts`, and update `src/lib/tool-routes.ts`. Do not expose untranslated pages to search engines as translated alternatives.

The product directory and inline header search share application and tool definitions. `Ctrl+K` / `Cmd+K` focuses the search field; results appear underneath it and support the arrow keys, Enter and Escape. Each desktop product has an isolated `/[locale]/applications/[id]` detail page. `/[locale]/ip-scanner` explains local discovery and links to the Windows download; `/[locale]/scan` contains general network-scanning guidance.

The current website downloads are portable executables. The Windows desktop workflows also build and smoke-test optional Inno Setup installers with a default-on, user-toggleable desktop shortcut task; these are uploaded as separate CI artifacts. Do not describe the portable downloads as installers or link to installer files until they have actually been published.

## Search and deployment

Route metadata provides localized canonical URLs and language alternatives. `src/app/sitemap.ts` produces a multilingual `/sitemap.xml` and `src/app/robots.ts` advertises it. Legal policies currently have English and Turkish bodies; untranslated copies are excluded from the sitemap and marked `noindex`. Blog articles are available only in languages with authored content.

The web app is deployed through the existing Vercel project; the scheduled weekly report is configured in `vercel.json`. Production deployment should follow the existing CI/release workflow after validating the production build and checking the live URLs. Never publish a build without reviewing its release configuration and runtime secrets.
