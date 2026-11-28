import Supercluster from "supercluster"

import type { MapArea, MapPinData } from "./MapView"

export type ClusterItem =
  | { kind: "pin"; pin: MapPinData }
  | {
      kind: "cluster"
      id: number
      lat: number
      lng: number
      count: number
      /** It holds an event that still misses people: a lime ring (DESIGN.md › Map pin and cluster). */
      hasMissing: boolean
    }

type ClusterProps = { missing: number }

// Pins closer than this many pixels join a cluster; a pin is 30–40 px wide.
const RADIUS = 48
// From this zoom on every pin stands on its own (street level).
const MAX_ZOOM = 16
// The whole world: the app has at most a few hundred pins, so no need to follow the view.
const WORLD: [number, number, number, number] = [-180, -85, 180, 85]

/**
 * Nearby pins as one cluster with a count (#56, B-029), so 500 pins stay
 * readable. Supercluster only computes; the map draws the result.
 */
export class PinClusters {
  private readonly index: Supercluster<{ pin: MapPinData }, ClusterProps>

  constructor(pins: MapPinData[]) {
    this.index = new Supercluster<{ pin: MapPinData }, ClusterProps>({
      radius: RADIUS,
      maxZoom: MAX_ZOOM,
      map: (props) => ({ missing: props.pin.variant === "highlighted" ? 1 : 0 }),
      reduce: (sum, props) => {
        sum.missing += props.missing
      },
    })
    this.index.load(
      pins.map((pin) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
        properties: { pin },
      })),
    )
  }

  /** Pins and clusters at a zoom level. */
  at(zoom: number): ClusterItem[] {
    return this.index.getClusters(WORLD, Math.round(zoom)).map((feature) => {
      const [lng, lat] = feature.geometry.coordinates as [number, number]
      const props = feature.properties
      return "cluster" in props && props.cluster
        ? {
            kind: "cluster",
            id: props.cluster_id,
            lat,
            lng,
            count: props.point_count,
            hasMissing: props.missing > 0,
          }
        : { kind: "pin", pin: (props as { pin: MapPinData }).pin }
    })
  }

  /** The zoom where the cluster splits up: a tap on it zooms at least there. */
  expansionZoom(clusterId: number): number {
    return Math.min(this.index.getClusterExpansionZoom(clusterId), MAX_ZOOM + 1)
  }

  /** The rectangle around the cluster's pins: a tap on it zooms to all of them (#306). */
  bounds(clusterId: number): MapArea {
    const points = this.index
      .getLeaves(clusterId, Infinity)
      .map((leaf) => leaf.geometry.coordinates as [number, number])
    const lngs = points.map(([lng]) => lng)
    const lats = points.map(([, lat]) => lat)
    return {
      west: Math.min(...lngs),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      north: Math.max(...lats),
    }
  }
}

// About 15 m: at the closest zoom (17, ~1 m per px) pins this far apart stand side by side.
const SAME_PLACE_SPREAD = 0.00014

/**
 * Events at one place (the same hall, QA-02, QA-03) would stand on one point: no zoom splits a
 * cluster of them and the top pin hides the rest. They go round a small circle instead, in a
 * stable order, so each one can be tapped; a place with one event keeps its point.
 */
export function spreadSamePlace<T extends { id: string; lat: number; lng: number }>(
  pins: T[],
): T[] {
  const places = new Map<string, T[]>()
  for (const pin of pins) {
    const key = `${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}`
    places.set(key, [...(places.get(key) ?? []), pin])
  }
  const moved = new Map<string, T>()
  for (const group of places.values()) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id))
    sorted.forEach((pin, index) => {
      const angle = (2 * Math.PI * index) / sorted.length
      moved.set(pin.id, {
        ...pin,
        lat: pin.lat + SAME_PLACE_SPREAD * Math.cos(angle),
        // a degree of longitude is shorter away from the equator
        lng: pin.lng + (SAME_PLACE_SPREAD * Math.sin(angle)) / Math.cos((pin.lat * Math.PI) / 180),
      })
    })
  }
  return pins.map((pin) => moved.get(pin.id) ?? pin)
}
