import { Link } from "@tanstack/react-router"
import { Users } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { CapacityBar } from "@/components/CapacityBar/CapacityBar"
import { StatusBadge, type BadgeStatus } from "@/components/StatusBadge/StatusBadge"
import { occupancyBesideBadge, occupancyCount } from "@/lib/occupancy"
import { cn } from "@/lib/utils"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { EventPhoto } from "@/features/events/components/EventPhoto"
import {
  capacityStatus,
  eventDateParts,
  formatEventStart,
  placeName,
} from "@/features/events/lib/formatEvent"

/**
 * `row` – Karta akce/Foto řádek: the /akce list, a column of events. `grid` – Karta akce/Foto:
 * a grid of cards. `responsive` – a grid on a phone is one column, so row there and grid
 * from `md` (Figma A-01 / A-01d, C-01 / C-01d).
 */
export type EventCardVariant = "row" | "grid" | "responsive"

type EventCardProps = {
  event: PublicEvent & { status?: "published" | "cancelled" }
  variant?: EventCardVariant
  /** Selected: its pin is highlighted on the map — a 2 px ring that doesn't change its size. */
  isHighlighted?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  /** Instead of the occupancy, e.g. the user's place in „Moje akce“. */
  status?: BadgeStatus
  /**
   * The grid card's numbers beside the badge; „5 z 12 · min. 6“ by default (#189). Where the
   * badge isn't the occupancy, say how many are missing here — `attendingNumbers`.
   */
  numbers?: string
  /** The row card's line starts with it, e.g. „chybí 1“ where the badge says „Jdu“ (C-01). */
  rowLead?: string
  /** The row card's line ends with it instead of the place, e.g. „2 žádosti čekají“ (C-02). */
  rowTail?: string
  /** The organizer goes to the event's management (C-02), everyone else to its detail. */
  linkTo?: "detail" | "manage"
  /** h3 under a section heading. */
  titleAs?: "h2" | "h3"
  /** The management's card leaves the occupancy to the big bar under it (Figma D-03). */
  hasBar?: boolean
  /**
   * The start of the description, in the map preview (#56): the grid card shows it under the
   * title instead of the place (Figma A-03ad); the row card in two lines under its line, so
   * the time and the place stay (a phone's preview).
   */
  summary?: string | null
  /** With okolí: km from the chosen locality's centre at the end of the row line (#57, Figma A-02gd). */
  distanceKm?: number | null
  /**
   * A group's event names its group under the title (Figma Karta akce › Skupina, #304), so
   * it is clear at a glance where it happens. In Moje only (C-01, C-02); elsewhere (/akce,
   * the landing page, the group's own page) it would be a new story for the PO.
   */
  isGroupShown?: boolean
  className?: string
}

/**
 * An event in a list or a grid (Figma: Karta akce/Foto, Karta akce/Foto řádek; DESIGN.md ›
 * Event card): the activity photo with the date tile, the title, where, and the occupancy.
 * The title links to the detail; its ::after stretches over the card, so the whole card is
 * clickable while the link is still named by the title. The focus ring moves to the card.
 */
export function EventCard({
  event,
  variant = "row",
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  status,
  numbers,
  rowLead,
  rowTail,
  linkTo = "detail",
  titleAs: Title = "h2",
  hasBar = true,
  summary,
  distanceKm,
  isGroupShown = false,
  className,
}: EventCardProps) {
  const isCancelled = event.status === "cancelled"
  const { time } = eventDateParts(event.startsAt)
  const place = placeName(event.address)
  const cardNumbers = numbers ?? (isCancelled ? occupancyCount(event) : occupancyBesideBadge(event))
  const distance =
    distanceKm === null || distanceKm === undefined
      ? undefined
      : `${distanceKm.toLocaleString("cs", { maximumFractionDigits: 1 })} km`
  const rowLine = [rowLead, time, ...(rowTail ? [rowTail] : [place, event.locality.name]), distance]
    .filter(Boolean)
    .join(" · ")

  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative rounded-2xl border border-card-border bg-card text-card-foreground transition-colors hover:border-foreground",
        "has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring",
        isHighlighted && "ring-2 ring-foreground",
        {
          row: "flex items-center gap-3 p-3",
          grid: "flex h-full flex-col overflow-hidden",
          responsive:
            "flex items-center gap-3 p-3 md:h-full md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:p-0",
        }[variant],
        className,
      )}
    >
      <EventPhoto
        event={event}
        variant={variant}
      />
      <div
        className={
          {
            row: "flex min-w-0 flex-1 flex-col gap-1",
            grid: "flex flex-1 flex-col gap-2 px-5 pt-4 pb-5",
            responsive: "flex min-w-0 flex-1 flex-col gap-1 md:gap-2 md:px-5 md:pt-4 md:pb-5",
          }[variant]
        }
      >
        <Title
          className={cn(
            "line-clamp-2",
            {
              row: "type-row-title",
              grid: "type-card-title",
              responsive: "type-row-title md:type-card-title",
            }[variant],
          )}
        >
          <Link
            to={linkTo === "manage" ? ROUTES.manageEvent : ROUTES.eventDetail}
            params={{ eventId: event.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {event.title}
          </Link>
        </Title>
        {event.group && isGroupShown ? (
          <p className="flex min-w-0 items-center gap-1 text-caption font-semibold text-secondary-foreground md:text-sm">
            <Users
              aria-hidden
              className="size-3.5 shrink-0"
            />
            <span className="sr-only">Skupina: </span>
            <span className="truncate">{event.group.name}</span>
          </p>
        ) : null}
        {/* the date tile is a picture of it */}
        <time
          dateTime={event.startsAt.toISOString()}
          className="sr-only"
        >
          {formatEventStart(event.startsAt)}
        </time>
        {variant === "grid" ? null : (
          <p
            className={cn(
              "truncate text-caption text-muted-foreground",
              variant === "responsive" && "md:hidden",
            )}
          >
            {rowLine}
          </p>
        )}
        {variant === "row" && summary ? (
          <p className="line-clamp-2 text-caption text-muted-foreground">{summary}</p>
        ) : null}
        {variant === "row" ? null : summary ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>
        ) : (
          <p
            className={cn(
              "truncate text-sm text-muted-foreground",
              variant === "responsive" && "hidden md:block",
            )}
          >
            {place} · {event.locality.name}
          </p>
        )}
        <div
          className={
            {
              row: "flex items-center gap-2 pt-1",
              grid: "mt-auto flex flex-wrap items-center gap-2 pt-2",
              responsive: "flex items-center gap-2 pt-1 md:mt-auto md:flex-wrap md:pt-2",
            }[variant]
          }
        >
          <StatusBadge status={status ?? capacityStatus(event)} />
          {/* the row card draws the numbers only as the bar, so a screen reader still gets them
              (a past event says who came in its line) */}
          {variant === "row" && status?.kind === "past" ? null : (
            <>
              {/* the row card and a phone show the numbers only to a screen reader — without
                  „chybí N“ when the line already starts with it (DESIGN.md › Occupancy in words) */}
              <span
                className={cn(
                  "truncate text-caption font-medium text-muted-foreground",
                  {
                    row: "sr-only",
                    grid: null,
                    responsive: rowLead ? "hidden md:inline" : "max-md:sr-only",
                  }[variant],
                )}
              >
                {variant === "row" && rowLead ? occupancyBesideBadge(event) : cardNumbers}
              </span>
              {variant === "responsive" && rowLead ? (
                <span className="sr-only md:hidden">{occupancyBesideBadge(event)}</span>
              ) : null}
            </>
          )}
          {/* a cancelled or past event no longer fills up */}
          {!hasBar || isCancelled || status?.kind === "past" ? null : (
            <CapacityBar
              variant="compact"
              approvedCount={event.approvedCount}
              minParticipants={event.minParticipants}
              maxParticipants={event.maxParticipants}
              missingToMin={event.missingToMin}
              freeSpots={event.freeSpots}
              isFull={event.isFull}
              className={
                {
                  row: "min-w-16 flex-1",
                  grid: "basis-full",
                  responsive: "min-w-16 flex-1 md:basis-full",
                }[variant]
              }
            />
          )}
        </div>
      </div>
    </article>
  )
}
