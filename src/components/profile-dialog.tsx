import * as React from "react"
import { useNavigate } from "react-router"
import {
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { Separator } from "@/components/ui/separator"
import { useProfiles } from "@/context/profile-context"
import { DEFAULT_CONTRACT, type Profile } from "@/lib/profiles/types"
import { makeProfile, maskKey } from "@/lib/profiles/storage"

interface FormState {
  id: string | null
  label: string
  contract: string
  routerKey: string
}

const EMPTY_FORM: FormState = {
  id: null,
  label: "",
  contract: DEFAULT_CONTRACT,
  routerKey: "",
}

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    profiles,
    activeProfileId,
    setActiveProfileId,
    upsertProfile,
    removeProfile,
  } = useProfiles()
  const [form, setForm] = React.useState<FormState | null>(null)
  const [showKey, setShowKey] = React.useState(false)
  const navigate = useNavigate()

  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setForm(null)
      setShowKey(false)
    }
  }

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setShowKey(false)
  }

  const startEdit = (profile: Profile) => {
    setForm({
      id: profile.id,
      label: profile.label,
      contract: profile.contract,
      routerKey: profile.routerKey,
    })
    setShowKey(false)
  }

  const cancelForm = () => setForm(null)

  const saveForm = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form) return

    const label = form.label.trim()
    const contract = form.contract.trim()
    const routerKey = form.routerKey.trim().replace(/^key\s+/i, "")
    if (!label || !contract || !routerKey) return

    const profile: Profile = form.id
      ? { id: form.id, label, contract, routerKey }
      : makeProfile({ label, contract, routerKey })

    upsertProfile(profile)

    if (!activeProfileId) {
      setActiveProfileId(profile.id)
    }

    setForm(null)
  }

  const handleDelete = (id: string) => {
    removeProfile(id)
    if (form?.id === id) {
      setForm(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Router key profiles</DialogTitle>
          <DialogDescription>
            Each profile stores a Blip contract and router key, used for every
            request. Stored in plaintext in this browser&apos;s local storage —
            this is a developer tool, not a secrets manager.
          </DialogDescription>
        </DialogHeader>

        {!form && (
          <div className="flex flex-col gap-1">
            <div className="flex max-h-[min(60vh,24rem)] flex-col gap-1 overflow-y-auto">
              {profiles.length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">
                  No profiles yet.
                </p>
              )}
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {profile.label}
                    </span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {profile.contract} · {maskKey(profile.routerKey)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {activeProfileId !== profile.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveProfileId(profile.id)
                          navigate("/flows")
                        }}
                      >
                        Use
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${profile.label}`}
                      onClick={() => startEdit(profile)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${profile.label}`}
                      onClick={() => handleDelete(profile.id)}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-2" />

            <Button variant="outline" onClick={startCreate}>
              <PlusIcon data-icon="inline-start" />
              Add profile
            </Button>
          </div>
        )}

        {form && (
          <form className="flex flex-col gap-4" onSubmit={saveForm}>
            <Field>
              <FieldLabel htmlFor="profile-label">Label</FieldLabel>
              <Input
                id="profile-label"
                autoFocus
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. skeps, cliente-1, cliente-2..."
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-contract">Contract</FieldLabel>
              <Input
                id="profile-contract"
                value={form.contract}
                onChange={(e) => setForm({ ...form, contract: e.target.value })}
                placeholder={DEFAULT_CONTRACT}
                required
              />
              <FieldDescription>
                Subdomain of http.msging.net, e.g. &quot;wlck&quot;.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-router-key">Router key</FieldLabel>
              <div className="relative">
                <Input
                  id="profile-router-key"
                  type={showKey ? "text" : "password"}
                  value={form.routerKey}
                  onChange={(e) =>
                    setForm({ ...form, routerKey: e.target.value })
                  }
                  className="pr-9"
                  autoComplete="off"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label={showKey ? "Hide router key" : "Show router key"}
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
              </div>
              <FieldDescription>
                Router Key of a router in meta WABA. e.g: Key ....
              </FieldDescription>
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelForm}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
