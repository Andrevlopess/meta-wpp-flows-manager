import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchPreview } from "@/lib/flows/preview"
import { flowsKeys } from "@/lib/flows/query-keys"
import { useRequestContext } from "@/context/profile-context"

export function useFlowPreview(flowId: string, opts: { enabled: boolean }) {
  const ctx = useRequestContext()
  const queryClient = useQueryClient()
  const key = flowsKeys.preview(ctx, flowId)

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      fetchPreview({ ...ctx, signal }, flowId, { invalidate: false }),
    enabled: opts.enabled,
  })

  const refreshMutation = useMutation({
    mutationFn: () => fetchPreview(ctx, flowId, { invalidate: true }),
    onSuccess: (outcome) => {
      queryClient.setQueryData(key, outcome)
    },
  })

  return {
    outcome: query.data ?? null,
    isLoading: query.isPending || refreshMutation.isPending,
    refresh: () => refreshMutation.mutateAsync(),
  }
}
