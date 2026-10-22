import { RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

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
  /** Show only the first N cards (the closed mobile panel); the count stays the total. */
  limit?: number
}

export function EventList({
  events,
  isLoading,
  error,
  onRetry,
  highlightedId,
  onHighlight,
  limit,
}: EventListProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Akce se nepodařilo načíst</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{error.message}</span>
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
          <EventCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{eventCountLabel(events.length)}</p>
        {/* Other orders come in sprint 3 (#57); until then this is just a label. */}
        <p className="text-xs font-medium text-muted-foreground">Řadit: nejbližší termín</p>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Pro zvolené filtry teď nejsou žádné nadcházející akce.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.slice(0, limit).map((event) => (
            <li key={event.id}>
              <EventCard
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

function EventCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Skeleton className="size-16 rounded-lg" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
