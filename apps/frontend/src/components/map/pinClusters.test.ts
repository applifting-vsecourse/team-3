import { describe, expect, it } from "vitest"

import type { MapPinData } from "./MapView"
import { PinClusters, spreadSamePlace } from "./pinClusters"

const pin = (id: string, lat: number, lng: number, variant: MapPinData["variant"] = "default") => ({
  id,
  lat,
  lng,
  variant,
  label: id,
})

// three events a few hundred metres apart in Holešovice, one in Brno
const pins = [
  pin("a", 50.1, 14.44),
  pin("b", 50.101, 14.441, "highlighted"),
  pin("c", 50.102, 14.439),
  pin("brno", 49.195, 16.607),
]

describe("PinClusters", () => {
  it("joins nearby pins into a cluster with a count, zoomed out", () => {
    const items = new PinClusters(pins).at(8)

    const cluster = items.find((item) => item.kind === "cluster")
    expect(cluster).toMatchObject({ kind: "cluster", count: 3, hasMissing: true })
    expect(items).toContainEqual({ kind: "pin", pin: pins[3] })
    expect(items).toHaveLength(2)
  })

  it("shows every pin on its own at street level", () => {
    const items = new PinClusters(pins).at(17)

    expect(items.every((item) => item.kind === "pin")).toBe(true)
    expect(items).toHaveLength(4)
  })

  it("rings only clusters with an event that misses people", () => {
    const items = new PinClusters([pin("x", 50.1, 14.44), pin("y", 50.1001, 14.4401)]).at(8)

    expect(items).toEqual([expect.objectContaining({ kind: "cluster", hasMissing: false })])
  })

  it("zooms a tapped cluster in to where it splits up", () => {
    const clusters = new PinClusters(pins)
    const cluster = clusters.at(8).find((item) => item.kind === "cluster")
    if (cluster?.kind !== "cluster") throw new Error("no cluster")

    const zoom = clusters.expansionZoom(cluster.id)
    expect(zoom).toBeGreaterThan(8)
    expect(clusters.at(zoom).filter((item) => item.kind === "pin").length).toBeGreaterThan(1)
  })

  it("knows the rectangle around a cluster's pins, where a tap zooms (#306)", () => {
    const clusters = new PinClusters(pins)
    const cluster = clusters.at(8).find((item) => item.kind === "cluster")
    if (cluster?.kind !== "cluster") throw new Error("no cluster")

    expect(clusters.bounds(cluster.id)).toEqual({
      west: 14.439,
      south: 50.1,
      east: 14.441,
      north: 50.102,
    })
  })
})

// QA-03: two events in one hall stood on one point; no zoom split them and one hid the other
describe("spreadSamePlace", () => {
  const at = (id: string, lat: number, lng: number) => ({ id, lat, lng })

  it("puts events at one place side by side, a few metres apart, in a stable order", () => {
    const spread = spreadSamePlace([at("b", 49.2185, 16.592), at("a", 49.2185, 16.592)])
    const [b, a] = spread
    expect(a).not.toEqual(b)
    // within about 20 m of the place
    for (const pin of spread) {
      expect(Math.abs(pin.lat - 49.2185)).toBeLessThan(0.0002)
      expect(Math.abs(pin.lng - 16.592)).toBeLessThan(0.0003)
    }
    expect(spreadSamePlace([at("a", 49.2185, 16.592), at("b", 49.2185, 16.592)])).toEqual([a, b])
  })

  it("leaves a place with one event, and the order of the list, as they are", () => {
    const pins = [at("a", 50, 14), at("b", 50.01, 14)]
    expect(spreadSamePlace(pins)).toEqual(pins)
  })
})
