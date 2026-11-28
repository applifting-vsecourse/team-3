import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { catalogKeys } from "@/lib/catalog/catalogQueryOptions"

import { InterestBrowser } from "@/features/onboarding/components/InterestPicker"
import type { SelfProfile } from "@/features/profile/api/profileSchemas"
import { ProfileForm } from "@/features/profile/components/ProfileForm"

// /profil/upravit puts the onboarding's picker into the profile's form (PO 26. 11., #418):
// the real picker inside the real form, as the route composes them
const save = vi.hoisted(() => vi.fn())
vi.mock("@/features/profile/hooks/useProfileMutations", () => ({
  useSaveProfile: () => ({ mutateAsync: save, isPending: false, isSuccess: false, error: null }),
}))

const locality = { id: "prague", slug: "praha", name: "Praha", parentId: null, lat: 50, lng: 14 }
// through `unknown`: Najdi parťáka (#472) adds a required `partnerDiscoverable` to the profile, and
// the fixture must type-check before and after it, whichever of the two is merged first
const profile = {
  id: "owner",
  name: "Jana Nová",
  email: "jana@example.com",
  emailVerified: true,
  hasPassword: true,
  homeLocality: locality,
  interests: [],
  partnerDiscoverable: true,
} as unknown as SelfProfile

describe("/profil/upravit › Zájmy (#418)", () => {
  it("Enter in the activity search searches, it doesn't save the profile (review #419)", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(catalogKeys.activities(), [
      {
        id: "sport",
        name: "Sport",
        slug: "sport",
        icon: "run",
        activities: [{ id: "volleyball", slug: "volejbal", name: "Volejbal", keywords: [] }],
      },
    ])
    client.setQueryData(catalogKeys.localities(), [locality])
    render(
      <QueryClientProvider client={client}>
        <ProfileForm
          profile={profile}
          interestChoice={(choice) => <InterestBrowser {...choice} />}
        />
      </QueryClientProvider>,
    )

    await userEvent.type(screen.getByLabelText("Hledat aktivitu"), "volejbal{Enter}")

    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { level: 3, name: "Výsledky hledání" })).toBeInTheDocument()
  })
})
