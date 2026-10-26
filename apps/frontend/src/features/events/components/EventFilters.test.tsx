import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"

import { EventFilters } from "@/features/events/components/EventFilters"
import { anEvent } from "@/features/events/test/anEvent"

const localities: Locality[] = [
  { id: "l-brno", slug: "brno", name: "Brno", parentId: null, lat: 49.2, lng: 16.6 },
  { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50.1, lng: 14.4 },
  { id: "l-praha-8", slug: "praha-8", name: "Praha 8", parentId: "l-praha", lat: 50.1, lng: 14.5 },
  {
    id: "l-usti-nad-orlici",
    slug: "usti-nad-orlici",
    name: "Ústí nad Orlicí",
    parentId: null,
    lat: 49.97,
    lng: 16.39,
  },
]
const categories: ActivityCategory[] = []

// The locality panel previews „Zobrazit N akcí“ through the real query layer;
// only the HTTP client is replaced. Praha 8 has one event, Praha two.
const get = vi.fn((path: string, options?: { searchParams?: URLSearchParams }) => ({
  json: () => {
    if (path === "localities") return Promise.resolve(localities)
    if (path === "activities") return Promise.resolve(categories)
    const localityId = options?.searchParams?.get("localityId")
    return Promise.resolve(
      localityId === "l-praha-8" ? [anEvent()] : [anEvent(), anEvent({ id: "e2" })],
    )
  },
}))
vi.mock("@/lib/api-client", () => ({
  api: { get: (...args: Parameters<typeof get>) => get(...args) },
}))

const renderFilters = (props: Partial<Parameters<typeof EventFilters>[0]> = {}) => {
  const onChange = vi.fn()
  const onClearAll = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  render(
    <EventFilters
      search={{}}
      catalog={{ localities, categories }}
      onChange={onChange}
      onClearAll={onClearAll}
      {...props}
    />,
    { wrapper },
  )
  return { onChange, onClearAll }
}

describe("EventFilters", () => {
  // desktop: the filters open as popovers
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("shows Praha by default, without „Zrušit vše“", () => {
    renderFilters()

    expect(screen.getByRole("button", { name: "Lokalita: Praha" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Zrušit vše" })).not.toBeInTheDocument()
  })

  it("picks „Volná místa“ in Obsazenost and asks the API for events that aren't full", async () => {
    const { onChange } = renderFilters()

    await userEvent.click(screen.getByRole("button", { name: "Obsazenost" }))
    const panel = await screen.findByRole("dialog", { name: "Obsazenost" })
    expect(within(panel).getByRole("radio", { name: "Všechny" })).toBeChecked()
    get.mockClear()
    await userEvent.click(within(panel).getByRole("radio", { name: "Volná místa" }))
    await within(panel).findByRole("button", { name: /^Zobrazit \d/ })
    const eventCalls = get.mock.calls.filter(([path]) => path === "events")
    expect(eventCalls.at(-1)?.[1]?.searchParams?.get("capacity")).toBe("free")

    await userEvent.click(within(panel).getByRole("button", { name: /^Zobrazit/ }))
    expect(onChange).toHaveBeenCalledWith({ obsazenost: "volna" })
  })

  it("shows the occupancy on the chip and „Všechny“ clears it", async () => {
    const { onChange } = renderFilters({ search: { obsazenost: "chybi" } })

    await userEvent.click(screen.getByRole("button", { name: "Obsazenost: Chybí lidé" }))
    const panel = await screen.findByRole("dialog", { name: "Obsazenost" })
    expect(within(panel).getByRole("radio", { name: "Chybí lidé" })).toBeChecked()
    await userEvent.click(within(panel).getByRole("button", { name: "Všechny" }))
    expect(onChange).toHaveBeenCalledWith({ obsazenost: undefined })
  })

  it("offers „Zrušit vše“ with an active filter", async () => {
    const { onClearAll } = renderFilters({ search: { lokalita: "praha-8" } })

    expect(screen.getByRole("button", { name: "Lokalita: Praha 8" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zrušit vše" }))
    expect(onClearAll).toHaveBeenCalledOnce()
  })

  it("picks a locality and previews how many events it shows", async () => {
    const { onChange } = renderFilters()

    await userEvent.click(screen.getByRole("button", { name: "Lokalita: Praha" }))
    const panel = await screen.findByRole("dialog", { name: "Lokalita" })
    expect(
      await within(panel).findByRole("button", { name: "Zobrazit 2 akce" }),
    ).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole("option", { name: "Praha 8" }))
    await userEvent.click(await within(panel).findByRole("button", { name: "Zobrazit 1 akci" }))
    expect(onChange).toHaveBeenCalledWith({ lokalita: "praha-8" })
  })

  it("finds a locality without diacritics and stores Praha as no parameter", async () => {
    const { onChange } = renderFilters({ search: { lokalita: "brno" } })

    await userEvent.click(screen.getByRole("button", { name: "Lokalita: Brno" }))
    const panel = await screen.findByRole("dialog", { name: "Lokalita" })
    await userEvent.type(within(panel).getByRole("combobox", { name: "Hledat lokalitu" }), "prah")
    expect(within(panel).queryByRole("option", { name: "Brno" })).not.toBeInTheDocument()

    await userEvent.click(within(panel).getByRole("option", { name: "Praha" }))
    await userEvent.click(await within(panel).findByRole("button", { name: "Zobrazit 2 akce" }))
    expect(onChange).toHaveBeenCalledWith({ lokalita: undefined })
  })

  it("„Zrušit výběr“ in a town shows events from all of Czechia", async () => {
    const { onChange } = renderFilters({ search: { lokalita: "brno" } })

    await userEvent.click(screen.getByRole("button", { name: "Lokalita: Brno" }))
    const panel = await screen.findByRole("dialog", { name: "Lokalita" })
    expect(within(panel).queryByRole("button", { name: "Celá Praha" })).not.toBeInTheDocument()
    await userEvent.click(within(panel).getByRole("button", { name: "Zrušit výběr" }))
    expect(onChange).toHaveBeenCalledWith({ lokalita: "cele-cesko" })
  })

  it("a town's name typed without diacritics finds it („usti nad orl“)", async () => {
    renderFilters()

    await userEvent.click(screen.getByRole("button", { name: "Lokalita: Praha" }))
    const panel = await screen.findByRole("dialog", { name: "Lokalita" })
    await userEvent.type(
      within(panel).getByRole("combobox", { name: "Hledat lokalitu" }),
      "usti nad orl",
    )

    expect(
      within(panel)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Ústí nad Orlicí"])
  })
})

describe("EventFilters › Termín", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    // Friday 23. 10. 2026, 10:00 in Prague. Only Date is faked, so user-event timers still run.
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-23T08:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("applies a quick option", async () => {
    const { onChange } = renderFilters()

    await userEvent.click(screen.getByRole("button", { name: "Termín" }))
    const panel = await screen.findByRole("dialog", { name: "Termín" })
    await userEvent.click(within(panel).getByRole("button", { name: "Tento víkend" }))
    expect(within(panel).getByRole("button", { name: "Tento víkend" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await userEvent.click(await within(panel).findByRole("button", { name: /^Zobrazit/ }))

    expect(onChange).toHaveBeenCalledWith({ od: "2026-10-24", do: "2026-10-25" })
  })

  it("does not let past days be picked; one picked day is a one-day range", async () => {
    const { onChange } = renderFilters()

    await userEvent.click(screen.getByRole("button", { name: "Termín" }))
    const panel = await screen.findByRole("dialog", { name: "Termín" })
    const day = (n: number) =>
      within(panel)
        .getAllByRole("button")
        .find((b) => b.textContent === String(n) && b.closest("[role=gridcell], td"))
    expect(day(22)).toBeDisabled()
    expect(day(23)).toBeEnabled()

    await userEvent.click(day(27)!)
    await userEvent.click(await within(panel).findByRole("button", { name: /^Zobrazit/ }))
    expect(onChange).toHaveBeenCalledWith({ od: "2026-10-27", do: "2026-10-27" })
  })

  it("previews no date limit once the range is unselected in the calendar", async () => {
    renderFilters({ search: { od: "2026-10-27", do: "2026-10-27" } })

    await userEvent.click(screen.getByRole("button", { name: "Termín: 27. 10." }))
    const panel = await screen.findByRole("dialog", { name: "Termín" })
    // the API mock returns 2 events without a locality filter, regardless of dates;
    // what matters is that the request no longer carries the URL's dates
    await within(panel).findByRole("button", { name: /^Zobrazit/ })
    get.mockClear()
    const day27 = within(panel)
      .getAllByRole("button")
      .find((b) => b.textContent === "27" && b.closest("[role=gridcell], td"))!
    await userEvent.click(day27)
    await within(panel).findByRole("button", { name: "Zobrazit 2 akce" })

    const eventCalls = get.mock.calls.filter(([path]) => path === "events")
    expect(eventCalls.length).toBeGreaterThan(0)
    for (const [, options] of eventCalls) {
      expect(options?.searchParams?.has("dateFrom")).toBe(false)
    }
  })

  it("shows the range on the chip and clears it", async () => {
    const { onChange } = renderFilters({ search: { od: "2026-10-23", do: "2026-10-29" } })

    await userEvent.click(screen.getByRole("button", { name: "Termín: 23.–29. 10." }))
    const panel = await screen.findByRole("dialog", { name: "Termín" })
    await userEvent.click(within(panel).getByRole("button", { name: "Zrušit termín" }))
    expect(onChange).toHaveBeenCalledWith({ od: undefined, do: undefined })
  })
})

describe("EventFilters › Typ aktivity", () => {
  const teamSports: ActivityCategory = {
    id: "c-tymove",
    slug: "tymove-sporty",
    name: "Týmové sporty",
    icon: "ball",
    activities: [
      { id: "a-florbal", slug: "florbal", name: "Florbal", keywords: [] },
      { id: "a-volejbal", slug: "volejbal", name: "Volejbal", keywords: [] },
    ],
  }
  const games: ActivityCategory = {
    id: "c-hry",
    slug: "hry",
    name: "Hry",
    icon: "dice",
    activities: [{ id: "a-sachy", slug: "sachy", name: "Šachy", keywords: ["šach"] }],
  }
  const withCatalog = { catalog: { localities, categories: [teamSports, games] } }

  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("checks a whole category and shows its activities as checked", async () => {
    const { onChange } = renderFilters(withCatalog)

    await userEvent.click(screen.getByRole("button", { name: "Typ aktivity" }))
    const panel = await screen.findByRole("dialog", { name: "Typ aktivity" })
    await userEvent.click(
      within(panel).getByRole("checkbox", { name: "Celá kategorie Týmové sporty" }),
    )
    expect(within(panel).getByRole("checkbox", { name: "Volejbal" })).toBeChecked()

    await userEvent.click(within(panel).getByRole("button", { name: /^Zobrazit/ }))
    expect(onChange).toHaveBeenCalledWith({ kategorie: "tymove-sporty", aktivita: undefined })
  })

  it("half-checks a category with some activities picked", async () => {
    const { onChange } = renderFilters(withCatalog)

    await userEvent.click(screen.getByRole("button", { name: "Typ aktivity" }))
    const panel = await screen.findByRole("dialog", { name: "Typ aktivity" })
    await userEvent.click(within(panel).getByRole("checkbox", { name: "Florbal" }))
    expect(
      within(panel).getByRole("checkbox", { name: "Celá kategorie Týmové sporty" }),
    ).toHaveAttribute("aria-checked", "mixed")

    await userEvent.click(within(panel).getByRole("button", { name: /^Zobrazit/ }))
    expect(onChange).toHaveBeenCalledWith({ kategorie: undefined, aktivita: "florbal" })
  })

  it("finds an activity in another category by search", async () => {
    const { onChange } = renderFilters(withCatalog)

    await userEvent.click(screen.getByRole("button", { name: "Typ aktivity" }))
    const panel = await screen.findByRole("dialog", { name: "Typ aktivity" })
    await userEvent.type(within(panel).getByLabelText("Hledat aktivitu"), "sach")
    await userEvent.click(within(panel).getByRole("checkbox", { name: /Šachy/ }))

    await userEvent.click(within(panel).getByRole("button", { name: /^Zobrazit/ }))
    expect(onChange).toHaveBeenCalledWith({ kategorie: "hry", aktivita: undefined })
  })

  it("names the chip after a single selection, counts several", () => {
    renderFilters({ ...withCatalog, search: { aktivita: "volejbal" } })
    expect(screen.getByRole("button", { name: "Typ aktivity: Volejbal" })).toBeInTheDocument()
  })
})
