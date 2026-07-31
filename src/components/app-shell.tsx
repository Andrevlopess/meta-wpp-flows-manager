import type * as React from "react"
import { Link } from "react-router"
import { WorkflowIcon } from "lucide-react"

import { ProfileSwitcher } from "@/components/profile-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <Link to="/flows" className="flex items-center gap-2 font-medium">
            <WorkflowIcon className="size-5 text-primary" />
            <span>Flows Manager</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileSwitcher />
          </div>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  )
}
