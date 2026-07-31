import type * as Monaco from "monaco-editor/editor/editor.api"

import type { MetaValidationError } from "./types"

export const META_MARKER_OWNER = "meta-flow-validation"

/**
 * Meta's `line_start` is documented 1-based, matching Monaco. `column_start`'s
 * base is not reliably documented — calibrate empirically (see plan §9 step 8)
 * by triggering a known validation error and checking whether the squiggle
 * starts on the offending token (base 1, current value) or one char to its
 * left (flip to 0).
 */
export const META_COLUMN_BASE = 1

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function toMarkers(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  errors: MetaValidationError[]
): Monaco.editor.IMarkerData[] {
  const lineCount = model.getLineCount()
  const colAdjust = 1 - META_COLUMN_BASE

  return errors.map((error) => {
    const startLine = clamp(error.line_start, 1, lineCount)
    const endLine = clamp(
      error.line_end ?? error.line_start,
      startLine,
      lineCount
    )
    const startCol = Math.max(1, (error.column_start ?? 1) + colAdjust)
    const endCol =
      error.column_end != null
        ? Math.max(startCol + 1, error.column_end + colAdjust)
        : model.getLineMaxColumn(endLine)

    return {
      severity: monaco.MarkerSeverity.Error,
      message: error.message,
      source: "Meta",
      code: error.error_type ?? error.error,
      startLineNumber: startLine,
      startColumn: startCol,
      endLineNumber: endLine,
      endColumn: endCol,
    }
  })
}

export function applyMetaMarkers(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  errors: MetaValidationError[]
): void {
  monaco.editor.setModelMarkers(
    model,
    META_MARKER_OWNER,
    toMarkers(monaco, model, errors)
  )
}

export function clearMetaMarkers(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel
): void {
  monaco.editor.setModelMarkers(model, META_MARKER_OWNER, [])
}

export function markerToRevealPosition(
  marker: Monaco.editor.IMarkerData
): Monaco.IPosition {
  return { lineNumber: marker.startLineNumber, column: marker.startColumn }
}
