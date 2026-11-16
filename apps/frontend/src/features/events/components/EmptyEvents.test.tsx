import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"
import { renderWithRouter } from "@/test/renderWithRouter"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { activeFiltersLabel, EmptyEvents } from "@/features/events/components/EmptyEvents"
import { PICK_LABELS, type EventsSearch } from "@/features/events/lib/eventsSearch"
import { anEvent } from "@/features/events/test/anEvent"

const localities: Locality[] = [
  { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50.1, lng: 14.4 },
  { id: "l-bruntal", slug: "bruntal", name: "Bruntál", parentId: null, lat: 50, lng: 17.5 },
]
const categories: ActivityCategory[] = [
  {
    id: "c-hry",
    slug: "hry",
    name: "Hry",
    icon: "dice",
    activities: [{ id: "a-sipky", slug: "sipky-a-bowling", name: "Šipky a bowling", keywords: [] }],
  },
]
const catalog = { localities, categories }

// How many events all of Czechia has for the same filters; a locality has `inLocality`,
// a map area (#56) none.
let everywhere = 5
let inLocality = 0
// When set, holds the count of all of Czechia back, as a slow network does.
let countGate: Promise<void> | undefined
const get = vi.fn((path: string, options?: { searchParams?: URLSearchParams }) => ({
  json: () => {
    if (path === "localities") return Promise.resolve(localities)
    if (path === "activities") return Promise.resolve(categories)
    if (options?.searchParams?.has("bbox")) return Promise.resolve([])
    if (options?.searchParams?.has("localityId")) {
      return Promise.resolve(Array.from({ length: inLocality }, (_, i) => anEvent({ id: `l${i}` })))
    }
    const events = () => Array.from({ length: everywhere }, (_, i) => anEvent({ id: `e${i}` }))
    return countGate ? countGate.then(events) : Promise.resolve(events())
  },
}))
vi.mock("@/lib/api-client", () => ({
  api: { get: (...args: Parameters<typeof get>) => get(...args) },
}))

const renderEmpty = async (
  search: EventsSearch,
  {
    isVisitor = false,
    nearest,
    inertAfter,
  }: {
    isVisitor?: boolean
    nearest?: { isAvailable: boolean; events: PublicEvent[] | undefined }
    inertAfter?: number
  } = {},
) => {
  const onSearchChange = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <EmptyEvents
        search={search}
        catalog={catalog}
        isVisitor={isVisitor}
        onSearchChange={onSearchChange}
        nearest={nearest}
        inertAfter={inertAfter}
      />
    </QueryClientProvider>,
  )
  return { onSearchChange }
}

describe("activeFiltersLabel", () => {
  it("names every active filter as its chip does, the town's name as it is", () => {
    expect(
      activeFiltersLabel(
        {
          lokalita: "bruntal",
          aktivita: "sipky-a-bowling",
          od: "2026-11-01",
          do: "2026-11-07",
          obsazenost: "chybi",
        },
        catalog,
      ),
    ).toBe("Bruntál · Šipky a bowling · 1.–7. 11. · Chybí lidé")
  })

  it("names the toggle as its chip does, „Jen s volným místem“ (#305)", () => {
    expect(activeFiltersLabel({ lokalita: "bruntal", obsazenost: "volna" }, catalog)).toBe(
      "Bruntál · Jen s volným místem",
    )
  })

  it("in a map area names the area, not the locality it replaced (#56)", () => {
    expect(
      activeFiltersLabel(
        { lokalita: "bruntal", oblast: "17.3,49.9,17.7,50.1", kategorie: "hry" },
        catalog,
      ),
    ).toBe("Výřez mapy · Hry")
  })

  it("names the shown locality, Celé Česko without one", () => {
    expect(activeFiltersLabel({ lokalita: "praha" }, catalog)).toBe("Praha")
    expect(activeFiltersLabel({}, catalog)).toBe("Celé Česko")
    expect(activeFiltersLabel({ lokalita: "cele-cesko", kategorie: "hry" }, catalog)).toBe(
      "Celé Česko · Hry",
    )
  })
})

describe("EmptyEvents", () => {
  beforeEach(() => {
    everywhere = 5
    inLocality = 0
    countGate = undefined
    get.mockClear()
  })

  it("says why the list is empty: the active filters", async () => {
    await renderEmpty({ lokalita: "bruntal", aktivita: "sipky-a-bowling" })

    expect(screen.getByText("Žádná nadcházející akce neodpovídá filtrům:")).toBeInTheDocument()
    expect(screen.getByText("Bruntál · Šipky a bowling")).toBeInTheDocument()
  })

  it("offers the same filters in all of Czechia when that finds something", async () => {
    const { onSearchChange } = await renderEmpty({
      lokalita: "bruntal",
      aktivita: "sipky-a-bowling",
    })

    await userEvent.click(
      await screen.findByRole("button", { name: "Zobrazit 5 akcí v celém Česku" }),
    )
    // only the locality changes, the activity stays
    expect(onSearchChange).toHaveBeenCalledWith({ lokalita: "cele-cesko" })
    // the count is the list's own request without a locality
    const eventCalls = get.mock.calls.filter(([path]) => path === "events")
    expect(eventCalls.at(-1)?.[1]?.searchParams?.toString()).toBe("activityId=a-sipky")
    expect(screen.queryByRole("button", { name: "Zrušit ostatní filtry" })).not.toBeInTheDocument()
  })

  it("in a map area: offers the same filters in the whole locality, without the area (#56)", async () => {
    inLocality = 3
    const { onSearchChange } = await renderEmpty({
      lokalita: "bruntal",
      oblast: "17.3,49.9,17.7,50.1",
      aktivita: "sipky-a-bowling",
    })

    expect(screen.getByText("Výřez mapy · Šipky a bowling")).toBeInTheDocument()
    await userEvent.click(
      await screen.findByRole("button", { name: "Zobrazit 3 akce v lokalitě Bruntál" }),
    )
    expect(onSearchChange).toHaveBeenCalledWith({ oblast: undefined })
    // the count is the list's request without the area
    const eventCalls = get.mock.calls.filter(([path]) => path === "events")
    expect(eventCalls.at(-1)?.[1]?.searchParams?.has("bbox")).toBe(false)
  })

  it("in a map area of all of Czechia: offers all of Czechia without the area", async () => {
    const { onSearchChange } = await renderEmpty({
      lokalita: "cele-cesko",
      oblast: "17.3,49.9,17.7,50.1",
    })

    await userEvent.click(
      await screen.findByRole("button", { name: "Zobrazit 5 akcí v celém Česku" }),
    )
    expect(onSearchChange).toHaveBeenCalledWith({ oblast: undefined })
  })

  it("nothing anywhere: drops the other filters and keeps the locality", async () => {
    everywhere = 0
    const { onSearchChange } = await renderEmpty({
      lokalita: "bruntal",
      aktivita: "sipky-a-bowling",
      obsazenost: "volna",
    })

    await userEvent.click(await screen.findByRole("button", { name: "Zrušit ostatní filtry" }))
    expect(onSearchChange).toHaveBeenCalledWith({
      kategorie: undefined,
      aktivita: undefined,
      od: undefined,
      do: undefined,
      obsazenost: undefined,
    })
    expect(screen.queryByRole("button", { name: /v celém Česku/ })).not.toBeInTheDocument()
  })

  it("Celé Česko with nothing else to drop: only „Založit akci“, nothing extra fetched", async () => {
    await renderEmpty({ lokalita: "cele-cesko" })

    expect(screen.getByRole("link", { name: "Založit akci" })).toBeInTheDocument()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(get.mock.calls.filter(([path]) => path === "events")).toHaveLength(0)
  })

  it("no button until the count is known, so none moves under a finger", async () => {
    const { promise, resolve: release } = Promise.withResolvers<void>()
    countGate = promise
    await renderEmpty({ lokalita: "bruntal", aktivita: "sipky-a-bowling" })

    expect(screen.getByText("Bruntál · Šipky a bowling")).toBeInTheDocument()
    // „Založit akci“ alone would be the main button, then move aside for the count's
    expect(screen.queryByRole("link", { name: "Založit akci" })).not.toBeInTheDocument()

    release()
    expect(
      await screen.findByRole("button", { name: "Zobrazit 5 akcí v celém Česku" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Založit akci" })).toBeInTheDocument()
  })

  it("„Založit akci“: a signed-in user goes to the form", async () => {
    await renderEmpty({ lokalita: "bruntal" })

    expect(await screen.findByRole("link", { name: "Založit akci" })).toHaveAttribute(
      "href",
      "/akce/nova",
    )
  })

  it("„Založit akci“: a visitor signs up first and comes back to the form", async () => {
    await renderEmpty({ lokalita: "bruntal" }, { isVisitor: true })

    // encoded once by the router, not %252F
    expect(await screen.findByRole("link", { name: "Založit akci" })).toHaveAttribute(
      "href",
      "/signup?from=%2Fakce%2Fnova",
    )
  })

  describe("a quick pick is a filter too (review #321)", () => {
    for (const vyber of ["podle-zajmu", "od-hodnocenych", "tady-chybis"] as const) {
      it(`?vyber=${vyber}: names the pick, never „V lokalitě … žádná akce není“`, async () => {
        await renderEmpty({ lokalita: "bruntal", vyber })

        expect(screen.getByText("Žádná nadcházející akce neodpovídá filtrům:")).toBeInTheDocument()
        expect(screen.getByText(new RegExp(`^Bruntál · ${PICK_LABELS[vyber]}`))).toBeInTheDocument()
        expect(screen.queryByText(/teď žádná nadcházející akce není/)).toBeNull()
      })
    }

    it("„Zrušit ostatní filtry“ drops the pick too", async () => {
      everywhere = 0
      const { onSearchChange } = await renderEmpty({ lokalita: "bruntal", vyber: "podle-zajmu" })

      await userEvent.click(await screen.findByRole("button", { name: "Zrušit ostatní filtry" }))
      expect(onSearchChange).toHaveBeenCalledWith(expect.objectContaining({ vyber: undefined }))
    })
  })

  // #61 meets #299: „V lokalitě … teď žádná nadcházející akce není“ is about the upcoming ones
  it("Proběhlé with just a locality: names the filters, never „V lokalitě … není“", async () => {
    await renderEmpty({ lokalita: "bruntal", termin: "probehle" })

    expect(screen.getByText("Žádná proběhlá akce neodpovídá filtrům:")).toBeInTheDocument()
    expect(screen.getByText("Bruntál · Proběhlé")).toBeInTheDocument()
    expect(screen.queryByText(/teď žádná nadcházející akce není/)).toBeNull()
  })

  describe("the nearest events instead of nothing (#299)", () => {
    const nearby = [
      anEvent({ id: "n1", title: "Volejbal v Náchodě", distanceKm: 8.4 }),
      anEvent({ id: "n2", title: "Deskovky v Hronově", distanceKm: 12.1 }),
    ]

    it("a locality alone is no filter: says the locality has nothing, then the nearest with their distance", async () => {
      await renderEmpty({ lokalita: "bruntal" }, { nearest: { isAvailable: true, events: nearby } })

      expect(
        screen.getByText((_, element) =>
          element?.tagName === "P"
            ? element.textContent === "V lokalitě Bruntál teď žádná nadcházející akce není."
            : false,
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText("Žádná nadcházející akce neodpovídá filtrům:")).toBeNull()
      const section = screen.getByRole("region", { name: "Nejbližší akce" })
      const items = within(section).getAllByRole("listitem")
      expect(items).toHaveLength(2)
      expect(items[0]).toHaveTextContent("Volejbal v Náchodě")
      expect(items[0]).toHaveTextContent("8,4 km")
      // the cards' titles sit under the section's heading (review #321)
      expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent("Nejbližší akce")
      expect(within(items[0]!).getByRole("heading", { level: 3 })).toHaveTextContent(
        "Volejbal v Náchodě",
      )
      // the ways on stay
      expect(
        await screen.findByRole("button", { name: "Zobrazit 5 akcí v celém Česku" }),
      ).toBeInTheDocument()
    })

    it("with other filters still names them", async () => {
      await renderEmpty(
        { lokalita: "bruntal", aktivita: "sipky-a-bowling" },
        { nearest: { isAvailable: true, events: nearby } },
      )

      expect(screen.getByText("Bruntál · Šipky a bowling")).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Nejbližší akce" })).toBeInTheDocument()
    })

    it("no buttons while the nearest events load, even with the count known", async () => {
      await renderEmpty(
        { lokalita: "bruntal" },
        { nearest: { isAvailable: true, events: undefined } },
      )

      // the count of all of Czechia arrives…
      await vi.waitFor(() => expect(get.mock.calls.some(([path]) => path === "events")).toBe(true))
      await new Promise((resolve) => setTimeout(resolve, 50))
      // …but the buttons wait for the nearest events, or they would jump down under them
      expect(screen.queryByRole("link", { name: "Založit akci" })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Zobrazit/ })).not.toBeInTheDocument()
    })

    it("nothing nearer anywhere: the empty state as before", async () => {
      everywhere = 0
      await renderEmpty({ lokalita: "bruntal" }, { nearest: { isAvailable: true, events: [] } })

      expect(screen.queryByRole("region", { name: "Nejbližší akce" })).toBeNull()
      expect(await screen.findByRole("link", { name: "Založit akci" })).toBeInTheDocument()
    })

    it("closed mobile list: the first nearest card is reachable, the rest and the buttons inert", async () => {
      await renderEmpty(
        { lokalita: "bruntal" },
        { nearest: { isAvailable: true, events: nearby }, inertAfter: 1 },
      )

      const items = within(screen.getByRole("region", { name: "Nejbližší akce" })).getAllByRole(
        "listitem",
      )
      expect(items[0]).not.toHaveAttribute("inert")
      expect(items[0]).toHaveAttribute("data-peek-end")
      expect(items[1]).toHaveAttribute("inert")
      const create = await screen.findByRole("link", { name: "Založit akci", hidden: true })
      expect(create.closest("[inert]")).not.toBeNull()
      expect(create).not.toHaveAttribute("data-peek-end")
    })
  })
})
