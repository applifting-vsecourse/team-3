import { describe, expect, it } from "vitest"

import { activityPhoto } from "@/assets/activity-photos"
import { env } from "@/config/env"
import { IMAGE_MAX_BYTES, IMAGE_MESSAGES, imageProblem, photoOf } from "@/lib/image"

describe("imageProblem", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("takes %s up to 5 MB", (type) => {
    expect(imageProblem({ type, size: IMAGE_MAX_BYTES })).toBeNull()
  })

  it("refuses a file over 5 MB and says why", () => {
    expect(imageProblem({ type: "image/png", size: IMAGE_MAX_BYTES + 1 })).toBe(
      IMAGE_MESSAGES.tooBig,
    )
  })

  it.each(["image/svg+xml", "image/gif", "image/heic", "application/pdf", ""])(
    "refuses %j and names the formats it takes",
    (type) => {
      expect(imageProblem({ type, size: 1000 })).toBe(IMAGE_MESSAGES.wrongType)
    },
  )
})

describe("photoOf", () => {
  const slug = "deskove-hry"

  it("is the event's or the group's own upload when there is one (#77)", () => {
    const src = `${env.VITE_API_URL.replace(/\/$/, "")}/images/abc-123`
    // two sizes, as the library's photos: a card's `sizes` pick the small one
    expect(photoOf({ activity: { slug }, imageKey: "abc-123" })).toEqual({
      src,
      srcSet: `${src}/small 480w, ${src} 1600w`,
    })
  })

  it("is the activity's photo without one", () => {
    expect(photoOf({ activity: { slug }, imageKey: null })).toBe(activityPhoto(slug))
    expect(photoOf({ activity: { slug } })).toBe(activityPhoto(slug))
  })
})
