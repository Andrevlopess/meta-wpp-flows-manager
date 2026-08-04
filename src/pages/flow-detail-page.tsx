import * as React from "react"
import { Link, useNavigate, useParams } from "react-router"
import type * as Monaco from "monaco-editor/editor/editor.api"
import {
  ArchiveXIcon,
  ArrowLeftIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PencilIcon,
  UploadCloudIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { DeprecateFlowDialog } from "@/components/deprecate-flow-dialog"
import { EditFlowMetadataDialog } from "@/components/edit-flow-metadata-dialog"
import { ErrorState } from "@/components/error-state"
import { FlowPreviewPanel } from "@/components/flow-preview-panel"
import { FlowStatusBadge } from "@/components/flow-status-badge"
import { ValidationErrorsPanel } from "@/components/validation-errors-panel"
import { EditorToolbar } from "@/components/monaco/editor-toolbar"
import JsonEditor, {
  type JsonEditorHandle,
} from "@/components/monaco/json-editor"
import {
  disposeFlowModel,
  ensureMonacoConfigured,
  getOrCreateFlowModel,
  isFlowModelDirty,
  markFlowModelSaved,
  monaco,
  setSchemaValidationEnabled,
} from "@/components/monaco/monaco-setup"
import { useFlowDetail } from "@/hooks/use-flow-detail"
import { usePublishFlow, useUpdateFlowJson } from "@/hooks/use-flow-mutations"
import type { UpdateFlowJsonResult } from "@/lib/flows/api"
import { applyMetaMarkers, clearMetaMarkers } from "@/lib/flows/markers"
import { FLOW_STATUSES, type MetaValidationError } from "@/lib/flows/types"

export function FlowDetailPage() {
  const { flowId } = useParams<{ flowId: string }>()

  if (!flowId) {
    return null
  }

  return <FlowDetailContent key={flowId} flowId={flowId} />
}

function FlowDetailContent({ flowId }: { flowId: string }) {
  const navigate = useNavigate()
  const { data, isPending, isError, error, refetch } = useFlowDetail(flowId)

  const [model, setModel] = React.useState<Monaco.editor.ITextModel | null>(
    null
  )
  const [dirty, setDirty] = React.useState(false)
  const [hasSyntaxErrors, setHasSyntaxErrors] = React.useState(false)
  const [metaErrors, setMetaErrors] = React.useState<MetaValidationError[]>([])
  const [updateOk, setUpdateOk] = React.useState(false)
  const [schemaMarkers, setSchemaMarkers] = React.useState<
    Monaco.editor.IMarkerData[]
  >([])
  const [schemaEnabled, setSchemaEnabled] = React.useState(true)
  const [previewCollapsed, setPreviewCollapsed] = React.useState(true)
  const [deprecateOpen, setDeprecateOpen] = React.useState(false)
  const [metadataEditOpen, setMetadataEditOpen] = React.useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = React.useState(false)
  const [updateResult, setUpdateResult] =
    React.useState<UpdateFlowJsonResult | null>(null)

  const savedVersionIdRef = React.useRef<number | null>(null)
  const editorHandleRef = React.useRef<JsonEditorHandle>(null)
  // Mirrors updateDialogOpen for reads inside handleUpdate: that closure is
  // invoked the instant the dialog opens (same tick as setUpdateDialogOpen),
  // so its captured `updateDialogOpen` is still the pre-open value by the
  // time the async update resolves. A ref read at toast-time stays current.
  const updateDialogOpenRef = React.useRef(false)

  const detail = data?.detail
  const isPublished = detail?.status === FLOW_STATUSES.PUBLISHED

  // (Re)create/reuse the model whenever a fresh flow JSON is fetched.
  React.useEffect(() => {
    if (!data?.flowJson) {
      return
    }

    ensureMonacoConfigured()
    // Pretty-print up front (Meta returns minified JSON) rather than creating
    // a minified model and formatting it after mount — formatting via the
    // editor's format action races the editor actually attaching the model.
    // This is a no-op for an already-existing model since initialValue is
    // only used the first time a given flowId's model is created.
    const initialValue = JSON.stringify(data.flowJson, null, 2)
    const { model: flowModel } = getOrCreateFlowModel(flowId, initialValue)

    // Deliberately synchronous: mirrors the Monaco model — an external system
    // created as a side effect of the fetch above — into React state so the
    // editor can render it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModel(flowModel)
    savedVersionIdRef.current = flowModel.getAlternativeVersionId()
    setDirty(false)
    setHasSyntaxErrors(false)

    const initialErrors = data.detail.validation_errors ?? []
    setMetaErrors(initialErrors)
    setUpdateOk(initialErrors.length === 0)

    if (initialErrors.length > 0) {
      applyMetaMarkers(monaco, flowModel, initialErrors)
    } else {
      clearMetaMarkers(monaco, flowModel)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, data?.flowJson])

  // Dirty tracking + pure-JSON-syntax validity (independent of schema markers).
  React.useEffect(() => {
    if (!model) {
      return undefined
    }

    const disposable = model.onDidChangeContent(() => {
      const isDirty =
        model.getAlternativeVersionId() !== savedVersionIdRef.current
      setDirty(isDirty)

      if (isDirty) {
        setUpdateOk(false)
        setMetaErrors([])
        clearMetaMarkers(monaco, model)
      }

      try {
        JSON.parse(model.getValue())
        setHasSyntaxErrors(false)
      } catch {
        setHasSyntaxErrors(true)
      }
    })

    return () => disposable.dispose()
  }, [model])

  // Mirror json-owned markers (syntax + schema) for the problems panel/count.
  React.useEffect(() => {
    if (!model) {
      return undefined
    }

    const sync = () => {
      setSchemaMarkers(
        monaco.editor.getModelMarkers({ owner: "json", resource: model.uri })
      )
    }
    sync()

    const disposable = monaco.editor.onDidChangeMarkers(
      (uris: readonly Monaco.Uri[]) => {
        const modelUri = model.uri.toString()
        if (uris.some((u: Monaco.Uri) => u.toString() === modelUri)) {
          sync()
        }
      }
    )

    return () => disposable.dispose()
  }, [model])

  // Dispose the model on unmount only if it has no unsaved changes.
  React.useEffect(() => {
    return () => {
      if (!isFlowModelDirty(flowId)) {
        disposeFlowModel(flowId)
      }
    }
  }, [flowId])

  React.useEffect(() => {
    setSchemaValidationEnabled(schemaEnabled)
  }, [schemaEnabled])

  const setUpdateDialogOpenState = React.useCallback((open: boolean) => {
    updateDialogOpenRef.current = open
    setUpdateDialogOpen(open)
  }, [])

  const updateMutation = useUpdateFlowJson(flowId)
  const publishMutation = usePublishFlow(flowId)

  const handleUpdate = async () => {
    setUpdateResult(null)

    if (!model) {
      setUpdateOk(false)
      // The update dialog already surfaces this same failure inline — only
      // toast it if the dialog isn't around to show it (e.g. user closed it
      // mid-request).
      if (!updateDialogOpenRef.current) {
        toast.add({
          title: "Update failed",
          description: "Editor is not ready yet.",
          type: "error",
        })
      }
      return
    }

    try {
      const parsed = JSON.parse(model.getValue())
      const result = await updateMutation.mutateAsync(parsed)
      setUpdateResult(result)

      if (result.ok) {
        savedVersionIdRef.current = model.getAlternativeVersionId()
        markFlowModelSaved(flowId)
        clearMetaMarkers(monaco, model)
        setDirty(false)
        setUpdateOk(true)
        setMetaErrors([])
        if (!updateDialogOpenRef.current) {
          toast.add({ title: "Flow JSON updated", type: "success" })
        }
      } else {
        setUpdateOk(false)
        setMetaErrors(result.validationErrors)
        applyMetaMarkers(monaco, model, result.validationErrors)
        if (!updateDialogOpenRef.current) {
          toast.add({
            title: `Update failed — ${result.validationErrors.length} validation error(s)`,
            type: "error",
          })
        }
      }
    } catch (err) {
      setUpdateOk(false)
      if (!updateDialogOpenRef.current) {
        const message = err instanceof Error ? err.message : String(err)
        toast.add({
          title: "Update failed",
          description: message,
          type: "error",
        })
      }
    }
  }

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync()
      // Publish has no dialog of its own to show success in, so always close
      // whatever's open (the update dialog, if publishing from its footer) and
      // surface the result via toast instead.
      setUpdateDialogOpenState(false)
      toast.add({ title: "Flow published", type: "success" })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.add({
        title: "Publish failed",
        description: message,
        type: "error",
      })
    }
  }

  const handleReveal = (position: Monaco.IPosition) => {
    editorHandleRef.current?.revealPosition(position)
  }

  if (isPending) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (isError && error) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center p-6">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  if (!detail) {
    return null
  }

  // Update/Publish stay enabled unconditionally — these are advisory hints
  // surfaced as tooltips, not gates.
  const updateWarning = hasSyntaxErrors
    ? "Fix JSON syntax errors first."
    : !dirty
      ? "No changes to update."
      : undefined

  const publishWarning = isPublished
    ? "Flow is already published."
    : dirty
      ? "You have unsaved changes — run Update first."
      : !updateOk || metaErrors.length > 0
        ? "Run Update successfully first."
        : undefined

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex items-center gap-3 px-4 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to flows"
          nativeButton={false}
          render={<Link to="/flows" />}
        >
          <ArrowLeftIcon />
        </Button>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{detail.name}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {detail.id}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Edit flow metadata"
          onClick={() => setMetadataEditOpen(true)}
        >
          <PencilIcon />
        </Button>
        <FlowStatusBadge status={detail.status} />

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            title={updateWarning}
            onClick={() => {
              setUpdateDialogOpenState(true)
              void handleUpdate()
            }}
          >
            {updateMutation.isPending && <Spinner />}
            Update
          </Button>
          <Button size="sm" title={publishWarning} onClick={handlePublish}>
            {publishMutation.isPending ? (
              <Spinner />
            ) : (
              <UploadCloudIcon data-icon="inline-start" />
            )}
            Publish
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Deprecate flow"
            disabled={detail.status === FLOW_STATUSES.DEPRECATED}
            onClick={() => setDeprecateOpen(true)}
          >
            <ArchiveXIcon />
          </Button>
          {previewCollapsed ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewCollapsed(false)}
            >
              <PanelRightOpenIcon data-icon="inline-start" />
              View preview
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Hide preview"
              onClick={() => setPreviewCollapsed(true)}
            >
              <PanelRightCloseIcon />
            </Button>
          )}
        </div>
      </div>

      {data?.flowJsonError && !data.flowJson && (
        <div className="p-3">
          <ErrorState error={new Error(data.flowJsonError)} onRetry={refetch} />
        </div>
      )}

      {data?.flowJson && (
        <div
          className="grid min-h-0 flex-1"
          style={{
            gridTemplateColumns: previewCollapsed
              ? "1fr"
              : "1fr minmax(0, 420px)",
          }}
        >
          <div className="flex min-h-0 min-w-0 flex-col border-r border-border">
            <EditorToolbar
              getValue={() => editorHandleRef.current?.getValue() ?? ""}
              flowName={detail.name}
              schemaEnabled={schemaEnabled}
              onSchemaEnabledChange={setSchemaEnabled}
              markerCount={metaErrors.length + schemaMarkers.length}
            />
            <div className="min-h-0 flex-1">
              <JsonEditor
                ref={editorHandleRef}
                model={model}
                className="h-full"
              />
            </div>
            <div className="border-t border-border">
              <ValidationErrorsPanel
                metaErrors={metaErrors}
                schemaMarkers={schemaMarkers}
                onReveal={handleReveal}
              />
            </div>
          </div>

          {!previewCollapsed && (
            <div className="flex min-h-0 min-w-0 flex-col">
              <FlowPreviewPanel flowId={flowId} enabled={!previewCollapsed} />
            </div>
          )}
        </div>
      )}

      <DeprecateFlowDialog
        open={deprecateOpen}
        onOpenChange={setDeprecateOpen}
        flowId={detail.id}
        flowName={detail.name}
        flowStatus={detail.status}
        onDeprecated={() => navigate("/flows")}
      />

      <EditFlowMetadataDialog
        open={metadataEditOpen}
        onOpenChange={setMetadataEditOpen}
        detail={detail}
      />

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpenState}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {updateMutation.isPending
                ? "Updating flow…"
                : updateMutation.status === "error"
                  ? "Update failed"
                  : updateResult?.ok
                    ? "Flow JSON updated"
                    : "Update rejected"}
            </DialogTitle>
            {!updateMutation.isPending && updateMutation.status === "error" && (
              <DialogDescription>
                {updateMutation.error?.message}
              </DialogDescription>
            )}
            {!updateMutation.isPending && updateResult?.ok && (
              <DialogDescription>
                The flow JSON was updated successfully. You can publish it now.
              </DialogDescription>
            )}
            {!updateMutation.isPending && updateResult && !updateResult.ok && (
              <DialogDescription>
                Meta rejected the update with{" "}
                {updateResult.validationErrors.length} validation error(s). Fix
                them and try again.
              </DialogDescription>
            )}
          </DialogHeader>

          {updateMutation.isPending && (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Spinner />
              Updating flow…
            </div>
          )}

          {!updateMutation.isPending && updateResult && !updateResult.ok && (
            <ValidationErrorsPanel
              metaErrors={updateResult.validationErrors}
              schemaMarkers={[]}
              onReveal={(position) => {
                setUpdateDialogOpenState(false)
                handleReveal(position)
              }}
            />
          )}

          {!updateMutation.isPending && updateResult?.ok && (
            <DialogFooter>
              <Button size="sm" title={publishWarning} onClick={handlePublish}>
                {publishMutation.isPending ? (
                  <Spinner />
                ) : (
                  <UploadCloudIcon data-icon="inline-start" />
                )}
                Publish
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
