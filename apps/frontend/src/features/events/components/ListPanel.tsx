import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

/**
 * Where the mobile sheet rests:
 * - map: only the handle and the count — the map is nearly all visible,
 * - peek: the count and the first card (Figma A-02, the default),
 * - list: pulled up, the list scrolls.
 */
export type PanelSnap = "map" | "peek" | "list"

const ORDER: PanelSnap[] = ["list", "peek", "map"] // top to bottom

type ListPanelProps = {
  snap: PanelSnap
  onSnapChange: (snap: PanelSnap) => void
  /** Changes with the filters; the list then scrolls back to the top. */
  scrollResetKey?: string
  /**
   * How much of the resting sheet shows above the bottom, so map controls can
   * sit above it. Pass a stable function (a state setter), it is an effect dependency.
   */
  onVisibleHeightChange?: (px: number) => void
  children: ReactNode
}

// Below this the pointer counts as a tap, above it as a drag.
const TAP_PX = 6
// A flick faster than this (px/ms) moves one position in its direction.
const FLICK_SPEED = 0.5
// Space kept under what peeks; less than the gap between cards.
const PEEK_GAP_PX = 8
// Elastic give past the top and bottom positions.
const GIVE_PX = 24

/**
 * The list on /akce. Mobile (Figma A-02): a sheet over the full-height map, as
 * in map apps — the whole lowered sheet can be dragged (a swipe up on the
 * cards pulls it up), the pulled-up list scrolls, and pulling down from its
 * top lowers it again. One element moved with transform, so dragging is
 * smooth and the map under it never re-renders. What peeks is measured from
 * the content: `data-peek-min` (the count row) for „map“, `data-peek-end`
 * (the first card) for „peek“.
 * Desktop (A-02d): a plain scrolling column left of the map.
 */
export function ListPanel({
  snap,
  onSnapChange,
  scrollResetKey,
  onVisibleHeightChange,
  children,
}: ListPanelProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const panelRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // Resting offsets from the pulled-up position, in px.
  const [offsets, setOffsets] = useState<Record<PanelSnap, number>>({ list: 0, peek: 0, map: 0 })
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const drag = useRef<{ y: number; time: number; from: number } | null>(null)
  // A drag must not also count as a tap on what it ends on: the handle, or a
  // card, which would open the event.
  const isClickSuppressed = useRef(false)

  // Measure what peeks. The content wrapper is observed (not the scroll box,
  // whose size is fixed), so new data, wrapped titles or a resize all re-measure.
  useLayoutEffect(() => {
    const panel = panelRef.current
    const content = contentRef.current
    if (isDesktop || !panel || !content) return
    const measure = () => {
      const top = panel.getBoundingClientRect().top
      // both rects move with the transform, so their differences don't
      const bottomOf = (selector: string) =>
        (content.querySelector(selector) ?? content).getBoundingClientRect().bottom - top
      const height = panel.offsetHeight
      const peek = Math.max(0, height - bottomOf("[data-peek-end]") - PEEK_GAP_PX)
      const map = Math.max(peek, height - bottomOf("[data-peek-min]") - PEEK_GAP_PX)
      setOffsets({ list: 0, peek, map })
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    observer.observe(content)
    return () => observer.disconnect()
  }, [isDesktop])

  useEffect(() => {
    const panel = panelRef.current
    if (isDesktop || !panel || snap === "list") return
    onVisibleHeightChange?.(Math.max(0, panel.offsetHeight - offsets[snap]))
  }, [isDesktop, snap, offsets, onVisibleHeightChange])

  // new filters, new results: start at the top, not halfway down the old list
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: 0 })
  }, [scrollResetKey])

  const settle = (from: number, dy: number, ms: number) => {
    const at = from + dy
    const speed = dy / Math.max(1, ms)
    const current = ORDER.indexOf(snap)
    if (speed < -FLICK_SPEED) return onSnapChange(ORDER[Math.max(0, current - 1)]!)
    if (speed > FLICK_SPEED) return onSnapChange(ORDER[Math.min(ORDER.length - 1, current + 1)]!)
    // a slow drag rests wherever is closest
    const closest = ORDER.reduce((a, b) =>
      Math.abs(offsets[b] - at) < Math.abs(offsets[a] - at) ? b : a,
    )
    onSnapChange(closest)
  }

  // Pulled up, the list scrolls natively; pulling down from its top lowers the
  // sheet. A non-passive touchmove stops the browser scrolling meanwhile.
  useEffect(() => {
    const scroller = scrollRef.current
    if (isDesktop || !scroller || snap !== "list") return
    let start: { y: number; time: number } | null = null
    let isPulling = false
    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      start =
        touch && scroller.scrollTop <= 0 ? { y: touch.clientY, time: performance.now() } : null
      isPulling = false
    }
    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!start || !touch) return
      const dy = touch.clientY - start.y
      // scrolling the list up: leave it to the browser
      if (!isPulling && dy < 0) start = null
      else if (!isPulling && dy > TAP_PX && scroller.scrollTop <= 0) isPulling = true
      if (isPulling) {
        e.preventDefault()
        setDragOffset(Math.max(0, dy))
      }
    }
    const onEnd = (e: TouchEvent) => {
      if (start && isPulling) {
        const dy = (e.changedTouches[0]?.clientY ?? start.y) - start.y
        setDragOffset(null)
        settle(0, dy, performance.now() - start.time)
      }
      start = null
      isPulling = false
    }
    scroller.addEventListener("touchstart", onStart, { passive: true })
    scroller.addEventListener("touchmove", onMove, { passive: false })
    scroller.addEventListener("touchend", onEnd)
    scroller.addEventListener("touchcancel", onEnd)
    return () => {
      scroller.removeEventListener("touchstart", onStart)
      scroller.removeEventListener("touchmove", onMove)
      scroller.removeEventListener("touchend", onEnd)
      scroller.removeEventListener("touchcancel", onEnd)
    }
    // settle only reads snap and offsets, which are deps already
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, snap, offsets])

  const restingOffset = offsets[snap]
  const offset = dragOffset ?? restingOffset
  // Lowered, the whole sheet is a drag surface; pulled up, only the handle is
  // (the rest scrolls).
  const isSheetDraggable = !isDesktop && snap !== "list"

  const pointerHandlers = {
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      drag.current = { y: e.clientY, time: performance.now(), from: restingOffset }
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const start = drag.current
      if (!start) return
      const dy = e.clientY - start.y
      if (dragOffset !== null || Math.abs(dy) > TAP_PX) {
        setDragOffset(Math.min(offsets.map + GIVE_PX, Math.max(-GIVE_PX, start.from + dy)))
      }
    },
    onPointerUp: (e: ReactPointerEvent) => {
      const start = drag.current
      drag.current = null
      setDragOffset(null)
      if (!start) return
      const dy = e.clientY - start.y
      // a tap is left to the click that follows (on the handle, or on a card)
      if (Math.abs(dy) < TAP_PX) return
      isClickSuppressed.current = true
      settle(start.from, dy, performance.now() - start.time)
    },
    onPointerCancel: () => {
      drag.current = null
      setDragOffset(null)
    },
  }

  return (
    <section
      ref={panelRef}
      aria-label="Seznam akcí"
      style={isDesktop ? undefined : { transform: `translateY(${offset}px)` }}
      {...(isSheetDraggable ? pointerHandlers : {})}
      // A touch browser sends no click after a drag, so the flag would outlive
      // it; any new press or key (also in the pulled-up list, where the sheet
      // has no pointer handlers) starts fresh.
      onPointerDownCapture={() => {
        isClickSuppressed.current = false
      }}
      onKeyDownCapture={() => {
        isClickSuppressed.current = false
      }}
      onClickCapture={(e) => {
        if (!isClickSuppressed.current) return
        isClickSuppressed.current = false
        e.preventDefault()
        e.stopPropagation()
      }}
      // the wheel over the lowered sheet pulls it up, as a swipe would
      onWheel={
        isSheetDraggable
          ? (e) => {
              if (e.deltaY > 0) onSnapChange("list")
            }
          : undefined
      }
      className={cn(
        // mobile: a sheet from under the filter chips to the bottom
        "absolute inset-x-0 top-16 bottom-0 z-10 flex flex-col rounded-t-lg bg-background shadow-md",
        // the sheet continues below its bottom edge, so the elastic give past the
        // top never uncovers the map underneath
        "after:absolute after:inset-x-0 after:top-full after:h-8 after:bg-background",
        isSheetDraggable && "touch-none select-none",
        dragOffset === null &&
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
        "md:static md:z-auto md:my-8 md:w-96 md:shrink-0 md:touch-auto md:rounded-none md:shadow-none md:select-auto md:after:hidden lg:w-130",
      )}
    >
      <button
        type="button"
        aria-label={snap === "list" ? "Stáhnout seznam" : "Vytáhnout seznam"}
        aria-expanded={snap === "list"}
        // pulled up, the sheet itself doesn't drag, so the handle does
        {...(isSheetDraggable ? {} : pointerHandlers)}
        // a tap (pointer or keyboard) steps up, or back to the peek from the list
        onClick={() => onSnapChange(snap === "map" ? "peek" : snap === "peek" ? "list" : "peek")}
        className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-t-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing md:hidden"
      >
        <span className="h-1 w-9 rounded-full bg-border" />
      </button>
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 px-4",
          // only the pulled-up list scrolls (and leaves room for the „Mapa“ button)
          snap === "list" ? "overflow-y-auto overscroll-contain pb-16" : "overflow-hidden",
          "md:overflow-y-auto md:p-0 md:pr-3",
        )}
      >
        <div ref={contentRef}>{children}</div>
      </div>
    </section>
  )
}
