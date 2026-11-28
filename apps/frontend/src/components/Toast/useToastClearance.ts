import { useEffect } from "react"

/** Above the bottom navigation (64 px) and a gap, where a phone's toast sits by default. */
export const TOAST_BOTTOM = 80
const GAP = 12

/**
 * Where a phone's toast must sit to stay clear of the page's own bottom action (PO 26. 11.:
 * never over a button): the highest marked element in view (`data-toast-clear` — the detail's
 * bar, a floating „Založit“), plus a gap; else just above the bottom navigation.
 */
export function toastBottom(tops: number[], viewportHeight: number): number {
  if (tops.length === 0) return TOAST_BOTTOM
  return Math.max(TOAST_BOTTOM, Math.round(viewportHeight - Math.min(...tops) + GAP))
}

/**
 * Keeps `--toast-bottom` (global.css, read by the Toaster) above whatever the page marked: its
 * height changes with its state (review #443: after „Přijdu“ the bar holds „Máš místo“ and
 * „Odhlásit se“, twice as high), so it is measured, not a fixed number.
 */
export function useToastClearance(): void {
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const tops = [...document.querySelectorAll<HTMLElement>("[data-toast-clear]")]
          .map((element) => element.getBoundingClientRect())
          .filter((box) => box.height > 0 && box.top < innerHeight && box.bottom > 0)
          .map((box) => box.top)
        document.documentElement.style.setProperty(
          "--toast-bottom",
          `${toastBottom(tops, innerHeight)}px`,
        )
      })
    }
    update()
    const resize = new ResizeObserver(update)
    resize.observe(document.body)
    const changes = new MutationObserver(update)
    changes.observe(document.body, { subtree: true, childList: true })
    addEventListener("scroll", update, { passive: true })
    addEventListener("resize", update)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      changes.disconnect()
      removeEventListener("scroll", update)
      removeEventListener("resize", update)
    }
  }, [])
}
