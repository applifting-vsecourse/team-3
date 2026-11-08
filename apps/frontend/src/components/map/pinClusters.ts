import Supercluster from "supercluster"

import type { MapPinData } from "./MapView"

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

  /** The zoom where the cluster splits up: a tap on it zooms there. */
  expansionZoom(clusterId: number): number {
    return Math.min(this.index.getClusterExpansionZoom(clusterId), MAX_ZOOM + 1)
  }
}
