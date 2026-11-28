import { useCallback, useState } from "react"

/** Which edge of a sideways-scrolling strip hides more: the one it fades out (QA-18). */
export type EdgeFade = "start" | "end" | "both"

/**
 * A strip of chips or tabs that scrolls sideways without a scrollbar (Figma A-02) gives no hint
 * there is more. The edge with more behind it fades out (Material's „scrollable tabs“, Apple's
 * edge fade): pass the ref to the strip and its class from `edgeFadeClass`. Nothing fades when
 * everything fits, at the start nothing fades on the left, at the end nothing on the right.
 */
export function useEdgeFade<T extends HTMLElement>() {
  const [fade, setFade] = useState<EdgeFade>()
  const ref = useCallback((node: T | null) => {
    if (!node) return
    const update = () => {
      const hidden = node.scrollWidth - node.clientWidth
      const hasMoreBefore = node.scrollLeft > 1
      const hasMoreAfter = node.scrollLeft < hidden - 1
      setFade(
        hasMoreBefore && hasMoreAfter
          ? "both"
          : hasMoreBefore
            ? "start"
            : hasMoreAfter
              ? "end"
              : undefined,
      )
    }
    update()
    node.addEventListener("scroll", update, { passive: true })
    // the strip's own width changes with the window, its content with the filters
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update)
    const observe = () => {
      resize?.observe(node)
      for (const child of node.children) resize?.observe(child)
    }
    observe()
    const mutation =
      typeof MutationObserver === "undefined"
        ? undefined
        : new MutationObserver(() => {
            observe()
            update()
          })
    mutation?.observe(node, { childList: true })
    return () => {
      node.removeEventListener("scroll", update)
      resize?.disconnect()
      mutation?.disconnect()
    }
  }, [])
  return [ref, fade] as const
}

/** The mask for each faded edge: 2 rem, about half a chip, so the next one still reads. */
export const edgeFadeClass: Record<EdgeFade, string> = {
  start: "[mask-image:linear-gradient(to_right,transparent,black_2rem)]",
  end: "[mask-image:linear-gradient(to_left,transparent,black_2rem)]",
  both: "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]",
}
