import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

// #298: the list and the map are the quick picks' tab panel
describe("/akce: the tabs' panel", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

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
// at phone width (matchMedia matches nothing), with the list sheet over the map.
describe("/akce on a phone: „Zrušit filtry“", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("then a card opens its detail", async () => {
    // as the API sends it: dates as strings
    const event: unknown = JSON.parse(JSON.stringify(anEvent({ id: "cm-e1" })))
    const app = await renderEvents("/akce?lokalita=cele-cesko&obsazenost=chybi", [event])

    await userEvent.click(await screen.findByRole("button", { name: "Zrušit filtry" }))
    await userEvent.click(await screen.findByRole("link", { name: "Language exchange: CZ/EN/ES" }))

    expect(app.state.location.pathname).toBe("/akce/cm-e1")
  })
})
