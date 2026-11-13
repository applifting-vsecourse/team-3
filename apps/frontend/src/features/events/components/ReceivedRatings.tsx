import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"

import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ratingSummaryLabel } from "@/lib/ratingSummary"

import { receivedRatingsQueryOptions } from "@/features/events/api/ratingQueryOptions"
import { RATING_WINDOW_DAYS } from "@/features/events/api/ratingSchemas"

type ReceivedRatingsProps = {
  eventId: string
  viewerId: string
  /** A group's event: its organizer stars belong to the group (B-060). */
  isGroupEvent: boolean
}

/**
 * What the participants said about the event, on its management page (B-060 „Organizátor vidí
 * hodnocení a komentáře své akce“, #66): the two averages, then each rating with its comment,
 * newest first. The organizer or a group's admin (GET /api/events/:id/ratings).
 */
export function ReceivedRatings({ eventId, viewerId, isGroupEvent }: ReceivedRatingsProps) {
  const headingId = useId()
  const query = useQuery(receivedRatingsQueryOptions(eventId, viewerId))
  const organizerWord = isGroupEvent ? "skupina" : "organizátor"

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h2
        id={headingId}
        className="text-lg font-semibold tracking-tight"
      >
        Jak akci hodnotili
      </h2>
      {query.error ? (
        <Alert variant="destructive">
          <AlertTitle>Hodnocení se nepodařilo načíst</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>Zkontroluj připojení a zkus to znovu.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              <RefreshCw className="size-4" />
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
      ) : !query.data ? (
        <div
          aria-busy
          aria-label="Načítám hodnocení"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Akce</dt>
            <dd>{ratingSummaryLabel(query.data.summary.event)}</dd>
            <dt className="text-muted-foreground">{isGroupEvent ? "Skupina" : "Organizátor"}</dt>
            <dd>{ratingSummaryLabel(query.data.summary.organizer)}</dd>
          </dl>
          {query.data.ratings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Zatím nikdo nehodnotil. Účastníci mohou hodnotit {RATING_WINDOW_DAYS} dní po akci.
            </p>
          ) : (
            <ul className="flex flex-col">
              {query.data.ratings.map((rating) => (
                <li
                  key={rating.author.id}
                  className="border-b border-border py-3 last:border-b-0"
                >
                  <PersonRow
                    name={rating.author.name}
                    userId={rating.author.id}
                    description={`akce ★ ${rating.eventStars} · ${organizerWord} ★ ${rating.organizerStars}`}
                    quote={rating.comment}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
