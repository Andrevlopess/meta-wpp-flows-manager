import { CopyIcon, DownloadIcon, SparklesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"

export interface EditorToolbarProps {
  getValue: () => string
  flowName: string
  schemaEnabled: boolean
  onSchemaEnabledChange: (enabled: boolean) => void
  markerCount: number
}

export function EditorToolbar({
  getValue,
  flowName,
  schemaEnabled,
  onSchemaEnabledChange,
  markerCount,
}: EditorToolbarProps) {
  const handleCopy = () => {
    void navigator.clipboard.writeText(getValue())
    toast.add({ title: "JSON copiado para a área de transferência", type: "success" })
  }

  const handleDownload = () => {
    const blob = new Blob([getValue()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${flowName || "flow"}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        <CopyIcon data-icon="inline-start" />
        Copiar
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDownload}>
        <DownloadIcon data-icon="inline-start" />
        Baixar
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button
        variant={schemaEnabled ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onSchemaEnabledChange(!schemaEnabled)}
      >
        <SparklesIcon data-icon="inline-start" />
        Validação de json: {schemaEnabled ? "ativada" : "desativada"}
      </Button>

      <div className="ml-auto flex items-center gap-2">
        {markerCount > 0 && (
          <Badge variant="destructive">
            {markerCount} {markerCount === 1 ? "problema" : "problemas"}
          </Badge>
        )}
      </div>
    </div>
  )
}
