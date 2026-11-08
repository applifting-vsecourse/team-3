import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { router } from "@/app/router"
import { authKeys } from "@/lib/auth-keys"

import { aMyEvent } from "@/features/events/test/anEvent"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { getSession: vi.fn().mockResolvedValue({ data: null, error: null }) },
}))

const user = { id: "u1", email: "petra@example.com", name: "Petra Nováková", emailVerified: true }
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })

type Answers = { attending: unknown[]; organizing: unknown[] | Promise<unknown[]> }

/** Moje akce on `url` for a signed-in user, the API answering both tabs. */
async function renderMyEvents(url: string, answers: Answers) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const href = input instanceof Request ? input.url : String(input)
      if (href.includes("me/events") && href.includes("tab=attending")) {
        return json(answers.attending)
      }
      if (href.includes("me/events") && href.includes("tab=organizing")) {
        return json(await answers.organizing)
      }
      return json([])
    }),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.session(), { user })
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

const going = aMyEvent({ id: "a1", title: "Florbal" })
const withRequests = aMyEvent({ id: "o1", title: "Deskovky", pendingRequests: 2 })
const noRequests = aMyEvent({ id: "o2", title: "Volejbal", pendingRequests: 0 })

const tab = (name: RegExp) => screen.findByRole("tab", { name })

describe("Moje akce: the tab it opens on (#188)", () => {
  beforeEach(() => {
    // the toaster in the root follows the system scheme; jsdom has no matchMedia
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("Pořádám with the requests' strip when requests wait — and no Přihlášen before it", async () => {
    let answerOrganizing!: (events: unknown[]) => void
    await renderMyEvents("/moje-akce", {
      attending: [going],
      organizing: new Promise((resolve) => (answerOrganizing = resolve)),
    })

    // Přihlášen is in, Pořádám not yet: no tab is chosen, the cards are placeholders
    expect(await tab(/Přihlášen 1/)).toHaveAttribute("aria-selected", "false")
    expect(screen.getByRole("tab", { name: /Pořádám/ })).toHaveAttribute("aria-selected", "false")
    expect(screen.getByLabelText("Načítám akce")).toBeInTheDocument()

    answerOrganizing([withRequests, noRequests])

    expect(await tab(/Pořádám 2/)).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("status")).toHaveTextContent("2 žádosti čekají na schválení")
    expect(screen.queryByText("Florbal")).not.toBeInTheDocument()
  })

  it("Pořádám for someone who runs events and goes to none", async () => {
    await renderMyEvents("/moje-akce", { attending: [], organizing: [noRequests] })

    expect(await tab(/Pořádám 1/)).toHaveAttribute("aria-selected", "true")
    expect(await screen.findByRole("link", { name: "Volejbal" })).toBeInTheDocument()
  })

  it("Přihlášen for an organizer without requests who goes somewhere too", async () => {
    await renderMyEvents("/moje-akce", { attending: [going], organizing: [noRequests] })

    expect(await tab(/Přihlášen 1/)).toHaveAttribute("aria-selected", "true")
    expect(await screen.findByRole("link", { name: "Florbal" })).toBeInTheDocument()
  })

  it("Přihlášen for someone who runs nothing", async () => {
    await renderMyEvents("/moje-akce", { attending: [going], organizing: [] })

    expect(await tab(/Přihlášen 1/)).toHaveAttribute("aria-selected", "true")
  })

  it("an explicit ?tab=prihlasen stays, even with requests waiting", async () => {
    const app = await renderMyEvents("/moje-akce?tab=prihlasen", {
      attending: [going],
      organizing: [withRequests],
    })

    expect(await tab(/Přihlášen 1/)).toHaveAttribute("aria-selected", "true")
    expect(await screen.findByRole("link", { name: "Florbal" })).toBeInTheDocument()
    expect(app.state.location.search).toEqual({ tab: "prihlasen" })
  })

  it("the tab the user picks goes to the URL, Přihlášen too, and stays", async () => {
    const userEvents = userEvent.setup()
    const app = await renderMyEvents("/moje-akce", {
      attending: [going],
      organizing: [withRequests],
    })
    await userEvents.click(await tab(/Přihlášen 1/))

    expect(screen.getByRole("tab", { name: /Přihlášen/ })).toHaveAttribute("aria-selected", "true")
    expect(app.state.location.search).toEqual({ tab: "prihlasen" })

    await userEvents.click(screen.getByRole("tab", { name: /Pořádám/ }))
    expect(app.state.location.search).toEqual({ tab: "poradam" })
  })
})
