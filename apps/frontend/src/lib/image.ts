import { activityPhoto } from "@/assets/activity-photos"
import { env } from "@/config/env"
import { api } from "@/lib/api-client"

/** The same limits as the API (`uploaded-image.ts`, #77): JPEG, PNG or WebP, at most 5 MB. */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
/** For the file picker's `accept`. */
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",")

// The API's sentences, so the form and the server say the same
export const IMAGE_MESSAGES = {
  tooBig: "Obrázek je moc velký. Nahraj nejvýš 5 MB.",
  wrongType: "Tenhle soubor nejde použít. Nahraj obrázek ve formátu JPEG, PNG nebo WebP.",
} as const

/**
 * Why a picked file can't be uploaded, or null when it can. The browser's
 * type is only a first look: the API checks the file's content.
 */
export function imageProblem(file: Pick<File, "type" | "size">): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return IMAGE_MESSAGES.wrongType
  if (file.size > IMAGE_MAX_BYTES) return IMAGE_MESSAGES.tooBig
  return null
}

/** Where the API serves an uploaded image (GET /api/images/:key). */
export const imageUrl = (key: string): string =>
  `${env.VITE_API_URL.replace(/\/$/, "")}/images/${encodeURIComponent(key)}`

export type PhotoSource = { src: string; srcSet?: string }

/** The API's sizes of an uploaded image: the longer side, as the backend stores it (`resize-image.ts`). */
export const IMAGE_FULL_WIDTH = 1600
export const IMAGE_SMALL_WIDTH = 480

/**
 * The picture of an event or a group (DESIGN.md › Event card): its own upload
 * (#77), or else its activity's photo from the library; undefined without either.
 * An upload comes in two sizes, as the library's photos do: the card's `sizes`
 * pick the small one (480 px), the detail the full one (1600 px).
 */
export function photoOf(item: {
  activity: { slug: string }
  imageKey?: string | null
}): PhotoSource | undefined {
  if (item.imageKey) {
    const src = imageUrl(item.imageKey)
    return {
      src,
      srcSet: `${src}/small ${IMAGE_SMALL_WIDTH}w, ${src} ${IMAGE_FULL_WIDTH}w`,
    }
  }
  return activityPhoto(item.activity.slug)
}

/** What a form wants done with the event's or the group's own image after saving it. */
export type ImageChange = { kind: "keep" } | { kind: "set"; file: File } | { kind: "remove" }

/**
 * PUT `path` (…/image) with the file, or DELETE it, and the API's answer; null for „keep“.
 * The caller parses the answer with its own schema.
 */
export async function sendImageChange(path: string, change: ImageChange): Promise<unknown> {
  switch (change.kind) {
    case "set": {
      const body = new FormData()
      body.append("image", change.file)
      return api.put(path, { body }).json()
    }
    case "remove":
      return api.delete(path).json()
    case "keep":
      return null
  }
}
