import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"
import type * as ApiClient from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import { LandingView } from "@/features/events/components/LandingView"
import { anEvent } from "@/features/events/test/anEvent"

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { get: vi.fn() },
}))
const get = vi.mocked(api.get)

// what the API sends: dates as ISO strings
const asJson = (body: unknown) =>
  ({ json: () => Promise.resolve(JSON.parse(JSON.stringify(body))) }) as never

const localities = [
  { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50.08, lng: 14.44 },
  { id: "l-brno", slug: "brno", name: "Brno", parentId: null, lat: 49.2, lng: 16.6 },
]

const renderLanding = (shouldInviteToSignUp: boolean) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: 0 } } })}>
      <LandingView shouldInviteToSignUp={shouldInviteToSignUp} />
    </QueryClientProvider>,
  )

describe("LandingView", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation(((path: string) =>
      path === "localities"
        ? asJson(localities)
        : asJson(
            ["e1", "e2", "e3", "e4"].map((id) => anEvent({ id, title: `Akce ${id}` })),
          )) as never)
  })

  it("says in one sentence what HobbyHub is for", async () => {
    await renderLanding(true)

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Najdi lidi na volnočasové akce ve svém okolí",
      }),
    ).toBeInTheDocument()
  })

  it("shows the three soonest events in Praha, each a link to its detail", async () => {
    await renderLanding(true)

    expect(await screen.findByRole("link", { name: "Akce e1" })).toHaveAttribute("href", "/akce/e1")
    const nearest = screen.getByRole("region", { name: "Nejbližší akce" })
    expect(within(nearest).getByText("Praha")).toBeInTheDocument()
    expect(within(nearest).getAllByRole("link", { name: /^Akce e/ })).toHaveLength(3)
    // Praha includes its districts; the API resolves that from the city's id
    expect(get).toHaveBeenCalledWith("events", {
      searchParams: new URLSearchParams({ localityId: "l-praha" }),
    })
  })

  it("links to the whole list of events", async () => {
    await renderLanding(true)

    expect(screen.getByRole("link", { name: "Zobrazit všechny akce" })).toHaveAttribute(
      "href",
      "/akce",
    )
    expect(screen.getByRole("link", { name: "Prohlédnout akce" })).toHaveAttribute("href", "/akce")
  })

  it("invites a visitor to sign up", async () => {
    await renderLanding(true)

    expect(screen.getByRole("link", { name: "Zaregistrovat se" })).toHaveAttribute(
      "href",
      "/signup",
    )
  })

  it("doesn't invite a signed-in user", async () => {
    await renderLanding(false)

    expect(screen.queryByRole("link", { name: "Zaregistrovat se" })).not.toBeInTheDocument()
  })
})
