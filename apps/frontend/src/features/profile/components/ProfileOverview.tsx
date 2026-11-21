import { useId, useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
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

/** The latest few of a role's ratings, the rest on „Zobrazit všechna“ (#370). */
const PREVIEW_COUNT = 3

/** How much the API left out of a list: past its limit (PROFILE_OVERVIEW_TAKE), none are loaded. */
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
  const listId = useId()
  const [isExpanded, setIsExpanded] = useState(false)
  const shown = isExpanded ? ratings : ratings.slice(0, PREVIEW_COUNT)
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
        <ul
          id={listId}
          className="divide-y divide-border"
        >
          {shown.map((rating) => (
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
      {ratings.length > shown.length ? (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          aria-expanded={false}
          aria-controls={listId}
          onClick={() => setIsExpanded(true)}
        >
          Zobrazit všechna ({summary.count})
        </Button>
      ) : (
        <More
          shown={ratings.length}
          total={summary.count}
        />
      )}
    </section>
  )
}
