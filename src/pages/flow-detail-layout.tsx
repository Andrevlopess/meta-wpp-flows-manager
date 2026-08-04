import * as React from "react"
import { NavLink, Outlet } from "react-router"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { NewFlowDialog } from "@/components/new-flow-dialog"
import { ProfileDialog } from "@/components/profile-dialog"
import { useFlows } from "@/hooks/use-flows"
import { useProfiles } from "@/context/profile-context"
import { cn } from "@/lib/utils"

export function FlowDetailLayout() {
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

  return <FlowDetailLayoutContent />
}

function FlowDetailLayoutContent() {
  const { data, isPending, isError, error, refetch } = useFlows()
  const [newFlowOpen, setNewFlowOpen] = React.useState(false)

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex min-h-0 w-64 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between gap-2 border-b border-border p-3">
          <span className="text-sm font-medium">Flows</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New flow"
            onClick={() => setNewFlowOpen(true)}
          >
            <PlusIcon />
          </Button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {isPending && <SidebarSkeleton />}

          {isError && error && (
            <ErrorState error={error} onRetry={refetch} className="px-2 py-6" />
          )}

          {data && data.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              No flows found.
            </p>
          )}

          {data?.map((flow) => (
            <NavLink
              key={flow.id}
              to={`/flows/${flow.id}`}
              className={({ isActive }) =>
                cn(
                  "block truncate rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                  isActive && "bg-accent"
                )
              }
            >
              {flow.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>

      <NewFlowDialog open={newFlowOpen} onOpenChange={setNewFlowOpen} />
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-full" />
      ))}
    </div>
  )
}
