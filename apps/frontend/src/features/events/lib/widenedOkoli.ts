import type { Home, HomeEventSectionKey } from "@/features/events/api/homeSchemas"
import { RADII, type Radius } from "@/features/events/lib/eventsSearch"

/**
 * The okolí /akce needs to list what a widened landing page shows (review #321): the nearest
 * events of a locality with nothing to join lie around it, so „Zobrazit všechny“ opens /akce in
 * that locality with the smallest okolí that holds every one of them — the list the section
 * promises, nearest first, with the distances. Undefined when they are not widened, or farther
 * than the widest okolí (50 km): /akce then shows the locality's nearest events itself
 * (EmptyEvents, #299).
 */
export function widenedOkoli(home: Home, key?: HomeEventSectionKey): Radius | undefined {
  if (!home.isWidened) return undefined
  // a section's link covers its own cards; the page's (the panel) all of them
  const distances = home.sections.flatMap((section) =>
    "events" in section && (key === undefined || section.key === key)
      ? section.events.map((event) => event.distanceKm ?? Infinity)
      : [],
  )
  if (distances.length === 0) return undefined
  const farthest = Math.max(...distances)
  // strictly below: the card's distance is rounded, /akce compares the exact one with the circle
  return RADII.find((km) => farthest < Number(km))
}
