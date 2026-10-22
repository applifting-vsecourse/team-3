import { createFileRoute } from "@tanstack/react-router"

import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { EventFilters } from "@/features/events/components/EventFilters"
import { EventList } from "@/features/events/components/EventList"
import { useEvents } from "@/features/events/hooks/useEvents"
import { eventsSearchSchema, type EventsSearch } from "@/features/events/lib/eventsSearch"

export const Route = createFileRoute("/akce")({
  component: EventsPage,
  validateSearch: eventsSearchSchema,
})

function EventsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { events, catalog, isPending, error, retry } = useEvents(search)

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
          />
        </section>
      </main>
    </>
  )
}
