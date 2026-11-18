import { describe, expect, it } from "vitest"

import { activityPhoto } from "@/assets/activity-photos"
import { env } from "@/config/env"

import {
  EVENT_IMAGE_MAX_BYTES,
  EVENT_IMAGE_MESSAGES,
  eventImageProblem,
  eventPhoto,
} from "@/features/events/lib/eventImage"

describe("eventImageProblem", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("takes %s up to 5 MB", (type) => {
    expect(eventImageProblem({ type, size: EVENT_IMAGE_MAX_BYTES })).toBeNull()
  })

  it("refuses a file over 5 MB and says why", () => {
    expect(eventImageProblem({ type: "image/png", size: EVENT_IMAGE_MAX_BYTES + 1 })).toBe(
      EVENT_IMAGE_MESSAGES.tooBig,
    )
  })

  it.each(["image/svg+xml", "image/gif", "image/heic", "application/pdf", ""])(
    "refuses %j and names the formats it takes",
    (type) => {
      expect(eventImageProblem({ type, size: 1000 })).toBe(EVENT_IMAGE_MESSAGES.wrongType)
    },
  )
})

describe("eventPhoto", () => {
  const slug = "deskove-hry"

  it("is the organizer's upload when there is one (#77)", () => {
    expect(eventPhoto({ activity: { slug }, imageKey: "abc-123" })).toEqual({
      src: `${env.VITE_API_URL.replace(/\/$/, "")}/event-images/abc-123`,
    })
  })

  it("is the activity's photo without one", () => {
    expect(eventPhoto({ activity: { slug }, imageKey: null })).toBe(activityPhoto(slug))
    expect(eventPhoto({ activity: { slug } })).toBe(activityPhoto(slug))
  })
})
