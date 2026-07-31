import * as monaco from "monaco-editor/editor/editor.api"

// Editor core UI features ("VSCode feel"). Monaco 0.56 dropped the old
// `editor.all.js` bundle — its package root (`monaco-editor/esm/vs/index.js`)
// now pulls in every contrib feature *and* every language grammar (~90
// languages) in one file. We only need JSON, so import the individual
// contrib modules that give find/fold/multi-cursor/suggest/hover/format
// instead of paying for the language grammars we'll never use.
//
// Note: specifiers below omit the `esm/vs/` prefix on purpose — the package's
// `exports` map (`"./*": "./esm/vs/*.js"`) already prepends it; including it
// in the specifier doubles the path and breaks resolution under `tsc -b` /
// `moduleResolution: "bundler"" (raw filesystem checks don't catch this).
import "monaco-editor/editor/contrib/contextmenu/browser/contextmenu.js"
import "monaco-editor/editor/contrib/find/browser/findController.js"
import "monaco-editor/editor/contrib/folding/browser/folding.js"
import "monaco-editor/editor/contrib/multicursor/browser/multicursor.js"
import "monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching.js"
import "monaco-editor/editor/contrib/clipboard/browser/clipboard.js"
import "monaco-editor/editor/contrib/linesOperations/browser/linesOperations.js"
import "monaco-editor/editor/contrib/wordOperations/browser/wordOperations.js"
import "monaco-editor/editor/contrib/cursorUndo/browser/cursorUndo.js"
import "monaco-editor/editor/contrib/format/browser/formatActions.js"
import "monaco-editor/editor/contrib/gotoError/browser/gotoError.js"
import "monaco-editor/editor/contrib/gotoError/browser/markerSelectionStatus.js"
import "monaco-editor/editor/contrib/hover/browser/hoverContribution.js"
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js"
import "monaco-editor/editor/contrib/suggest/browser/suggestInlineCompletions.js"
import "monaco-editor/editor/contrib/snippet/browser/snippetController2.js"
import "monaco-editor/editor/contrib/stickyScroll/browser/stickyScrollContribution.js"
import "monaco-editor/editor/contrib/wordHighlighter/browser/wordHighlighter.js"
import "monaco-editor/editor/contrib/indentation/browser/indentation.js"
import "monaco-editor/editor/contrib/readOnlyMessage/browser/contribution.js"
import "monaco-editor/editor/contrib/unusualLineTerminators/browser/unusualLineTerminators.js"
import "monaco-editor/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode.js"

// JSON language: tokenizer + worker-backed diagnostics/completion/format/hover.
// Monaco 0.56 restructured this out of the old `language/json/monaco.contribution`
// location (still present as an untyped legacy shim) into `languages/features/json`,
// which is what the package root's own `index.d.ts` re-exports as `json` — so this
// is the only path with real type declarations for `jsonDefaults`.
import { jsonDefaults } from "monaco-editor/languages/features/json/register.js"

import EditorWorker from "monaco-editor/editor/editor.worker?worker"
import JsonWorker from "monaco-editor/languages/features/json/json.worker?worker"

import { FLOW_JSON_SCHEMA } from "@/lib/flows/schema"

declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment
  }
}

// Must be assigned before the first `monaco.editor.create` / `createModel`.
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "json") {
      return new JsonWorker()
    }
    return new EditorWorker()
  },
}

export { monaco }

export const FLOW_SCHEMA_URI =
  "https://flows-manager.local/schemas/whatsapp-flow-json.json"

let configured = false

export function ensureMonacoConfigured(): void {
  if (configured) {
    return
  }
  configured = true

  monaco.editor.defineTheme("flows-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#00000000",
      "editorGutter.background": "#00000000",
    },
  })

  monaco.editor.defineTheme("flows-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#00000000",
      "editorGutter.background": "#00000000",
    },
  })

  setSchemaValidationEnabled(true)

  // Monaco measures glyph width once (from the actual `font-family`, not the
  // fallback) and caches it for every position/selection calculation. The
  // JetBrains Mono Variable webfont (@fontsource-variable/jetbrains-mono)
  // loads asynchronously, so if an editor is created before it's ready,
  // Monaco measures the fallback monospace font instead — then keeps using
  // that stale width forever, which desyncs the cursor/typed characters and
  // selection highlights from where the (now-loaded) real font actually
  // paints glyphs. `remeasureFonts` clears the cache once the webfont is
  // confirmed loaded so layout catches up.
  void document.fonts.load('14px "JetBrains Mono Variable"').then(() => {
    monaco.editor.remeasureFonts()
  })
}

export function setSchemaValidationEnabled(enabled: boolean): void {
  jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    trailingCommas: "error",
    enableSchemaRequest: false,
    schemaValidation: "error",
    schemaRequest: "ignore",
    schemas: enabled
      ? [{ uri: FLOW_SCHEMA_URI, fileMatch: ["*"], schema: FLOW_JSON_SCHEMA }]
      : [],
  })
}

const models = new Map<string, monaco.editor.ITextModel>()
const savedVersionIds = new Map<string, number>()

export interface FlowModelResult {
  model: monaco.editor.ITextModel
  created: boolean
}

export function getOrCreateFlowModel(
  flowId: string,
  initialValue: string
): FlowModelResult {
  const existing = models.get(flowId)
  if (existing && !existing.isDisposed()) {
    return { model: existing, created: false }
  }

  const uri = monaco.Uri.parse(`inmemory://flow-json/${flowId}.json`)
  const model = monaco.editor.createModel(initialValue, "json", uri)
  models.set(flowId, model)
  savedVersionIds.set(flowId, model.getAlternativeVersionId())
  return { model, created: true }
}

export function disposeFlowModel(flowId: string): void {
  const model = models.get(flowId)
  if (model && !model.isDisposed()) {
    model.dispose()
  }
  models.delete(flowId)
  savedVersionIds.delete(flowId)
}

/** Marks the model's current content as the saved baseline (e.g. after a successful Update). */
export function markFlowModelSaved(flowId: string): void {
  const model = models.get(flowId)
  if (model && !model.isDisposed()) {
    savedVersionIds.set(flowId, model.getAlternativeVersionId())
  }
}

export function isFlowModelDirty(flowId: string): boolean {
  const model = models.get(flowId)
  if (!model || model.isDisposed()) {
    return false
  }
  const saved = savedVersionIds.get(flowId)
  return saved !== undefined && model.getAlternativeVersionId() !== saved
}

export function hasAnyDirtyModel(): boolean {
  for (const flowId of models.keys()) {
    if (isFlowModelDirty(flowId)) {
      return true
    }
  }
  return false
}
