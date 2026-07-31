import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { getFlow, getFlowAsset } from "@/lib/flows/api"
import { flowsKeys } from "@/lib/flows/query-keys"
import type { RequestContext } from "@/lib/lime/client"
import type { FlowDetail, FlowJson } from "@/lib/flows/types"
import { useRequestContext } from "@/context/profile-context"

export interface FlowDetailResult {
  detail: FlowDetail
  flowJson: FlowJson | null
  flowJsonError: string | null
}

function useFlowMetaQuery(
  ctx: RequestContext,
  flowId: string
): UseQueryResult<FlowDetail> {
  return useQuery({
    queryKey: flowsKeys.detail(ctx, flowId),
    queryFn: ({ signal }) => getFlow({ ...ctx, signal }, flowId),
  })
}

function useFlowAssetQuery(
  ctx: RequestContext,
  flowId: string
): UseQueryResult<FlowJson> {
  return useQuery({
    queryKey: flowsKeys.asset(ctx, flowId),
    queryFn: ({ signal }) => getFlowAsset({ ...ctx, signal }, flowId),
  })
}

export function useFlowDetail(flowId: string) {
  const ctx = useRequestContext()
  const metaQuery = useFlowMetaQuery(ctx, flowId)
  const assetQuery = useFlowAssetQuery(ctx, flowId)

  const isPending = metaQuery.isPending || assetQuery.isPending
  const isError = metaQuery.isError

  // Gate on both queries settling (mirrors the previous Promise.all
  // behavior), not just metaQuery.data, so `data` never goes truthy with a
  // still-in-flight asset — that would otherwise render neither the editor
  // nor the error block for a tick.
  const data: FlowDetailResult | undefined =
    !isPending && metaQuery.data
      ? {
          detail: metaQuery.data,
          flowJson: assetQuery.data ?? null,
          flowJsonError: assetQuery.isError
            ? assetQuery.error instanceof Error
              ? assetQuery.error.message
              : String(assetQuery.error)
            : null,
        }
      : undefined

  const refetch = () => {
    void metaQuery.refetch()
    void assetQuery.refetch()
  }

  return {
    data,
    isPending,
    isError,
    error: metaQuery.error,
    isLoading: isPending,
    refetch,
  }
}
