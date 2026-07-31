import * as React from "react"
import { useNavigate } from "react-router"

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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useCreateFlow } from "@/hooks/use-flow-mutations"
import { FLOW_CATEGORIES, type FlowCategory } from "@/lib/flows/types"

export function NewFlowDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const [name, setName] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("")
  const [categories, setCategories] = React.useState<FlowCategory[]>(["OTHER"])

  const mutation = useCreateFlow()

  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setName("")
      setEndpoint("")
      setCategories(["OTHER"])
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
    if (!name.trim() || categories.length === 0) return

    try {
      const id = await mutation.mutateAsync({
        name: name.trim(),
        categories,
        endpoint_uri: endpoint.trim() || undefined,
      })
      toast.add({ title: "Flow created", type: "success" })
      onOpenChange(false)
      navigate(`/flows/${id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      onOpenChange(false)
      toast.add({
        title: "Could not create flow",
        description: message,
        type: "error",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New flow</DialogTitle>
          <DialogDescription>
            Creates an empty draft flow. You can edit its JSON afterwards.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="new-flow-name">Name</FieldLabel>
            <Input
              id="new-flow-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. personal-data-staging"
              required
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

          <Field>
            <FieldLabel htmlFor="new-flow-endpoint">
              Endpoint URI (optional)
            </FieldLabel>
            <Input
              id="new-flow-endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://example.com/data"
            />
            <FieldDescription>
              Required only for flows with a data endpoint.
            </FieldDescription>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending || !name.trim() || categories.length === 0
              }
            >
              {mutation.isPending && <Spinner />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
