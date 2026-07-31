import * as React from "react"
import { SettingsIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProfileDialog } from "@/components/profile-dialog"
import { useProfiles } from "@/context/profile-context"

const MANAGE_VALUE = "__manage__"

export function ProfileSwitcher() {
  const { profiles, activeProfileId, setActiveProfileId } = useProfiles()
  const [dialogOpen, setDialogOpen] = React.useState(false)

  return (
    <>
      <Select
        // Always controlled (never `undefined`) — Base UI warns and gets
        // stuck displaying the placeholder if a Select switches from
        // uncontrolled to controlled after the first profile is added.
        value={activeProfileId ?? ""}
        onValueChange={(value: string | null) => {
          if (value === MANAGE_VALUE) {
            setDialogOpen(true)
            return
          }
          setActiveProfileId(value)
        }}
      >
        <SelectTrigger className="w-48" size="sm">
          <SelectValue placeholder="No profile">
            {(value: string | null) =>
              profiles.find((p) => p.id === value)?.label ?? "No profile"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.label}
            </SelectItem>
          ))}
          {profiles.length > 0 && <SelectSeparator />}
          <SelectItem value={MANAGE_VALUE}>
            <SettingsIcon />
            Manage profiles…
          </SelectItem>
        </SelectContent>
      </Select>

      <ProfileDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
