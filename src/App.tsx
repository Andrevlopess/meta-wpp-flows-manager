import * as React from "react"
import { Navigate, Route, Routes } from "react-router"

import { AppShell } from "@/components/app-shell"
import { Spinner } from "@/components/ui/spinner"
import { FlowDetailLayout } from "@/pages/flow-detail-layout"
import { FlowsListPage } from "@/pages/flows-list-page"
import { NotFoundPage } from "@/pages/not-found-page"

// Lazy-loaded at the route level (not just its editor): this page imports
// monaco-setup.ts directly for model/marker management, not only through the
// JsonEditor component, so route-level splitting is what actually keeps
// Monaco out of the flows-list bundle.
const FlowDetailPage = React.lazy(() =>
  import("@/pages/flow-detail-page").then((m) => ({
    default: m.FlowDetailPage,
  }))
)

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/flows" replace />} />
        <Route path="/flows" element={<FlowsListPage />} />
        <Route path="/flows/:flowId" element={<FlowDetailLayout />}>
          <Route
            index
            element={
              <React.Suspense
                fallback={
                  <div className="flex flex-1 items-center justify-center p-6">
                    <Spinner className="size-6" />
                  </div>
                }
              >
                <FlowDetailPage />
              </React.Suspense>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
