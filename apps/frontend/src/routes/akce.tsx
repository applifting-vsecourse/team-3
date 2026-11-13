import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Map as MapIcon, Search } from "lucide-react"

import { BandTabs, BandTabsItem } from "@/components/PageBand/BandTabs"
import { PageBand } from "@/components/PageBand/PageBand"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useElementHeight } from "@/hooks/useElementHeight"
import { localityDefault, useLocality } from "@/hooks/useLocality"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { ALL_LOCALITIES_SLUG } from "@/lib/catalog/localityOptions"
import { cn } from "@/lib/utils"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { EmptyEvents } from "@/features/events/components/EmptyEvents"
import { EventFilters } from "@/features/events/components/EventFilters"
import { EventList } from "@/features/events/components/EventList"
import { EventMapPreview } from "@/features/events/components/EventMapPreview"
import { EventSearch } from "@/features/events/components/EventSearch"
import { EventsMap } from "@/features/events/components/EventsMap"
import { ListPanel, type PanelSnap } from "@/features/events/components/ListPanel"
import { SortMenu } from "@/features/events/components/SortMenu"
import { EventsViewerContext, useEvents } from "@/features/events/hooks/useEvents"
import { usePickCounts } from "@/features/events/hooks/usePickCounts"
import {
  changesPick,
  effectiveSort,
  eventsSearchSchema,
  hasActiveFilters,
  hasFiltersBeyondPick,
  isAllEvents,
  localityCenter,
  pickSearch,
  toMapArea,
  toOblast,
  type EventsSearch,
  type QuickPick,
  type Radius,
} from "@/features/events/lib/eventsSearch"

// DESIGN.md › Quick picks, in this order (Figma A-02d)
const PICK_TABS: { pick: QuickPick | undefined; label: string }[] = [
  { pick: undefined, label: "Všechny akce" },
  { pick: "tady-chybis", label: "Tady chybíš" },
  { pick: "tento-vikend", label: "Tento víkend" },
  { pick: "podle-zajmu", label: "Podle tvých zájmů" },
  { pick: "kousek-od-tebe", label: "Kousek od tebe" },
  { pick: "od-hodnocenych", label: "Od dobře hodnocených" },
]
const ALL_EVENTS_TAB = "vsechny"

// Celé Česko, and until the locality is known: the whole country in view
const CZECHIA_CENTER = { lat: 49.8, lng: 15.5, zoom: 7 }

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
  const urlSearch = Route.useSearch()
  // one moment for the page: „Tento víkend“ and the picks' dates don't shift while it is open
  const now = useMemo(() => new Date(), [])
  const navigate = Route.useNavigate()
  const session = useSession()
  const shownLocality = useLocality(
    urlSearch.lokalita,
    session.isPending ? undefined : (session.user?.id ?? null),
  )
  // the filters as shown: the visitor's default locality (#55) when the URL has none
  const search = { ...urlSearch, lokalita: shownLocality.slug }
  const { events, catalog, isPending, error, retry } = useEvents(search, {
    // nothing for all of Czechia first while the default locality loads
    isEnabled: shownLocality.slug !== undefined,
  })
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [overlayRef, overlayHeight] = useElementHeight<HTMLDivElement>()
  const [panelSnap, setPanelSnap] = useState<PanelSnap>("peek")
  const isListExpanded = panelSnap === "list"
  const [highlightedId, setHighlightedId] = useState<string>()
  // the tapped pin's event (#56); gone with the filters that showed it
  const [selectedId, setSelectedId] = useState<string>()
  const selectedEvent = events?.find((event) => event.id === selectedId)
  const area = toMapArea(search.oblast)
  const [panelPeekHeight, setPanelPeekHeight] = useState(0)
  // phone: the preview hides the list sheet and covers the map's bottom instead (review #276)
  const [previewCover, setPreviewCover] = useState(0)
  const mapBottomInset = selectedEvent ? previewCover : panelPeekHeight
  const locality = catalog?.localities.find((l) => l.slug === search.lokalita)
  const isMapVisible = isDesktop || !isListExpanded

  // Escape closes the preview, like a tap into the map — unless it closed an open panel or
  // menu first (the kit's layers prevent the default of the Escape they handle)
  useEffect(() => {
    if (!selectedEvent) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setSelectedId(undefined)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedEvent])

  // replace: changing a filter shouldn't fill the back button with filter states
  // A filter only, nothing remembered: e.g. „… v celém Česku“ from an empty list widens it
  // this once (review #274). A locality replaces the searched area (and the other way round).
  // Changing a filter the quick pick set leaves the pick (Figma A-02d, #250). Any change closes
  // the map preview, or Praha → Brno → Praha would open it again by itself (review #276).
  const setSearch = (patch: Partial<EventsSearch>) => {
    setSelectedId(undefined)
    const withArea = patch.lokalita !== undefined ? { ...patch, oblast: undefined } : patch
    const withPick = changesPick(urlSearch, withArea, now)
      ? { ...withArea, vyber: undefined }
      : withArea
    void navigate({ search: (prev) => ({ ...prev, ...withPick }), replace: true })
  }
  // a tab: the locality and okolí stay, the other filters give way to the pick's
  const selectPick = (pick: QuickPick | undefined) => {
    setSelectedId(undefined)
    void navigate({ search: pickSearch(pick, urlSearch, now), replace: true })
  }
  // a pick in the locality chip: remembered in this browser (#55), with its okolí (#57)
  const pickLocality = (lokalita: string, okoli?: Radius) => {
    shownLocality.pick(lokalita)
    setSearch({ lokalita, okoli })
  }
  // also the remembered locality: back to the visitor's default (#55); with a pick back to
  // the pick as it was chosen (Figma A-02d)
  const clearFilters = () => {
    setSelectedId(undefined)
    shownLocality.forget()
    void navigate({
      search: urlSearch.vyber ? pickSearch(urlSearch.vyber, {}, now) : {},
      replace: true,
    })
  }
  const hasOwnFilters =
    (urlSearch.vyber ? hasFiltersBeyondPick(urlSearch, now) : hasActiveFilters(urlSearch)) ||
    shownLocality.isPicked
  // only a quick pick is on: its chips light up too, so there must be a way out of it —
  // „Zrušit výběr“ goes to „Všechny akce“, the locality and okolí stay
  const isPickOnly = Boolean(urlSearch.vyber) && !hasOwnFilters
  const canClear = hasOwnFilters || isPickOnly
  const clear = isPickOnly ? () => selectPick(undefined) : clearFilters
  const clearLabel = isPickOnly ? "Zrušit výběr" : undefined
  // the order and the distances need the chosen locality's centre (#57)
  const center = catalog ? localityCenter(search, catalog) : undefined
  const sort = catalog ? effectiveSort(search, catalog) : "termin"
  // with okolí, or ordered by distance: an order the cards don't explain looks random (review #279)
  const isDistanceShown = Boolean(center) && (search.okoli !== undefined || sort === "vzdalenost")
  // the quick picks (#250): „Podle tvých zájmů“ for a signed-in user, „Kousek od tebe“ with a
  // centre to measure from (Figma A-02 · celé Česko has none)
  const tabs = PICK_TABS.filter(
    ({ pick }) =>
      (pick !== "podle-zajmu" || Boolean(session.user)) &&
      (pick !== "kousek-od-tebe" || Boolean(center)),
  )
  const counts = usePickCounts(
    tabs.map(({ pick }) => ({ ...pickSearch(pick, urlSearch, now), lokalita: search.lokalita })),
    { isEnabled: shownLocality.slug !== undefined },
  )
  const activeTab = urlSearch.vyber ?? (isAllEvents(urlSearch) ? ALL_EVENTS_TAB : "")
  // a hand-changed filter, or a pick whose tab is not shown: no tab names the panel
  const hasActiveTrigger = tabs.some(({ pick }) => (pick ?? ALL_EVENTS_TAB) === activeTab)
  const title = urlSearch.vyber
    ? (PICK_TABS.find(({ pick }) => pick === urlSearch.vyber)?.label ?? "Akce")
    : isAllEvents(urlSearch)
      ? "Akce"
      : "Akce podle tvých filtrů"
  // phone: the header's „Hledat“ opens the search above the chips; a search in the URL keeps
  // it open, so closing it also ends the search (review #279)
  const [isSearchOpened, setIsSearchOpened] = useState(false)
  const hasSearchRow = !isDesktop && (isSearchOpened || search.q !== undefined)
  const searchField = (isAutoFocused = false) => (
    <EventSearch
      value={search.q}
      onChange={(q) => setSearch({ q })}
      isAutoFocused={isAutoFocused}
    />
  )
  // „Zrušit výběr“ in the locality panel: back to the default, the other filters stay
  const clearLocality = () => {
    setSelectedId(undefined)
    shownLocality.forget()
    void navigate({
      search: (prev) => ({ ...prev, lokalita: undefined, oblast: undefined, okoli: undefined }),
      replace: true,
    })
  }

  return (
    // the quick picks' personal parts differ per user: their cache too (#250)
    <EventsViewerContext value={session.user?.id ?? null}>
      <Seo title="Akce" />
      <AppHeader
        screenAction={
          // Figma A-02: the magnifier in the phone's header (#57)
          <Button
            variant="ghost"
            aria-expanded={hasSearchRow}
            onClick={() => {
              if (!hasSearchRow) {
                setIsSearchOpened(true)
                return
              }
              setIsSearchOpened(false)
              if (search.q !== undefined) setSearch({ q: undefined })
            }}
            className="h-10 gap-1.5 px-2"
          >
            <Search />
            Hledat
          </Button>
        }
      />
      {/* the band and its H1 belong to main, as on every page; desktop: main takes exactly the
          rest of the viewport (basis-0 + min-h-0) */}
      <main className="flex flex-1 flex-col md:min-h-0 md:basis-0">
        {/* Figma A-02d: „Akce v Praze 3“ needs the locality in the locative, which the catalog
            does not have; the line under the title names it in the nominative. The
            quick picks come with #250. */}
        {/* the quick picks as tabs on the band's edge (#250); a hand-changed filter leaves none active */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            selectPick(value === ALL_EVENTS_TAB ? undefined : (value as QuickPick))
          }
          // it holds the band and the rest of the page, so it takes the page's height as the
          // rest did before (#298)
          className="flex-1 gap-0 md:min-h-0 md:basis-0"
        >
          <PageBand
            variant="section"
            isMotifAboveTabs
            title={title}
            description={
              area
                ? "Nadcházející akce ve výřezu mapy."
                : search.lokalita === ALL_LOCALITIES_SLUG
                  ? "Nadcházející akce v celém Česku."
                  : locality
                    ? `Nadcházející akce v lokalitě ${locality.name}.`
                    : // the line keeps its place until the catalog names the locality
                      " "
            }
          >
            <BandTabs>
              {tabs.map(({ pick, label }, index) => (
                <BandTabsItem
                  key={pick ?? ALL_EVENTS_TAB}
                  value={pick ?? ALL_EVENTS_TAB}
                  count={counts[index]}
                >
                  {label}
                </BandTabsItem>
              ))}
            </BandTabs>
          </PageBand>
          {/* Desktop: the rest under the band, the list scrolls on its own and the map fills
              the height beside it. It is the tabs' panel, so the active tab points at what it
              shows (aria-controls, #298). Without an active tab it is named by the title. */}
          <TabsContent
            value={activeTab}
            asChild
            {...(hasActiveTrigger ? {} : { "aria-labelledby": undefined, "aria-label": title })}
          >
            <div className="relative flex flex-1 flex-col overflow-hidden md:min-h-0 md:basis-0">
              <div
                // on a phone it floats over the map's top: „Hledat v této oblasti“ goes under it
                ref={overlayRef}
                className={cn(
                  // mobile: chips over the map, or a bar above the pulled-up list
                  "absolute inset-x-0 top-0 z-20",
                  // pb-1: the bar reaches the sheet below it (top-16), no strip of map between
                  isListExpanded && "border-b border-border bg-background pb-1",
                  // desktop: no hairline under the bar, the list and the map start below it; on the
                  // 1200 grid like the band (Figma A-02d)
                  "md:static md:mx-auto md:w-full md:max-w-7xl md:border-b-0 md:bg-background",
                )}
              >
                {hasSearchRow ? (
                  <div className="px-4 pt-3 md:hidden">{searchField(isSearchOpened)}</div>
                ) : null}
                <EventFilters
                  search={search}
                  catalog={catalog}
                  onChange={setSearch}
                  onLocalityChange={pickLocality}
                  onClearAll={canClear ? clear : undefined}
                  clearAllLabel={clearLabel}
                  localityDefault={localityDefault(shownLocality, clearLocality)}
                  isFloating={!isDesktop && !isListExpanded}
                  searchControl={isDesktop ? searchField() : undefined}
                  // Chips scroll sideways on narrow screens without a visible scrollbar
                  // (Figma A-02); a desktop scrollbar would also make the bar taller
                  // and cover the top of the pulled-up list.
                  className="[scrollbar-width:none] overflow-x-auto px-4 py-3 md:px-10 [&::-webkit-scrollbar]:hidden"
                />
              </div>

              <div className="flex flex-1 md:mx-auto md:min-h-0 md:w-full md:max-w-7xl md:gap-8 md:px-10">
                <ListPanel
                  snap={panelSnap}
                  onSnapChange={setPanelSnap}
                  scrollResetKey={JSON.stringify(search)}
                  onVisibleHeightChange={setPanelPeekHeight}
                  isHidden={selectedEvent !== undefined}
                  hasSearchRow={hasSearchRow}
                >
                  <EventList
                    events={events ?? []}
                    isLoading={isPending}
                    error={error}
                    // Only the error state offers a retry; refocusing the tab refetches.
                    onRetry={retry}
                    // desktop: the selected pin's card stays marked in the list (Figma A-03ad)
                    highlightedId={highlightedId ?? selectedEvent?.id}
                    onHighlight={setHighlightedId}
                    onClearFilters={canClear ? clear : undefined}
                    clearFiltersLabel={clearLabel}
                    sortControl={
                      <SortMenu
                        value={sort}
                        isDistanceAvailable={Boolean(center)}
                        // the order okolí implies stays out of the URL
                        onChange={(razeni) =>
                          setSearch({
                            razeni:
                              razeni === (search.okoli ? "vzdalenost" : "termin")
                                ? undefined
                                : razeni,
                          })
                        }
                      />
                    }
                    isDistanceShown={isDistanceShown}
                    empty={
                      <EmptyEvents
                        search={search}
                        catalog={catalog}
                        isVisitor={!session.user && !session.isPending}
                        onSearchChange={setSearch}
                      />
                    }
                    // lowered sheet: what is below its edge is out of the Tab order
                    inertAfter={
                      isDesktop || isListExpanded ? undefined : panelSnap === "map" ? 0 : 1
                    }
                  />
                </ListPanel>

                <div
                  // hidden, not unmounted, under the pulled-up list; inert keeps it out of Tab order
                  aria-hidden={!isMapVisible}
                  inert={!isMapVisible}
                  // mobile: the OSM attribution sits bottom right just above the closed list
                  // sheet, or above the preview that took its place, instead of hiding under it
                  // (! because leaflet.css isn't layered)
                  style={
                    isDesktop
                      ? undefined
                      : ({ "--map-bottom-inset": `${mapBottomInset}px` } as CSSProperties)
                  }
                  className={cn(
                    "absolute inset-0 md:static md:min-w-0 md:flex-1 md:py-8",
                    !isDesktop && "[&_.leaflet-bottom]:bottom-(--map-bottom-inset)!",
                  )}
                >
                  <div className="relative size-full overflow-hidden md:rounded-2xl md:border md:border-card-border">
                    <EventsMap
                      events={events ?? []}
                      highlightedId={highlightedId}
                      selectedId={selectedEvent?.id}
                      onSelect={setSelectedId}
                      area={area}
                      onAreaSearch={(searched) => {
                        setSelectedId(undefined)
                        void navigate({
                          search: (prev) => ({ ...prev, oblast: toOblast(searched) }),
                          replace: true,
                        })
                      }}
                      center={
                        search.lokalita === ALL_LOCALITIES_SLUG
                          ? CZECHIA_CENTER
                          : (locality ?? CZECHIA_CENTER)
                      }
                      // the phone's search and chips float over the map's top (#288)
                      topInset={isDesktop ? 0 : overlayHeight}
                      hasZoomControl={isDesktop}
                    />
                    {selectedEvent && isDesktop ? (
                      <EventMapPreview
                        event={selectedEvent}
                        isDesktop
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {selectedEvent && !isDesktop ? (
                <EventMapPreview
                  event={selectedEvent}
                  isDesktop={false}
                  onCoverChange={setPreviewCover}
                />
              ) : null}

              {isListExpanded ? (
                // Figma: Map action „Mapa“ over the pulled-up list
                <Button
                  variant="outline"
                  onClick={() => setPanelSnap("peek")}
                  className="absolute bottom-4 left-4 z-20 h-11 bg-background shadow-md md:hidden"
                >
                  <MapIcon />
                  Mapa
                </Button>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </EventsViewerContext>
  )
}
