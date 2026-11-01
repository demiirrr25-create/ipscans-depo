# IPScans

IPScans is a Next.js network-tools platform. The web tools include IP lookup, DNS, WHOIS, port checking and a browser-based speed test. Local network discovery requires the downloadable Windows IPscans+ application; a browser cannot directly scan a local network.

## Website development

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

## Windows applications

Build the Rust workspace from the repository root on a Windows x64 host with Rust MSVC and the Windows SDK installed.

```powershell
cargo test --workspace --locked
cargo build --release --workspace --locked
.\target\release\ipscans-network-scanner.exe --selftest
```

The active packages live in [crates](crates). The [Windows verification workflow](.github/workflows/windows-rust.yml) builds all workspace targets, runs all eight desktop self-tests, verifies each desktop copy by SHA-256, and requests the installed application's local screen and PNG icon. A successful run uploads the tested executables and a commit-bound checksum manifest as a CI artifact. GitHub Releases and production downloads are published separately.

Earlier desktop implementations and their release notes remain in the top-level product directories for comparison. See the [IPScans+ 4.3 release notes](desktop-app/V43_RELEASE.md) for the historical feature baseline.

## Search and deployment

Route metadata provides localized canonical URLs and language alternatives. `src/app/sitemap.ts` produces a multilingual `/sitemap.xml` and `src/app/robots.ts` advertises it. Legal policies currently have English and Turkish bodies; untranslated copies are excluded from the sitemap and marked `noindex`. Blog articles are available only in languages with authored content.

The web app is deployed through the existing Vercel project; the scheduled weekly report is configured in `vercel.json`. Production deployment should follow the existing CI/release workflow after validating the production build and checking the live URLs. Never publish a build without reviewing its release configuration and runtime secrets.
