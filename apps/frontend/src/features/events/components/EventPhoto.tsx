import { activityPhoto } from "@/assets/activity-photos"
import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { DateTile } from "@/components/DateTile/DateTile"
import { cn } from "@/lib/utils"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import type { EventCardVariant } from "@/features/events/components/EventCard"
import { eventDateParts } from "@/features/events/lib/formatEvent"

type EventPhotoProps = {
  event: Pick<PublicEvent, "activity" | "startsAt">
  variant: EventCardVariant | "past"
}

/**
 * The top of an event card (Figma Karta akce › Foto): the activity's photo from the library
 * with one colour grade (saturation −14 %, contrast +10 %; a past event −60 %), and the date
 * tile over it. Without a photo for its activity, the Activity tile on the page colour.
 * Decoration: the card's title and its <time> say what it shows.
 */
export function EventPhoto({ event, variant }: EventPhotoProps) {
  const photo = activityPhoto(event.activity.slug)
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

  return (
    <div
      aria-hidden
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
      {variant === "grid" ? medium : null}
      {variant === "row" || variant === "past" ? small : null}
      {variant === "responsive" ? (
        <>
          <div className="md:hidden">{small}</div>
          <div className="hidden md:block">{medium}</div>
        </>
      ) : null}
    </div>
  )
}
