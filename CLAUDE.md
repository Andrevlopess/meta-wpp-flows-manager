# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A frontend for managing WhatsApp Flows through Blip's LIME command API
(`postmaster@wa.gw.msging.net`), replacing an ad-hoc Python notebook workflow:
list, create, view, edit (VSCode-like JSON editor with schema validation),
update, publish, and delete flows, across multiple router-key profiles.

There is **no backend for LIME traffic** — every command goes directly from
the browser to `https://{contract}.http.msging.net/commands`, by design.
This has two consequences that shape the code:
- CORS failures on that path are terminal — there's no server-side
  fallback, so error paths need to surface a readable message (see
  `LimeError` in [src/lib/lime/client.ts](src/lib/lime/client.ts)) rather than retry or hide the failure.
- Router keys live in plaintext `localStorage`
  ([src/lib/profiles/storage.ts](src/lib/profiles/storage.ts)) — this is an internal dev tool, not a
  secrets manager. Don't add "improvements" that push keys through any other
  channel.

The one exception is the flow-asset JSON download (see "Flow asset proxy"
below) — Meta's CDN inconsistently sends CORS headers per-object, so that
one download goes through a small Lambda proxy instead of a direct browser
fetch. Don't extend that proxy to cover LIME `/commands` traffic; the
no-backend design still holds there.

## Commands - Permission to execute allowed

```bash
pnpm install
pnpm dev         # start the dev server
pnpm build       # tsc -b && vite build (typecheck is part of build)
pnpm typecheck   # tsc --noEmit only
pnpm lint        # eslint .
pnpm format      # prettier --write "**/*.{ts,tsx}"
pnpm preview     # preview the production build locally
```

There is no test runner configured in this repo — don't invent test commands.

Adding a shadcn/ui component:
```bash
pnpm dlx shadcn@latest add <component>
```
This project uses the `base-nova` style on **Base UI** (not Radix) —
generated components import from `@base-ui/react/*`, not `@radix-ui/*`.

## Architecture

### Request layer: LIME over HTTP

Everything Blip-related funnels through
[src/lib/lime/client.ts](src/lib/lime/client.ts)'s `sendCommand` / `sendCommandOrThrow`. These wrap a LIME
command (`{ id, to, method, uri, type?, resource? }`) in a POST to
`/commands` with `Authorization: Key {routerKey}`, and normalize both
network failures and non-2xx/`reason`-bearing responses into `LimeError`.

[src/lib/flows/api.ts](src/lib/flows/api.ts) builds on top of this with one function per Blip
operation (`listFlows`, `getFlow`, `getFlowAsset`, `createFlow`,
`updateFlowJson`, `publishFlow`, `deprecateFlow`, `updateFlowMetadata`). Response
shapes coming back from Blip are inconsistent/undocumented in places, so this
file leans on defensive unwrapping helpers (`unwrapList`,
`findValidationErrorsArray`, `looksLikeFlowJson`) that walk the payload
looking for the shape they need rather than assuming one fixed schema.

`deprecateFlow` is the only removal path exposed in the UI: a flow that has
been published even once can only be deprecated (Meta refuses to delete it),
while a never-published draft has nothing to deprecate and can only be
deleted. It branches on the flow's `status` and falls back to the other call
if the first one fails, since Blip's reported status isn't always in sync
with Meta's.

### Flow asset proxy

`fetchFlowJsonAsset` in [src/lib/flows/api.ts](src/lib/flows/api.ts) downloads flow JSON from a Blip-supplied
`download_url` (Meta's CDN, `mmg.whatsapp.net`) when Blip returns a CDN
pointer instead of embedding the JSON. That CDN inconsistently sets
`Access-Control-Allow-Origin` depending on the underlying object's stored
metadata (confirmed by comparing response headers of a working vs. failing
asset — same host, one had `Content-Type: application/json` +
`Access-Control-Allow-Origin: *`, the other had neither), so a direct
browser fetch works for some flows and hard-fails for others with no
client-side fix. `fetchFlowJsonAsset` always routes through a small Lambda
proxy ([infra/lambda/flow-asset-proxy/index.mjs](infra/lambda/flow-asset-proxy/index.mjs)) instead, via
`buildAssetProxyUrl` — same-origin in production (a CloudFront behavior for
`/api/flow-asset*`), or `VITE_ASSET_PROXY_BASE` pointed at the deployed
proxy directly in local dev. [infra/template.yml](infra/template.yml) is an AWS SAM template that
deploys the same handler behind an HTTP API (`GET /api/flow-asset`) as an
alternative to wiring a Lambda Function URL by hand — see README "Deploying
the asset proxy" for both paths. The proxy allowlists CDN hostnames server-side
(`ALLOWED_ASSET_HOSTS`, default `mmg.whatsapp.net`) since it's an
unauthenticated public endpoint — don't remove that check, it's the only
thing stopping the Function URL from being an open relay.

### Preview: multi-strategy probing

Meta's flow preview endpoint isn't confirmed to work through Blip's proxy in
any single shape, so [src/lib/flows/preview.ts](src/lib/flows/preview.ts) tries several candidate
request shapes (`PREVIEW_STRATEGIES`) in order, caches whichever one succeeds
in `localStorage` (`flows-manager.preview-strategy`) so later calls skip
straight to it, and falls back to an "unavailable" state listing every
attempt rather than failing the page. Do not remove the cache-and-retry
behavior when touching this — it's compensating for an unconfirmed API
contract, not incidental complexity.

### The JSON editor (Monaco)

[src/components/monaco/monaco-setup.ts](src/components/monaco/monaco-setup.ts) is the load-bearing file here. Key
constraints baked into it:
- **Manual contrib imports, not the `editor.all.js` bundle.** Monaco 0.56
  dropped that bundle; importing the package root now pulls in every
  language grammar (~90 languages). Only the specific contrib modules needed
  for JSON editing (find, fold, multi-cursor, suggest, hover, etc.) are
  imported individually.
- **Import specifiers omit the `esm/vs/` prefix on purpose** — the package's
  `exports` map already prepends it; adding it doubles the path and breaks
  resolution under `moduleResolution: "bundler"`.
- `jsonDefaults` comes from `monaco-editor/languages/features/json/register.js`,
  the only import path with real type declarations for it in 0.56.
- `self.MonacoEnvironment` (worker routing) must be assigned before the first
  `monaco.editor.create` / `createModel` call — it's set at module load time.
- One Monaco text model per flow ID is kept alive in a module-level `Map`
  (`getOrCreateFlowModel` / `disposeFlowModel`), with dirty-tracking done by
  comparing `getAlternativeVersionId()` against a saved baseline
  (`markFlowModelSaved`, `isFlowModelDirty`, `hasAnyDirtyModel`) — not by
  diffing content.
- Route-level lazy-loading matters here: `FlowDetailPage` is
  `React.lazy`-loaded in [src/App.tsx](src/App.tsx) specifically because that page imports
  `monaco-setup.ts` directly (for model/marker management), not just through
  the `JsonEditor` component — lazy-loading only the editor component
  wouldn't be enough to keep Monaco out of the flows-list bundle.

### Flow JSON Schema

[src/lib/flows/schema/](src/lib/flows/schema/) is a hand-written JSON Schema (draft-07) for WhatsApp
Flow JSON, split by concern (`primitives`, `components`, `screen`,
`actions`, `data-source`) and assembled in `schema/index.ts`. It drives
Monaco's live autocomplete/hover/inline diagnostics. `$defs` is used despite
being 2019-09 naming because `vscode-json-languageservice`'s resolver treats
it as a plain object and `$ref: "#/$defs/x"` is pure JSON-pointer
resolution — this works under draft-07 in practice, it's not a schema-version
bug. There's a UI toggle to disable this local schema's validation entirely
(in case it produces a false positive); it must never block **Update**, which
only depends on the JSON parsing.

### Meta validation errors → editor markers

When Blip/Meta rejects an Update with `validation_errors`, `updateFlowJson`
(in `flows/api.ts`) extracts them and [src/lib/flows/markers.ts](src/lib/flows/markers.ts) converts them
into Monaco markers (`source: "Meta"`, owner `meta-flow-validation`), applied
separately from the local schema's own diagnostics. `META_COLUMN_BASE` is a
calibrated constant, not a documented value from Meta — if column squiggles
look off-by-one, that's the first place to check, not a logic bug elsewhere.
**Publish** stays disabled until a clean Update succeeds with no unsaved
changes since.

### Profiles (multi-tenant credentials)

A "profile" is `{ id, label, contract, routerKey }`
([src/lib/profiles/types.ts](src/lib/profiles/types.ts)), persisted via
[src/lib/profiles/storage.ts](src/lib/profiles/storage.ts) to `localStorage` under
`flows-manager.profiles` / `flows-manager.active-profile`.
[src/context/profile-context.tsx](src/context/profile-context.tsx) wraps this in React context, exposing
`useProfiles()` (full profile CRUD) and `useRequestContext()` (throws if no
active profile — only call it from code paths where an active profile is
guaranteed, e.g. inside routes that already require one). It also listens
for the `storage` event, so profile changes make from another tab sync in.

### Data fetching pattern

Two small hand-rolled hooks stand in for a data-fetching library:
- [src/hooks/use-async.ts](src/hooks/use-async.ts) — read path. Reruns on dep changes, tracks
  in-flight requests via a `runId` ref (so a stale response can't clobber a
  newer one) and an `AbortController` (aborted on dep change/unmount).
- [src/hooks/use-mutation.ts](src/hooks/use-mutation.ts) — write path. Wraps an async fn with
  status/error/reset state, no caching.

Feature hooks (`use-flows`, `use-flow-detail`, `use-flow-preview`) compose
these with `src/lib/flows/api.ts` calls and `useRequestContext()`. Follow
this pattern for new data operations rather than introducing a fetching
library or ad hoc `useEffect`s.

### Path alias

`@/*` → `src/*`, configured in both [vite.config.ts](vite.config.ts) and
[tsconfig.app.json](tsconfig.app.json). Keep both in sync if it ever changes.

## Notes

- `shadcn/ui` primitives under [src/components/ui/](src/components/ui/) intentionally
  co-export variant helpers (e.g. `buttonVariants`) from the same file as
  their component — that's the upstream shadcn generator's pattern, and
  `eslint.config.js` disables `react-refresh/only-export-components` for that
  directory specifically. Don't split them apart, and don't hand-edit
  generated primitives beyond what `shadcn add` produces — regenerate instead.
- `teste.json` at the repo root is scratch/test data, not part of the app.
