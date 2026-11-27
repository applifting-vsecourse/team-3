import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Map as LeafletMap } from "leaflet"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { router } from "@/app/router"
import { authKeys } from "@/lib/auth-keys"

import { anEvent } from "@/features/events/test/anEvent"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { getSession: vi.fn().mockResolvedValue({ data: null, error: null }) },
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })

/**
 * /akce on `url` for a visitor; the event list holds `events`, or `occupied` with an occupancy
 * filter, the catalog `localities`.
 */
async function renderEvents(
  url: string,
  events: unknown[] = [],
  {
    occupied = [],
    localities = [],
    user = null,
  }: { occupied?: unknown[]; localities?: unknown[]; user?: Record<string, unknown> | null } = {},
) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const href = input instanceof Request ? input.url : String(input)
      if (/\/events(\?|$)/.test(href)) {
        return Promise.resolve(json(href.includes("capacity") ? occupied : events))
      }
      if (/\/localities(\?|$)/.test(href)) return Promise.resolve(json(localities))
      return Promise.resolve(json([]))
    }),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.session(), user ? { user } : null)
  const app = createRouter({
    ...router.options,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  await app.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={app} />
    </QueryClientProvider>,
  )
  return app
}

/** `isDesktop`: every media query matches; otherwise none does — the phone layout. */
function stubMatchMedia(isDesktop: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: isDesktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

beforeEach(() => stubMatchMedia(false))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// #298: the list and the map are the quick picks' tab panel
describe("/akce: the tabs' panel", () => {
  it("is what the active tab points at, and not a Tab stop of its own", async () => {
    await renderEvents("/akce")

    const tab = await screen.findByRole("tab", { name: /Všechny akce/ })
    const panel = screen.getByRole("tabpanel", { name: /Všechny akce/ })
    expect(tab).toHaveAttribute("aria-controls", panel.id)
    // Radix makes it focusable; it has no ring, and its first control takes focus anyway
    expect(panel).toHaveAttribute("tabindex", "-1")
  })

  it("is named by the title when a hand-changed filter leaves no tab active", async () => {
    await renderEvents("/akce?obsazenost=chybi")

    await screen.findAllByRole("tab")
    const panel = screen.getByRole("tabpanel", { name: "Akce podle tvých filtrů" })
    expect(panel).not.toHaveAttribute("aria-labelledby")
  })
})

// #288 (merged #192): on a phone a card could not be opened after „Zrušit filtry“. The whole page
// at phone width, with the list sheet over the map.
describe("/akce on a phone: „Zrušit filtry“", () => {
  it("then a card opens its detail", async () => {
    // as the API sends it: dates as strings
    const event: unknown = JSON.parse(JSON.stringify(anEvent({ id: "cm-e1" })))
    const app = await renderEvents("/akce?lokalita=cele-cesko&obsazenost=chybi", [event])

    await userEvent.click(await screen.findByRole("button", { name: "Zrušit filtry" }))
    await userEvent.click(await screen.findByRole("link", { name: "Language exchange: CZ/EN/ES" }))

    expect(app.state.location.pathname).toBe("/akce/cm-e1")
  })
})

// #305: „Volná místa“ / „Chybí lidé“ became one toggle, „Jen s volným místem“. Links shared before
// it, and the landing page's „Zobrazit všechny“ under „Tady chybíš“ (?obsazenost=chybi), keep
// working: the same events, and the chip says which filter is on.
describe("/akce: old ?obsazenost= links", () => {
  it.each([
    ["volna", "free", "Jen s volným místem"],
    ["chybi", "missing", "Chybí lidé"],
  ])(
    "?obsazenost=%s asks for capacity=%s and shows it on the chip",
    async (value, capacity, chip) => {
      const event: unknown = JSON.parse(JSON.stringify(anEvent({ id: "cm-e1" })))
      await renderEvents(`/akce?lokalita=cele-cesko&obsazenost=${value}`, [], { occupied: [event] })

      expect(
        (await screen.findAllByRole("link", { name: "Language exchange: CZ/EN/ES" })).length,
      ).toBeGreaterThan(0)
      const urls = vi
        .mocked(fetch)
        .mock.calls.map(([input]) =>
          typeof input === "string" ? input : input instanceof Request ? input.url : input.href,
        )
      expect(urls.some((url) => url.includes(`capacity=${capacity}`))).toBe(true)
      expect(screen.getByRole("button", { name: chip })).toHaveAttribute("aria-pressed", "true")
    },
  )

  // review #331: the chip that goes would take the focus to the page's start
  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])(
    "?obsazenost=chybi: %s on „Chybí lidé“ clears it and focuses „Jen s volným místem“",
    async (_, key) => {
      const app = await renderEvents("/akce?lokalita=cele-cesko&obsazenost=chybi")

      const missing = await screen.findByRole("button", { name: "Chybí lidé" })
      act(() => missing.focus())
      await userEvent.keyboard(key)

      expect(app.state.location.search).not.toHaveProperty("obsazenost")
      expect(screen.queryByRole("button", { name: "Chybí lidé" })).not.toBeInTheDocument()
      const free = screen.getByRole("button", { name: "Jen s volným místem" })
      expect(free).toHaveFocus()
      expect(free).toHaveAttribute("aria-pressed", "false")
    },
  )

  // review #331: the URL holds one value; „Jen s volným místem“ replaces „chybi“
  it("?obsazenost=chybi: „Jen s volným místem“ on replaces it, „Chybí lidé“ goes", async () => {
    const app = await renderEvents("/akce?lokalita=cele-cesko&obsazenost=chybi")

    await userEvent.click(await screen.findByRole("button", { name: "Jen s volným místem" }))

    expect(app.state.location.search).toMatchObject({ obsazenost: "volna" })
    expect(screen.getByRole("button", { name: "Jen s volným místem" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.queryByRole("button", { name: "Chybí lidé" })).not.toBeInTheDocument()
  })
})

// A quick pick lights up its chip („Chybí lidé“): without a filter of one's own there was no way
// out but the „Všechny akce“ tab. „Zrušit rychlý výběr“ goes there, the locality stays — and
// nothing the pick turned on by itself does: the tab adds okolí +10 km (review #326, #328).
describe("/akce: „Zrušit rychlý výběr“", () => {
  it.each([
    ["on a phone", false],
    ["on desktop", true],
  ])("%s leaves the pick for Všechny akce", async (_, isDesktop) => {
    stubMatchMedia(isDesktop)
    // no locality in the URL: the visitor's default, which isn't a filter of their own
    const app = await renderEvents("/akce")
    await userEvent.click(await screen.findByRole("tab", { name: /^Tady chybíš/ }))
    // its okolí applies, but stays out of the URL (#328)
    expect(app.state.location.search).toEqual({ vyber: "tady-chybis", obsazenost: "chybi" })

    // the count's (phone) and the bar's (desktop) – CSS shows one of them
    const buttons = await screen.findAllByRole("button", { name: "Zrušit rychlý výběr" })
    const button = buttons.find((b) => Boolean(b.closest("[data-peek-min]")) !== isDesktop)
    await userEvent.click(button!)

    expect(app.state.location.search).toEqual({})
    expect(screen.queryByRole("button", { name: /Zrušit (vše|filtry)/ })).not.toBeInTheDocument()
  })
})

// #328: the okolí a pick turns on applies (the chip says so) but stays out of the URL, so the
// URL tells it from one set by hand — +10 km included — which stays after the pick.
describe("/akce: the okolí of „Tady chybíš“ (#328)", () => {
  const praha8 = {
    id: "l-p8",
    slug: "praha-8",
    name: "Praha 8",
    parentId: null,
    lat: 50.1,
    lng: 14.5,
  }
  const eventsUrls = () =>
    vi
      .mocked(fetch)
      .mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)))
      .filter((href) => /\/events(\?|$)/.test(href))

  it.each([
    ["on a phone", false],
    ["on desktop", true],
  ])("%s the chip shows the pick's okolí, which leaves with it", async (_, isDesktop) => {
    stubMatchMedia(isDesktop)
    const app = await renderEvents("/akce?lokalita=praha-8", [], { localities: [praha8] })
    await userEvent.click(await screen.findByRole("tab", { name: /^Tady chybíš/ }))

    expect(app.state.location.search).not.toHaveProperty("okoli")
    expect(
      await screen.findByRole("button", { name: "Lokalita: Praha 8 · +10 km" }),
    ).toBeInTheDocument()
    expect(eventsUrls().some((href) => href.includes("radiusKm=10"))).toBe(true)

    await userEvent.click(screen.getByRole("tab", { name: /^Všechny akce/ }))
    expect(app.state.location.search).toEqual({ lokalita: "praha-8" })
    expect(await screen.findByRole("button", { name: "Lokalita: Praha 8" })).toBeInTheDocument()
  })

  it("an okolí of +10 km set by hand stays after the pick", async () => {
    // the app writes okolí as a string, „"10"“
    const app = await renderEvents("/akce?lokalita=praha-8&okoli=%2210%22", [], {
      localities: [praha8],
    })
    await userEvent.click(await screen.findByRole("tab", { name: /^Tady chybíš/ }))
    await userEvent.click(screen.getByRole("tab", { name: /^Všechny akce/ }))

    expect(app.state.location.search).toEqual({ lokalita: "praha-8", okoli: "10" })
    expect(
      await screen.findByRole("button", { name: "Lokalita: Praha 8 · +10 km" }),
    ).toBeInTheDocument()
  })
})

// #288: on a phone the search and the chips float over the map's top, and „Hledat v této oblasti“
// must come under them, never beneath — the page passes the bar's measured height to the map.
describe("/akce: „Hledat v této oblasti“ after the map is moved", () => {
  // Leaflet can't remove an init hook, so one hook for the file, and its list emptied per test
  const maps: LeafletMap[] = []
  beforeAll(() => {
    LeafletMap.addInitHook(function (this: LeafletMap) {
      maps.push(this)
    })
  })
  beforeEach(() => {
    maps.length = 0
  })

  const OVERLAY_HEIGHT = 108

  /** /akce with every element `OVERLAY_HEIGHT` tall; returns the page's Leaflet map. */
  async function renderAndMoveMap() {
    // jsdom has no layout: the measured bar (and anything else) is this tall
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(OVERLAY_HEIGHT)
    await renderEvents("/akce")
    await screen.findByRole("region", { name: "Mapa akcí" })
    const map = maps.at(-1)
    if (!map) throw new Error("the page has no map")

    // the user drags the map: a pointer goes down on it, the map moves
    map.getContainer().dispatchEvent(new Event("pointerdown"))
    act(() => {
      map.fire("movestart")
      map.fire("moveend")
    })
    map.getContainer().dispatchEvent(new Event("pointerup"))
    return screen.findByRole("button", { name: "Hledat v této oblasti" })
  }

  it("on a phone, sits under the bar floating over the map", async () => {
    const button = await renderAndMoveMap()

    expect(button).toHaveStyle({ top: `${OVERLAY_HEIGHT}px` })
  })

  it("on desktop, where nothing floats over the map, sits at its top", async () => {
    stubMatchMedia(true)

    const button = await renderAndMoveMap()

    expect(button.style.top).toBe("")
  })
})

// PO 26. 11. (#420): a signed-in user founds an event from the list's band
describe("/akce: „Založit akci“ in the band", () => {
  // the band's row: the title and, beside it, the page's action
  const bandRow = async () =>
    (await screen.findByRole("heading", { level: 1 })).closest("div")!.parentElement!

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("a signed-in user has it, leading to the form", async () => {
    await renderEvents("/akce", [], {
      user: {
        id: "u1",
        email: "petra@example.com",
        name: "Petra Nováková",
        emailVerified: true,
        ageConfirmedAt: "2026-01-01T00:00:00.000Z",
      },
    })

    expect(within(await bandRow()).getByRole("link", { name: "Založit akci" })).toHaveAttribute(
      "href",
      "/akce/nova",
    )
  })

  it("a visitor doesn't", async () => {
    await renderEvents("/akce")

    expect(within(await bandRow()).queryByRole("link", { name: "Založit akci" })).toBeNull()
  })
})
