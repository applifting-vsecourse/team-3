import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { EventFilters } from "@/features/events/components/EventFilters"
import { EventList } from "@/features/events/components/EventList"
import { EventsMap } from "@/features/events/components/EventsMap"
import { useEvents } from "@/features/events/hooks/useEvents"
import {
  DEFAULT_LOCALITY_SLUG,
  eventsSearchSchema,
  type EventsSearch,
} from "@/features/events/lib/eventsSearch"

// Praha, until the catalog has loaded
const FALLBACK_CENTER = { lat: 50.0755, lng: 14.4378 }

export const Route = createFileRoute("/akce")({
  component: EventsPage,
  validateSearch: eventsSearchSchema,
})

function EventsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { events, catalog, isPending, error, retry } = useEvents(search)
  const [highlightedId, setHighlightedId] = useState<string>()
  const locality = catalog?.localities.find(
    (l) => l.slug === (search.lokalita ?? DEFAULT_LOCALITY_SLUG),
  )

  // replace: changing a filter shouldn't fill the back button with filter states
  const setSearch = (patch: Partial<EventsSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  return (
    <>
      <Seo title="Akce" />
      <Header userMenu={<HeaderMenu />} />
      <main className="flex-1">
        <h1 className="sr-only">Akce</h1>
        <div className="border-b border-border">
          <EventFilters
            search={search}
            catalog={catalog}
            onChange={setSearch}
            onClearAll={() => void navigate({ search: {}, replace: true })}
            className="overflow-x-auto px-4 py-3 md:px-10"
          />
        </div>
        <section className="mx-auto w-full max-w-2xl px-4 py-6">
          <EventList
            events={events ?? []}
            isLoading={isPending}
            error={error}
            // Only the error state offers a retry; refocusing the tab refetches.
            onRetry={retry}
            highlightedId={highlightedId}
            onHighlight={setHighlightedId}
          />
        </section>
        <div className="h-96">
          <EventsMap
            events={events ?? []}
            highlightedId={highlightedId}
            center={locality ?? FALLBACK_CENTER}
          />
        </div>
      </main>
    </>
  )
}
