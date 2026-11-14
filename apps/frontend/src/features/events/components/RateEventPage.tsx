import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Info } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiErrorCode, HTTPError } from "@/lib/api-client"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { myEventRatingQueryOptions } from "@/features/events/api/ratingQueryOptions"
import {
  RATING_WINDOW_DAYS,
  type EventRatingRefusal,
  type MyEventRating,
} from "@/features/events/api/ratingSchemas"
import { PastEventCard } from "@/features/events/components/PastEventCard"
import { RateEventForm } from "@/features/events/components/RateEventForm"
import { RateParticipantsPage } from "@/features/events/components/RateParticipantsPage"
import { useRateEvent } from "@/features/events/hooks/useRateEvent"
import { ratingBandLine } from "@/features/events/lib/rating"

type RateEventPageProps = {
  eventId: string
  /** The signed-in user; the page sits under the protected layout. */
  viewerId: string
  /** After saving: what else shows the averages (the profiles) refreshes. */
  onSaved?: () => Promise<void>
}

/**
 * /akce/:id/hodnoceni for a participant (Figma C-03, C-03d; B-060, #66). Everything comes from
 * GET /api/events/:id/rating, never from the event's detail: a former member of the group no
 * longer gets the detail of a members-only event, and still rates it. Its organizer gets their
 * side of the same address (D-05, RateParticipantsPage): the API's 403 OWN_EVENT tells.
 */
export function RateEventPage({ eventId, viewerId, onSaved }: RateEventPageProps) {
  const query = useQuery(myEventRatingQueryOptions(eventId, viewerId))
  const save = useRateEvent(eventId, viewerId, onSaved)
  const data = query.data

  // the organizer's side of the same address: the API says whose event it is (403 OWN_EVENT)
  if (apiErrorCode(query.error) === "OWN_EVENT") {
    return (
      <RateParticipantsPage
        eventId={eventId}
        viewerId={viewerId}
        onSaved={onSaved}
      />
    )
  }

  return (
    <>
      <Seo title="Ohodnotit akci" />
      <PageBand
        title="Ohodnoť akci"
        // Figma C-03d: „Volejbal na Letné · Po 19. 10. · Sportovní areál Letná, Praha 7 · …“
        description={data ? ratingBandLine(data.event) : undefined}
        back={{ to: ROUTES.myEvents, fallbackLabel: "Moje akce", label: "Moje akce" }}
        // a form: on a phone one bar with the arrow and the title (Figma C-03, Header/Sub)
        isCompactOnMobile
      />
      <div className={cn(PAGE, "gap-6 pb-24")}>
        {query.error ? (
          <RateEventError
            error={query.error}
            retry={() => void query.refetch()}
          />
        ) : !data ? (
          <RateEventLoading />
        ) : data.refusal ? (
          <NotRatable
            data={data}
            refusal={data.refusal}
          />
        ) : (
          <RateEventForm
            // a new rating from the server (after saving, or another tab) fills the form anew
            key={data.rating?.updatedAt.toISOString() ?? "new"}
            data={data}
            isSaving={save.isPending}
            onSave={save.mutateAsync}
          />
        )}
      </div>
    </>
  )
}

function RateEventLoading() {
  return (
    <div
      role="status"
      aria-label="Načítám hodnocení"
      className="grid gap-6 md:grid-cols-2 md:gap-12"
    >
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-32" />
    </div>
  )
}

const NOT_RATABLE: Record<EventRatingRefusal, { title: string; body: string }> = {
  EVENT_NOT_ENDED: {
    title: "Hodnotit půjde, až akce skončí",
    body: `Pak na to budeš mít ${RATING_WINDOW_DAYS} dní.`,
  },
  EVENT_NOT_PUBLISHED: {
    title: "Akce je zrušená",
    body: "Zrušenou akci hodnotit nejde.",
  },
  // below its minimum: as the event's detail says, „Akce se nekonala“ (B-060, #314)
  EVENT_NOT_HELD: {
    title: "Akce se nekonala",
    body: "Nesešlo se dost lidí, takže hodnotit ji nejde.",
  },
  RATING_WINDOW_CLOSED: {
    title: "Hodnotit už nejde",
    body: `Hodnotit šlo jen ${RATING_WINDOW_DAYS} dní po akci.`,
  },
  RATING_DELETED: {
    title: "Hodnocení odstranil správce",
    body: "Znovu ho dát nejde.",
  },
}

/**
 * Why rating isn't possible now, with what the user gave if anything, and somewhere to go next
 * (DESIGN.md › Copy: always with a next step).
 */
function NotRatable({ data, refusal }: { data: MyEventRating; refusal: EventRatingRefusal }) {
  const { title, body } = NOT_RATABLE[refusal]
  const given = data.rating
  return (
    <div className="flex flex-col gap-6 md:max-w-xl">
      {/* before it ends, the past event's card would say how it went (review #322) */}
      {refusal === "EVENT_NOT_ENDED" ? null : (
        <PastEventCard
          event={data.event}
          rating={given ? { kind: "given", stars: given.eventStars } : undefined}
          // the detail: a former member of the group gets a 403 there (review #315)
          isLinked={false}
        />
      )}
      <Alert variant="neutral">
        <Info />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <p>
            {body}
            {given
              ? ` Tvoje hodnocení: akce ★ ${given.eventStars}, ${
                  data.event.group ? "skupina" : "organizátor"
                } ★ ${given.organizerStars}.`
              : null}
          </p>
          <NextStep>
            <Link
              to={ROUTES.events}
              className="font-medium underline underline-offset-4"
            >
              Najdi další akci
            </Link>
          </NextStep>
        </AlertDescription>
      </Alert>
    </div>
  )
}

function NextStep({ children }: { children: ReactNode }) {
  return <p className="pt-1">{children}</p>
}

/**
 * 404 (unknown, hidden or deleted), 403 (not approved for it) —
 * each says why, in the API's words, and where to go; anything else can be tried again.
 */
function RateEventError({ error, retry }: { error: Error; retry: () => void }) {
  const status = error instanceof HTTPError ? error.response.status : undefined
  const code = apiErrorCode(error)
  if (status === 404) {
    return (
      <Explained title="Akce neexistuje">
        Možná ji organizátor smazal nebo máš špatný odkaz.{" "}
        <Link
          to={ROUTES.events}
          className="font-medium underline underline-offset-4"
        >
          Prohlédni si akce
        </Link>
        .
      </Explained>
    )
  }
  if (code === "NOT_PARTICIPANT") {
    return (
      <Explained title="Tuhle akci hodnotit nemůžeš">
        {error.message}{" "}
        <Link
          to={ROUTES.events}
          className="font-medium underline underline-offset-4"
        >
          Najdi akci, na kterou půjdeš
        </Link>
        .
      </Explained>
    )
  }
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 py-6"
    >
      <p className="text-sm text-destructive">{error.message}</p>
      <Button
        variant="outline"
        onClick={retry}
      >
        Zkusit znovu
      </Button>
    </div>
  )
}

function Explained({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Alert
      variant="neutral"
      className="md:max-w-xl"
    >
      <Info />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{children}</p>
      </AlertDescription>
    </Alert>
  )
}
