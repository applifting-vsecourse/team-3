import { useId, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ratingSummaryLabel } from "@/lib/ratingSummary"

import type { ProfileRating, RatingSummary } from "@/features/profile/api/profileSchemas"

/** A section of /profil (Figma B-05, B-05d): heading, content, how much is left out. */
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

/** A section heading with its one keyword highlighted: „Moje **hodnocení**“ (DESIGN.md › Type). */
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

/** How much is left out of a list that shows only the latest few (there is no page for all yet). */
function More({ shown, total }: { shown: number; total: number }) {
  return shown && total > shown ? (
    <p className="text-sm text-muted-foreground">
      Zobrazeno {shown} z {total}
    </p>
  ) : null
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
