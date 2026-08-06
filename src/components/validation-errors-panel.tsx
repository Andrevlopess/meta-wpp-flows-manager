import type * as Monaco from "monaco-editor/editor/editor.api"
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
} from "lucide-react"

import { markerToRevealPosition } from "@/lib/flows/markers"
import type { MetaValidationError } from "@/lib/flows/types"

export interface ValidationErrorsPanelProps {
  metaErrors: MetaValidationError[]
  schemaMarkers: Monaco.editor.IMarkerData[]
  onReveal: (position: Monaco.IPosition) => void
}

export function ValidationErrorsPanel({
  metaErrors,
  schemaMarkers,
  onReveal,
}: ValidationErrorsPanelProps) {
  const totalCount = metaErrors.length + schemaMarkers.length

  if (totalCount === 0) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <CheckCircle2Icon className="size-4 text-primary" />
        Nenhum problema detectado.
      </div>
    )
  }

  const remainingCount = totalCount - 1

  return (
    <div className="flex flex-col gap-1 p-2">
      {metaErrors.length > 0 ? (
        <button
          type="button"
          onClick={() =>
            onReveal({
              lineNumber: metaErrors[0].line_start,
              column: metaErrors[0].column_start,
            })
          }
          className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="min-w-0 truncate">
            <span className="font-mono text-xs text-muted-foreground">
              Meta · L{metaErrors[0].line_start}:{metaErrors[0].column_start}{" "}
            </span>
            {metaErrors[0].message}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onReveal(markerToRevealPosition(schemaMarkers[0]))}
          className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
        >
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
          <span className="min-w-0 truncate">
            <span className="font-mono text-xs text-muted-foreground">
              Schema · L{schemaMarkers[0].startLineNumber}:
              {schemaMarkers[0].startColumn}{" "}
            </span>
            {schemaMarkers[0].message}
          </span>
        </button>
      )}
      {remainingCount > 0 && (
        <div className="px-2 py-1 text-xs text-muted-foreground">
          +{remainingCount} {remainingCount === 1 ? "problema" : "problemas"}
        </div>
      )}
    </div>
  )
}
