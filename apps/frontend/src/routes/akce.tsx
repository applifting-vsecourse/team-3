import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Map as MapIcon } from "lucide-react"

import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { EventFilters } from "@/features/events/components/EventFilters"
import { EventList } from "@/features/events/components/EventList"
import { EventsMap } from "@/features/events/components/EventsMap"
import { ListPanel } from "@/features/events/components/ListPanel"
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

/**
 * Figma A-02 (mobile) and A-02d (desktop). The map is mounted once and never
 * unmounted, so pulling the mobile list up and down keeps its position; the
 * filters live in the URL, so they survive it too.
 */
function EventsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { events, catalog, isPending, error, retry } = useEvents(search)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [isListExpanded, setIsListExpanded] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string>()
  const locality = catalog?.localities.find(
    (l) => l.slug === (search.lokalita ?? DEFAULT_LOCALITY_SLUG),
  )
  const isMapVisible = isDesktop || !isListExpanded

  // replace: changing a filter shouldn't fill the back button with filter states
  const setSearch = (patch: Partial<EventsSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  return (
    <>
      <Seo title="Akce" />
      <Header userMenu={<HeaderMenu />} />
      {/* Desktop: main takes exactly the rest of the viewport (basis-0 + min-h-0),
          the list scrolls on its own and the map fills the height beside it. */}
      <main className="relative flex flex-1 flex-col md:min-h-0 md:basis-0">
        <h1 className="sr-only">Akce</h1>

        <div
          className={cn(
            // mobile: chips over the map, or a bar above the pulled-up list
            "absolute inset-x-0 top-0 z-20",
            isListExpanded && "border-b border-border bg-background",
            "md:static md:border-b md:border-border md:bg-background",
          )}
        >
          <EventFilters
            search={search}
            catalog={catalog}
            onChange={setSearch}
            onClearAll={() => void navigate({ search: {}, replace: true })}
            isFloating={!isDesktop && !isListExpanded}
            // Chips scroll sideways on narrow screens without a visible scrollbar
            // (Figma A-02); a desktop scrollbar would also make the bar taller
            // and cover the top of the pulled-up list.
            className="[scrollbar-width:none] overflow-x-auto px-4 py-3 md:px-8 [&::-webkit-scrollbar]:hidden"
          />
        </div>

        <div className="flex flex-1 md:min-h-0 md:gap-8 md:px-8">
          <ListPanel
            isExpanded={isListExpanded}
            onExpandedChange={setIsListExpanded}
          >
            <div className="md:py-8">
              <EventList
                events={events ?? []}
                isLoading={isPending}
                error={error}
                // Only the error state offers a retry; refocusing the tab refetches.
                onRetry={retry}
                highlightedId={highlightedId}
                onHighlight={setHighlightedId}
                limit={isDesktop || isListExpanded ? undefined : 1}
              />
            </div>
          </ListPanel>

          <div
            // hidden, not unmounted, under the pulled-up list; inert keeps it out of Tab order
            aria-hidden={!isMapVisible}
            inert={!isMapVisible}
            className={cn(
              "absolute inset-0 md:static md:min-w-0 md:flex-1 md:py-8",
              // mobile: map controls below the floating chips
              !isDesktop && "[&_.leaflet-top]:top-16",
            )}
          >
            <div className="size-full overflow-hidden md:rounded-lg md:border md:border-border">
              <EventsMap
                events={events ?? []}
                highlightedId={highlightedId}
                center={locality ?? FALLBACK_CENTER}
                hasZoomControl={isDesktop}
                attributionPosition={isDesktop ? "bottomright" : "topright"}
              />
            </div>
          </div>
        </div>

        {isListExpanded ? (
          // Figma: Map action „Mapa“ over the pulled-up list
          <Button
            variant="outline"
            onClick={() => setIsListExpanded(false)}
            className="absolute bottom-4 left-4 z-20 h-11 rounded-full bg-background shadow-md md:hidden"
          >
            <MapIcon />
            Mapa
          </Button>
        ) : null}
      </main>
    </>
  )
}
