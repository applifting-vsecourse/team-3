import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { MyGroup } from "@/features/groups/api/groupSchemas"
import { ProfileGroups } from "@/features/groups/components/ProfileGroups"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const volleyball: MyGroup = {
  id: "g-volejbal",
  name: "Volejbal Praha 7",
  type: "public",
  activity: {
    id: "a",
    slug: "a",
    name: "Volejbal",
    category: { id: "c", slug: "c", name: "Sport", icon: "route" },
  },
  locality: { id: "l", slug: "praha-7", name: "Praha 7" },
  memberCount: 6,
  membership: { role: "admin", status: "active" },
}

const show = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ProfileGroups viewerId="owner" />
    </QueryClientProvider>,
  )

beforeEach(() => {
  api.get.mockReset()
})

describe("Moje skupiny on /profil (#178)", () => {
  it("a group I run opens its management", async () => {
    api.get.mockReturnValue({ json: () => Promise.resolve([volleyball]) })
    await show()

    expect(await screen.findByRole("link", { name: /Volejbal Praha 7/ })).toHaveAttribute(
      "href",
      "/skupiny/g-volejbal/sprava",
    )
    expect(api.get).toHaveBeenCalledWith("me/groups")
  })

  it("says I am in no group yet and leads to the groups", async () => {
    api.get.mockReturnValue({ json: () => Promise.resolve([]) })
    await show()

    expect(await screen.findByText("Zatím nejsi v žádné skupině.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Prohlédnout skupiny" })).toHaveAttribute(
      "href",
      "/skupiny",
    )
  })

  it("explains a failed load and loads again on retry", async () => {
    api.get.mockReturnValue({ json: () => Promise.reject(new Error("offline")) })
    await show()

    expect(await screen.findByRole("alert")).toHaveTextContent("Skupiny se nepodařilo načíst.")
    api.get.mockReturnValue({ json: () => Promise.resolve([]) })
    await userEvent.setup().click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByText("Zatím nejsi v žádné skupině.")).toBeInTheDocument()
  })
})
