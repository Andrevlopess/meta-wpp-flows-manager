import type { LimeCommand, LimeMethod, LimeReason, LimeResponse } from "./types"
import { WA_POSTMASTER } from "./types"

export interface RequestContext {
  routerKey: string
  contract: string
  signal?: AbortSignal
}

export class LimeError extends Error {
  code: number | undefined
  httpStatus: number | undefined
  raw: unknown

  constructor(
    message: string,
    opts: { code?: number; httpStatus?: number; raw?: unknown } = {}
  ) {
    super(message)
    this.name = "LimeError"
    this.code = opts.code
    this.httpStatus = opts.httpStatus
    this.raw = opts.raw
  }
}

interface SendCommandInput<TReq> {
  method: LimeMethod
  uri: string
  type?: string
  resource?: TReq
}

export async function sendCommand<TRes = unknown, TReq = unknown>(
  input: SendCommandInput<TReq>,
  ctx: RequestContext
): Promise<LimeResponse<TRes>> {
  const command: LimeCommand<TReq> = {
    id: crypto.randomUUID(),
    to: WA_POSTMASTER,
    ...input,
  }

  const url = `https://${ctx.contract}.http.msging.net/commands`

  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Key ${ctx.routerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: ctx.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err
    }
    throw new LimeError(
      "Requisição bloqueada pelo navegador (provavelmente CORS) ou a rede está inacessível. Verifique o console do navegador para obter detalhes.",
      { raw: err }
    )
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (err) {
    throw new LimeError(
      `Resposta não-JSON inesperada do Blip (HTTP ${response.status}).`,
      { httpStatus: response.status, raw: err }
    )
  }

  if (!response.ok) {
    const reason = extractReason(body)
    throw new LimeError(
      reason?.description ?? `Requisição falhou (HTTP ${response.status}).`,
      {
        code: reason?.code,
        httpStatus: response.status,
        raw: body,
      }
    )
  }

  return body as LimeResponse<TRes>
}

export async function sendCommandOrThrow<TRes = unknown, TReq = unknown>(
  input: SendCommandInput<TReq>,
  ctx: RequestContext
): Promise<TRes> {
  const response = await sendCommand<TRes, TReq>(input, ctx)

  if (response.resource !== undefined) {
    return response.resource
  }

  if (response.success === true || response.status === "success") {
    return undefined as TRes
  }

  const description = response.reason?.description ?? "Erro desconhecido"
  throw new LimeError(description, {
    code: response.reason?.code,
    raw: response,
  })
}

function extractReason(body: unknown): LimeReason | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined
  }

  const reason = (body as { reason?: unknown }).reason
  if (typeof reason !== "object" || reason === null) {
    return undefined
  }

  const { code, description } = reason as Partial<LimeReason>
  if (typeof description !== "string") {
    return undefined
  }

  return { code: typeof code === "number" ? code : 0, description }
}
