import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { PartnerEntry } from "@/features/partners/components/PartnerEntry"
import { PartnersPage } from "@/features/partners/components/PartnersPage"

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
vi.mock("@/lib/api-client", () => ({ api }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

describe("/partaci (#84)", () => {
  it("has the band, the okolí in the URL's hands and the deck", async () => {
    api.get.mockReturnValue({
      json: () =>
        Promise.resolve({
          items: [],
          nextCursor: null,
          radiusKm: 25,
          missing: [],
          hidden: false,
          requestsLeft: 20,
        }),
    })
    const onRadiusChange = vi.fn()
    await renderWithRouter(
      <QueryClientProvider client={new QueryClient()}>
        <PartnersPage
          viewerId="jana"
          viewerName="Jana Nová"
          radiusKm={25}
          onRadiusChange={onRadiusChange}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Najdi parťáka" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "+25 km" })).toHaveAttribute("aria-checked", "true")
    await userEvent.click(screen.getByRole("radio", { name: "+50 km" }))
    expect(onRadiusChange).toHaveBeenCalledWith(50)
    expect(
      await screen.findByRole("heading", { name: "V okolí 25 km teď nikdo další není." }),
    ).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("partners/suggestions", { searchParams: { radiusKm: 25 } })
  })

  it("Můj profil leads there", async () => {
    await renderWithRouter(<PartnerEntry />)

    expect(screen.getByRole("link", { name: "Najdi parťáka" })).toHaveAttribute("href", "/partaci")
    expect(screen.getByText("Lidi z okolí se stejnými koníčky.")).toBeInTheDocument()
  })
})
