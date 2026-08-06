import type { RequestContext } from "@/lib/lime/client"

export const flowsKeys = {
  all: (ctx: RequestContext) => ["flows", ctx.contract, ctx.routerKey] as const,
  lists: (ctx: RequestContext) => [...flowsKeys.all(ctx), "list"] as const,
  flow: (ctx: RequestContext, flowId: string) =>
    [...flowsKeys.all(ctx), "flow", flowId] as const,
  detail: (ctx: RequestContext, flowId: string) =>
    [...flowsKeys.flow(ctx, flowId), "detail"] as const,
  asset: (ctx: RequestContext, flowId: string) =>
    [...flowsKeys.flow(ctx, flowId), "asset"] as const,
  preview: (ctx: RequestContext, flowId: string) =>
    [...flowsKeys.flow(ctx, flowId), "preview"] as const,
  publicKey: (ctx: RequestContext) =>
    [...flowsKeys.all(ctx), "public-key"] as const,
}
