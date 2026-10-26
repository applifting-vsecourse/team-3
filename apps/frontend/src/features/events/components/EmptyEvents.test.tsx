import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"
import { renderWithRouter } from "@/test/renderWithRouter"

import { activeFiltersLabel, EmptyEvents } from "@/features/events/components/EmptyEvents"
import type { EventsSearch } from "@/features/events/lib/eventsSearch"
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

// How many events all of Czechia has for the same filters; a locality has none.
let everywhere = 5
// When set, holds the count of all of Czechia back, as a slow network does.
let countGate: Promise<void> | undefined
const get = vi.fn((path: string, options?: { searchParams?: URLSearchParams }) => ({
  json: () => {
    if (path === "localities") return Promise.resolve(localities)
    if (path === "activities") return Promise.resolve(categories)
    if (options?.searchParams?.has("localityId")) return Promise.resolve([])
    const events = () => Array.from({ length: everywhere }, (_, i) => anEvent({ id: `e${i}` }))
    return countGate ? countGate.then(events) : Promise.resolve(events())
  },
}))
vi.mock("@/lib/api-client", () => ({
  api: { get: (...args: Parameters<typeof get>) => get(...args) },
}))

const renderEmpty = async (search: EventsSearch, { isVisitor = false } = {}) => {
  const onSearchChange = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <EmptyEvents
        search={search}
        catalog={catalog}
        isVisitor={isVisitor}
        onSearchChange={onSearchChange}
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

  it("Praha without a parameter, Celé Česko by its name", () => {
    expect(activeFiltersLabel({}, catalog)).toBe("Praha")
    expect(activeFiltersLabel({ lokalita: "cele-cesko", kategorie: "hry" }, catalog)).toBe(
      "Celé Česko · Hry",
    )
  })
})

describe("EmptyEvents", () => {
  beforeEach(() => {
    everywhere = 5
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
})
