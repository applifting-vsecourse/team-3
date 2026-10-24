import type { EventDetail, PublicEvent } from "@/features/events/api/eventSchemas"

/** A seed-like event for component tests: Fri 23. 10. 2026, 17:30 Prague time. */
export const anEvent = (overrides: Partial<PublicEvent> = {}): PublicEvent => ({
  id: "e1",
  title: "Language exchange: CZ/EN/ES",
  startsAt: new Date("2026-10-23T15:30:00.000Z"),
  endsAt: null,
  address: "Kavárna Pražírna, Dělnická 12, Praha 8",
  lat: 50.1,
  lng: 14.45,
  activity: {
    id: "a-tandem",
    slug: "jazykovy-tandem",
    name: "Jazykový tandem",
    category: { id: "c-kvizy", slug: "kvizy-a-jazyky", name: "Kvízy a jazyky", icon: "message" },
  },
  locality: { id: "l-praha-8", slug: "praha-8", name: "Praha 8" },
  organizer: { id: "u1", name: "Petra" },
  group: null,
  minParticipants: 4,
  maxParticipants: 12,
  approvedCount: 4,
  missingToMin: 0,
  freeSpots: 8,
  isFull: false,
  isPromoted: false,
  ...overrides,
})

/** The same event as on its detail page, as a signed-in user gets it. */
export const anEventDetail = (overrides: Partial<EventDetail> = {}): EventDetail => ({
  ...anEvent(),
  description: "Procvičte si angličtinu a španělštinu u kávy.\nZačátečníci vítáni.",
  approvalMode: "open",
  status: "published",
  cancelReason: null,
  participants: [
    { id: "u2", name: "Jana Svobodová" },
    { id: "u3", name: "Tomáš Dvořák" },
    { id: "u4", name: "Lucie Černá" },
    { id: "u5", name: "Marek Novák" },
  ],
  myParticipation: null,
  ...overrides,
})
