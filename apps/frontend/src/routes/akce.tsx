import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import {
  activityTreeQueryOptions,
  localitiesQueryOptions,
} from "@/features/events/api/catalogQueryOptions"
import { eventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { EventList } from "@/features/events/components/EventList"
import { eventsSearchSchema, toEventFilters } from "@/features/events/lib/eventsSearch"

export const Route = createFileRoute("/akce")({
  component: EventsPage,
  validateSearch: eventsSearchSchema,
})

function EventsPage() {
  const search = Route.useSearch()
  const localitiesQuery = useQuery(localitiesQueryOptions())
  const activitiesQuery = useQuery(activityTreeQueryOptions())

  // The URL holds slugs; the API wants ids, which come from the catalog.
  const filters =
    localitiesQuery.data && activitiesQuery.data
      ? toEventFilters(search, {
          localities: localitiesQuery.data,
          categories: activitiesQuery.data,
        })
      : undefined
  const eventsQuery = useQuery(eventsQueryOptions(filters))

  const queries = [localitiesQuery, activitiesQuery, eventsQuery]
  const error = queries.find((query) => query.error)?.error ?? undefined

  return (
    <>
      <Seo title="Akce" />
      <Header userMenu={<HeaderMenu />} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-2xl px-4 py-6">
          <h1 className="sr-only">Akce</h1>
          <EventList
            events={eventsQuery.data ?? []}
            isLoading={queries.some((query) => query.isPending)}
            error={error}
            // Only the error state offers a retry; refocusing the tab refetches.
            onRetry={() => {
              for (const query of queries) if (query.error) void query.refetch()
            }}
          />
        </section>
      </main>
    </>
  )
}
