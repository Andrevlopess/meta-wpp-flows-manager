import type { Profile } from "./types"

export const PROFILES_KEY = "flows-manager.profiles"
export const ACTIVE_PROFILE_KEY = "flows-manager.active-profile"

function isProfile(value: unknown): value is Profile {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const p = value as Partial<Profile>
  return (
    typeof p.id === "string" &&
    typeof p.label === "string" &&
    typeof p.routerKey === "string" &&
    typeof p.contract === "string"
  )
}

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isProfile)
  } catch {
    return []
  }
}

export function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function loadActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY)
}

export function saveActiveProfileId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(ACTIVE_PROFILE_KEY)
    return
  }

  localStorage.setItem(ACTIVE_PROFILE_KEY, id)
}

export function makeProfile(input: Omit<Profile, "id">): Profile {
  return { id: crypto.randomUUID(), ...input }
}

// Fixed-width mask: a run of dots as long as the key is an unbreakable string
// that blows past any container it's rendered in (and leaks the key length).
const MASK_DOTS = 8

export function maskKey(key: string): string {
  if (key.length <= 4) {
    return "•".repeat(MASK_DOTS)
  }

  return `${"•".repeat(MASK_DOTS)}${key.slice(-4)}`
}
