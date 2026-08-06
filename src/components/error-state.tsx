import { AlertTriangleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LimeError } from "@/lib/lime/client"

export interface ErrorStateProps {
  error: Error
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const code = error instanceof LimeError ? error.code : undefined

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center",
        className
      )}
    >
      <AlertTriangleIcon className="size-8 text-destructive" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium wrap-break-word text-destructive">
          {error.message}
        </p>
        {code !== undefined && (
          <p className="font-mono text-xs wrap-break-word text-muted-foreground">
            código: {code}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
