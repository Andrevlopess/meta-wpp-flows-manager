import * as React from "react"
import { CheckIcon, PencilIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useUpdateFlowMetadata } from "@/hooks/use-flow-mutations"
import {
  FLOW_CATEGORIES,
  type FlowCategory,
  type FlowDetail,
} from "@/lib/flows/types"

export function FlowMetadataForm({ detail }: { detail: FlowDetail }) {
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState(detail.name)
  const [endpoint, setEndpoint] = React.useState(detail.endpoint_uri ?? "")
  const [categories, setCategories] = React.useState<FlowCategory[]>(
    detail.categories
  )

  const mutation = useUpdateFlowMetadata(detail.id)

  const startEdit = () => {
    setName(detail.name)
    setEndpoint(detail.endpoint_uri ?? "")
    setCategories(detail.categories)
    setEditing(true)
  }

  const toggleCategory = (category: FlowCategory) => {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category]
    )
  }

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({
        name: name.trim(),
        endpoint_uri: endpoint.trim(),
        categories,
      })
      toast.add({ title: "Metadata updated", type: "success" })
      setEditing(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.add({
        title: "Could not update metadata",
        description: message,
        type: "error",
      })
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <div>
            <span className="text-muted-foreground">Name: </span>
            {detail.name}
          </div>
          <div>
            <span className="text-muted-foreground">Endpoint: </span>
            {detail.endpoint_uri ? (
              <span className="break-all">{detail.endpoint_uri}</span>
            ) : (
              <span className="text-muted-foreground">none</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Categories: </span>
            {detail.categories.join(", ")}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={startEdit}>
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <Field>
        <FieldLabel htmlFor="metadata-name">Name</FieldLabel>
        <Input
          id="metadata-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="metadata-endpoint">Endpoint URI</FieldLabel>
        <Input
          id="metadata-endpoint"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://example.com/data"
        />
      </Field>

      <Field>
        <FieldLabel>Categories</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {FLOW_CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={categories.includes(category)}
                onCheckedChange={() => toggleCategory(category)}
              />
              {category}
            </label>
          ))}
        </div>
      </Field>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(false)}
          disabled={mutation.isPending}
        >
          <XIcon data-icon="inline-start" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={mutation.isPending || !name.trim()}
        >
          {mutation.isPending ? (
            <Spinner />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          Save
        </Button>
      </div>
    </div>
  )
}
