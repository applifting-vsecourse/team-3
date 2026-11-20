import { useQuery } from "@tanstack/react-query"
import { CalendarDays } from "lucide-react"

import type { Locality } from "@/lib/catalog/catalogSchemas"
import { photoOf } from "@/lib/image"

import { eventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { formatEventStart } from "@/features/events/lib/formatEvent"

export function OnboardingEventPreview({
  locality,
  categoryId,
}: {
  locality: Locality
  categoryId: string
}) {
  const { data } = useQuery(
    eventsQueryOptions({
      lat: locality.lat,
      lng: locality.lng,
      radiusKm: 25,
      categoryIds: [categoryId],
      activityIds: [],
      limit: 1,
    }),
  )
  const event = data?.[0]
  if (!event) return null

  const photo = photoOf(event)
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-tile-border bg-secondary p-3 text-secondary-foreground motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      {photo ? (
        <img
          src={photo.src}
          alt=""
          className="size-12 shrink-0 rounded-md object-cover"
        />
      ) : (
        <CalendarDays
          aria-hidden
          className="size-5 shrink-0"
        />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium">Už teď v okolí</p>
        <p className="font-semibold wrap-break-word">{event.title}</p>
        <p className="text-xs">
          <time dateTime={event.startsAt.toISOString()}>{formatEventStart(event.startsAt)}</time> ·{" "}
          {event.locality.name}
        </p>
      </div>
    </div>
  )
}
