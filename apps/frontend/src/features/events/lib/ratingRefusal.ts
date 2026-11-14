import { RATING_WINDOW_DAYS, type EventRatingRefusal } from "@/features/events/api/ratingSchemas"

/**
 * Why rating isn't possible now, in the words both rating pages use (review #322): the
 * participant's (C-03) and the organizer's (D-05). The organizer's list never gets
 * RATING_DELETED as a whole — a deleted rating is one participant's, shown at their row.
 */
export const NOT_RATABLE: Record<EventRatingRefusal, { title: string; body: string }> = {
  EVENT_NOT_ENDED: {
    title: "Hodnotit půjde, až akce skončí",
    body: `Pak na to budeš mít ${RATING_WINDOW_DAYS} dní.`,
  },
  EVENT_NOT_PUBLISHED: {
    title: "Akce je zrušená",
    body: "Zrušenou akci hodnotit nejde.",
  },
  // below its minimum: as the event's detail says, „Akce se nekonala“ (B-060, #314)
  EVENT_NOT_HELD: {
    title: "Akce se nekonala",
    body: "Nesešlo se dost lidí, takže hodnotit nejde.",
  },
  RATING_WINDOW_CLOSED: {
    title: "Hodnotit už nejde",
    body: `Hodnotit šlo jen ${RATING_WINDOW_DAYS} dní po akci.`,
  },
  RATING_DELETED: {
    title: "Hodnocení odstranil správce",
    body: "Znovu ho dát nejde.",
  },
}
