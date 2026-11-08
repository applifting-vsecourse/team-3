import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

const pick = vi.fn()

const renderLanding = (
  isVisitor: boolean,
  session: "known" | "loading" = "known",
  source: "home" | "ip" | "none" = "home",
) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: 0 } } })}>
      <LandingView
        isSignedIn={session === "loading" ? undefined : !isVisitor}
        locality={{ slug: "praha", source, pick }}
      />
    </QueryClientProvider>,
  )

const isPopularRequest = (options: unknown) =>
  (options as { searchParams?: { sort?: string } } | undefined)?.searchParams?.sort === "popular"

describe("LandingView", () => {
  afterEach(() => vi.unstubAllGlobals())
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation(((path: string, options: unknown) =>
      path === "localities"
        ? asJson(localities)
        : isPopularRequest(options)
          ? asJson(
              ["p1", "p2", "p3", "p4", "p5", "p6"].map((id) =>
                anEvent({ id, title: `Oblíbená ${id}` }),
              ),
            )
          : asJson(
              ["e1", "e2", "e3", "e4"].map((id) => anEvent({ id, title: `Akce ${id}` })),
            )) as never)
  })

  // docs/ux-audit.md › Hlas aplikace: personal, never by name
  it.each([
    [true, "Někde chybí jeden do party. Třeba ty."],
    [false, "Tady se na tebe čeká."],
  ])("a visitor (%s) is welcomed with „%s“", async (isVisitor, title) => {
    await renderLanding(isVisitor)

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument()
  })

  it("the band's title is part of the main content, where a screen reader jumps to", async () => {
    await renderLanding(true)

    expect(within(screen.getByRole("main")).getByRole("heading", { level: 1 })).toBeInTheDocument()
  })

  it("while the session loads, no title shows that could swap out", async () => {
    await renderLanding(false, "loading")

    // it keeps its place in the band, hidden (jsdom does not apply the class, so check it)
    expect(screen.getByRole("heading", { level: 1 }).firstElementChild).toHaveClass("invisible")
    expect(screen.queryByText("Tady se na tebe čeká.")).not.toBeInTheDocument()
  })

  it("shows the three soonest events in Praha, each a link to its detail", async () => {
    await renderLanding(true)

    expect(await screen.findByRole("link", { name: "Akce e1" })).toHaveAttribute("href", "/akce/e1")
    const nearest = screen.getByRole("region", { name: "Nejbližší akce" })
    expect(within(nearest).getByRole("button", { name: "Lokalita: Praha" })).toBeInTheDocument()
    expect(within(nearest).getAllByRole("link", { name: /^Akce e/ })).toHaveLength(3)
    // Praha includes its districts; the API resolves that from the city's id
    expect(get).toHaveBeenCalledWith("events", {
      searchParams: new URLSearchParams({ localityId: "l-praha" }),
    })
  })

  it("links to the whole list of events", async () => {
    await renderLanding(true)

    // under the nearest and under the popular events
    const links = screen.getAllByRole("link", { name: "Zobrazit všechny akce" })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).toHaveAttribute("href", "/akce")
    expect(screen.getByRole("link", { name: "Prohlédnout akce" })).toHaveAttribute("href", "/akce")
  })

  it("shows a visitor six events from all of Czechia with the most interest, each a link to its detail", async () => {
    await renderLanding(true)

    const popular = screen.getByRole("region", { name: "O tyhle akce je zájem" })
    expect(await within(popular).findByRole("link", { name: "Oblíbená p1" })).toHaveAttribute(
      "href",
      "/akce/p1",
    )
    expect(within(popular).getAllByRole("link", { name: /^Oblíbená/ })).toHaveLength(6)
    expect(within(popular).getByText("Celé Česko")).toBeInTheDocument()
    // no locality: the API ranks all of Czechia
    expect(get).toHaveBeenCalledWith("events", { searchParams: { sort: "popular", limit: 6 } })
  })

  it("says the locality is a guess when it comes from the IP, and lets it be changed", async () => {
    // desktop: the locality panel opens as a popover
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    await renderLanding(true, "known", "ip")

    const nearest = screen.getByRole("region", { name: "Nejbližší akce" })
    expect(within(nearest).getByText("Odhad podle tvé IP adresy.")).toBeInTheDocument()
    await userEvent.click(await within(nearest).findByRole("button", { name: "Lokalita: Praha" }))
    const panel = await screen.findByRole("dialog", { name: "Lokalita" })
    await userEvent.click(within(panel).getByRole("option", { name: "Brno" }))
    await userEvent.click(within(panel).getByRole("button", { name: "Zobrazit akce" }))
    expect(pick).toHaveBeenCalledWith("brno")
  })

  it("doesn't call a home locality a guess", async () => {
    await renderLanding(true)

    expect(await screen.findByRole("button", { name: "Lokalita: Praha" })).toBeInTheDocument()
    expect(screen.queryByText("Odhad podle tvé IP adresy.")).not.toBeInTheDocument()
  })

  it("invites a visitor to sign up", async () => {
    await renderLanding(true)

    expect(screen.getByRole("link", { name: "Zaregistrovat se" })).toHaveAttribute(
      "href",
      "/signup",
    )
  })

  it("doesn't invite a signed-in user nor show them the popular events", async () => {
    await renderLanding(false)

    expect(screen.queryByRole("link", { name: "Zaregistrovat se" })).not.toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "O tyhle akce je zájem" })).not.toBeInTheDocument()
    // the nearest events load, the popular ones aren't even asked for
    expect(await screen.findByRole("link", { name: "Akce e1" })).toBeInTheDocument()
    expect(get.mock.calls.some(([, options]) => isPopularRequest(options))).toBe(false)
  })
})
