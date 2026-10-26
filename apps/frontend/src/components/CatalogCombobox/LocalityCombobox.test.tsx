import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocalityCombobox } from "@/components/CatalogCombobox/LocalityCombobox"
import type { Locality } from "@/lib/catalog/catalogSchemas"

const locality = (slug: string, name: string, parentId: string | null = null): Locality => ({
  id: `l-${slug}`,
  slug,
  name,
  parentId,
  lat: 50,
  lng: 15,
})

// in the API's order, not the picker's
const localities = [
  locality("zlin", "Zlín"),
  locality("usti-nad-labem", "Ústí nad Labem"),
  locality("sezimovo-usti", "Sezimovo Ústí"),
  locality("usti-nad-orlici", "Ústí nad Orlicí"),
  locality("praha-10", "Praha 10", "l-praha"),
  locality("brno", "Brno"),
  locality("praha", "Praha"),
  locality("praha-8", "Praha 8", "l-praha"),
  locality("frydek-mistek", "Frýdek-Místek"),
]

/** Labelled and controlled, as FormControl renders it in a form. */
function Field({
  initialValue = "",
  onChange,
  isDisabled = false,
  catalog = localities,
}: {
  initialValue?: string
  onChange?: (id: string) => void
  isDisabled?: boolean
  catalog?: Locality[]
}) {
  const [value, setValue] = useState(initialValue)
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <label htmlFor="lokalita">Lokalita *</label>
      <LocalityCombobox
        id="lokalita"
        localities={catalog}
        value={value}
        onChange={(id) => {
          setValue(id)
          onChange?.(id)
        }}
        disabled={isDisabled}
      />
    </QueryClientProvider>
  )
}

/** OpenStreetMap (Photon) answering with these places, and the API saving a picked one. */
const answerPlaces = (...features: object[]) => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(String(input), init)
    if (request.url.includes("photon.komoot.io")) {
      return Promise.resolve(Response.json({ type: "FeatureCollection", features }))
    }
    // POST /localities: the place becomes a locality
    return request.json().then((place: { name: string; lat: number; lng: number }) =>
      Response.json(
        {
          id: "l-privrat",
          slug: "privrat",
          name: place.name,
          parentId: null,
          lat: place.lat,
          lng: place.lng,
        },
        { status: 201 },
      ),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const privrat = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [16.397, 49.9246] },
  properties: {
    name: "Přívrat",
    osm_key: "place",
    osm_value: "municipality",
    county: "okres Ústí nad Orlicí",
  },
}

beforeEach(() => {
  answerPlaces()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const field = () => screen.getByRole("combobox", { name: "Lokalita *" })
const searchField = () => screen.getByRole("combobox", { name: "Hledat lokalitu" })
const optionNames = () => screen.queryAllByRole("option").map((option) => option.textContent)

describe("LocalityCombobox", () => {
  it("asks for a locality; opened, it searches and lists Praha with its districts first, then towns A–Z", async () => {
    render(<Field />)

    expect(field()).toHaveTextContent("Vyber lokalitu")
    await userEvent.click(field())

    expect(searchField()).toHaveFocus()
    expect(searchField()).toHaveAttribute("placeholder", "Hledej město nebo obec…")
    expect(screen.getByRole("listbox", { name: "Lokality" })).toBeInTheDocument()
    expect(optionNames()).toEqual([
      "Praha",
      "Praha 8",
      "Praha 10",
      "Brno",
      "Frýdek-Místek",
      "Sezimovo Ústí",
      "Ústí nad Labem",
      "Ústí nad Orlicí",
      "Zlín",
    ])
  })

  it.each([
    ["usti nad orl", "Ústí nad Orlicí"],
    ["ÚSTÍ NAD ORL", "Ústí nad Orlicí"],
    ["zlin", "Zlín"],
    ["praha 8", "Praha 8"],
    ["frydek mistek", "Frýdek-Místek"],
  ])("„%s“ finds %s, whatever the case and diacritics", async (query, name) => {
    render(<Field />)

    await userEvent.click(field())
    await userEvent.type(searchField(), query)

    expect(optionNames()).toEqual([name])
  })

  it("a name starting with the text comes before a name with it inside", async () => {
    render(<Field />)

    await userEvent.click(field())
    await userEvent.type(searchField(), "usti")

    expect(optionNames()).toEqual(["Ústí nad Labem", "Ústí nad Orlicí", "Sezimovo Ústí"])
  })

  it("from the keyboard: arrows open the list and move in it, Enter picks and returns to the field", async () => {
    const onChange = vi.fn()
    render(<Field onChange={onChange} />)

    await userEvent.tab()
    expect(field()).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    await userEvent.type(searchField(), "usti")
    // the best match is highlighted right away
    expect(screen.getByRole("option", { name: "Ústí nad Labem" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("option", { name: "Ústí nad Orlicí" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await userEvent.keyboard("{Enter}")

    expect(onChange).toHaveBeenCalledExactlyOnceWith("l-usti-nad-orlici")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(field()).toHaveTextContent("Ústí nad Orlicí")
    expect(field()).toHaveFocus()
  })

  it("a letter typed on the field opens the search with it", async () => {
    render(<Field />)

    await userEvent.tab()
    await userEvent.keyboard("z")

    expect(searchField()).toHaveValue("z")
    expect(optionNames()[0]).toBe("Zlín")
  })

  it("Esc closes the list and keeps the locality", async () => {
    const onChange = vi.fn()
    render(
      <Field
        initialValue="l-brno"
        onChange={onChange}
      />,
    )

    await userEvent.click(field())
    await userEvent.type(searchField(), "zlin")
    await userEvent.keyboard("{Escape}")

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    expect(field()).toHaveTextContent("Brno")
  })

  it("the picked locality is marked and highlighted when the list opens, so Enter keeps it", async () => {
    const onChange = vi.fn()
    render(
      <Field
        initialValue="l-praha-8"
        onChange={onChange}
      />,
    )

    expect(field()).toHaveTextContent("Praha 8")
    await userEvent.click(field())

    const picked = screen.getByRole("option", { name: /Praha 8/ })
    expect(picked).toHaveTextContent("vybráno")
    expect(picked).toHaveAttribute("aria-selected", "true")
    await userEvent.keyboard("{Enter}")
    expect(onChange).toHaveBeenCalledExactlyOnceWith("l-praha-8")
  })

  it("lists the first 100 and says the rest are found by typing", async () => {
    const villages = Array.from({ length: 150 }, (_, i) =>
      locality(`obec-${i}`, `Obec ${String(i).padStart(3, "0")}`),
    )
    render(<Field catalog={[...villages, locality("zlin", "Zlín")]} />)

    await userEvent.click(field())
    // counted directly: a role query over 100 rows is slow in jsdom
    const rows = () => screen.getByRole("listbox").querySelectorAll("[role=option]")
    expect(rows()).toHaveLength(100)
    expect(screen.getByText("Další najdeš, když začneš psát.")).toBeInTheDocument()

    await userEvent.type(searchField(), "zlin")
    expect(optionNames()).toEqual(["Zlín"])
    expect(screen.queryByText(/Další najdeš/)).not.toBeInTheDocument()
  })

  it("keeps the picked town in the list even past the first 100 (editing an event in Zlín)", async () => {
    const villages = Array.from({ length: 150 }, (_, i) =>
      locality(`obec-${i}`, `Obec ${String(i).padStart(3, "0")}`),
    )
    render(
      <Field
        catalog={[...villages, locality("zlin", "Zlín")]}
        initialValue="l-zlin"
      />,
    )

    await userEvent.click(field())

    const zlin = [...screen.getByRole("listbox").querySelectorAll("[role=option]")].find((row) =>
      row.textContent?.includes("Zlín"),
    )
    expect(zlin).toBeDefined()
  })

  it("says what to do when no town matches", async () => {
    render(<Field />)

    await userEvent.click(field())
    await userEvent.type(searchField(), "Atlantida")

    expect(optionNames()).toEqual([])
    expect(screen.getByRole("status")).toHaveTextContent(
      "V našem seznamu není. Vyber obec z mapových podkladů níž.",
    )
  })

  it("a disabled field doesn't open", async () => {
    render(<Field isDisabled />)

    expect(field()).toBeDisabled()
    await userEvent.click(field())
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("a village the catalog doesn't have („přívrat“) is found online, saved and picked", async () => {
    const fetchMock = answerPlaces(privrat)
    const onChange = vi.fn()
    render(<Field onChange={onChange} />)

    await userEvent.click(field())
    await userEvent.type(searchField(), "privrat")
    const option = await screen.findByRole("option", { name: /Přívrat/ })
    expect(option).toHaveTextContent("okres Ústí nad Orlicí")
    expect(screen.getByText("Obce a místa (OpenStreetMap)")).toBeInTheDocument()

    await userEvent.click(option)

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith("l-privrat"))
    const saved = fetchMock.mock.calls
      .map(([input, init]) => (input instanceof Request ? input : new Request(String(input), init)))
      .find((request) => request.method === "POST")
    expect(saved?.url).toMatch(/\/localities$/)
  })
})
