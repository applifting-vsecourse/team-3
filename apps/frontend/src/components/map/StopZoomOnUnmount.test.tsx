import { createRef } from "react"
import { render } from "@testing-library/react"
import type { Map as LeafletMap } from "leaflet"
import { MapContainer } from "react-leaflet"
import { describe, expect, it } from "vitest"

import { StopZoomOnUnmount } from "./StopZoomOnUnmount"

/** Leaflet's own state of a zoom animation, and the end its 250 ms timer calls. */
type Animating = LeafletMap & {
  _animatingZoom?: boolean
  _animateToCenter?: unknown
  _animateToZoom?: number
  _onZoomTransitionEnd: () => void
}

/** A map whose zoom animation is running when it is removed; returns what the timer calls. */
function leaveMidZoom(hasGuard: boolean) {
  const ref = createRef<LeafletMap>()
  const { unmount } = render(
    <MapContainer
      ref={ref}
      center={[50.08, 14.44]}
      zoom={12}
    >
      {hasGuard ? <StopZoomOnUnmount /> : null}
    </MapContainer>,
  )
  const map = ref.current as Animating
  // as if a fitBounds had just started its animation
  map._animatingZoom = true
  map._animateToCenter = map.getCenter()
  map._animateToZoom = 13
  unmount()
  return () => map._onZoomTransitionEnd()
}

describe("StopZoomOnUnmount", () => {
  it("leaving the page mid-zoom: the animation's late end does nothing (#449)", () => {
    expect(leaveMidZoom(true)).not.toThrow()
  })

  it("without it the late end reads the removed map (the bug, so this test would catch a Leaflet rename)", () => {
    expect(leaveMidZoom(false)).toThrow(/_leaflet_pos/)
  })
})
