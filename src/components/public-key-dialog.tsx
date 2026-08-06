import * as React from "react"
import { CopyIcon, PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useFlowPublicKey } from "@/hooks/use-flow-public-key"
import { useUploadFlowPublicKey } from "@/hooks/use-flow-mutations"
import { cn } from "@/lib/utils"


export function PublicKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: currentKey } = useFlowPublicKey()
  const [editing, setEditing] = React.useState(false)
  const [key, setKey] = React.useState("")

  const mutation = useUploadFlowPublicKey()

  const hasKey = typeof currentKey === "string" && currentKey.length > 0

  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setEditing(false)
      setKey("")
      mutation.reset()
    }
  }

  const handleEdit = () => {
    setKey(currentKey ?? "")
    setEditing(true)
  }

  const handleClose = () => {
    setEditing(false)
    setKey("")
    mutation.reset()
    onOpenChange(false)
  }

  const handleCopy = () => {
    if (!currentKey) return
    void navigator.clipboard.writeText(currentKey)
    toast.add({ title: "Chave pública copiada para a área de transferência", type: "success" })
  }

  const handleSave = async () => {
    if (!key.trim()) return

    try {
      await mutation.mutateAsync(key.trim())
      toast.add({ title: "Chave pública atualizada", type: "success" })
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.add({
        title: "Não foi possível atualizar a chave pública",
        description: message,
        type: "error",
      })
    }
  }

  if (!open) {
    return null
  }

  const editable = !hasKey || editing
  const value = hasKey && !editing ? (currentKey ?? "") : key

  return (
    <Dialog open onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{hasKey ? "Chave pública" : "Adicionar chave pública"}</DialogTitle>
          <DialogDescription>
            Chave pública RSA usada para autorizar requisições de endpoint para
            flows com endpoint de dados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <textarea
              autoFocus={!hasKey}
              readOnly={!editable}
              value={value}
              disabled={!editable}
              onChange={(e) => setKey(e.target.value)}
              placeholder={`-----BEGIN PUBLIC KEY-----…\n…\n-----END PUBLIC KEY-----`}
              aria-label="Chave pública"
              className={cn(
                "h-64 w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs leading-relaxed whitespace-pre text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-80 dark:bg-input/30"
              )}
            />
            {hasKey && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Copiar chave pública"
                className="absolute top-1 right-1"
                onClick={handleCopy}
              >
                <CopyIcon />
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Fechar
            </Button>
            {hasKey ? (
              editing ? (
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={mutation.isPending || !key.trim()}
                >
                  {mutation.isPending && <Spinner />}
                  Salvar
                </Button>
              ) : (
                <Button type="button" onClick={handleEdit}>
                  <PencilIcon data-icon="inline-start" />
                  Editar
                </Button>
              )
            ) : (
              <Button
                type="button"
                onClick={handleSave}
                disabled={mutation.isPending || !key.trim()}
              >
                {mutation.isPending && <Spinner />}
                Enviar
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
