# IPScans Design System

The single source of truth for every page. Tokens live in `src/app/globals.css`
(`@theme`), primitives live in `src/components/ds/`. **Do not** add page-level
stylesheets or hard-coded hex colors — compose Tailwind utilities that map to
the tokens below plus the `ds-*` / `btn*` component classes.

## Principles
1. **Calm, light, generous.** White surfaces, lots of air, a strong type
   hierarchy. Dark "stage" panels (`.ds-stage`) are used *sparingly* for emphasis
   (a product demo, a download CTA, the speed-test gauge).
2. **One accent.** The signal gradient (blue → cyan → violet) is the brand. Use
   it for small moments: a dot, a gauge arc, a highlighted word. Never fill
   large areas with it.
3. **No clutter.** No version badges, build numbers, "NEW" pills, technical
   tags, emoji, or filler copy in marketing UI. Technical facts (version,
   SHA-256, file size) belong only in a dedicated, quiet "release details" area
   on download/product pages.
4. **Real things only.** No fake data, placeholder screenshots, or dead
   buttons. Every control does what it says.
5. **Motion with purpose.** Entrance reveals, hover lifts, smooth state
   transitions. Transform/opacity only (GPU). Everything respects
   `prefers-reduced-motion` (handled globally).

## Tokens (Tailwind utilities)
| Purpose | Utilities |
|---|---|
| Surfaces | `bg-surface` (#fff) · `bg-surface-dim` · `bg-surface-2` · `bg-surface-3` |
| Text | `text-ink` · `text-ink-2` (body) · `text-ink-3` (captions) · `text-ink-4` (disabled) |
| Lines | `border-line` · `border-line-2` · `border-line-3` |
| Stage (dark) | `bg-stage` · `bg-stage-2` · `bg-stage-3` · `text-on-stage` · `text-on-stage-2` · `text-on-stage-3` · `border-stage-line` · `border-stage-line-2` |
| Brand | `text-signal` · `bg-signal` · `bg-signal-soft` · `signal-cyan` · `signal-violet` · CSS var `--signal-gradient` |
| Status | `ok` / `ok-soft` · `warn` / `warn-soft` · `bad` / `bad-soft` |
| Radius | `rounded-xs` 6 · `rounded-sm` 10 · `rounded-md` 16 · `rounded-lg` 24 · `rounded-xl` 32 · `rounded-2xl` 44 · `rounded-full` |
| Shadow | `shadow-soft` · `shadow-lift` · `shadow-float` |
| Easing | `ease-out-expo` (default for motion) · `ease-out-quart` · `ease-in-out-soft` |
| Fonts | `font-sans` / `font-display` (Google Sans Flex) · `font-mono` (Google Sans Code) |

## Layout
- `.ds-container` — max 1320px content + responsive page margin. `.ds-container-narrow` — 880px (articles, legal).
- `.ds-section` — standard vertical rhythm between sections (72→160px). `.ds-section-sm` — tighter.
- Header is fixed, height `var(--header-h)` (68px). The first section on a page must pad its top by
  `pt-[calc(var(--header-h)+…)]` (PageShell already does this).

## Type scale
`.ds-display` (hero only) · `.ds-h1` · `.ds-h2` · `.ds-h3` · `.ds-h4` · `.ds-lead` · `.ds-body` · `.ds-caption` · `.ds-eyebrow` (small label with gradient dot) · `.ds-gradient-text` · `.ds-mono` · `.ds-tabular`.

## Components (CSS classes)
- Buttons: `.btn` + one of `.btn-primary` (ink), `.btn-signal` (brand blue), `.btn-secondary` (outlined glass), `.btn-ghost`; on dark stages `.btn-inverse` / `.btn-inverse-secondary`. Sizes `.btn-sm` / `.btn-lg`, `.btn-icon` for square. Put `<Icon name="arrowRight" className="btn-arrow rtl-flip" />` inside for the hover nudge.
- Cards: `.ds-card` (+ `.ds-card-interactive` for hover lift) · `.ds-card-muted` · `.ds-stage` (dark rounded panel) · `.ds-stage-card` (card inside a stage).
- Forms: `.ds-input`, `.ds-label`.
- Data: `.ds-kv` (key/value row), `.ds-divider`, `.ds-chip` (rare), `.ds-skeleton` (loading shimmer), `.ds-spinner`, `.ds-live-dot`.
- Long-form: `.ds-prose`.
- Scroll rail: `.ds-rail` (horizontal snap list).

## React primitives (`src/components/ds/`)
- `<Reveal delay={ms} variant="up|scale" as="div">` — fade/rise on first scroll into view. Stagger siblings with `delay={i * 80}`.
- `<SplitHeading text as="h1" className="ds-h1" delay={ms} />` — words rise in on load (CSS-only, SSR-safe). Use for page/hero headlines.
- `<SignalField variant="hero|ambient|stage" />` — animated brand canvas; place inside a `relative` container (it is `absolute inset-0`).
- `<Icon name="…" size={20} />` — shared stroke icon set; see `Icon.tsx` for names.
- `PageShell` (`src/components/PageShell.tsx`) — standard sub-page hero (eyebrow, title, subtitle, actions, aside) + body container. Pass `bodyClassName=""` to render full-bleed sections yourself.
- `Logo`, `LogoLockup` (`src/components/Logo.tsx`).
- `<CopyButton value label copiedLabel tone />` — clipboard with fallback.

### Product kit (`src/components/ds/product.tsx`)
- `<SectionHeader eyebrow title lead align="start|center" tone="light|dark" />`
- `<ScreenshotFrame src alt width height priority caption tone />` — real screenshots only.
- `<FeatureGrid features={[{title, body, icon}]} columns={2|3} tone />`
- `<ReleaseDetails title rows files copyLabel downloadLabel releaseNotes />` — the **only** place versions, sizes and SHA-256 hashes appear. `formatBytes()` helper exported.
- `<DownloadStage title lead note>{buttons}</DownloadStage>` — dark closing CTA.

## Patterns
- **Section header**: `ds-eyebrow` → `ds-h2` → `ds-lead` (max-w ~640px), then content with `mt-12 sm:mt-16`.
- **Feature grid**: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` of `.ds-card p-7 sm:p-8`, icon in `size-11 rounded-[13px] bg-signal-soft text-signal grid place-items-center`.
- **Product screenshot**: frame real images from `/public` in `rounded-xl border border-line bg-surface-dim p-2 sm:p-3 shadow-float`, image `rounded-[22px]`. Use `next/image` with explicit width/height and `sizes`.
- **Download CTA stage**: `.ds-stage` with `SignalField variant="stage"` at low opacity, `ds-h2 text-on-stage`, `btn-inverse` + `btn-inverse-secondary`.
- **RTL**: use logical utilities (`ms-*`, `me-*`, `ps-*`, `start-*`, `text-start`). Add `rtl-flip` to directional arrows.
- **i18n**: user-facing text comes from the dictionaries (`getDictionary`) or `uiText(locale, english, turkish)` — never hard-code a single language.
