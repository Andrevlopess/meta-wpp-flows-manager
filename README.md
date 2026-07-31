# Flows Manager

A frontend for managing WhatsApp Flows through Blip's LIME command API
(`postmaster@wa.gw.msging.net`), replacing the ad-hoc Python notebook
workflow: list, create, view, edit (VSCode-like JSON editor with schema
validation), update, publish, and delete flows, across multiple
router-key profiles.

## Requirements

- Node.js 18+, pnpm
- A Blip router key with access to the WhatsApp Flows commands, for each
  contract/environment you want to manage

## Getting started

```bash
pnpm install
pnpm dev
```

Open the app, click **Add profile**, and fill in:
- **Label** — any name you choose (e.g. `vitru`, `cyrela-prod`)
- **Contract** — the Blip contract subdomain (e.g. `wlck`)
- **Router key** — sent as `Authorization: Key …` on every request

Profiles are stored in this browser's `localStorage`, unencrypted — see
**Security note** below. Switch between profiles from the dropdown in the
top-right; the flow list refetches automatically.

## How it talks to Blip

Every LIME command goes **directly from the browser** to
`https://{contract}.http.msging.net/commands`, exactly like the original
notebook's `requests.post(...)` calls. There is no backend for this
traffic — by design, per the project's requirements.

**Consequence:** this only works if Blip's `/commands` endpoint sends
permissive CORS headers for the origin you're running this app from. In
testing this worked cleanly (requests reach Blip and get real HTTP
responses, e.g. `401` for a bad key) — if your environment behaves
differently, requests will fail with a browser CORS error visible in the
console, and the app surfaces a readable "request blocked by the browser"
message rather than hanging silently. There is no built-in workaround for
this path.

**One exception:** when Blip's asset response points at a CDN URL instead
of embedding the flow JSON directly (the `download_url` follow-up fetch),
that URL is Meta's CDN (`mmg.whatsapp.net`), which inconsistently sends
`Access-Control-Allow-Origin` depending on the underlying object's stored
metadata — some flows' JSON loads fine in-browser, others hard-fail with a
CORS error, with no client-side fix. To make this work for every flow
regardless of that inconsistency, this one download always goes through a
small Lambda proxy (see "Deploying the asset proxy" below) instead of
fetching Meta's CDN directly from the browser.

## Editing a flow

Opening a flow loads its JSON into a Monaco (VSCode) editor with:
- Full JSON syntax highlighting, folding, find, multi-cursor, etc.
- A hand-written JSON Schema for Flow JSON covering the documented
  component set, with live autocomplete, hover docs, and inline error
  squiggles — including for `${data.x}` / `${form.x}` dynamic bindings
- A **Schema validation: on/off** toggle in the toolbar, in case the local
  schema ever produces an incorrect false positive — it never blocks
  Update, which only depends on the JSON actually parsing

Clicking **Update** sends the JSON to Blip; if Meta returns
`validation_errors`, they're shown in the problems panel and mapped onto
editor squiggles (source: "Meta"), and **Publish** stays disabled until a
clean Update succeeds with no unsaved changes.

## Preview panel

The panel next to the editor tries to fetch Meta's official flow preview
(`preview_url`) through several candidate Blip request shapes, since it's
not confirmed which one (if any) Blip's proxy supports. If none succeed,
it shows an "unavailable" state with the attempted requests listed rather
than failing the rest of the page — this is expected and does not indicate
a bug elsewhere.

## Deploying the asset proxy

The app is a static build served from S3 + CloudFront. Flow-asset JSON
downloads route through a small Lambda proxy (`infra/lambda/flow-asset-proxy/index.mjs`,
zero dependencies, Node.js 20.x runtime) to work around Meta's CDN
inconsistently sending `Access-Control-Allow-Origin` (see "How it talks to
Blip" above). It's not wired up automatically — set it up once per
environment:

1. Create a Lambda function (Node.js 20.x runtime) and paste in
   `infra/lambda/flow-asset-proxy/index.mjs`.
2. Enable a **Function URL** on it with auth type `NONE`.
3. Optional: set the `ALLOWED_ASSET_HOSTS` env var (comma-separated
   hostnames) if flow assets ever come from a CDN host other than the
   default `mmg.whatsapp.net`.
4. In the CloudFront distribution, add the Function URL as a second origin
   and add a behavior for path pattern `/api/flow-asset*` routing to it —
   use the `CachingDisabled` managed cache policy (the asset URLs are
   signed and short-lived, so caching the proxy response isn't safe) and an
   origin request policy that forwards query strings (e.g.
   `AllViewerExceptHostHeader`). The default behavior keeps pointing at the
   existing S3 origin, unchanged.

**Alternative — deploy with AWS SAM:** `infra/template.yml` defines the same
Lambda behind an HTTP API (API Gateway) instead of a Function URL, so steps
1–3 above can be replaced with:

```bash
cd infra
sam build
sam deploy --guided   # first time; pick a stack name, allow SAM to create roles
```

This prints a `FlowAssetProxyApiUrl` output — use that in place of the
Function URL in step 4 (CloudFront origin) and for `VITE_ASSET_PROXY_BASE`
below. Override the allowlist with `--parameter-overrides
AllowedAssetHosts=mmg.whatsapp.net,other.cdn.host` if needed.

For local development (`pnpm dev`), the proxy isn't same-origin, so set
`VITE_ASSET_PROXY_BASE` in `.env.local` to the Function URL directly (e.g.
`VITE_ASSET_PROXY_BASE=https://xyz.lambda-url.us-east-1.on.aws`) — the
Lambda always sends `Access-Control-Allow-Origin: *`, so this works
cross-origin. Leave it unset in production; the CloudFront behavior above
makes `/api/flow-asset` same-origin.

## Security note

Router keys are stored in plaintext in `localStorage`. This is a developer
tool for internal use, not a secrets manager — don't use it on a shared or
untrusted machine, and treat the keys with the same care you would in the
original notebook.

## Scripts

```bash
pnpm dev         # start the dev server
pnpm build       # typecheck + production build
pnpm preview     # preview the production build locally
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm format      # prettier --write
```

## Adding shadcn/ui components

```bash
pnpm dlx shadcn@latest add <component>
```

This project uses the `base-nova` style on **Base UI** (not Radix) —
generated components import from `@base-ui/react/*`.
