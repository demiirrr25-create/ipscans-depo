# IPScans

IPScans is a Next.js network-tools platform. The web tools include IP lookup, DNS, WHOIS, port checking and a browser-based speed test. Local network discovery requires the downloadable Windows IPscans+ application; a browser cannot directly scan a local network.

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

The primary IPscans+ download links to its [Windows 3.0.0 release](https://github.com/demiirrr25-create/ipscans-depo/releases/tag/ipscans-plus-v3.0.0). The product detail page also offers a portable executable, both sizes and SHA-256 hashes, and release notes. The Windows workflow builds and smoke-tests the user-toggleable desktop shortcut, source/packaged/installed EXE, embedded version metadata and uninstall process. IPCast 2.5's installer and portable EXE are published in [its release](https://github.com/demiirrr25-create/ipscans-depo/releases/tag/ipcast-v2.5.0).

The [desktop source](desktop-app/README.md) contains IPscans+ 3.0.0
Next Generation: progressive discovery, a unified Network Map,
capability-driven verified-HTTPS ONVIF management, potential conflict
evidence and bounded scan history. [Release notes](desktop-app/RELEASE_NOTES.md)
describe compatibility, unsupported capabilities and validation scope.
The website's 14 locales use shared feature/limitation copy. Previous
2.0.2 assets remain available. Physical camera interoperability and
real-network accuracy have not been measured; in-app changes require
supported verified-HTTPS ONVIF and confirmed administrator permission.

Prepare scanner releases with `node tools/scanner-release.mjs --directory
<artifact-directory> --checksums <Windows-CI-checksums.json> --version
<version> --commit <verified-full-commit> --run <Windows-run-id>`. The helper
refuses binaries that differ from CI or do not have valid Windows PE
headers, and generates the release manifest and hash sidecars. Publish
as a draft first; verify uploaded sizes/digests before making it public
and updating production download metadata.

Network Health Pro is no longer published on the website; its standalone source and historical GitHub release remain in the repository. Its old website download and update endpoint are retired. The old scanner download URL redirects to the current IPscans+ installer for existing bookmarks.

## Search and deployment

Route metadata provides localized canonical URLs and language alternatives. `src/app/sitemap.ts` produces a multilingual `/sitemap.xml` and `src/app/robots.ts` advertises it. Legal policies currently have English and Turkish bodies; untranslated copies are excluded from the sitemap and marked `noindex`. Blog articles are available only in languages with authored content.

The web app is deployed through the existing Vercel project; the scheduled weekly report is configured in `vercel.json`. Production deployment should follow the existing CI/release workflow after validating the production build and checking the live URLs. Never publish a build without reviewing its release configuration and runtime secrets.
