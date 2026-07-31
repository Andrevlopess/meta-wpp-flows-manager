/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import type { RequestContext } from "@/lib/lime/client"
import type { Profile } from "@/lib/profiles/types"
import {
  ACTIVE_PROFILE_KEY,
  PROFILES_KEY,
  loadActiveProfileId,
  loadProfiles,
  saveActiveProfileId,
  saveProfiles,
} from "@/lib/profiles/storage"

export interface ProfileContextValue {
  profiles: Profile[]
  activeProfile: Profile | null
  activeProfileId: string | null
  setActiveProfileId: (id: string | null) => void
  upsertProfile: (profile: Profile) => void
  removeProfile: (id: string) => void
  requestContext: RequestContext | null
}

const ProfileContext = React.createContext<ProfileContextValue | undefined>(
  undefined
)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = React.useState<Profile[]>(() =>
    loadProfiles()
  )
  const [activeProfileId, setActiveProfileIdState] = React.useState<
    string | null
  >(() => loadActiveProfileId())

  const setActiveProfileId = React.useCallback((id: string | null) => {
    saveActiveProfileId(id)
    setActiveProfileIdState(id)
  }, [])

  const upsertProfile = React.useCallback((profile: Profile) => {
    setProfiles((current) => {
      const index = current.findIndex((p) => p.id === profile.id)
      const next =
        index === -1
          ? [...current, profile]
          : current.map((p) => (p.id === profile.id ? profile : p))
      saveProfiles(next)
      return next
    })
  }, [])

  const removeProfile = React.useCallback((id: string) => {
    setProfiles((current) => {
      const next = current.filter((p) => p.id !== id)
      saveProfiles(next)
      return next
    })
    setActiveProfileIdState((current) => {
      if (current !== id) {
        return current
      }
      saveActiveProfileId(null)
      return null
    })
  }, [])

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) {
        return
      }

      if (event.key === PROFILES_KEY || event.key === null) {
        setProfiles(loadProfiles())
      }

      if (event.key === ACTIVE_PROFILE_KEY || event.key === null) {
        setActiveProfileIdState(loadActiveProfileId())
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const activeProfile = React.useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId]
  )

  const requestContext = React.useMemo<RequestContext | null>(() => {
    if (!activeProfile) {
      return null
    }
    return {
      routerKey: activeProfile.routerKey,
      contract: activeProfile.contract,
    }
  }, [activeProfile])

  const value = React.useMemo<ProfileContextValue>(
    () => ({
      profiles,
      activeProfile,
      activeProfileId,
      setActiveProfileId,
      upsertProfile,
      removeProfile,
      requestContext,
    }),
    [
      profiles,
      activeProfile,
      activeProfileId,
      setActiveProfileId,
      upsertProfile,
      removeProfile,
      requestContext,
    ]
  )

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  )
}

export function useProfiles(): ProfileContextValue {
  const context = React.useContext(ProfileContext)

  if (context === undefined) {
    throw new Error("useProfiles must be used within a ProfileProvider")
  }

  return context
}

export function useRequestContext(): RequestContext {
  const { requestContext } = useProfiles()

  if (!requestContext) {
    throw new Error(
      "useRequestContext must only be used where an active profile is guaranteed"
    )
  }

  return requestContext
}
