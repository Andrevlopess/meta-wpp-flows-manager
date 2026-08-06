# AGENTS.md

Frontend for managing WhatsApp Flows via Blip's LIME command API
(`postmaster@wa.gw.msging.net`), across multiple router-key "profiles". React 19
+ Vite + Tailwind v4, route-based `react-router` v7, `@tanstack/react-query`,
Monaco editor, shadcn/ui on **Base UI** (not Radix — generated components import
from `@base-ui/react/*`).

## Commands

```bash
pnpm dev         # dev server
pnpm build       # tsc -b && vite build (typecheck is part of build)
pnpm typecheck   # tsc --noEmit only
pnpm lint        # eslint .
pnpm format      # prettier --write "**/*.{ts,tsx}"
pnpm preview     # preview production build
pnpm deploy      # pwsh scripts/deploy.ps1 — builds and syncs dist/ to S3 + CloudFront invalidation
```

There is **no test runner** in this repo — don't invent test commands.

shadcn/ui additions:
```bash
pnpm dlx shadcn@latest add <component>
```

## Core design constraints

- **No backend for LIME traffic.** Every command goes directly from the browser
  to `https://{contract}.http.msging.net/commands`. CORS failures on that path
  are terminal — error paths must surface a readable message (`LimeError` in
  `src/lib/lime/client.ts`) rather than retry/hide. The **only** exception is
  flow-asset JSON downloads (Meta CDN sends inconsistent CORS headers), which
  route through a small Lambda proxy (`infra/lambda/flow-asset-proxy/index.mjs`).
  Don't extend that proxy to LIME `/commands` traffic.
- **Router keys are plaintext `localStorage`** (`src/lib/profiles/storage.ts`,
  keys `flows-manager.profiles` / `flows-manager.active-profile`). Internal dev
  tool, not a secrets manager — don't push keys through any other channel.
- `@/*` → `src/*` alias lives in both `vite.config.ts` and
  `tsconfig.app.json` — keep in sync.

## Request layer & data fetching

- All Blip operations funnel through `sendCommand` / `sendCommandOrThrow` in
  `src/lib/lime/client.ts`, then one function per operation in
  `src/lib/flows/api.ts` (`listFlows`, `getFlow`, `getFlowAsset`, `createFlow`,
  `updateFlowJson`, `publishFlow`, `deprecateFlow`, `updateFlowMetadata`). Blip's
  response shapes are inconsistent/undocumented — the file uses defensive
  unwrappers (`unwrapList`, `findValidationErrorsArray`, `looksLikeFlowJson`)
  that walk payloads for the shape they need; keep that pattern.
- `deprecateFlow` is the only removal path: published flows can only be
  deprecated, never-published drafts only deleted. It branches on `status` and
  falls back to the other call if the first fails.
- **Data fetching is `@tanstack/react-query`** (not hand-rolled hooks):
  - Query keys are the `flowsKeys` factory in `src/lib/flows/query-keys.ts`,
    always scoped by profile (`ctx.contract` + `ctx.routerKey`) so switching
    profiles invalidates correctly. `queryClient` in `src/lib/query-client.ts`
    sets `retry: false`, `refetchOnWindowFocus: false`.
  - Read hooks: `useFlows`, `useFlowDetail`, `useFlowPreview`. Write hooks in
    `use-flow-mutations.ts` update the cache via `setQueryData` (e.g. pushing a
    clean `validation_errors: []` after a successful update) or `invalidateQueries`.
  - `useRequestContext()` from `src/context/profile-context.tsx` **throws** if no
    active profile — only call it where one is guaranteed (routes that require one).
- Meta's preview endpoint shape is unconfirmed: `src/lib/flows/preview.ts` probes
  `PREVIEW_STRATEGIES` in order, caches the winner in `localStorage`
  (`flows-manager.preview-strategy`), and falls back to an "unavailable" state.
  **Don't remove the cache-and-retry behavior** — it compensates for an
  unconfirmed API contract. An "unavailable" preview is expected, not a bug.

## Monaco editor (`src/components/monaco/monaco-setup.ts`)

Load-bearing file; constraints are deliberate:
- Manual contrib imports, not the `editor.all.js` bundle (dropped in 0.56; the
  package root pulls in ~90 language grammars). Import specifiers **omit** the
  `esm/vs/` prefix — the package `exports` map prepends it; adding it breaks
  resolution under `moduleResolution: "bundler"`.
- `jsonDefaults` imports from `monaco-editor/languages/features/json/register.js`
  (only path with real types in 0.56). `self.MonacoEnvironment` must be assigned
  before the first `monaco.editor.create` / `createModel` — it's set at module
  load time. There's also a `document.fonts.load(...).then(remeasureFonts)` step
  — without it the async JetBrains Mono webfont desyncs cursor positions.
- One Monaco text model per flow ID in a module-level `Map`
  (`getOrCreateFlowModel` / `disposeFlowModel`); dirty-tracking compares
  `getAlternativeVersionId()` to a saved baseline (`markFlowModelSaved`,
  `isFlowModelDirty`, `hasAnyDirtyModel`) — not content diffing.
- **Route-level lazy-loading matters:** `FlowDetailPage` is `React.lazy`-loaded
  in `src/App.tsx` because it imports `monaco-setup.ts` directly (model/marker
  management), not just via the `JsonEditor` component. Keep Monaco out of the
  flows-list bundle.

## Flow JSON schema & markers

- `src/lib/flows/schema/` is a hand-written draft-07 schema split by concern
  (`primitives`, `components`, `screen`, `actions`, `data-source`), assembled in
  `schema/index.ts`. `$defs` is used despite being 2019-09 naming — the
  `vscode-json-languageservice` resolver treats it as a plain object and
  `$ref: "#/$defs/x"` resolves as a JSON pointer under draft-07. Not a bug.
- The schema-validation UI toggle must never block **Update**, which only depends
  on JSON parsing.
- Meta's `validation_errors` from a rejected Update become Monaco markers
  (`source: "Meta"`, owner `meta-flow-validation`) via `src/lib/flows/markers.ts`.
  `META_COLUMN_BASE` is a calibrated constant, not documented by Meta — check it
  first if column squiggles look off-by-one. **Publish** stays disabled until a
  clean Update succeeds with no unsaved changes since.

## Conventions / gotchas

- `src/components/ui/` primitives intentionally co-export variant helpers (e.g.
  `buttonVariants`) from the same file — `eslint.config.js` disables
  `react-refresh/only-export-components` for that directory. Don't split them or
  hand-edit generated primitives; regenerate with `shadcn add`.
- `teste.json` at repo root is scratch data, not part of the app.
- Asset proxy in local dev: set `VITE_ASSET_PROXY_BASE` in `.env`/`.env.local`
  to the deployed proxy URL; same-origin in production via a CloudFront behavior
  for `/api/flow-asset*`. The Lambda allowlists CDN hosts server-side
  (`ALLOWED_ASSET_HOSTS`, default `mmg.whatsapp.net`) — it's an unauthenticated
  public endpoint; don't remove that check. SAM template:
  `infra/lambda/template.yml`.
