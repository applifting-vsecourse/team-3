import { createRef } from "react"
import { render } from "@testing-library/react"
import type { Map as LeafletMap } from "leaflet"
import { MapContainer } from "react-leaflet"
import { describe, expect, it } from "vitest"

import { StopZoomOnUnmount } from "./StopZoomOnUnmount"

type Animating = { _animatingZoom?: boolean }

describe("StopZoomOnUnmount", () => {
  it("marks a running zoom animation over when the map goes away, so its timer does nothing", () => {
    const ref = createRef<LeafletMap>()
    const { unmount } = render(
      <MapContainer
        ref={ref}
        center={[50.08, 14.44]}
        zoom={12}
      >
        <StopZoomOnUnmount />
      </MapContainer>,
    )
    const map = ref.current as unknown as Animating
    // as if a fitBounds had just started its animation
    map._animatingZoom = true

    unmount()

    expect(map._animatingZoom).toBe(false)
  })
})
