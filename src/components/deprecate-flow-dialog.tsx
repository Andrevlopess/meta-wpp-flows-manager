import * as React from "react"
import { useNavigate } from "react-router"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useDeprecateFlow } from "@/hooks/use-flow-mutations"
import { FLOW_STATUSES, type FlowStatus } from "@/lib/flows/types"

export function DeprecateFlowDialog({
  open,
  onOpenChange,
  flowId,
  flowName,
  flowStatus,
  onDeprecated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  flowId: string
  flowName: string
  flowStatus: FlowStatus
  onDeprecated?: () => void
}) {
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = React.useState("")

  const mutation = useDeprecateFlow()

  // Reset local state when the dialog transitions to closed. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass.
  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setConfirmText("")
      mutation.reset()
    }
  }

  const isDraft = flowStatus === FLOW_STATUSES.DRAFT
  const canDeprecate = confirmText.trim() === flowName

  const handleConfirm = async () => {
    if (!canDeprecate) return

    try {
      const outcome = await mutation.mutateAsync({ flowId, status: flowStatus })
      toast.add({
        title: outcome === "deleted" ? "Flow excluído" : "Flow descontinuado",
        type: "success",
      })
      onOpenChange(false)
      onDeprecated?.()
      navigate("/flows")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      onOpenChange(false)
      toast.add({
        title: "Não foi possível descontinuar o flow",
        description: message,
        type: "error",
      })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Descontinuar &quot;{flowName}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDraft
              ? "Este flow nunca foi publicado, portanto será excluído definitivamente. Essa ação não pode ser desfeita. Digite o nome do flow para confirmar."
              : "Este flow já foi publicado, portanto só pode ser descontinuado, não excluído. Flows descontinuados deixam de ficar disponíveis e não podem ser restaurados. Digite o nome do flow para confirmar."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={flowName}
          autoFocus
        />

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canDeprecate || mutation.isPending}
            onClick={handleConfirm}
          >
            {mutation.isPending && <Spinner />}
            {isDraft ? "Excluir" : "Descontinuar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
