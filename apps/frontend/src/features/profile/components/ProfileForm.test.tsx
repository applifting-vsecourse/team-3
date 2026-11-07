import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { catalogKeys } from "@/lib/catalog/catalogQueryOptions"

import type { ProfileInput, SelfProfile } from "@/features/profile/api/profileSchemas"

import { ProfileForm } from "./ProfileForm"

const save = vi.hoisted(() => vi.fn())
vi.mock("@/features/profile/hooks/useProfileMutations", () => ({
  useSaveProfile: () => ({ mutateAsync: save, isPending: false, isSuccess: false, error: null }),
}))
// Catalog selection itself has component tests; these stand in for its picked IDs.
vi.mock("@/components/CatalogCombobox/ActivityCombobox", () => ({
  ActivityCombobox: ({ onChange }: { onChange: (id: string) => void }) => (
    <button
      type="button"
      onClick={() => onChange("running")}
    >
      Vybrat běh
    </button>
  ),
}))
vi.mock("@/components/CatalogCombobox/LocalityCombobox", () => ({
  LocalityCombobox: ({ onChange }: { onChange: (id: string) => void }) => (
    <button
      type="button"
      onClick={() => onChange("prague")}
    >
      Vybrat Prahu
    </button>
  ),
}))
const locality = { id: "prague", slug: "praha", name: "Praha", parentId: null, lat: 50, lng: 14 }
const profile: SelfProfile = {
  id: "owner",
  name: "Jana Nová",
  email: "jana@example.com",
  emailVerified: true,
  hasPassword: true,
  homeLocality: locality,
  interests: [{ id: "running", name: "Běh" }],
}
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(catalogKeys.activities(), [
    {
      id: "sport",
      name: "Sport",
      slug: "sport",
      icon: "run",
      activities: [{ id: "running", slug: "beh", name: "Běh", keywords: [] }],
    },
  ])
  client.setQueryData(catalogKeys.localities(), [locality])
  return render(
    <QueryClientProvider client={client}>
      <ProfileForm profile={profile} />
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  save.mockImplementation((input: ProfileInput) =>
    Promise.resolve({
      ...profile,
      name: input.name,
      homeLocality: input.homeLocalityId ? locality : null,
      interests: input.interestIds.map((id) => ({ id, name: "Běh" })),
    }),
  )
})

describe("profile editing (#178)", () => {
  it("can clear interests/locality without passing account identity or email fields", async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole("button", { name: "Vymazat lokalitu" }))
    await user.click(screen.getByRole("button", { name: "Odebrat zájem Běh" }))
    await user.click(screen.getByRole("button", { name: "Uložit profil" }))
    expect(save).toHaveBeenCalledWith({ name: "Jana Nová", homeLocalityId: null, interestIds: [] })
  })
  it("does not duplicate a selected activity", async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole("button", { name: "Vybrat běh" }))
    await user.click(screen.getByRole("button", { name: "Uložit profil" }))
    expect(save).toHaveBeenCalledWith({
      name: "Jana Nová",
      homeLocalityId: "prague",
      interestIds: ["running"],
    })
  })
  it("explains an invalid name before sending any update", async () => {
    const user = userEvent.setup()
    show()
    await user.clear(screen.getByLabelText("Jméno"))
    await user.type(screen.getByLabelText("Jméno"), "Jana 123")
    await user.click(screen.getByRole("button", { name: "Uložit profil" }))
    expect(await screen.findByText(/do jména nepatří/)).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })
})
