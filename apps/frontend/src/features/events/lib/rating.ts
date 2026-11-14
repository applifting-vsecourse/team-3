import { inSentence } from "@/lib/inSentence"
import { gatheredLabel, isBelowMinimum } from "@/lib/occupancy"

import { RATING_WINDOW_DAYS } from "@/features/events/api/ratingSchemas"
import {
  endOfPragueDay,
  formatEventDay,
  isEventOver,
  placeName,
} from "@/features/events/lib/formatEvent"

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const pragueDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" })

/**
 * The last moment to rate an event, as the API counts it (B-060, rating-window.ts): the end of
 * the 14th Prague calendar day after the day the event ended. An end exactly at Prague midnight
 * belongs to the day before; without an end, the day it started.
 */
export function ratingDeadline(event: { startsAt: Date; endsAt: Date | null }): Date {
  const endedAt = event.endsAt ? new Date(event.endsAt.getTime() - 1) : event.startsAt
  // the Prague date as a UTC midnight: plain calendar arithmetic, no change of time in it
  const endDay = Date.parse(pragueDateFormat.format(endedAt))
  const lastDay = endDay + RATING_WINDOW_DAYS * DAY_MS
  // noon of that date is on the same Prague day in summer and winter time
  return new Date(endOfPragueDay(new Date(lastDay + 12 * HOUR_MS)).getTime() - 1)
}

type RatableEvent = {
  startsAt: Date
  endsAt: Date | null
  status: "published" | "cancelled"
  approvedCount: number
  minParticipants: number
  organizer: { id: string }
  myParticipation: string | null
}

/**
 * Whether to offer „Ohodnotit akci“ (#66): the same rules as the API, so the link never leads to
 * a page that refuses — the user had a place and isn't the organizer, the event took place (not
 * cancelled, its minimum reached: below it the API says EVENT_NOT_HELD), it is over and the
 * window is still open.
 */
export function canRateEvent(event: RatableEvent, viewerId: string | null, now: Date): boolean {
  return (
    viewerId !== null &&
    event.organizer.id !== viewerId &&
    event.myParticipation === "approved" &&
    tookPlace(event, now) &&
    now <= ratingDeadline(event)
  )
}

type HeldEvent = {
  startsAt: Date
  endsAt: Date | null
  status: "published" | "cancelled"
  approvedCount: number
  minParticipants: number
}

/** Over, not cancelled, its minimum reached: participants could rate it (#66). */
export const tookPlace = (event: HeldEvent, now: Date): boolean =>
  event.status === "published" && !isBelowMinimum(event) && isEventOver(event, now)

/**
 * Whether to offer „Ohodnotit účastníky“ (D-05, #66): the API's rules for the organizer — the
 * one who created the event, not a group's other admin (NOT_ORGANIZER) — at an event that took
 * place, while the window is open.
 */
export function canRateParticipants(
  event: HeldEvent & { organizer: { id: string } },
  viewerId: string | null,
  now: Date,
): boolean {
  return (
    viewerId !== null &&
    event.organizer.id === viewerId &&
    tookPlace(event, now) &&
    now <= ratingDeadline(event)
  )
}

type BandEvent = {
  title: string
  startsAt: Date
  address: string
  locality: { name: string }
  approvedCount: number
}

/** The rating pages' band (Figma C-03d, D-05d): „Volejbal na Letné · Po 19. 10. · místo · sešlo se 5 lidí“. */
export function ratingBandLine(event: BandEvent): string {
  return [
    event.title,
    formatEventDay(event.startsAt),
    `${placeName(event.address)}, ${event.locality.name}`,
    inSentence(gatheredLabel(event.approvedCount)),
  ].join(" · ")
}
