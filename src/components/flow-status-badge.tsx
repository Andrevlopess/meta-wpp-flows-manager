import { Badge } from "@/components/ui/badge"
import { FLOW_STATUSES, type FlowStatus } from "@/lib/flows/types"

const VARIANT_BY_STATUS: Record<
  FlowStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [FLOW_STATUSES.DRAFT]: "secondary",
  [FLOW_STATUSES.PUBLISHED]: "default",
  [FLOW_STATUSES.DEPRECATED]: "outline",
  [FLOW_STATUSES.BLOCKED]: "destructive",
  [FLOW_STATUSES.THROTTLED]: "destructive",
}

export function FlowStatusBadge({ status }: { status: FlowStatus }) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status] ?? "outline"}>{status}</Badge>
  )
}
