import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { clusterHtml, PIN_BOX, pinHtml } from "./mapPin"
import { AreaSearchButton, MapView, toArea, viewKey } from "./MapView"

const praha = { lat: 50.0755, lng: 14.4378 }

describe("MapView", () => {
  it("renders the OpenStreetMap map with one marker per pin", () => {
    const { container } = render(
      <MapView
        center={praha}
        pins={[
          { id: "a", lat: 50.09, lng: 14.45, variant: "default", label: "Deskovky" },
          { id: "b", lat: 50.1, lng: 14.43, variant: "highlighted", label: "Běh · chybí 1" },
        ]}
      />,
    )

    expect(screen.getByLabelText("Mapa akcí")).toBeInTheDocument()
    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2)
    expect(screen.getByText("OpenStreetMap")).toBeInTheDocument()
  })

  it("labels only the highlighted pin", () => {
    render(
      <MapView
        center={praha}
        highlightedId="b"
        pins={[
          { id: "a", lat: 50.09, lng: 14.45, variant: "default", label: "Deskovky" },
          { id: "b", lat: 50.1, lng: 14.43, variant: "highlighted", label: "Běh · chybí 1" },
        ]}
      />,
    )

    expect(screen.getByText("Běh · chybí 1")).toBeInTheDocument()
    expect(screen.queryByText("Deskovky")).not.toBeInTheDocument()
  })
})

describe("MapView with clusters (#56)", () => {
  const nearby = [
    { id: "a", lat: 50.1, lng: 14.44, variant: "default" as const, label: "Deskovky" },
    { id: "b", lat: 50.101, lng: 14.441, variant: "highlighted" as const, label: "Běh · chybí 1" },
    { id: "c", lat: 50.102, lng: 14.439, variant: "default" as const, label: "Volejbal" },
  ]

  it("joins nearby pins into one cluster with the count, zoomed out", () => {
    const { container } = render(
      <MapView
        center={{ ...praha, zoom: 8 }}
        pins={nearby}
        isClustered
        // keep the given zoom: no fitting to the pins
        area={{ west: 12, south: 48.5, east: 19, north: 51 }}
      />,
    )

    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(1)
    expect(screen.getByTitle("3 akce – přiblížit")).toHaveTextContent("3")
  })

  it("keeps the selected pin out of the cluster, bigger and labelled", () => {
    const { container } = render(
      <MapView
        center={{ ...praha, zoom: 8 }}
        pins={nearby}
        isClustered
        selectedId="b"
        area={{ west: 12, south: 48.5, east: 19, north: 51 }}
      />,
    )

    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2)
    expect(screen.getByText("Běh · chybí 1")).toBeInTheDocument()
    expect(screen.getByTitle("2 akce – přiblížit")).toBeInTheDocument()
  })
})

describe("viewKey: what a user's move belongs to (review #276)", () => {
  const pin = (id: string) => ({ id, lat: 50, lng: 14, variant: "default" as const, label: id })
  const view = { pins: [pin("a"), pin("b")], center: praha }

  it("changes when the map fits itself to another set of pins, e.g. another locality", () => {
    expect(viewKey({ ...view, pins: [pin("c")] })).not.toBe(viewKey(view))
    expect(viewKey({ ...view, pins: [] })).not.toBe(viewKey(view))
  })

  it("changes with the centre the map falls back to", () => {
    expect(viewKey({ ...view, center: { lat: 49.2, lng: 16.6 } })).not.toBe(viewKey(view))
  })

  it("stays for the same pins, whatever is highlighted, so the button stays too", () => {
    expect(viewKey({ ...view, pins: [pin("a"), { ...pin("b"), variant: "highlighted" }] })).toBe(
      viewKey(view),
    )
  })

  it("in a searched area is the area, not the pins it found", () => {
    const area = { west: 14.3, south: 50, east: 14.6, north: 50.15 }
    expect(viewKey({ ...view, area })).toBe(viewKey({ ...view, pins: [pin("c")], area }))
    expect(viewKey({ ...view, area })).not.toBe(viewKey(view))
  })
})

// Read from disk: Vitest empties CSS imports, even with ?raw.
// (jsdom gives import.meta.url an http: scheme, so the path is from the package root)
const mapCss = readFileSync(resolve(process.cwd(), "src/components/map/map.css"), "utf8")

describe("map.css", () => {
  it("styles Leaflet with tokens only and leaves the tiles as they are", () => {
    expect(mapCss).not.toMatch(/#[0-9a-f]{3,6}\b|rgba?\(/i)
    expect(mapCss).not.toMatch(/filter:/)
  })
})

describe("pinHtml", () => {
  it("colours pins with tokens only", () => {
    for (const variant of ["default", "highlighted", "full"] as const) {
      expect(pinHtml(variant)).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i)
    }
    expect(pinHtml("highlighted")).toContain("fill-primary")
    expect(pinHtml("full")).toContain("fill-muted-foreground")
  })

  it("draws every state one size, 32 × 40 in a 40 × 40 target (#249)", () => {
    for (const variant of ["default", "highlighted", "full"] as const) {
      const html = pinHtml(variant)
      expect(html).toContain('<svg width="32" height="40"')
      expect(html).toContain("width:40px;height:40px")
    }
    expect(PIN_BOX).toEqual({ width: 40, height: 40 })
  })

  it("grows a selected pin and keeps its tip on the place", () => {
    const html = pinHtml("default", "Deskovky", { isSelected: true })
    expect(html).toContain("scale(1.3)")
    expect(html).toContain("origin-bottom")
    expect(html).toContain("var(--ring)")
    expect(html).toContain("Deskovky")
  })

  it("escapes the label", () => {
    expect(pinHtml("default", "<b>Kvíz</b> & spol.")).toContain(
      "&#60;b&#62;Kvíz&#60;/b&#62; &#38; spol.",
    )
  })
})

describe("clusterHtml", () => {
  it("rings a cluster lime only when an event in it misses people", () => {
    expect(clusterHtml(16, true)).toContain("ring-primary")
    expect(clusterHtml(16, true)).toContain("outline-primary-edge")
    expect(clusterHtml(16, false)).not.toContain("ring-primary")
    expect(clusterHtml(16, false)).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i)
  })
})

describe("toArea (review #276)", () => {
  it("cuts a view zoomed out past the Earth's edges to the Earth", () => {
    expect(toArea({ west: -250.123456, south: -95, east: 310, north: 91 })).toEqual({
      west: -180,
      south: -90,
      east: 180,
      north: 90,
    })
  })

  it("keeps an ordinary view, rounded to four decimals", () => {
    expect(toArea({ west: 14.123456, south: 50.000049, east: 14.6, north: 50.2 })).toEqual({
      west: 14.1235,
      south: 50,
      east: 14.6,
      north: 50.2,
    })
  })
})

// #288: on a phone the search and the chips float over the map's top; the button was under them
describe("AreaSearchButton", () => {
  it("sits 12 px under what floats over the map's top", () => {
    render(
      <AreaSearchButton
        topInset={108}
        onClick={vi.fn()}
      />,
    )

    const button = screen.getByRole("button", { name: "Hledat v této oblasti" })
    expect(button).toHaveStyle({ top: "108px" })
    expect(button).toHaveClass("mt-3")
  })

  it("without anything over the map it sits 12 px from the map's top (desktop)", () => {
    render(<AreaSearchButton onClick={vi.fn()} />)

    const button = screen.getByRole("button", { name: "Hledat v této oblasti" })
    expect(button).toHaveClass("top-0", "mt-3")
    expect(button.style.top).toBe("")
  })
})
