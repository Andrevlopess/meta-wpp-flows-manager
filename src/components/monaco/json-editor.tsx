import * as React from "react"

import { useResolvedTheme } from "@/hooks/use-resolved-theme"

import { ensureMonacoConfigured, monaco } from "./monaco-setup"

export interface JsonEditorHandle {
  revealPosition: (position: monaco.IPosition) => void
  getValue: () => string
  focus: () => void
}

export interface JsonEditorProps {
  model: monaco.editor.ITextModel | null
  readOnly?: boolean
  className?: string
  ref?: React.Ref<JsonEditorHandle>
}

function themeName(resolved: "dark" | "light"): string {
  return resolved === "dark" ? "flows-dark" : "flows-light"
}

export default function JsonEditor({
  model,
  readOnly = false,
  className,
  ref,
}: JsonEditorProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null
  )
  const resolvedTheme = useResolvedTheme()

  React.useEffect(() => {
    ensureMonacoConfigured()

    if (!containerRef.current) {
      return undefined
    }

    const editor = monaco.editor.create(containerRef.current, {
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 20,
      fontFamily:
        "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
      fontLigatures: false,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
      wordWrap: "off",
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
        highlightActiveIndentation: true,
      },
      renderWhitespace: "selection",
      renderLineHighlight: "line",
      folding: true,
      foldingStrategy: "indentation",
      stickyScroll: { enabled: true },
      smoothScrolling: true,
      cursorBlinking: "smooth",
      padding: { top: 12, bottom: 12 },
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false,
      },
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      formatOnPaste: false,
      formatOnType: false,
      fixedOverflowWidgets: true,
      theme: themeName(resolvedTheme),
    })

    editorRef.current = editor

    return () => {
      editor.dispose()
      editorRef.current = null
    }
    // Editor instance is created once and reused via setModel() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    monaco.editor.setTheme(themeName(resolvedTheme))
  }, [resolvedTheme])

  React.useEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }
    editor.setModel(model && !model.isDisposed() ? model : null)
  }, [model])

  React.useEffect(() => {
    editorRef.current?.updateOptions({ readOnly })
  }, [readOnly])

  React.useImperativeHandle(
    ref,
    () => ({
      revealPosition: (position) => {
        const editor = editorRef.current
        if (!editor) return
        editor.revealPositionInCenter(position)
        editor.setPosition(position)
        editor.focus()
      },
      getValue: () => editorRef.current?.getModel()?.getValue() ?? "",
      focus: () => editorRef.current?.focus(),
    }),
    []
  )

  return <div ref={containerRef} className={className} />
}
