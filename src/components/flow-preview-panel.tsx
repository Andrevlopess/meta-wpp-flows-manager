import * as React from "react"
import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFlowPreview } from "@/hooks/use-flow-preview"
import { resetPreviewDetection } from "@/lib/flows/preview"

export function FlowPreviewPanel({
  flowId,
  enabled,
}: {
  flowId: string
  enabled: boolean
}) {
  const { outcome, isLoading, refresh } = useFlowPreview(flowId, { enabled })

  if (!enabled) {
    return null
  }

  if (isLoading && !outcome) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Spinner />
        Detecting preview…
      </div>
    )
  }

  if (!outcome || outcome.kind === "unsupported") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-medium">Preview unavailable</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Blip&apos;s command proxy did not return a preview_url for any known
          request shape.
        </p>
        {outcome && outcome.attempts.length > 0 && (
          <details className="w-full max-w-xs text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">
              Attempts ({outcome.attempts.length})
            </summary>
            <ul className="mt-1 flex flex-col gap-1">
              {outcome.attempts.map((attempt) => (
                <li key={attempt.strategyId} className="break-all">
                  <span className="font-mono">{attempt.uri}</span>
                  <br />
                  {attempt.error}
                </li>
              ))}
            </ul>
          </details>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetPreviewDetection()
            void refresh()
          }}
          disabled={isLoading}
        >
          {isLoading && <Spinner />}
          <RefreshCwIcon data-icon="inline-start" />
          Retry detection
        </Button>
      </div>
    )
  }

  const { preview } = outcome

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Preview</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<a href={preview.url} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Open in new tab
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh preview"
            onClick={() => void refresh()}
            disabled={isLoading}
          >
            {isLoading ? <Spinner /> : <RefreshCwIcon />}
          </Button>
        </div>
      </div>

      <PreviewFrame key={preview.url} url={preview.url} />
    </div>
  )
}

function PreviewFrame({ url }: { url: string }) {
  const [loaded, setLoaded] = React.useState(false)
  const [timedOut, setTimedOut] = React.useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="relative flex-1 bg-muted/30">
      <iframe
        src={url}
        title="Flow preview"
        className="size-full border-0"
        onLoad={() => setLoaded(true)}
      />
      {timedOut && !loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 p-6 text-center">
          <p className="text-sm font-medium">Preview could not be embedded</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            The preview may refuse to load inside an iframe. Open it in a new
            tab instead.
          </p>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={url} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Open in new tab
          </Button>
        </div>
      )}
    </div>
  )
}
