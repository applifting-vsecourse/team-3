import { activityPhoto } from "@/assets/activity-photos"
import { env } from "@/config/env"

/** The same limits as the API (`event-image.ts`, #77): JPEG, PNG or WebP, at most 5 MB. */
export const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const EVENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
/** For the file picker's `accept`. */
export const EVENT_IMAGE_ACCEPT = EVENT_IMAGE_TYPES.join(",")

// The API's sentences, so the form and the server say the same
export const EVENT_IMAGE_MESSAGES = {
  tooBig: "Obrázek je moc velký. Nahraj nejvýš 5 MB.",
  wrongType: "Tenhle soubor nejde použít. Nahraj obrázek ve formátu JPEG, PNG nebo WebP.",
} as const

/**
 * Why a picked file can't be the event's image, or null when it can. The
 * browser's type is only a first look: the API checks the file's content.
 */
export function eventImageProblem(file: Pick<File, "type" | "size">): string | null {
  if (!(EVENT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return EVENT_IMAGE_MESSAGES.wrongType
  }
  if (file.size > EVENT_IMAGE_MAX_BYTES) return EVENT_IMAGE_MESSAGES.tooBig
  return null
}

/** Where the API serves an uploaded image (GET /api/event-images/:key). */
export const eventImageUrl = (key: string): string =>
  `${env.VITE_API_URL.replace(/\/$/, "")}/event-images/${encodeURIComponent(key)}`

export type EventPhotoSource = { src: string; srcSet?: string }

/**
 * The picture of an event (DESIGN.md › Event card): the organizer's upload
 * (#77), or else the activity's photo from the library; undefined without
 * either.
 */
export function eventPhoto(event: {
  activity: { slug: string }
  imageKey?: string | null
}): EventPhotoSource | undefined {
  if (event.imageKey) return { src: eventImageUrl(event.imageKey) }
  return activityPhoto(event.activity.slug)
}
