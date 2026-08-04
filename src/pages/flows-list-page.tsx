import * as React from "react"
import { Link } from "react-router"
import {
  ArchiveXIcon,
  CopyIcon,
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
import { DeprecateFlowDialog } from "@/components/deprecate-flow-dialog"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { FlowStatusBadge } from "@/components/flow-status-badge"
import { NewFlowDialog } from "@/components/new-flow-dialog"
import { ProfileDialog } from "@/components/profile-dialog"
import { useFlows } from "@/hooks/use-flows"
import { useProfiles } from "@/context/profile-context"
import { FLOW_STATUSES, type FlowSummary } from "@/lib/flows/types"

export function FlowsListPage() {
  const { activeProfile } = useProfiles()
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false)

  if (!activeProfile) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          title="No profile configured"
          description="Add a router key profile to start listing flows."
          action={
            <Button onClick={() => setProfileDialogOpen(true)}>
              Add profile
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
  const [newFlowOpen, setNewFlowOpen] = React.useState(false)
  const [deprecateTarget, setDeprecateTarget] =
    React.useState<FlowSummary | null>(null)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Flows</h1>
        <Button onClick={() => setNewFlowOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New flow
        </Button>
      </div>

      {isPending && <ListSkeleton />}

      {isError && error && <ErrorState error={error} onRetry={refetch} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No flows found"
          description="Create your first flow to get started."
          action={
            <Button onClick={() => setNewFlowOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              New flow
            </Button>
          }
        />
      )}

      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((flow) => (
              <TableRow key={flow.id}>
                <TableCell>
                  <Link
                    to={`/flows/${flow.id}`}
                    className="font-medium hover:underline"
                  >
                    {flow.name}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">
                    {flow.id}
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
                          aria-label="Row actions"
                        />
                      }
                    >
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        render={<Link to={`/flows/${flow.id}`} />}
                      >
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          void navigator.clipboard.writeText(flow.id)
                        }}
                      >
                        <CopyIcon data-icon="inline-start" />
                        Copy ID
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={flow.status === FLOW_STATUSES.DEPRECATED}
                        onClick={() => setDeprecateTarget(flow)}
                      >
                        <ArchiveXIcon data-icon="inline-start" />
                        Deprecate
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
