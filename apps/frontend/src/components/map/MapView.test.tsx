import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { clusterHtml, pinHtml } from "./mapPin"
import { MapView } from "./MapView"

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

// Read from disk: Vitest empties CSS imports, even with ?raw.
// (jsdom gives import.meta.url an http: scheme, so the path is from the package root)
const mapCss = readFileSync(resolve(process.cwd(), "src/components/map/map.css"), "utf8")

describe("map.css", () => {
  it("styles Leaflet with tokens only and darkens just the tiles in dark mode", () => {
    expect(mapCss).not.toMatch(/#[0-9a-f]{3,6}\b|rgba?\(/i)
    expect(mapCss).toMatch(/\.dark \.leaflet-tile-pane\s*\{[^}]*filter:/)
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

  it("grows a selected pin and keeps its tip on the place", () => {
    const html = pinHtml("default", "Deskovky", { isSelected: true })
    expect(html).toContain("scale(1.3)")
    expect(html).toContain("origin-bottom")
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
    expect(clusterHtml(16, false)).not.toContain("ring-primary")
    expect(clusterHtml(16, false)).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i)
  })
})
