# APWRS

**Adaptive Planting Window Recommendation System** — a drought-risk and sowing-window
console for Tunisia, Morocco and Algeria, built from the Claude Design project in
[`design/`](design/).

Turns climate, soil, satellite and drought-index data into one 0–100 risk score and a
planting window per crop and site.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 6**
- **Tailwind CSS v4** — CSS-first `@theme`, no JS config file
- **Motion 13** for transitions
- **Radix UI** primitives behind the dropdowns, dialogs, drawers and sliders
- **next-themes** for the dark/light switch

## Routes

| Route | Screen |
| --- | --- |
| `/` | Marketing landing (pinned dark) |
| `/login` | Sign in + forgot password (`?view=forgot`) |
| `/app/<page>` | Expert console — 17 pages, each its own URL |
| `/farm/<tab>` | **Farmer console** — same shell, 4 tabs. Where signing in as a farmer lands |
| `/farmer` | Standalone phone/tablet build of the farmer app |

Console pages: `overview`, `map`, `sensors`, `alerts`, `risk`, `forecasts`, `drivers`,
`planting`, `history`, `archive`, `upload`, `manual`, `datasets`, `activity`, `users`,
`regions`, `settings`.

Farm tabs: `today`, `fields`, `alerts`, `help`.

### The two farmer surfaces

The designs ship the farmer experience twice, and both are built:

- **`/farm` — the signed-in one.** `App.dc.html` with `role=farmer`: the same console
  shell, but the sidebar collapses to a single **MY FARM** group of four items, the
  account becomes Hédi Jlassi, and the analyst-only controls (season selector, ⌘K
  palette, Settings) disappear. The farmer screens render *embedded*, with no palette of
  their own, so the header's EN/FR and dark/light switches drive them. This is what the
  Farmer role on the login screen goes to.
- **`/farmer` — the standalone one.** `Farmer.dc.html` run on its own: pinned light
  palette, compact header, bottom tab bar. The phone/tablet build.

Both render the same `<FarmerContent />`; only the chrome around it differs. `AppShell`
takes a `role` prop, which is the one switch that separates the two consoles.

## How it is put together

```
app/
  globals.css          Design tokens + the blueprint frame + base layer
  layout.tsx           Fonts (Barlow / Barlow Condensed / JetBrains Mono), ThemeProvider
  app/[page]/page.tsx  One dynamic route that dispatches to the 17 console pages
components/
  ui/primitives.tsx    Blueprint, Button, RiskBadge, Field, TabStrip, Segmented, Toggle…
  ui/dropdown.tsx      Radix-backed Menu / Panel with the system's surface
  app-shell.tsx        Sidebar, header controls, mobile drawer (role: expert | farmer)
  farmer-content.tsx   The farmer screens, chrome-free — shared by both surfaces
  farmer.tsx           Standalone phone build (own header + bottom tabs)
  farm-pane.tsx        The same content embedded in the console shell
  command-palette.tsx  ⌘K
  map-view.tsx         The Ichkeul/Bizerte basin, generated as SVG
  pages/*.tsx          One file per console page
lib/
  data.ts              All console content, typed
  farmer-data.ts       Farmer copy, EN + FR
```

### Design tokens

Every colour, font and shadow comes from a CSS variable. The raw values live on
`:root` / `[data-theme="dark"]` / `[data-theme="light"]`, and `@theme inline` maps them
onto Tailwind utilities — so `bg-surface`, `text-muted` and `border-divider` all follow
the active theme with no `dark:` variants scattered through the markup.

Theme is an **attribute**, not a class, so a subtree can override the page: the
marketing pages pin dark, the farmer app pins light, and the console lets the operator
choose (`ThemeScope` in `components/theme-provider.tsx`).

`:root` carries the dark set as a default, so the page is fully themed before
next-themes runs.

### The blueprint frame

The Industry design system draws cards, figures and primary buttons as wireframe
objects: square corners, hairline border, `+` registration marks at each corner. That
is the `.blueprint` utility plus the four `.bp-corner` children, which ship inside the
`<Blueprint>` and `<Button variant="primary">` components rather than being hand-written
per use.

### Data

`lib/data.ts` and `lib/farmer-data.ts` hold every figure and string from the mockups —
the designs are a static prototype, so these stand in for the API. Swap them for
fetches and the components do not change.

## Notes on the port

- **Navigation is real routing.** The prototype switched a `page` state variable; here
  every console page has its own URL, so links, the back button and refresh all work.
- **Accessibility.** Dropdowns, dialogs and drawers are Radix primitives, so they carry
  focus trapping, roving focus, typeahead, Escape/outside-dismiss and correct ARIA.
  Focus rings are the design system's 2px accent ring, never the browser default.
- **Reduced motion** is respected globally and by the count-up animations.
- **Responsive.** The prototype was fixed at `min-width: 1280px` for the console and had
  a separate `Mobile.dc.html` board of 390px frames. Rather than reproduce that board as
  a page, the real screens are responsive down to phone width: the sidebar becomes a
  drawer, tables scroll horizontally, and multi-column grids collapse.
- **`design/` is untouched** and kept as the reference.
