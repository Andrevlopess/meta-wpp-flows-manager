import { sendCommand, type RequestContext } from "@/lib/lime/client"

export interface FlowPreview {
  url: string
  expiresAt?: string
}

export interface PreviewAttempt {
  strategyId: string
  uri: string
  error: string
}

export type PreviewOutcome =
  | { kind: "ok"; preview: FlowPreview; strategyId: string }
  | { kind: "unsupported"; attempts: PreviewAttempt[] }

interface PreviewStrategy {
  id: string
  uri: (flowId: string, invalidate: boolean) => string
}

export const PREVIEW_STRATEGIES: readonly PreviewStrategy[] = [
  {
    id: "fields-param",
    uri: (flowId, invalidate) =>
      `/whatsapp-flows/${flowId}?fields=preview.invalidate(${invalidate})`,
  },
  {
    id: "fields-encoded",
    uri: (flowId, invalidate) =>
      `/whatsapp-flows/${flowId}?fields=preview.invalidate%28${invalidate}%29`,
  },
  {
    id: "preview-path",
    uri: (flowId) => `/whatsapp-flows/preview/${flowId}`,
  },
  {
    id: "detail-inline",
    uri: (flowId) => `/whatsapp-flows/${flowId}`,
  },
]

const STRATEGY_CACHE_KEY = "flows-manager.preview-strategy"

export function getCachedStrategyId(): string | null {
  return localStorage.getItem(STRATEGY_CACHE_KEY)
}

export function setCachedStrategyId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(STRATEGY_CACHE_KEY)
    return
  }
  localStorage.setItem(STRATEGY_CACHE_KEY, id)
}

export function resetPreviewDetection(): void {
  setCachedStrategyId(null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function extractPreview(
  payload: unknown,
  depth = 0
): FlowPreview | null {
  if (depth > 5 || !isRecord(payload)) {
    return null
  }

  const directUrl = payload.preview_url ?? payload.previewUrl
  if (typeof directUrl === "string" && directUrl.length > 0) {
    const expires = payload.expires_at ?? payload.expiresAt
    return {
      url: directUrl,
      expiresAt: typeof expires === "string" ? expires : undefined,
    }
  }

  if (isRecord(payload.preview)) {
    const nested = extractPreview(payload.preview, depth + 1)
    if (nested) {
      return nested
    }
  }

  for (const key of Object.keys(payload)) {
    if (key === "preview") continue
    const value = payload[key]
    if (isRecord(value)) {
      const nested = extractPreview(value, depth + 1)
      if (nested) {
        return nested
      }
    }
  }

  return null
}

async function tryStrategy(
  strategy: PreviewStrategy,
  ctx: RequestContext,
  flowId: string,
  invalidate: boolean
): Promise<{ preview: FlowPreview } | { error: string }> {
  const uri = strategy.uri(flowId, invalidate)

  try {
    const response = await sendCommand({ method: "get", uri }, ctx)
    const preview =
      extractPreview(response.resource) ?? extractPreview(response)

    if (!preview) {
      return { error: "A resposta não continha um preview_url." }
    }

    return { preview }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export async function fetchPreview(
  ctx: RequestContext,
  flowId: string,
  opts: { invalidate?: boolean } = {}
): Promise<PreviewOutcome> {
  const invalidate = opts.invalidate ?? false
  const cachedId = getCachedStrategyId()
  const ordered = cachedId
    ? [
        ...PREVIEW_STRATEGIES.filter((s) => s.id === cachedId),
        ...PREVIEW_STRATEGIES.filter((s) => s.id !== cachedId),
      ]
    : PREVIEW_STRATEGIES

  const attempts: PreviewAttempt[] = []

  for (const strategy of ordered) {
    const result = await tryStrategy(strategy, ctx, flowId, invalidate)

    if ("preview" in result) {
      setCachedStrategyId(strategy.id)
      return { kind: "ok", preview: result.preview, strategyId: strategy.id }
    }

    attempts.push({
      strategyId: strategy.id,
      uri: strategy.uri(flowId, invalidate),
      error: result.error,
    })
  }

  setCachedStrategyId(null)
  return { kind: "unsupported", attempts }
}
