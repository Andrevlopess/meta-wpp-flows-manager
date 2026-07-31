import { useQuery } from "@tanstack/react-query"

import { listFlows } from "@/lib/flows/api"
import { flowsKeys } from "@/lib/flows/query-keys"
import { useRequestContext } from "@/context/profile-context"

export function useFlows() {
  const ctx = useRequestContext()

  return useQuery({
    queryKey: flowsKeys.lists(ctx),
    queryFn: ({ signal }) => listFlows({ ...ctx, signal }),
  })
}
