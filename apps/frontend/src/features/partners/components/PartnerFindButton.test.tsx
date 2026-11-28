import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { PartnerFindButton } from "@/features/partners/components/PartnerFindButton"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))

const deck = (missing: string[]) => ({
  json: () =>
    Promise.resolve({
      items: [],
      nextCursor: null,
      radiusKm: 10,
      missing,
      hidden: false,
      requestsLeft: 20,
    }),
})

const show = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PartnerFindButton viewerId="me" />
    </QueryClientProvider>,
  )

describe("PartnerFindButton under the empty friends (#474)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("leads to Najdi parťáka when the deck can be built", async () => {
    api.get.mockReturnValue(deck([]))
    await show()

    expect(await screen.findByRole("link", { name: "Najdi parťáka" })).toHaveAttribute(
      "href",
      "/partaci",
    )
    expect(api.get).toHaveBeenCalledWith("partners/suggestions", {
      searchParams: { radiusKm: 10 },
    })
  })

  it("with something missing in the profile it is „Doplnit profil“, to the profile's edit", async () => {
    api.get.mockReturnValue(deck(["locality"]))
    await show()

    expect(await screen.findByRole("link", { name: "Doplnit profil" })).toHaveAttribute(
      "href",
      "/profil/upravit",
    )
    expect(screen.queryByRole("link", { name: "Najdi parťáka" })).not.toBeInTheDocument()
  })
})
