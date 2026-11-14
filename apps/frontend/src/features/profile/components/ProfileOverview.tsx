import { useId, type ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { ratingSummaryLabel } from "@/lib/ratingSummary"

import type {
  ProfileEvent,
  ProfileRating,
  RatingSummary,
} from "@/features/profile/api/profileSchemas"

/** A section of the overview on /profil (Figma B-05, B-05d): heading, content, the way to the rest. */
export function ProfileSection({
  title,
  children,
  more,
}: {
  /** With one highlighted keyword (DESIGN.md › Type): `HighlightedTitle`. */
  title: ReactNode
  children: ReactNode
  more?: ReactNode
}) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
    >
      <h2
        id={headingId}
        className="type-feature"
      >
        {title}
      </h2>
      {children}
      {more}
    </section>
  )
}

/** A section heading with its one keyword highlighted: „Kam **jdu**“ (DESIGN.md › Type). */
export function HighlightedTitle({
  before,
  keyword,
  after,
}: {
  before?: string
  keyword: string
  after?: string
}) {
  return (
    <>
      {before ? `${before} ` : null}
      <span className="highlight-keyword">{keyword}</span>
      {after ? ` ${after}` : null}
    </>
  )
}

/** Where the rest of a section lives: Moje akce, or — with no page for it yet — how much is left out. */
function More({
  shown,
  total,
  link,
}: {
  shown: number
  total: number
  link?: Pick<LinkProps, "to" | "search">
}) {
  if (!shown) return null
  if (link) {
    return (
      <Button
        asChild
        variant="outline"
        className="w-fit"
      >
        <Link {...link}>Všechny v Moje akce</Link>
      </Button>
    )
  }
  // past events get a page with #61, ratings have none yet
  return total > shown ? (
    <p className="text-sm text-muted-foreground">
      Zobrazeno {shown} z {total}
    </p>
  ) : null
}

export type ProfileEventSection = "upcoming" | "organizing" | "past"

/**
 * One event of a section as its card. The cards belong to the events feature, which this
 * feature can't import, so the route puts them in (like Moje skupiny).
 */
export type RenderProfileEvent = (event: ProfileEvent, section: ProfileEventSection) => ReactNode

/** Kam jdu, Pořádám, Proběhlé: the first few events (the API sends at most 3) as row cards. */
export function EventSection({
  title,
  section,
  events,
  total,
  empty,
  link,
  renderEvent,
}: {
  title: ReactNode
  section: ProfileEventSection
  events: ProfileEvent[]
  total: number
  empty: ReactNode
  link?: Pick<LinkProps, "to" | "search">
  renderEvent: RenderProfileEvent
}) {
  return (
    <ProfileSection
      title={title}
      more={
        <More
          shown={events.length}
          total={total}
          link={link}
        />
      }
    >
      {!events.length ? (
        <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">{empty}</div>
      ) : (
        // grid-cols-1 = minmax(0, 1fr): a long title truncates instead of widening the column
        <ul className="grid grid-cols-1 gap-3">
          {events.map((event) => (
            <li key={event.id}>{renderEvent(event, section)}</li>
          ))}
        </ul>
      )}
    </ProfileSection>
  )
}

type RatingGroup = { ratings: ProfileRating[]; summary: RatingSummary }

/** Hodnocení: as a participant and as an organizer, each with its average and the latest few. */
export function RatingsSection({
  participant,
  organizer,
}: {
  participant: RatingGroup
  organizer: RatingGroup
}) {
  return (
    <ProfileSection
      title={
        <HighlightedTitle
          before="Moje"
          keyword="hodnocení"
        />
      }
    >
      <div className="grid gap-8 md:grid-cols-2">
        <RatingList
          title="Jako účastník"
          {...participant}
        />
        <RatingList
          title="Jako organizátor"
          {...organizer}
        />
      </div>
    </ProfileSection>
  )
}

function RatingList({ title, ratings, summary }: RatingGroup & { title: string }) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h3
          id={headingId}
          className="text-body font-semibold"
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{ratingSummaryLabel(summary)}</p>
      </div>
      {ratings.length ? (
        <ul className="divide-y divide-border">
          {ratings.map((rating) => (
            <li
              key={rating.id}
              className="flex flex-col gap-1 py-3 first:pt-0"
            >
              <p className="text-sm">
                <strong>{rating.stars} z 5</strong> · {rating.author.name}
              </p>
              {rating.comment ? (
                <p className="text-sm whitespace-pre-wrap">{rating.comment}</p>
              ) : null}
              <Link
                to={ROUTES.eventDetail}
                params={{ eventId: rating.event.id }}
                className="w-fit text-sm underline underline-offset-4"
              >
                {rating.event.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <More
        shown={ratings.length}
        total={summary.count}
      />
    </section>
  )
}
