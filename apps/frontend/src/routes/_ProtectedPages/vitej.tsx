import { useState } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"
import { defaultLocalityQueryOptions } from "@/lib/catalog/defaultLocality"

import {
  authSessionQueryOptions,
  needsOnboarding,
  type Session,
} from "@/features/auth/api/authSessionQueryOptions"
import { useSession } from "@/features/auth/hooks/useSession"
import { safeRedirect } from "@/features/auth/lib/redirect"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"
import { OnboardingEventPreview } from "@/features/events/components/OnboardingEventPreview"
import { OnboardingBioSuggestion } from "@/features/onboarding/components/OnboardingBioSuggestion"
import {
  OnboardingWizard,
  type OnboardingResult,
} from "@/features/onboarding/components/OnboardingWizard"
import { INTEREST_GOAL } from "@/features/onboarding/lib/onboardingFlow"
import { profileKeys } from "@/features/profile/api/profileQueryOptions"
import { profileUpload } from "@/features/profile/api/profileUpload"
import { ProfileEditor, type ProfileDraft } from "@/features/profile/components/ProfileEditor"

export const Route = createFileRoute("/_ProtectedPages/vitej")({
  validateSearch: z.object({ from: z.string().optional().catch(undefined) }),
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) {
      throw redirect({
        to: ROUTES.login,
        search: { from: safeRedirect(search.from, ROUTES.events) },
      })
    }
    if (!needsOnboarding(session.user)) {
      throw redirect({ href: safeRedirect(search.from, ROUTES.events), replace: true })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const { user } = useSession()
  const { from } = Route.useSearch()
  const { queryClient } = Route.useRouteContext()
  const navigate = Route.useNavigate()
  const [draft, setDraft] = useState<{ viewerId: string; profile: ProfileDraft }>()
  if (!user) return null
  const viewerId = user.id

  const finish = async (
    { onboardingCompletedAt, localitySlug, hasInterests, displayName }: OnboardingResult,
    hasSubmittedPreferences: boolean,
  ) => {
    const current = queryClient.getQueryData<Session>(authKeys.session())
    if (current?.user.id !== viewerId) return
    queryClient.setQueryData<Session>(authKeys.session(), () => ({
      user: { ...current.user, name: displayName ?? current.user.name, onboardingCompletedAt },
    }))
    void queryClient.invalidateQueries({ queryKey: defaultLocalityQueryOptions(viewerId).queryKey })
    void queryClient.invalidateQueries({ queryKey: profileKeys.self(viewerId) })
    void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })

    if (hasSubmittedPreferences && localitySlug && hasInterests) {
      await navigate({
        to: ROUTES.events,
        search: { lokalita: localitySlug, vyber: "podle-zajmu" },
        replace: true,
      })
    } else {
      await navigate({ href: safeRedirect(from, ROUTES.events), replace: true })
    }
  }

  return (
    <OnboardingWizard
      key={viewerId}
      viewerId={viewerId}
      renderEventPreview={(locality, categoryId) => (
        <OnboardingEventPreview
          key={categoryId}
          locality={locality}
          categoryId={categoryId}
        />
      )}
      renderProfile={({
        locality,
        interestIds,
        categories,
        localities,
        onBack,
        onSkip,
        onSave,
      }) => (
        <ProfileEditor
          initial={{ name: user.name, bio: "", homeLocalityId: locality.id, interestIds }}
          draft={draft?.viewerId === viewerId ? draft.profile : undefined}
          categories={categories}
          localities={localities}
          onboarding={{
            minimumInterests: INTEREST_GOAL,
            onBack: (profile) => {
              setDraft({ viewerId, profile })
              onBack()
            },
            onSkip,
            renderBioSuggestion: (editor) => <OnboardingBioSuggestion {...editor} />,
          }}
          onSave={async (values, photo) => {
            // A name carried over from sign-up should only be saved if the owner edited it.
            const { name, ...preferences } = values
            const payload = name === user.name ? preferences : { ...preferences, name }
            await onSave(profileUpload(payload, photo))
          }}
        />
      )}
      onFinish={finish}
    />
  )
}
