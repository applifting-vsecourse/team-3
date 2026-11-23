import { useQuery } from "@tanstack/react-query"

import { activityTreeQueryOptions, localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"

import type { ProfileInput, SelfProfile } from "@/features/profile/api/profileSchemas"
import { useSaveProfile } from "@/features/profile/hooks/useProfileMutations"

import { ProfileEditor } from "./ProfileEditor"
import { ProfileError, ProfileLoading } from "./ProfileState"

/** Údaje on /profil/upravit (Figma B-06, B-06d): photo, name, bio, who sees what, home locality and interests. */
function toSettings(profile: SelfProfile): ProfileInput {
  return {
    name: profile.name,
    bio: profile.bio ?? "",
    homeLocalityId: profile.homeLocality?.id ?? null,
    interestIds: profile.interests.map(({ id }) => id),
    photoVisibility: profile.visibility.photo,
    bioVisibility: profile.visibility.bio,
    pastEventsVisibility: profile.visibility.pastEvents,
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
      photoKey={profile.photoKey}
      categories={activities.data}
      localities={localities.data}
      knownInterests={profile.interests}
      onSave={async (settings, photo) => {
        const next = await save.mutateAsync(photo ? { settings, photo } : settings)
        return { settings: toSettings(next), photoKey: next.photoKey }
      }}
    />
  )
}
