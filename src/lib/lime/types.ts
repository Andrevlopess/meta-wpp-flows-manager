export const LIME_METHODS = {
  get: "get",
  set: "set",
  delete: "delete",
  merge: "merge",
} as const

export type LimeMethod = (typeof LIME_METHODS)[keyof typeof LIME_METHODS]

export const WA_POSTMASTER = "postmaster@wa.gw.msging.net"

export interface LimeCommand<T = unknown> {
  id: string
  to: string
  method: LimeMethod
  uri: string
  type?: string
  resource?: T
}

export interface LimeReason {
  code: number
  description: string
}

export interface LimeResponse<T = unknown> {
  id: string
  method?: LimeMethod
  status?: "success" | "failure"
  success?: boolean
  resource?: T
  reason?: LimeReason
}
