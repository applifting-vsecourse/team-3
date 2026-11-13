import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { act, render, screen } from "@testing-library/react"
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

/** /akce on `url` for a visitor; the event list holds `events` unless an occupancy filter is set. */
async function renderEvents(url: string, events: unknown[] = []) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const href = input instanceof Request ? input.url : String(input)
      if (/\/events(\?|$)/.test(href)) {
        return Promise.resolve(json(href.includes("capacity") ? [] : events))
      }
      return Promise.resolve(json([]))
    }),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.session(), null)
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

// A quick pick lights up its chips („Chybí lidé“): without a filter of one's own there was no way
// out but the „Všechny akce“ tab. „Zrušit výběr“ goes there, the locality stays.
describe("/akce: „Zrušit výběr“", () => {
  it.each([
    ["on a phone", false],
    ["on desktop", true],
  ])("%s leaves the pick for Všechny akce", async (_, isDesktop) => {
    stubMatchMedia(isDesktop)
    // no locality in the URL: the visitor's default, which isn't a filter of their own
    const app = await renderEvents("/akce?obsazenost=chybi&vyber=tady-chybis")

    // the bar's (desktop) and the count's (phone) – CSS shows one of them
    const [button] = await screen.findAllByRole("button", { name: "Zrušit výběr" })
    await userEvent.click(button!)

    expect(app.state.location.search).toEqual({})
    expect(screen.queryByRole("button", { name: /Zrušit (vše|filtry)/ })).not.toBeInTheDocument()
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
