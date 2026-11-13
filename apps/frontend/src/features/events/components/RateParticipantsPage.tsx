import { useId, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Info, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { PageBand } from "@/components/PageBand/PageBand"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { RatingStars } from "@/components/RatingStars/RatingStars"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { apiErrorCode } from "@/lib/api-client"
import { inSentence } from "@/lib/inSentence"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { participantRatingsQueryOptions } from "@/features/events/api/ratingQueryOptions"
import {
  RATING_COMMENT_MAX_LENGTH,
  RATING_WINDOW_DAYS,
  type ParticipantRatings,
  type ParticipantRatingsRefusal,
} from "@/features/events/api/ratingSchemas"
import { PastEventCard } from "@/features/events/components/PastEventCard"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useRateParticipants } from "@/features/events/hooks/useRateParticipants"
import { formatEventDay } from "@/features/events/lib/formatEvent"
import {
  effectiveStars,
  initialForm,
  rowDescription,
  savedRows,
  toInputs,
  type CommonRating,
  type ParticipantRow,
} from "@/features/events/lib/participantRatingsForm"
import { ratingBandLine } from "@/features/events/lib/rating"

type RateParticipantsPageProps = {
  eventId: string
  /** The organizer who created the event: the API told the rating page so (OWN_EVENT). */
  viewerId: string
  /** After saving: the participants' public profiles show the ratings. */
  onSaved?: () => Promise<void>
}

/**
 * /akce/:id/hodnoceni for the organizer (Figma D-05, D-05d; B-060, #66): „Všem stejně“ – 5★ to
 * start with and one comment – and each approved participant, who follows it („Jako všichni“) or
 * gets their own stars and comment. One save for the whole list. The event comes from its detail,
 * which its organizer always sees.
 */
export function RateParticipantsPage({ eventId, viewerId, onSaved }: RateParticipantsPageProps) {
  const detail = useEventDetail(eventId, viewerId)
  const query = useQuery(participantRatingsQueryOptions(eventId, viewerId))
  const event = detail.event
  const back = {
    to: ROUTES.manageEvent,
    params: { eventId },
    fallbackLabel: "Správa akce",
    label: "Správa akce",
  } as const

  return (
    <>
      <Seo title="Ohodnotit účastníky" />
      <PageBand
        title="Ohodnoť účastníky"
        // Figma D-05d: „Volejbal na Letné · Po 19. 10. · Sportovní areál Letná, Praha 7 · …“
        description={event ? ratingBandLine(event) : undefined}
        back={back}
        // a form: on a phone one bar with the arrow and the title (Figma D-05, Header/Sub)
        isCompactOnMobile
      />
      <div className={cn(PAGE, "gap-6 pb-24")}>
        {query.error || detail.error ? (
          <LoadError
            error={query.error ?? detail.error}
            retry={() => {
              void query.refetch()
              detail.retry()
            }}
          />
        ) : detail.isNotFound ? (
          <Explained title="Akce neexistuje">
            <Link
              to={ROUTES.events}
              className="font-medium underline underline-offset-4"
            >
              Prohlédni si akce
            </Link>
          </Explained>
        ) : !query.data || !event ? (
          <Loading />
        ) : query.data.refusal ? (
          <NotRatable
            event={event}
            data={query.data}
            refusal={query.data.refusal}
          />
        ) : query.data.participants.length === 0 ? (
          <Explained title="Není koho hodnotit">
            Na akci kromě tebe nikdo nebyl.{" "}
            <Link
              to={ROUTES.manageEvent}
              params={{ eventId }}
              className="font-medium underline underline-offset-4"
            >
              Zpět na správu akce
            </Link>
          </Explained>
        ) : (
          <RateParticipantsForm
            event={event}
            data={query.data}
            eventId={eventId}
            viewerId={viewerId}
            onSaved={onSaved}
          />
        )}
      </div>
    </>
  )
}

const COMMENT_TOO_LONG = `Komentář může mít nejvýš ${RATING_COMMENT_MAX_LENGTH} znaků`

function RateParticipantsForm({
  event,
  data,
  eventId,
  viewerId,
  onSaved,
}: {
  event: EventDetail
  data: ParticipantRatings
  eventId: string
  viewerId: string
  onSaved?: () => Promise<void>
}) {
  const save = useRateParticipants(eventId, viewerId, onSaved)
  // „Všem stejně“ and the rows, read back from what was saved (review #322)
  const [start] = useState(() => initialForm(data.participants))
  const [common, setCommon] = useState<CommonRating>(start.common)
  const [rows, setRows] = useState<ParticipantRow[]>(start.rows)
  // a refusal about one participant, shown at their row (SELF_RATING, NOT_APPROVED, RATING_DELETED)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const commonQuestionId = useId()
  const commonCommentId = useId()
  const commonHintId = useId()

  const update = (id: string, change: (row: ParticipantRow) => ParticipantRow) =>
    setRows((current) => current.map((row) => (row.id === id ? change(row) : row)))
  const tooLong = (text: string) => text.trim().length > RATING_COMMENT_MAX_LENGTH
  const hasTooLong = tooLong(common.comment) || rows.some((row) => tooLong(row.comment))
  // the group's organizer stars belong to the group; these are the participants' own
  const isGroupEvent = event.group !== null

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault()
        setIsSubmitted(true)
        if (hasTooLong) return
        setRowErrors({})
        save.mutateAsync(toInputs(rows, common)).then(
          (view) => {
            // „Jako všichni“ stays so; the own ones are „Uloženo“; a refusal keeps the edits
            setRows((current) => savedRows(current, view.participants))
            toast.success("Hodnocení účastníků je uložené")
          },
          (error: Error & { data?: unknown }) => {
            const participantId = participantOf(error)
            if (participantId) setRowErrors({ [participantId]: error.message })
            toast.error(error.message)
          },
        )
      }}
    >
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* min-w-0: the card's truncated line would widen the column past a phone's width */}
        <div className="flex min-w-0 flex-col gap-6">
          <PastEventCard
            event={event}
            // the page is the event's own; the card needn't lead back to its detail
            isLinked={false}
          />
          <section className="flex flex-col gap-3">
            <p
              id={commonQuestionId}
              className="text-sm leading-none font-medium"
            >
              Všem stejně
            </p>
            <p className="text-sm text-muted-foreground">
              Vyber hvězdičky a napiš jeden komentář pro všechny. Kdo si zaslouží jiné hodnocení,
              tomu ho níž změníš.
            </p>
            <RatingStars
              value={common.stars}
              onChange={(stars) => setCommon((current) => ({ ...current, stars }))}
              aria-labelledby={commonQuestionId}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor={commonCommentId}>Komentář pro všechny (nepovinné)</Label>
              <Textarea
                id={commonCommentId}
                className="min-h-24"
                value={common.comment}
                aria-describedby={commonHintId}
                aria-invalid={isSubmitted && tooLong(common.comment)}
                onChange={(changeEvent) =>
                  setCommon((current) => ({ ...current, comment: changeEvent.target.value }))
                }
              />
              <p
                id={commonHintId}
                className={cn(
                  "text-sm",
                  isSubmitted && tooLong(common.comment)
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {isSubmitted && tooLong(common.comment)
                  ? COMMENT_TOO_LONG
                  : "Kdo nedostane vlastní komentář, uvidí u svého hodnocení tenhle."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full"
              onClick={() =>
                setRows((current) =>
                  current.map((row) =>
                    row.isDeleted
                      ? row
                      : {
                          ...row,
                          mode: "common",
                          comment: "",
                          isCommentOpen: false,
                          isEdited: true,
                        },
                  ),
                )
              }
            >
              Použít pro všechny
            </Button>
          </section>
        </div>
        <section
          aria-label={`Účastníci (${rows.length})`}
          className="flex min-w-0 flex-col gap-2"
        >
          <p className="text-sm font-medium">Účastníci ({rows.length})</p>
          <ul className="flex flex-col">
            {rows.map((row) => (
              <ParticipantItem
                key={row.id}
                row={row}
                stars={effectiveStars(row, common)}
                error={rowErrors[row.id]}
                commentError={isSubmitted && tooLong(row.comment) ? COMMENT_TOO_LONG : undefined}
                onStars={(stars) =>
                  update(row.id, (current) => ({ ...current, mode: "own", stars, isEdited: true }))
                }
                onOpenComment={() =>
                  update(row.id, (current) => ({
                    ...current,
                    mode: "own",
                    stars: effectiveStars(current, common),
                    isCommentOpen: true,
                    isEdited: true,
                  }))
                }
                onComment={(comment) =>
                  update(row.id, (current) => ({ ...current, comment, isEdited: true }))
                }
              />
            ))}
          </ul>
        </section>
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full md:w-fit"
        disabled={save.isPending}
      >
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Uložit hodnocení
      </Button>
      <p className="text-sm text-muted-foreground">
        Hodnotit jde {RATING_WINDOW_DAYS} dní po akci, tedy do{" "}
        {inSentence(formatEventDay(data.ratableUntil))}, a do té doby hodnocení změníš. Hodnocení i
        s komentářem se ukáže na veřejném profilu účastníka; sebe organizátor nehodnotí.
        {isGroupEvent ? " Hodnocení dáváš za sebe, ne za skupinu." : null}
      </p>
    </form>
  )
}

function ParticipantItem({
  row,
  stars,
  error,
  commentError,
  onStars,
  onOpenComment,
  onComment,
}: {
  row: ParticipantRow
  stars: number
  /** The API's refusal about this participant: about their rating. */
  error: string | undefined
  /** About their own comment (too long): at the comment, as the common one has it. */
  commentError: string | undefined
  onStars: (stars: number) => void
  onOpenComment: () => void
  onComment: (comment: string) => void
}) {
  const nameId = useId()
  const commentId = useId()
  const errorId = useId()
  const commentErrorId = useId()
  return (
    <li className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0">
      <PersonRow
        name={row.name}
        userId={row.id}
        description={rowDescription(row)}
      />
      <span
        id={nameId}
        className="sr-only"
      >
        Hodnocení: {row.name}
      </span>
      {row.isDeleted ? null : (
        <>
          <RatingStars
            value={stars}
            onChange={onStars}
            aria-labelledby={nameId}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
          />
          {row.isCommentOpen ? (
            <div className="flex flex-col gap-2 pt-1">
              <Label htmlFor={commentId}>Vlastní komentář (nepovinné)</Label>
              <Textarea
                id={commentId}
                className="min-h-24"
                value={row.comment}
                aria-invalid={Boolean(commentError)}
                aria-describedby={commentError ? commentErrorId : undefined}
                onChange={(changeEvent) => onComment(changeEvent.target.value)}
              />
              {commentError ? (
                <p
                  id={commentErrorId}
                  className="text-sm text-destructive"
                >
                  {commentError}
                </p>
              ) : null}
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-11 w-fit"
              onClick={onOpenComment}
            >
              Přidat vlastní komentář
            </Button>
          )}
        </>
      )}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </li>
  )
}

/** The participant a refusal is about, when the API names one (#66). */
function participantOf(error: { data?: unknown }): string | undefined {
  const data = error.data
  if (typeof data !== "object" || data === null || !("participantId" in data)) return undefined
  return typeof data.participantId === "string" ? data.participantId : undefined
}

const NOT_RATABLE: Record<ParticipantRatingsRefusal, { title: string; body: string }> = {
  EVENT_NOT_ENDED: {
    title: "Hodnotit půjde, až akce skončí",
    body: `Pak na to budeš mít ${RATING_WINDOW_DAYS} dní.`,
  },
  EVENT_NOT_PUBLISHED: {
    title: "Akce je zrušená",
    body: "Zrušenou akci hodnotit nejde.",
  },
  EVENT_NOT_HELD: {
    title: "Akce se nekonala",
    body: "Nesešlo se dost lidí, takže hodnotit nejde.",
  },
  RATING_WINDOW_CLOSED: {
    title: "Hodnotit už nejde",
    body: `Hodnotit šlo jen ${RATING_WINDOW_DAYS} dní po akci.`,
  },
}

function NotRatable({
  event,
  data,
  refusal,
}: {
  event: EventDetail
  data: ParticipantRatings
  refusal: ParticipantRatingsRefusal
}) {
  const { title, body } = NOT_RATABLE[refusal]
  const rated = data.participants.filter((participant) => participant.rating !== null).length
  return (
    <div className="flex flex-col gap-6 md:max-w-xl">
      {/* the past event's card would say it took place (review #322) */}
      {refusal === "EVENT_NOT_ENDED" ? null : (
        <PastEventCard
          event={event}
          isLinked={false}
        />
      )}
      <Alert variant="neutral">
        <Info />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <p>
            {body}
            {rated > 0 ? ` Hodnocení má ${rated} z ${data.participants.length} účastníků.` : null}
          </p>
          <p className="pt-1">
            <Link
              to={ROUTES.manageEvent}
              params={{ eventId: event.id }}
              className="font-medium underline underline-offset-4"
            >
              Zpět na správu akce
            </Link>
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}

function Loading() {
  return (
    <div
      role="status"
      aria-label="Načítám účastníky"
      className="grid gap-8 md:grid-cols-2 md:gap-12"
    >
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

function LoadError({ error, retry }: { error: Error | undefined; retry: () => void }) {
  if (apiErrorCode(error) === "NOT_ORGANIZER") {
    return <Explained title="Účastníky hodnotí jen organizátor akce">{error?.message}</Explained>
  }
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 py-6"
    >
      <p className="text-sm text-destructive">{error?.message}</p>
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
