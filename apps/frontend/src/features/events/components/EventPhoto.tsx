import { ActivityTag } from "@/components/ActivityTag/ActivityTag"
import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { DateTile } from "@/components/DateTile/DateTile"
import { photoOf } from "@/lib/image"
import { cn } from "@/lib/utils"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import type { EventCardVariant } from "@/features/events/components/EventCard"
import { eventDateParts } from "@/features/events/lib/formatEvent"

type EventPhotoProps = {
  event: Pick<PublicEvent, "activity" | "startsAt" | "imageKey">
  variant: EventCardVariant | "past"
}

/**
 * The top of an event card (Figma Karta akce › Foto): the organizer's own image (#77) or the
 * activity's photo from the library, with one colour grade (saturation −14 %, contrast +10 %;
 * a past event −60 %), and the date tile over it. Without a photo for its activity, the Activity tile on the page colour.
 * Over it the activity's name (Tag/Activity, #348): a photo doesn't always say what the event
 * is, nor does a poster. A row's 104 px photo has it at the bottom, under the date tile; the grid
 * card at the top, above its date tile. The photo and the tiles are decoration (the card's title
 * and its <time> say them); the activity is read out, before the title.
 */
export function EventPhoto({ event, variant }: EventPhotoProps) {
  const photo = photoOf(event)
  const date = eventDateParts(event.startsAt)
  const isPast = variant === "past"
  const small = (
    <DateTile
      weekday={date.weekday}
      day={date.day}
      size="s"
      isPast={isPast}
      className="absolute top-1.5 left-1.5"
    />
  )
  const medium = (
    <DateTile
      weekday={date.weekday}
      day={date.day}
      time={date.time}
      className="absolute bottom-4 left-4"
    />
  )
  // a row: one line, cut with an ellipsis (it never covers the tile in the corner without a photo)
  const smallTag = (
    <ActivityTag
      name={event.activity.name}
      className={cn(
        "absolute bottom-1.5 left-1.5 block max-w-[calc(100%-0.75rem)] truncate border border-tile-border px-2 py-0.5",
        !photo && "max-w-[calc(100%-3rem)]",
      )}
    />
  )
  const mediumTag = (
    <ActivityTag
      name={event.activity.name}
      className="absolute top-3 left-3 block max-w-[calc(100%-1.5rem)] truncate border border-tile-border"
    />
  )

  return (
    <div
      data-slot="event-photo"
      className={cn(
        "relative shrink-0 overflow-hidden bg-background",
        {
          row: "size-26 rounded-xl",
          past: "size-26 rounded-xl",
          grid: "h-50 w-full",
          responsive: "size-26 rounded-xl md:h-50 md:w-full md:rounded-none",
        }[variant],
      )}
    >
      {photo ? (
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          // a grid card is full width on a phone, a third of the 1200 grid on desktop; only
          // `responsive` is a 104 px row on a phone
          sizes={
            {
              row: "104px",
              past: "104px",
              grid: "(min-width: 48rem) 400px, 100vw",
              responsive: "(min-width: 48rem) 400px, 104px",
            }[variant]
          }
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            "size-full object-cover contrast-110",
            isPast ? "saturate-40" : "saturate-86",
          )}
        />
      ) : (
        <ActivityTile
          icon={event.activity.category.icon}
          className={cn(
            "absolute right-2 bottom-2",
            {
              row: "size-8 rounded-md",
              past: "size-8 rounded-md",
              grid: "size-14",
              responsive: "size-8 rounded-md md:size-14 md:rounded-lg",
            }[variant],
          )}
          iconClassName={
            {
              row: "size-5",
              past: "size-5",
              grid: "size-7",
              responsive: "size-5 md:size-7",
            }[variant]
          }
        />
      )}
      <div aria-hidden>
        {variant === "grid" ? medium : null}
        {variant === "row" || variant === "past" ? small : null}
        {variant === "responsive" ? (
          <>
            <div className="md:hidden">{small}</div>
            <div className="hidden md:block">{medium}</div>
          </>
        ) : null}
      </div>
      {variant === "grid" ? mediumTag : null}
      {variant === "row" || variant === "past" ? smallTag : null}
      {variant === "responsive" ? (
        <>
          <div className="md:hidden">{smallTag}</div>
          <div className="hidden md:block">{mediumTag}</div>
        </>
      ) : null}
    </div>
  )
}
