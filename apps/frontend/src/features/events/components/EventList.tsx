import type { ReactNode } from "react"
import { RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"
import { eventCountLabel } from "@/features/events/lib/formatEvent"

type EventListProps = {
  events: PublicEvent[]
  isLoading?: boolean
  error?: Error
  onRetry?: () => void
  /** The card under the mouse, so the map can highlight its pin. */
  highlightedId?: string
  onHighlight?: (eventId: string | undefined) => void
  /**
   * The closed mobile panel shows only the first N cards; the rest stay
   * rendered (so the sheet can be dragged up smoothly) but inert. At 0 („map“)
   * an empty list's block is inert too.
   */
  inertAfter?: number
  /**
   * Mobile: „Zrušit filtry“ next to the count, where it shows in every sheet
   * position (on desktop „Zrušit vše“ is in the filter bar). Pass only with an active filter.
   */
  onClearFilters?: () => void
  /**
   * What an empty list says and offers instead of the plain sentence, e.g.
   * the filters and ways on (/akce). Marks its own `data-peek-end`.
   */
  empty?: ReactNode
  /** „Řadit: …“ beside the count (SortMenu, #57); a plain label without it. */
  sortControl?: ReactNode
  /** With okolí the cards say how far each event is (#57, Figma A-02gd). */
  isDistanceShown?: boolean
}

export function EventList({
  events,
  isLoading,
  error,
  onRetry,
  highlightedId,
  onHighlight,
  inertAfter,
  onClearFilters,
  empty,
  sortControl,
  isDistanceShown = false,
}: EventListProps) {
  if (error) {
    return (
      <Alert
        variant="destructive"
        data-peek-end
      >
        <AlertTitle>Akce se nepodařilo načíst</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          {/* ky's message is a URL and a status code; it stays in the console */}
          <span>Zkontroluj připojení a zkus to znovu.</span>
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              <RefreshCw className="size-4" />
              Zkusit znovu
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy
        aria-label="Načítám akce"
      >
        {[0, 1, 2, 3].map((i) => (
          <EventCardSkeleton
            key={i}
            isPeekEnd={i === 0}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* the lowest mobile sheet position („map“) shows just this row */}
      <div
        data-peek-min
        className="flex items-center justify-between gap-3"
      >
        <p className="flex items-center gap-1 text-sm font-semibold">
          {eventCountLabel(events.length)}
          {onClearFilters ? (
            <>
              <span
                aria-hidden
                className="font-normal text-muted-foreground md:hidden"
              >
                ·
              </span>
              <Button
                variant="link"
                onClick={onClearFilters}
                // a link-sized label with a full-height tap target
                className="-my-2 h-auto px-1 py-2 font-medium underline md:hidden"
              >
                Zrušit filtry
              </Button>
            </>
          ) : null}
        </p>
        {sortControl ?? (
          <p className="text-xs font-medium text-muted-foreground">Řadit: nejbližší termín</p>
        )}
      </div>

      {events.length === 0 ? (
        // the lowest sheet position („map“) shows just the count row: the rest is out of reach
        <div inert={inertAfter === 0}>
          {empty ?? (
            <p
              data-peek-end
              className="py-8 text-center text-sm text-muted-foreground"
            >
              Pro zvolené filtry teď nejsou žádné nadcházející akce.
            </p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event, index) => (
            <li
              key={event.id}
              data-peek-end={index === 0 ? "" : undefined}
              inert={inertAfter !== undefined && index >= inertAfter}
            >
              <EventCard
                distanceKm={isDistanceShown ? event.distanceKm : undefined}
                event={event}
                isHighlighted={event.id === highlightedId}
                onMouseEnter={() => onHighlight?.(event.id)}
                onMouseLeave={() => onHighlight?.(undefined)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The shape of an EventCard while it loads, row or grid as the card it stands for. */
export function EventCardSkeleton({
  isPeekEnd,
  variant = "row",
}: {
  isPeekEnd?: boolean
  variant?: "row" | "responsive"
}) {
  const isResponsive = variant === "responsive"
  return (
    <div
      data-peek-end={isPeekEnd ? "" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-card-border p-3",
        isResponsive && "md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:p-0",
      )}
    >
      <Skeleton
        className={cn(
          "size-26 shrink-0 rounded-xl",
          isResponsive && "md:h-50 md:w-full md:rounded-none",
        )}
      />
      <div className={cn("flex flex-1 flex-col gap-2", isResponsive && "md:p-5")}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
