import { useCallback, useEffect, useState } from "react"

/**
 * The live height of an element, e.g. the bar floating over the map on a phone (#288): pass
 * the returned ref, read the height. 0 until it is measured, and where ResizeObserver is
 * missing (jsdom without the test setup).
 */
export function useElementHeight<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!element) return
    const measure = () => setHeight(element.offsetHeight)
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  // a callback ref, so a bar that mounts later (or remounts) is measured too
  const ref = useCallback((node: T | null) => setElement(node), [])
  return [ref, height] as const
}
