import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { catalogKeys } from "@/lib/catalog/catalogQueryOptions"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import type * as placeSearch from "@/lib/catalog/placeSearch"

import { LocalityPicker } from "./LocalityPicker"

const maps = vi.hoisted(() => ({
  query: vi.fn<(query: string) => Promise<placeSearch.OnlinePlace[]>>(),
  save: vi.fn<(place: placeSearch.OnlinePlace) => Promise<Locality>>(),
}))

vi.mock("@/lib/catalog/placeSearch", async (importOriginal) => {
  const base = await importOriginal<typeof placeSearch>()
  const { skipToken } = await import("@tanstack/react-query")
  return {
    ...base,
    placeSuggestionsQueryOptions: (query: string) => ({
      queryKey: ["tests", "locality-suggestions", query] as const,
      queryFn: query ? () => maps.query(query) : skipToken,
      retry: false,
    }),
    addPlaceAsLocality: maps.save,
  }
})

const prague = locality("praha", "Praha", 50.09, 14.42)
const district = { ...locality("praha-8", "Praha 8", 50.11, 14.45), parentId: prague.id }
const brno = locality("brno", "Brno", 49.2, 16.6)
const smallTown = locality("dlouha-lhota", "Dlouhá Lhota", 49.7, 14.16)
const suggested = {
  key: "lhota-other",
  name: "Dlouhá Lhota",
  area: "okres Mladá Boleslav",
  lat: 50.42,
  lng: 15.02,
}
const overlapping = {
  key: "lhota-existing",
  name: "Dlouhá Lhota",
  area: "okres Příbram",
  lat: 49.7,
  lng: 14.17,
}
const lhotka = { key: "lhotka", name: "Lhotka", area: "okres Mělník", lat: 50.4, lng: 14.52 }
const places = [prague, district, brno, smallTown]

function locality(id: string, name: string, lat: number, lng: number): Locality {
  return { id, slug: id, name, parentId: null, lat, lng }
}

function openPicker({
  confirmed = null,
  estimate,
}: {
  confirmed?: Locality | null
  estimate?: Locality
} = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(catalogKeys.localities(), places)
  const onPick = vi.fn()
  const onPendingChange = vi.fn()
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <LocalityPicker
        localities={places}
        confirmed={confirmed}
        suggested={estimate}
        onPick={onPick}
        onPendingChange={onPendingChange}
      />
    </QueryClientProvider>,
  )
  return {
    query: screen.getByLabelText("Město, obec nebo městská část"),
    results: screen.getByRole("list", { name: "Vyber místo" }),
    user,
    client,
    onPick,
    onPendingChange,
  }
}

beforeEach(() => {
  maps.query.mockReset().mockResolvedValue([])
  maps.save.mockReset()
})

describe("one locality finder in onboarding", () => {
  it("commits the city on activation and uses exactly the object chosen", async () => {
    const { user, onPick, results } = openPicker()
    await user.click(within(results).getByRole("button", { name: "Brno" }))
    expect(onPick).toHaveBeenCalledExactlyOnceWith(brno)
    expect(maps.query).not.toHaveBeenCalled()
  })

  it("types over a previous choice without committing either place", async () => {
    const { user, onPick, query } = openPicker({ confirmed: brno, estimate: prague })
    expect(screen.getByRole("button", { name: "Brno Poslední výběr" })).toBeVisible()
    await user.type(query, "Praha 8")
    expect(screen.queryByRole("button", { name: "Brno Poslední výběr" })).toBeNull()
    expect(onPick).not.toHaveBeenCalled()
    expect(maps.query).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Praha 8 Praha" }))
    expect(onPick).toHaveBeenCalledExactlyOnceWith(district)
  })

  it("accepts an exact district with Enter and also works after keyboard navigation", async () => {
    const { user, onPick, query } = openPicker()
    await user.type(query, "praha-8{Enter}")
    expect(onPick).toHaveBeenCalledExactlyOnceWith(district)
    await user.clear(query)
    await user.type(query, "prah{ArrowDown}{ArrowDown}{Enter}")
    expect(onPick).toHaveBeenLastCalledWith(district)
  })

  it("keeps the pending confirmation separate from a partial search", async () => {
    const { user, onPick, query } = openPicker({ estimate: brno })
    await user.type(query, "pra{Enter}")
    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByText("Vyber místo z nabídky pod vyhledáváním.")).toBeVisible()
    await user.clear(query)
    expect(screen.getByRole("button", { name: "Brno Odhad podle připojení" })).toBeVisible()
  })

  it("offers an explicit map expansion from a partial catalog match and hides nearby duplicates", async () => {
    maps.query.mockResolvedValue([overlapping, suggested])
    const { user, query } = openPicker()
    await user.type(query, "dlouha")
    expect(maps.query).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Hledat další místa" }))
    expect(
      await screen.findByRole("button", { name: "Dlouhá Lhota okres Mladá Boleslav" }),
    ).toBeVisible()
    expect(screen.queryByRole("button", { name: "Dlouhá Lhota okres Příbram" })).toBeNull()
    expect(screen.getByRole("button", { name: "Dlouhá Lhota" })).toBeVisible()
    expect(maps.query).toHaveBeenCalledWith("dlouha")
  })

  it("ignores lookup results for a superseded search", async () => {
    let deliverOld: ((value: (typeof lhotka)[]) => void) | undefined
    maps.query.mockImplementation(
      () =>
        new Promise((resolve) => {
          deliverOld = resolve
        }),
    )
    const { user, query, onPick } = openPicker()
    await user.type(query, "Lhotka")
    await waitFor(() => expect(maps.query).toHaveBeenCalledWith("Lhotka"))
    await user.clear(query)
    await user.type(query, "Brno")
    deliverOld?.([lhotka])
    expect(screen.queryByRole("button", { name: "Lhotka okres Mělník" })).toBeNull()
    expect(onPick).not.toHaveBeenCalled()
    await user.keyboard("{Enter}")
    expect(onPick).toHaveBeenCalledExactlyOnceWith(brno)
  })

  it("only commits after the chosen map result saves, and updates the shared catalog", async () => {
    let savePlace: ((value: Locality) => void) | undefined
    maps.query.mockResolvedValue([lhotka])
    maps.save.mockImplementation(
      () =>
        new Promise((resolve) => {
          savePlace = resolve
        }),
    )
    const { user, query, client, onPick, onPendingChange } = openPicker()
    await user.type(query, "Lhotka")
    await user.click(await screen.findByRole("button", { name: "Lhotka okres Mělník" }))
    expect(maps.save).toHaveBeenCalledOnce()
    expect(maps.save.mock.calls[0]?.[0]).toEqual(lhotka)
    expect(onPendingChange).toHaveBeenLastCalledWith(true)
    expect(query).toBeDisabled()
    expect(onPick).not.toHaveBeenCalled()

    const saved = locality("lhotka", "Lhotka", 50.4, 14.52)
    savePlace?.(saved)
    await waitFor(() => expect(onPick).toHaveBeenCalledExactlyOnceWith(saved))
    expect(onPendingChange).toHaveBeenLastCalledWith(false)
    expect(client.getQueryData(catalogKeys.localities())).toContainEqual(saved)
  })

  it("keeps the input enabled and lets searching recover after a lookup error", async () => {
    maps.query.mockRejectedValueOnce(new Error("Maps are offline")).mockResolvedValueOnce([lhotka])
    const { user, query, onPick } = openPicker()
    await user.type(query, "Lhotka")
    await user.click(await screen.findByRole("button", { name: "Zkusit hledat znovu" }))
    expect(await screen.findByRole("button", { name: "Lhotka okres Mělník" })).toBeVisible()
    expect(query).toBeEnabled()
    expect(onPick).not.toHaveBeenCalled()
  })
})
