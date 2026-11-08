import type { ReactNode } from "react"

import { activityPhoto } from "@/assets/activity-photos"

type ActivityPhotoProps = {
  /** The activity's slug: one photo per activity from the library (DESIGN.md › Event card). */
  slug: string
  /** Over the photo, e.g. the event's date tile. */
  children?: ReactNode
}

/**
 * The activity's photo at the top of a detail (Figma A-05, A-05d, A-08, A-08d): edge to edge
 * under the bar on a phone, in the content column on desktop, with the cards' colour grade
 * (saturation −14 %, contrast +10 %). Without a photo for the activity, nothing — a big empty
 * box would only fill space. Decoration: the title says what it shows.
 */
export function ActivityPhoto({ slug, children }: ActivityPhotoProps) {
  const photo = activityPhoto(slug)
  if (!photo) return null
  return (
    <div
      aria-hidden
      data-slot="activity-photo"
      className="relative h-55 w-full shrink-0 overflow-hidden md:h-85 md:rounded-2xl"
    >
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="(min-width: 48rem) 760px, 100vw"
        alt=""
        // at the top of the page
        loading="eager"
        decoding="async"
        className="size-full object-cover contrast-110 saturate-86"
      />
      {children}
    </div>
  )
}
