import * as React from "react"
import { Link } from "react-router"
import {
  ArchiveXIcon,
  CopyIcon,
  KeyRoundIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { DeprecateFlowDialog } from "@/components/deprecate-flow-dialog"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { FlowStatusBadge } from "@/components/flow-status-badge"
import { NewFlowDialog } from "@/components/new-flow-dialog"
import { ProfileDialog } from "@/components/profile-dialog"
import { PublicKeyDialog } from "@/components/public-key-dialog"
import { useFlows } from "@/hooks/use-flows"
import { useFlowPublicKey } from "@/hooks/use-flow-public-key"
import { useProfiles } from "@/context/profile-context"
import { FLOW_STATUSES, type FlowSummary } from "@/lib/flows/types"

export function FlowsListPage() {
  const { activeProfile } = useProfiles()
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false)

  if (!activeProfile) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          title="Nenhum perfil configurado"
          description="Adicione um perfil de chave de roteamento para começar a listar flows."
          action={
            <Button onClick={() => setProfileDialogOpen(true)}>
              Adicionar perfil
            </Button>
          }
        />
        <ProfileDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
        />
      </div>
    )
  }

  return <FlowsListContent />
}

function FlowsListContent() {
  const { data, isPending, isError, error, refetch } = useFlows()
  const { data: publicKey, isPending: isKeyPending } = useFlowPublicKey()
  const [newFlowOpen, setNewFlowOpen] = React.useState(false)
  const [publicKeyOpen, setPublicKeyOpen] = React.useState(false)
  const [deprecateTarget, setDeprecateTarget] =
    React.useState<FlowSummary | null>(null)

  const handleCopy = (value: string, label: string) => {
    void navigator.clipboard.writeText(value)
    toast.add({ title: `${label} copiado para a área de transferência`, type: "success" })
  }

  const hasPublicKey = typeof publicKey === "string" && publicKey.length > 0

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Flows</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={isKeyPending}
            onClick={() => setPublicKeyOpen(true)}
          >
            {hasPublicKey ? (
              <KeyRoundIcon data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            {hasPublicKey ? "Editar chave pública" : "Chave pública"}
          </Button>
          <Button onClick={() => setNewFlowOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Novo flow
          </Button>
        </div>
      </div>

      {isPending && <ListSkeleton />}

      {isError && error && <ErrorState error={error} onRetry={refetch} />}

      {data && data.length === 0 && (
        <EmptyState
          title="Nenhum flow encontrado"
          description="Crie seu primeiro flow para começar."
          action={
            <Button onClick={() => setNewFlowOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Novo flow
            </Button>
          }
        />
      )}

      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Categorias</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((flow) => (
              <TableRow key={flow.id}>
                <TableCell>
                  <div className="group/name flex items-center gap-1">
                    <Link
                      to={`/flows/${flow.id}`}
                      className="font-medium hover:underline"
                    >
                      {flow.name}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copiar nome do flow"
                      className="opacity-0 group-hover/name:opacity-100 focus-visible:opacity-100"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCopy(flow.name, "Nome do flow")
                      }}
                    >
                      <CopyIcon />
                    </Button>
                  </div>
                  <div className="group/id flex items-center gap-1">
                    <div className="font-mono text-xs text-muted-foreground">
                      {flow.id}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copiar ID do flow"
                      className="opacity-0 group-hover/id:opacity-100 focus-visible:opacity-100"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCopy(flow.id, "ID do flow")
                      }}
                    >
                      <CopyIcon />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <FlowStatusBadge status={flow.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {flow.categories.join(", ")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Ações da linha"
                        />
                      }
                    >
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        render={<Link to={`/flows/${flow.id}`} />}
                      >
                        Abrir
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          void navigator.clipboard.writeText(flow.id)
                        }}
                      >
                        <CopyIcon data-icon="inline-start" />
                        Copiar ID
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={flow.status === FLOW_STATUSES.DEPRECATED}
                        onClick={() => setDeprecateTarget(flow)}
                      >
                        <ArchiveXIcon data-icon="inline-start" />
                        Descontinuar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <NewFlowDialog open={newFlowOpen} onOpenChange={setNewFlowOpen} />

      <PublicKeyDialog open={publicKeyOpen} onOpenChange={setPublicKeyOpen} />

      {deprecateTarget && (
        <DeprecateFlowDialog
          open={!!deprecateTarget}
          onOpenChange={(open) => {
            if (!open) setDeprecateTarget(null)
          }}
          flowId={deprecateTarget.id}
          flowName={deprecateTarget.name}
          flowStatus={deprecateTarget.status}
        />
      )}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  )
}
