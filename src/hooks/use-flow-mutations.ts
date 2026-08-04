import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createFlow,
  deprecateFlow,
  publishFlow,
  updateFlowJson,
  updateFlowMetadata,
} from "@/lib/flows/api"
import { flowsKeys } from "@/lib/flows/query-keys"
import type {
  CreateFlowInput,
  FlowDetail,
  FlowJson,
  FlowStatus,
  UpdateMetadataInput,
} from "@/lib/flows/types"
import { useRequestContext } from "@/context/profile-context"

export function useCreateFlow() {
  const ctx = useRequestContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateFlowInput) => createFlow(ctx, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: flowsKeys.lists(ctx) })
    },
  })
}

export function useUpdateFlowJson(flowId: string) {
  const ctx = useRequestContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (json: FlowJson) => updateFlowJson(ctx, flowId, json),
    onSuccess: (result, json) => {
      if (result.ok) {
        queryClient.setQueryData(flowsKeys.asset(ctx, flowId), json)
        queryClient.setQueryData<FlowDetail>(
          flowsKeys.detail(ctx, flowId),
          (old) => old && { ...old, validation_errors: [] }
        )
      } else {
        queryClient.setQueryData<FlowDetail>(
          flowsKeys.detail(ctx, flowId),
          (old) => old && { ...old, validation_errors: result.validationErrors }
        )
      }
    },
  })
}

export function usePublishFlow(flowId: string) {
  const ctx = useRequestContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => publishFlow(ctx, flowId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: flowsKeys.detail(ctx, flowId),
      })
      void queryClient.invalidateQueries({ queryKey: flowsKeys.lists(ctx) })
    },
  })
}

export function useUpdateFlowMetadata(flowId: string) {
  const ctx = useRequestContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateMetadataInput) =>
      updateFlowMetadata(ctx, flowId, input),
    onSuccess: (_data, input) => {
      queryClient.setQueryData<FlowDetail>(
        flowsKeys.detail(ctx, flowId),
        (old) =>
          old && {
            ...old,
            name: input.name ?? old.name,
            endpoint_uri: input.endpoint_uri ?? old.endpoint_uri,
            categories: input.categories ?? old.categories,
          }
      )
      void queryClient.invalidateQueries({ queryKey: flowsKeys.lists(ctx) })
    },
  })
}

export function useDeprecateFlow() {
  const ctx = useRequestContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ flowId, status }: { flowId: string; status: FlowStatus }) =>
      deprecateFlow(ctx, flowId, status),
    onSuccess: (_outcome, { flowId }) => {
      queryClient.removeQueries({ queryKey: flowsKeys.flow(ctx, flowId) })
      void queryClient.invalidateQueries({ queryKey: flowsKeys.lists(ctx) })
    },
  })
}
