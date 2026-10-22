import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ActivityCategory, Locality } from "@/features/events/api/catalogSchemas"
import { EventFilters } from "@/features/events/components/EventFilters"
import { anEvent } from "@/features/events/test/anEvent"

const localities: Locality[] = [
  { id: "l-brno", slug: "brno", name: "Brno", parentId: null, lat: 49.2, lng: 16.6 },
  { id: "l-praha", slug: "praha", name: "Praha", parentId: null, lat: 50.1, lng: 14.4 },
  { id: "l-praha-8", slug: "praha-8", name: "Praha 8", parentId: "l-praha", lat: 50.1, lng: 14.5 },
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

    expect(screen.getByRole("button", { name: "Praha" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Zrušit vše" })).not.toBeInTheDocument()
  })

  it("toggles „Chybí lidé“", async () => {
    const { onChange } = renderFilters()

    await userEvent.click(screen.getByRole("button", { name: "Chybí lidé" }))
    expect(onChange).toHaveBeenCalledWith({ chybi: 1 })
  })

  it("turns „Chybí lidé“ off again", async () => {
    const { onChange } = renderFilters({ search: { chybi: 1 } })

    const chip = screen.getByRole("button", { name: "Chybí lidé" })
    expect(chip).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(chip)
    expect(onChange).toHaveBeenCalledWith({ chybi: undefined })
  })

  it("offers „Zrušit vše“ with an active filter", async () => {
    const { onClearAll } = renderFilters({ search: { lokalita: "praha-8" } })

    expect(screen.getByRole("button", { name: "Praha 8" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zrušit vše" }))
    expect(onClearAll).toHaveBeenCalledOnce()
  })

  it("picks a locality and previews how many events it shows", async () => {
    const { onChange } = renderFilters()

    await userEvent.click(screen.getByRole("button", { name: "Praha" }))
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

    await userEvent.click(screen.getByRole("button", { name: "Brno" }))
    const panel = await screen.findByRole("dialog", { name: "Lokalita" })
    await userEvent.type(within(panel).getByRole("combobox", { name: "Hledat lokalitu" }), "prah")
    expect(within(panel).queryByRole("option", { name: "Brno" })).not.toBeInTheDocument()

    await userEvent.click(within(panel).getByRole("button", { name: "Celá Praha" }))
    expect(onChange).toHaveBeenCalledWith({ lokalita: undefined })
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

  it("shows the range on the chip and clears it", async () => {
    const { onChange } = renderFilters({ search: { od: "2026-10-23", do: "2026-10-29" } })

    await userEvent.click(screen.getByRole("button", { name: "23.–29. 10." }))
    const panel = await screen.findByRole("dialog", { name: "Termín" })
    await userEvent.click(within(panel).getByRole("button", { name: "Zrušit termín" }))
    expect(onChange).toHaveBeenCalledWith({ od: undefined, do: undefined })
  })
})
