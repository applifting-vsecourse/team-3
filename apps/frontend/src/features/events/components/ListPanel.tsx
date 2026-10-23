import { useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type ListPanelProps = {
  isExpanded: boolean
  onExpandedChange: (isExpanded: boolean) => void
  children: ReactNode
}

// A short swipe on the handle is enough; a tap toggles too.
const SWIPE_PX = 24

/**
 * The list on /akce. Mobile (Figma A-02): a panel over the full-height map —
 * closed it shows the count and the first card, pulled up it is the list.
 * Desktop (A-02d): a plain column left of the map.
 */
export function ListPanel({ isExpanded, onExpandedChange, children }: ListPanelProps) {
  const startY = useRef<number | null>(null)

  return (
    <section
      aria-label="Seznam akcí"
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-lg bg-background px-4 pb-4 shadow-md",
        // pulled up: covers the map; the filter chips stay above it
        isExpanded && "top-0 overflow-y-auto pt-16 pb-16 shadow-none",
        "md:static md:z-auto md:w-96 md:shrink-0 md:overflow-y-auto md:rounded-none md:p-0 md:shadow-none lg:w-130",
      )}
    >
      {isExpanded ? null : (
        <button
          type="button"
          aria-label="Vytáhnout seznam"
          aria-expanded={false}
          onClick={() => onExpandedChange(true)}
          onPointerDown={(e) => {
            startY.current = e.clientY
          }}
          onPointerUp={(e) => {
            if (startY.current !== null && startY.current - e.clientY > SWIPE_PX) {
              onExpandedChange(true)
            }
            startY.current = null
          }}
          className="flex h-6 shrink-0 touch-none items-center justify-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:hidden"
        >
          <span className="h-1 w-9 rounded-full bg-border" />
        </button>
      )}
      {children}
    </section>
  )
}
