import { useQuery } from "@tanstack/react-query"

import { getFlowPublicKey } from "@/lib/flows/api"
import { flowsKeys } from "@/lib/flows/query-keys"
import { useRequestContext } from "@/context/profile-context"

export function useFlowPublicKey() {
  const ctx = useRequestContext()

  return useQuery({
    queryKey: flowsKeys.publicKey(ctx),
    queryFn: ({ signal }) => getFlowPublicKey({ ...ctx, signal }),
  })
}
