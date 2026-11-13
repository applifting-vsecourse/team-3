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

type Answers = {
  attending?: unknown[]
  organizing?: unknown[] | Promise<unknown[]>
  groups?: unknown[]
}

/** Moje on `url` for a signed-in user, the API answering the events and the groups. */
async function renderMy(url: string, answers: Answers) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const href = input instanceof Request ? input.url : String(input)
      if (href.includes("me/events") && href.includes("tab=attending")) {
        return json(answers.attending ?? [])
      }
      if (href.includes("me/events") && href.includes("tab=organizing")) {
        return json((await answers.organizing) ?? [])
      }
      if (href.includes("me/groups")) return json(answers.groups ?? [])
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

// the toaster in the root follows the system scheme; jsdom has no matchMedia
const stubMatchMedia = () =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))

beforeEach(stubMatchMedia)
afterEach(() => vi.unstubAllGlobals())

describe("Moje › Akce: the chip it opens on (#188, #304)", () => {
  it("Pořádám with the requests' strip when requests wait — and no Přihlášen before it", async () => {
    let answerOrganizing!: (events: unknown[]) => void
    await renderMy("/moje/akce", {
      attending: [going],
      organizing: new Promise((resolve) => (answerOrganizing = resolve)),
    })

    // Přihlášen is in, Pořádám not yet: no chip is chosen, the cards are placeholders
    expect(await tab(/Přihlášen · 1/)).toHaveAttribute("aria-selected", "false")
    expect(screen.getByRole("tab", { name: /Pořádám/ })).toHaveAttribute("aria-selected", "false")
    expect(screen.getByLabelText("Načítám akce")).toBeInTheDocument()

    answerOrganizing([withRequests, noRequests])

    expect(await tab(/Pořádám · 2/)).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("status")).toHaveTextContent("2 žádosti čekají na schválení")
    expect(screen.queryByText("Florbal")).not.toBeInTheDocument()
  })

  it("Pořádám for someone who runs events and goes to none", async () => {
    await renderMy("/moje/akce", { attending: [], organizing: [noRequests] })

    expect(await tab(/Pořádám · 1/)).toHaveAttribute("aria-selected", "true")
    expect(await screen.findByRole("link", { name: "Volejbal" })).toBeInTheDocument()
  })

  it("Přihlášen for an organizer without requests who goes somewhere too", async () => {
    await renderMy("/moje/akce", { attending: [going], organizing: [noRequests] })

    expect(await tab(/Přihlášen · 1/)).toHaveAttribute("aria-selected", "true")
    expect(await screen.findByRole("link", { name: "Florbal" })).toBeInTheDocument()
  })

  it("Přihlášen for someone who runs nothing", async () => {
    await renderMy("/moje/akce", { attending: [going], organizing: [] })

    expect(await tab(/Přihlášen · 1/)).toHaveAttribute("aria-selected", "true")
  })

  it("an explicit ?tab=prihlasen stays, even with requests waiting", async () => {
    const app = await renderMy("/moje/akce?tab=prihlasen", {
      attending: [going],
      organizing: [withRequests],
    })

    expect(await tab(/Přihlášen · 1/)).toHaveAttribute("aria-selected", "true")
    expect(await screen.findByRole("link", { name: "Florbal" })).toBeInTheDocument()
    expect(app.state.location.search).toEqual({ tab: "prihlasen" })
  })

  it("the tab the user picks goes to the URL, Přihlášen too, and stays", async () => {
    const userEvents = userEvent.setup()
    const app = await renderMy("/moje/akce", {
      attending: [going],
      organizing: [withRequests],
    })
    await userEvents.click(await tab(/Přihlášen · 1/))

    expect(screen.getByRole("tab", { name: /Přihlášen/ })).toHaveAttribute("aria-selected", "true")
    expect(app.state.location.search).toEqual({ tab: "prihlasen" })

    await userEvents.click(screen.getByRole("tab", { name: /Pořádám/ }))
    expect(app.state.location.search).toEqual({ tab: "poradam" })
  })
})

const deskovky = {
  id: "g-deskovky",
  name: "Deskovky Vinohrady",
  type: "closed",
  activity: {
    id: "a",
    slug: "deskove-hry",
    name: "Deskové hry",
    category: { id: "c", slug: "hry", name: "Hry", icon: "dice" },
  },
  locality: { id: "l", slug: "praha-2", name: "Praha 2" },
  memberCount: 5,
  membership: { role: "member", status: "pending" },
  pendingRequests: null,
}
const volejbal = {
  ...deskovky,
  id: "g-volejbal",
  name: "Volejbal Praha 7 – po práci",
  type: "public",
  membership: { role: "admin", status: "active" },
  pendingRequests: 1,
}

describe("Moje: Akce and Skupiny (#304)", () => {
  it("the band has both tabs with what they hold; an event in Přihlášen and Pořádám counts once", async () => {
    await renderMy("/moje/akce", {
      attending: [going, noRequests],
      organizing: [noRequests],
      groups: [deskovky, volejbal],
    })

    expect(await screen.findByRole("heading", { level: 1, name: "Moje" })).toBeInTheDocument()
    expect(await tab(/^Akce 2$/)).toHaveAttribute("aria-selected", "true")
    expect(await tab(/^Skupiny 2$/)).toHaveAttribute("aria-selected", "false")
    expect(screen.getByRole("link", { name: "Založit akci" })).toHaveAttribute("href", "/akce/nova")
  })

  it("Skupiny opens on Spravuju while requests wait there, with „Založit skupinu“", async () => {
    const app = await renderMy("/moje/akce", { groups: [deskovky, volejbal] })
    await userEvent.click(await tab(/^Skupiny/))

    expect(app.state.location.pathname).toBe("/moje/skupiny")
    expect(await tab(/Spravuju · 1/)).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("status")).toHaveTextContent("1 žádost o členství čeká na schválení")
    expect(screen.getByRole("link", { name: "Založit skupinu" })).toHaveAttribute(
      "href",
      "/skupiny/nova",
    )
  })

  it("Jsem členem shows my request with the badge of an event's request", async () => {
    const app = await renderMy("/moje/skupiny", { groups: [deskovky] })

    expect(await tab(/Jsem členem · 1/)).toHaveAttribute("aria-selected", "true")
    const pending = await screen.findByRole("region", { name: "Čeká na schválení (1)" })
    expect(pending).toHaveTextContent("Deskovky Vinohrady")
    expect(pending).toHaveTextContent("Čeká na schválení")

    await userEvent.click(screen.getByRole("tab", { name: /Spravuju/ }))
    expect(app.state.location.search).toEqual({ tab: "spravuju" })
  })
})

describe("Moje: the old addresses lead there (#304)", () => {
  it("/moje-akce, with the tab it asked for", async () => {
    const app = await renderMy("/moje-akce?tab=poradam", {})

    expect(app.state.location.pathname).toBe("/moje/akce")
    expect(app.state.location.search).toEqual({ tab: "poradam" })
  })

  it("/moje (the navigation's „Moje“) opens on Akce", async () => {
    const app = await renderMy("/moje", {})

    expect(app.state.location.pathname).toBe("/moje/akce")
  })

  it("/moje opens on Skupiny when only requests to join my groups wait", async () => {
    const app = await renderMy("/moje", { organizing: [noRequests], groups: [volejbal] })

    expect(app.state.location.pathname).toBe("/moje/skupiny")
    expect(await tab(/Spravuju · 1/)).toHaveAttribute("aria-selected", "true")
  })

  it("/skupiny?tab=moje is Moje › Skupiny; /skupiny itself has no tabs", async () => {
    const app = await renderMy("/skupiny?tab=moje", {})

    expect(app.state.location.pathname).toBe("/moje/skupiny")
    await app.navigate({ to: "/skupiny" })
    expect(await screen.findByRole("heading", { level: 1, name: "Skupiny" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: /Všechny/ })).not.toBeInTheDocument()
  })
})
