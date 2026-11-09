import { CalendarDays, Lock, MapPin, UserCheck } from "lucide-react"

import { DetailRow } from "@/components/DetailRow/DetailRow"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { approvalModeLabel, formatEventTime } from "@/features/events/lib/formatEvent"

/**
 * When, where and how to join (Figma: Detail row) — the detail's panel (A-05d) and the
 * management's summary (D-03d). A group's event also says who sees it (A-05g, B-055).
 */
export function EventFacts({ event }: { event: EventDetail }) {
  return (
    <dl className="flex flex-col gap-3 md:gap-4">
      <DetailRow
        icon={CalendarDays}
        label="Kdy"
      >
        <time dateTime={event.startsAt.toISOString()}>
          {/* the full date with the year here (Figma A-05, A-05d); the band's line goes without it */}
          {formatEventTime(event.startsAt, event.endsAt, { hasYear: true })}
        </time>
      </DetailRow>
      <DetailRow
        icon={MapPin}
        label="Kde"
      >
        {event.address}
      </DetailRow>
      <DetailRow
        icon={UserCheck}
        label="Přihlašování"
      >
        {approvalModeLabel(event.approvalMode)}
      </DetailRow>
      {event.group ? (
        <DetailRow
          icon={Lock}
          label="Kdo akci vidí"
        >
          {event.visibility === "members" ? "Jen pro členy skupiny" : "Veřejná"}
        </DetailRow>
      ) : null}
    </dl>
  )
}
