// AWS Lambda handler (Node.js 20.x runtime, exposed via a Function URL).
// Fetches flow-asset JSON from Meta's CDN server-side, so the browser never
// depends on whether that particular CDN object happens to carry an
// Access-Control-Allow-Origin header (it inconsistently does not).
//
// No dependencies — paste/zip this file directly into Lambda, no build step.

const DEFAULT_ALLOWED_HOSTS = ["mmg.whatsapp.net"]
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024 // 5 MB

function getAllowedHosts() {
  const raw = process.env.ALLOWED_ASSET_HOSTS
  if (!raw) return DEFAULT_ALLOWED_HOSTS
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
}

function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  }
}

export const handler = async (event) => {
  const rawUrl = event?.queryStringParameters?.url

  if (!rawUrl) {
    return jsonResponse(400, { error: "Missing required 'url' query parameter." })
  }

  let target
  try {
    target = new URL(rawUrl)
  } catch {
    return jsonResponse(400, { error: "'url' is not a valid URL." })
  }

  if (target.protocol !== "https:") {
    return jsonResponse(400, { error: "Only https URLs are allowed." })
  }

  const allowedHosts = getAllowedHosts()
  const hostname = target.hostname.toLowerCase()
  const isAllowed = allowedHosts.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  )
  if (!isAllowed) {
    return jsonResponse(403, {
      error: `Host '${hostname}' is not in the asset proxy allowlist.`,
    })
  }

  let upstream
  try {
    upstream = await fetch(target)
  } catch (err) {
    return jsonResponse(502, {
      error: "Could not reach the upstream asset host.",
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  if (!upstream.ok) {
    return jsonResponse(upstream.status, {
      error: `Upstream responded with HTTP ${upstream.status}.`,
    })
  }

  const contentLength = upstream.headers.get("content-length")
  if (contentLength && Number(contentLength) > MAX_CONTENT_LENGTH) {
    return jsonResponse(413, { error: "Upstream asset is too large." })
  }

  const body = await upstream.text()
  if (body.length > MAX_CONTENT_LENGTH) {
    return jsonResponse(413, { error: "Upstream asset is too large." })
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
    body,
  }
}
