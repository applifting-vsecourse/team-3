import { useEffect } from "react"
import { useMap } from "react-leaflet"

/**
 * Leaflet 1.9 ends a zoom animation from a 250 ms timer it never clears. Leaving the page in
 * between (right after the map fitted its pins, or a click on a cluster) removes the map first,
 * and the timer then reads its removed panes: „Cannot read properties of undefined (reading
 * '_leaflet_pos')“ in the console. On unmount the animation is marked over, so the timer has
 * nothing left to finish. Put it inside every MapContainer.
 */
export function StopZoomOnUnmount() {
  const map = useMap()
  useEffect(
    () => () => {
      // Leaflet's own flag, checked first thing by its _onZoomTransitionEnd
      ;(map as unknown as { _animatingZoom?: boolean })._animatingZoom = false
    },
    [map],
  )
  return null
}
