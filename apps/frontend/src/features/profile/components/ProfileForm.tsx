import { useQuery } from "@tanstack/react-query"

import { activityTreeQueryOptions, localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"

import type { ProfileInput, SelfProfile } from "@/features/profile/api/profileSchemas"
import { useSaveProfile } from "@/features/profile/hooks/useProfileMutations"

import { ProfileEditor } from "./ProfileEditor"
import { ProfileError, ProfileLoading } from "./ProfileState"

function toSettings(profile: SelfProfile): ProfileInput {
  return {
    name: profile.name,
    bio: profile.bio ?? "",
    homeLocalityId: profile.homeLocality?.id ?? null,
    interestIds: profile.interests.map(({ id }) => id),
  }
}

export function ProfileForm({
  profile,
  onSaved,
}: {
  profile: SelfProfile
  onSaved?: () => Promise<void>
}) {
  const activities = useQuery(activityTreeQueryOptions())
  const localities = useQuery(localitiesQueryOptions())
  const save = useSaveProfile(profile.id, onSaved)
  if (activities.error || localities.error) {
    return (
      <ProfileError
        retry={() => {
          void activities.refetch()
          void localities.refetch()
        }}
      />
    )
  }
  if (!activities.data || !localities.data) return <ProfileLoading />

  return (
    <ProfileEditor
      initial={toSettings(profile)}
      photoVersion={profile.photoVersion}
      categories={activities.data}
      localities={localities.data}
      knownInterests={profile.interests}
      onSave={async (settings, photo) => {
        const next = await save.mutateAsync(photo ? { settings, photo } : settings)
        return { settings: toSettings(next), photoVersion: next.photoVersion }
      }}
    />
  )
}
