import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { pinHtml } from "./mapPin"
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

  it("escapes the label", () => {
    expect(pinHtml("default", "<b>Kvíz</b> & spol.")).toContain(
      "&#60;b&#62;Kvíz&#60;/b&#62; &#38; spol.",
    )
  })
})
