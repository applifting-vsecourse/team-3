import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { activityPhoto } from "@/assets/activity-photos"
import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { CapacityBar } from "@/components/CapacityBar/CapacityBar"
import { DateTile } from "@/components/DateTile/DateTile"
import { LogoMark } from "@/components/Logo/Logo"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { eventDateParts, formatEventStart, placeName } from "@/features/events/lib/formatEvent"
import { missingNowLabel, missingNowSentence, startsIn } from "@/features/events/lib/homeCopy"

/** The panel's surface in the band (Figma Panel/Teď chybí jeden): a card with the `on-hero-muted` edge. */
const PANEL =
  "relative flex flex-col overflow-hidden rounded-2xl border border-on-hero-muted bg-card text-card-foreground"

/** The label with the small logo: „Teď chybí jeden · za 2 dny“. */
function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-caption font-semibold text-secondary-foreground">
      <LogoMark className="size-4.5" />
      {children}
    </p>
  )
}

/**
 * The panel „Teď chybí jeden“ in the landing page's band (Figma Panel/Teď chybí jeden, A-01,
 * A-01d; DESIGN.md › Panel): the event closest to taking place — photo with the date tile,
 * the label with the logo, title, place, one sentence with numbers, the capacity bar and an
 * outline „Doplnit partu“ (the band's primary is „Prohlédnout akce“). The title's link covers
 * the panel, as on the event card.
 */
export function MissingOnePanel({ event, now }: { event: PublicEvent; now: Date }) {
  const photo = activityPhoto(event.activity.slug)
  const date = eventDateParts(event.startsAt)
  return (
    <article
      className={cn(
        PANEL,
        "transition-colors hover:border-on-hero has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring",
      )}
    >
      <div
        aria-hidden
        className="relative h-45 shrink-0 bg-background md:h-60"
      >
        {photo ? (
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="(min-width: 64rem) 480px, 100vw"
            alt=""
            // at the top of the page
            loading="eager"
            decoding="async"
            className="size-full object-cover contrast-110 saturate-86"
          />
        ) : (
          <ActivityTile
            icon={event.activity.category.icon}
            className="absolute right-4 bottom-4"
          />
        )}
        <DateTile
          weekday={date.weekday}
          day={date.day}
          time={date.time}
          size="l"
          className="absolute bottom-4 left-4"
        />
      </div>
      <div className="flex flex-col gap-2 px-6 pt-4.5 pb-5.5">
        <PanelLabel>
          {missingNowLabel(event.missingToMin)} · {startsIn(event.startsAt, now)}
        </PanelLabel>
        <h2 className="type-feature">
          <Link
            to={ROUTES.eventDetail}
            params={{ eventId: event.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {event.title}
          </Link>
        </h2>
        <time
          dateTime={event.startsAt.toISOString()}
          className="sr-only"
        >
          {formatEventStart(event.startsAt)}
        </time>
        <p className="text-sm text-muted-foreground">
          {placeName(event.address)} · {event.locality.name}
        </p>
        <p className="text-body">{missingNowSentence(event)}</p>
        <CapacityBar
          variant="compact"
          approvedCount={event.approvedCount}
          minParticipants={event.minParticipants}
          maxParticipants={event.maxParticipants}
          missingToMin={event.missingToMin}
          freeSpots={event.freeSpots}
          isFull={event.isFull}
        />
        {/* above the title's link, which covers the panel, and leads to the same detail: one
            link for the keyboard and a screen reader, the title's */}
        <Button
          asChild
          variant="outline"
          className="relative mt-2 h-11 self-start"
        >
          <Link
            to={ROUTES.eventDetail}
            params={{ eventId: event.id }}
            tabIndex={-1}
            aria-hidden
          >
            Doplnit partu
          </Link>
        </Button>
      </div>
    </article>
  )
}

type EmptyPanelProps = {
  /** Events elsewhere on the page, just none missing people; else nothing upcoming at all. */
  hasOtherEvents: boolean
  isSignedIn: boolean
  /** /akce of the page's locality. */
  eventsSearch: Record<string, string | undefined>
}

/**
 * The panel without an event (Figma A-01 · Panel „Teď chybí jeden“ – bez akce): it never
 * disappears, or the band's top would fall apart. Nobody missing anywhere → the events with
 * free places; nothing upcoming → be the first (visitor: sign up, signed in: create one).
 */
export function EmptyMissingOnePanel({
  hasOtherEvents,
  isSignedIn,
  eventsSearch,
}: EmptyPanelProps) {
  return (
    <div className={cn(PANEL, "gap-2 px-6 pt-5.5 pb-6")}>
      {hasOtherEvents ? (
        <>
          <PanelLabel>Teď nikde nikdo nechybí</PanelLabel>
          <h2 className="type-feature">Všechny party jsou kompletní</h2>
          <p className="text-body">
            {/* signed in, the page leaves out events one already goes to: those may still miss
                people (review #263) */}
            {isSignedIn
              ? "Akce v okolí, kam se můžeš přidat, mají svoje minimum."
              : "Všechny akce v okolí mají svoje minimum."}{" "}
            Mrkni, kde jsou ještě volná místa.
          </p>
          <PanelButton>
            <Link
              to={ROUTES.events}
              search={{ ...eventsSearch, obsazenost: "volna" }}
            >
              Akce s volnými místy
            </Link>
          </PanelButton>
        </>
      ) : (
        <>
          <PanelLabel>V okolí teď nic není</PanelLabel>
          <h2 className="type-feature">Buď první</h2>
          <p className="text-body">
            V okolí teď žádná akce není. Založ ji a dej o ní vědět – lidi se přidají.
          </p>
          <PanelButton>
            {isSignedIn ? (
              <Link to={ROUTES.newEvent}>Založit akci</Link>
            ) : (
              <Link to={ROUTES.signup}>Zaregistrovat se</Link>
            )}
          </PanelButton>
        </>
      )}
    </div>
  )
}

function PanelButton({ children }: { children: ReactNode }) {
  return (
    <Button
      asChild
      variant="outline"
      className="mt-4 h-11 self-start"
    >
      {children}
    </Button>
  )
}

/** While the sections load: the panel's shape, so the band doesn't jump. */
export function MissingOnePanelSkeleton() {
  return (
    <div
      className={PANEL}
      aria-busy
      aria-label="Načítám akce"
    >
      <Skeleton className="h-45 rounded-none md:h-60" />
      <div className="flex flex-col gap-3 px-6 pt-4.5 pb-5.5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="mt-2 h-11 w-32" />
      </div>
    </div>
  )
}

/**
 * The sections failed to load (DESIGN.md › Every list has three states): in the panel's
 * place, so the band keeps its shape, with a way to retry.
 */
export function MissingOnePanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className={cn(PANEL, "gap-2 px-6 pt-5.5 pb-6")}
    >
      <h2 className="type-feature">Akce se nepodařilo načíst</h2>
      <p className="text-body">Zkontroluj připojení a zkus to znovu.</p>
      <Button
        variant="outline"
        className="mt-4 h-11 self-start"
        onClick={onRetry}
      >
        <RefreshCw className="size-4" />
        Zkusit znovu
      </Button>
    </div>
  )
}
