import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

type ListPanelProps = {
  isExpanded: boolean
  onExpandedChange: (isExpanded: boolean) => void
  /** Changes with the filters; the list then scrolls back to the top. */
  scrollResetKey?: string
  children: ReactNode
}

// Below this the pointer counts as a tap (toggle), above it as a drag.
const TAP_PX = 6
// A flick faster than this (px/ms) decides the direction regardless of position.
const FLICK_SPEED = 0.5
// Space kept under the peeking card; less than the gap between cards,
// so no sliver of the next card shows.
const PEEK_GAP_PX = 8

/**
 * The list on /akce. Mobile (Figma A-02): a sheet over the full-height map that
 * follows the finger — closed it peeks with the count and the first card,
 * pulled up it is the list. It is one sheet moved with transform, so dragging
 * is smooth and the map under it never re-renders. The end of the peek is the
 * element marked `data-peek-end` (the first card, or the empty/error state).
 * Desktop (A-02d): a plain column left of the map.
 */
export function ListPanel({
  isExpanded,
  onExpandedChange,
  scrollResetKey,
  children,
}: ListPanelProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const panelRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // How far down the closed sheet sits, in px from the open position.
  const [closedOffset, setClosedOffset] = useState(0)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const drag = useRef<{ y: number; time: number; from: number } | null>(null)

  useLayoutEffect(() => {
    const panel = panelRef.current
    const content = contentRef.current
    if (isDesktop || !panel || !content) return
    const measure = () => {
      const peekEnd = content.querySelector("[data-peek-end]") ?? content
      // both rects move with the transform, so their difference doesn't
      const peek = peekEnd.getBoundingClientRect().bottom - panel.getBoundingClientRect().top
      setClosedOffset(Math.max(0, panel.offsetHeight - peek - PEEK_GAP_PX))
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    observer.observe(content)
    return () => observer.disconnect()
  }, [isDesktop])

  // new filters, new results: start at the top, not halfway down the old list
  useEffect(() => {
    contentRef.current?.scrollTo?.({ top: 0 })
  }, [scrollResetKey])

  const restingOffset = isExpanded ? 0 : closedOffset
  const offset = dragOffset ?? restingOffset

  const endDrag = (clientY: number) => {
    const start = drag.current
    drag.current = null
    setDragOffset(null)
    if (!start) return
    const dy = clientY - start.y
    if (Math.abs(dy) < TAP_PX) {
      onExpandedChange(!isExpanded)
      return
    }
    const speed = dy / Math.max(1, performance.now() - start.time)
    if (speed < -FLICK_SPEED) onExpandedChange(true)
    else if (speed > FLICK_SPEED) onExpandedChange(false)
    // slow drag: wherever is closer
    else onExpandedChange(start.from + dy < closedOffset / 2)
  }

  return (
    <section
      ref={panelRef}
      aria-label="Seznam akcí"
      style={isDesktop ? undefined : { transform: `translateY(${offset}px)` }}
      className={cn(
        // mobile: a sheet from under the filter chips to the bottom
        "absolute inset-x-0 top-16 bottom-0 z-10 flex flex-col rounded-t-lg bg-background shadow-md",
        dragOffset === null &&
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
        "md:static md:z-auto md:my-8 md:w-96 md:shrink-0 md:rounded-none md:shadow-none lg:w-130",
      )}
    >
      <button
        type="button"
        aria-label={isExpanded ? "Stáhnout seznam" : "Vytáhnout seznam"}
        aria-expanded={isExpanded}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId)
          drag.current = { y: e.clientY, time: performance.now(), from: restingOffset }
        }}
        onPointerMove={(e) => {
          const start = drag.current
          if (!start) return
          const next = start.from + e.clientY - start.y
          // a little give past the ends, not a free fall
          setDragOffset(Math.min(closedOffset + 24, Math.max(-24, next)))
        }}
        onPointerUp={(e) => endDrag(e.clientY)}
        onPointerCancel={() => {
          drag.current = null
          setDragOffset(null)
        }}
        // keyboard: Enter/Space fire click without pointer events
        onClick={(e) => {
          if (e.detail === 0) onExpandedChange(!isExpanded)
        }}
        className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-t-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing md:hidden"
      >
        <span className="h-1 w-9 rounded-full bg-border" />
      </button>
      <div
        ref={contentRef}
        className={cn(
          "min-h-0 flex-1 px-4 pb-16",
          // only the pulled-up list scrolls; closed, the sheet just peeks
          isExpanded ? "overflow-y-auto" : "overflow-hidden",
          "md:overflow-y-auto md:p-0 md:pr-3",
        )}
      >
        {children}
      </div>
    </section>
  )
}
