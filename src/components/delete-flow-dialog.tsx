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
import { useDeleteFlow } from "@/hooks/use-flow-mutations"

export function DeleteFlowDialog({
  open,
  onOpenChange,
  flowId,
  flowName,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  flowId: string
  flowName: string
  onDeleted?: () => void
}) {
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = React.useState("")

  const mutation = useDeleteFlow()

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

  const canDelete = confirmText.trim() === flowName

  const handleConfirm = async () => {
    if (!canDelete) return

    try {
      await mutation.mutateAsync(flowId)
      toast.add({ title: "Flow deleted", type: "success" })
      onOpenChange(false)
      onDeleted?.()
      navigate("/flows")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      onOpenChange(false)
      toast.add({
        title: "Could not delete flow",
        description: message,
        type: "error",
      })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{flowName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This deprecates and permanently deletes the flow. This cannot be
            undone. Type the flow name to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={flowName}
          autoFocus
        />

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canDelete || mutation.isPending}
            onClick={handleConfirm}
          >
            {mutation.isPending && <Spinner />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
