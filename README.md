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

The homepage hero is server-rendered without an animation-library hydration cost. Its Canvas network decoration renders a static frame on small screens and when reduced motion is requested; primary content remains visible without JavaScript.

The primary desktop downloads link to verified Windows installers in the [desktop-apps-2026.10.06 release](https://github.com/demiirrr25-create/ipscans-depo/releases/tag/desktop-apps-2026.10.06). Each product detail page also offers a portable executable, installer size and SHA-256 hash. The Windows workflows build and smoke-test default-on, user-toggleable desktop shortcuts; installers and portable builds are uploaded as separate CI artifacts. IPCast 2.5's installer and portable EXE are published in [its release](https://github.com/demiirrr25-create/ipscans-depo/releases/tag/ipcast-v2.5.0).

## Search and deployment

Route metadata provides localized canonical URLs and language alternatives. `src/app/sitemap.ts` produces a multilingual `/sitemap.xml` and `src/app/robots.ts` advertises it. Legal policies currently have English and Turkish bodies; untranslated copies are excluded from the sitemap and marked `noindex`. Blog articles are available only in languages with authored content.

The web app is deployed through the existing Vercel project; the scheduled weekly report is configured in `vercel.json`. Production deployment should follow the existing CI/release workflow after validating the production build and checking the live URLs. Never publish a build without reviewing its release configuration and runtime secrets.
