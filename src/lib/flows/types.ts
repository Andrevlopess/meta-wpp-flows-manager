export const FLOW_STATUSES = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  DEPRECATED: "DEPRECATED",
  BLOCKED: "BLOCKED",
  THROTTLED: "THROTTLED",
} as const

export type FlowStatus = (typeof FLOW_STATUSES)[keyof typeof FLOW_STATUSES]

export const FLOW_CATEGORIES = [
  "SIGN_UP",
  "SIGN_IN",
  "APPOINTMENT_BOOKING",
  "LEAD_GENERATION",
  "CONTACT_US",
  "CUSTOMER_SUPPORT",
  "SURVEY",
  "OTHER",
] as const

export type FlowCategory = (typeof FLOW_CATEGORIES)[number]

export interface MetaValidationError {
  error?: string
  error_type?: string
  message: string
  line_start: number
  line_end?: number
  column_start: number
  column_end?: number
  pointers?: unknown
}

export interface FlowSummary {
  id: string
  name: string
  status: FlowStatus
  categories: FlowCategory[]
  endpoint_uri?: string
  validation_errors?: MetaValidationError[]
}

export interface FlowDetail extends FlowSummary {
  preview?: { preview_url: string; expires_at?: string }
  json_version?: string
  data_api_version?: string
  whatsapp_business_account?: unknown
}

export interface CreateFlowInput {
  name: string
  categories: FlowCategory[]
  endpoint_uri?: string
}

export interface UpdateMetadataInput {
  name?: string
  endpoint_uri?: string
  categories?: FlowCategory[]
}

export type FlowJson = Record<string, unknown>
