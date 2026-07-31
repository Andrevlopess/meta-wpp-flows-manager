import {
  LimeError,
  type RequestContext,
  sendCommand,
  sendCommandOrThrow,
} from "@/lib/lime/client"
import type {
  CreateFlowInput,
  FlowDetail,
  FlowJson,
  FlowSummary,
  MetaValidationError,
  UpdateMetadataInput,
} from "./types"

export interface UpdateFlowJsonResult {
  ok: boolean
  validationErrors: MetaValidationError[]
  raw: unknown
}

export function unwrapList<T>(resource: unknown): T[] {
  if (Array.isArray(resource)) {
    return resource as T[]
  }

  if (typeof resource === "object" && resource !== null) {
    const obj = resource as Record<string, unknown>

    if (Array.isArray(obj.data)) {
      return obj.data as T[]
    }

    if (Array.isArray(obj.items)) {
      return obj.items as T[]
    }

    if (typeof obj.resource === "object" && obj.resource !== null) {
      return unwrapList<T>(obj.resource)
    }
  }

  return []
}

function extractContentLength(resource: unknown): string | undefined {
  if (typeof resource !== "object" || resource === null) {
    return undefined
  }

  const headers = (resource as { headers?: unknown }).headers
  if (!Array.isArray(headers)) {
    return undefined
  }

  for (const header of headers) {
    if (typeof header !== "object" || header === null) {
      continue
    }
    const { key, value } = header as { key?: unknown; value?: unknown }
    if (key === "Content-Length" && Array.isArray(value)) {
      return String(value[0])
    }
  }

  return undefined
}

function looksLikeFlowJson(value: unknown): value is FlowJson {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>
  return "version" in obj && Array.isArray(obj.screens)
}

function buildAssetProxyUrl(url: string): string {
  const proxyBase = import.meta.env.VITE_ASSET_PROXY_BASE ?? ""
  return `${proxyBase}/api/flow-asset?url=${encodeURIComponent(url)}`
}

async function fetchFlowJsonAsset(url: string): Promise<FlowJson> {
  const proxiedUrl = buildAssetProxyUrl(url)

  let response: Response
  try {
    response = await fetch(proxiedUrl)
  } catch (err) {
    throw new LimeError(
      `Could not reach the asset proxy. Open the asset manually: ${url}`,
      { raw: err }
    )
  }

  if (!response.ok) {
    throw new LimeError(
      `Could not download the flow JSON asset (HTTP ${response.status}). Open it manually: ${url}`,
      { httpStatus: response.status }
    )
  }

  const parsed: unknown = await response.json()
  if (!looksLikeFlowJson(parsed)) {
    throw new LimeError("Downloaded asset does not look like Flow JSON.", {
      raw: parsed,
    })
  }

  return parsed
}

export async function listFlows(ctx: RequestContext): Promise<FlowSummary[]> {
  const resource = await sendCommandOrThrow<unknown>(
    { method: "get", uri: "/whatsapp-flows" },
    ctx
  )
  return unwrapList<FlowSummary>(resource)
}

export async function getFlow(
  ctx: RequestContext,
  id: string
): Promise<FlowDetail> {
  return sendCommandOrThrow<FlowDetail>(
    { method: "get", uri: `/whatsapp-flows/${id}` },
    ctx
  )
}

export async function getFlowAsset(
  ctx: RequestContext,
  id: string
): Promise<FlowJson> {
  const resource = await sendCommandOrThrow<unknown>(
    { method: "get", uri: `/whatsapp-flows/assets/${id}` },
    ctx
  )

  if (looksLikeFlowJson(resource)) {
    return resource
  }

  if (typeof resource === "string") {
    try {
      const parsed: unknown = JSON.parse(resource)
      if (looksLikeFlowJson(parsed)) {
        return parsed
      }
    } catch {
      // not a JSON string — fall through to the error below
    }
  }

  if (
    typeof resource === "object" &&
    resource !== null &&
    Array.isArray((resource as { data?: unknown }).data)
  ) {
    const items = (resource as { data: unknown[] }).data
    const isRecord = (v: unknown): v is Record<string, unknown> =>
      typeof v === "object" && v !== null

    const item =
      items.find((it) => {
        if (!isRecord(it)) return false
        const assetType = it.asset_type
        return (
          typeof assetType === "string" &&
          assetType.toUpperCase() === "FLOW_JSON"
        )
      }) ??
      items.find((it) => isRecord(it) && typeof it.download_url === "string")

    if (item && isRecord(item) && typeof item.download_url === "string") {
      return fetchFlowJsonAsset(item.download_url)
    }
  }

  throw new LimeError("Unrecognised flow asset response shape.", {
    raw: resource,
  })
}

export async function createFlow(
  ctx: RequestContext,
  input: CreateFlowInput
): Promise<string> {
  const resource: Record<string, unknown> = {
    name: input.name,
    categories: input.categories,
  }

  if (input.endpoint_uri) {
    resource.endpoint_uri = input.endpoint_uri
  }

  const result = await sendCommandOrThrow<{ id?: string }>(
    {
      method: "set",
      uri: "/whatsapp-flows",
      type: "application/json",
      resource,
    },
    ctx
  )

  if (!result?.id) {
    throw new LimeError("Flow was created but no id was returned.", {
      raw: result,
    })
  }

  return result.id
}

export async function updateFlowJson(
  ctx: RequestContext,
  id: string,
  json: FlowJson
): Promise<UpdateFlowJsonResult> {
  const response = await sendCommand(
    {
      method: "set",
      uri: `/whatsapp-flows/flow-json/${id}`,
      type: "application/json",
      resource: json,
    },
    ctx
  )

  // Blip's LIME envelope reports "success" even when Meta rejected the JSON —
  // the only reliable signal is the Content-Length header Blip reflects back
  // from Meta's own HTTP response. Meta's empty-array ack body
  // (`{"success":true,"validation_errors":[]}`) is always exactly 39 bytes;
  // any other length means Meta returned validation errors instead, which
  // this response doesn't carry — they have to be fetched separately.
  const succeeded = extractContentLength(response.resource) === "39"

  if (succeeded) {
    return { ok: true, validationErrors: [], raw: response }
  }

  const flow = await getFlow(ctx, id)
  return {
    ok: false,
    validationErrors: flow.validation_errors ?? [],
    raw: response,
  }
}

export async function publishFlow(
  ctx: RequestContext,
  id: string
): Promise<void> {
  await sendCommandOrThrow<void>(
    { method: "get", uri: `/whatsapp-flows/publish/${id}` },
    ctx
  )
}

export type DeprecateFlowOutcome = "deprecated" | "deleted"

/**
 * Removes a flow from the account. A flow that has been published even once
 * can only be deprecated — Meta refuses to delete it — while a never-published
 * draft has nothing to deprecate and can only be deleted. `status` decides
 * which call to make; the other is used as a fallback, since Blip's reported
 * status isn't always in sync with Meta's.
 */
export async function deprecateFlow(
  ctx: RequestContext,
  id: string,
  status: FlowStatus
): Promise<DeprecateFlowOutcome> {
  const deprecate = () =>
    sendCommandOrThrow<void>(
      { method: "delete", uri: `/whatsapp-flows/deprecate/${id}` },
      ctx
    )

  const remove = () =>
    sendCommandOrThrow<void>(
      { method: "delete", uri: `/whatsapp-flows/${id}` },
      ctx
    )

  if (status === FLOW_STATUSES.DRAFT) {
    try {
      await remove()
      return "deleted"
    } catch (err) {
      // Blip may still report DRAFT for a flow Meta considers published.
      try {
        await deprecate()
        return "deprecated"
      } catch {
        throw err
      }
    }
  }

  try {
    await deprecate()
    return "deprecated"
  } catch (err) {
    try {
      await remove()
      return "deleted"
    } catch {
      throw err
    }
  }
}

export async function updateFlowMetadata(
  ctx: RequestContext,
  id: string,
  input: UpdateMetadataInput
): Promise<void> {
  const resource: Record<string, unknown> = {}
  if (input.name !== undefined) resource.name = input.name
  if (input.endpoint_uri !== undefined)
    resource.endpoint_uri = input.endpoint_uri
  if (input.categories !== undefined) resource.categories = input.categories

  await sendCommandOrThrow<void>(
    {
      method: "set",
      uri: `/whatsapp-flows/${id}`,
      type: "application/json",
      resource,
    },
    ctx
  )
}
