import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

export function EditFlowMetadataDialog({
  open,
  onOpenChange,
  detail,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: FlowDetail
}) {
  const [name, setName] = React.useState(detail.name)
  const [endpoint, setEndpoint] = React.useState(detail.endpoint_uri ?? "")
  const [categories, setCategories] = React.useState<FlowCategory[]>(
    detail.categories
  )

  const mutation = useUpdateFlowMetadata(detail.id)

  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setName(detail.name)
      setEndpoint(detail.endpoint_uri ?? "")
      setCategories(detail.categories)
      mutation.reset()
    }
  }

  const toggleCategory = (category: FlowCategory) => {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category]
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    try {
      await mutation.mutateAsync({
        name: name.trim(),
        endpoint_uri: endpoint.trim(),
        categories,
      })
      toast.add({ title: "Metadata updated", type: "success" })
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.add({
        title: "Could not update metadata",
        description: message,
        type: "error",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit flow metadata</DialogTitle>
          <DialogDescription>
            Updates the flow&apos;s name, endpoint, and categories.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="metadata-name">Name</FieldLabel>
            <Input
              id="metadata-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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
                <label
                  key={category}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={categories.includes(category)}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  {category}
                </label>
              ))}
            </div>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !name.trim()}
            >
              {mutation.isPending && <Spinner />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
